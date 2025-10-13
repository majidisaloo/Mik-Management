import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const emptyForm = {
  name: '',
  parentId: ''
};

const formatDateTime = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const flattenTree = (nodes, depth = 0, acc = []) => {
  nodes.forEach((node) => {
    acc.push({ ...node, depth });
    if (Array.isArray(node.children) && node.children.length > 0) {
      flattenTree(node.children, depth + 1, acc);
    }
  });
  return acc;
};

const Groups = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [tree, setTree] = useState([]);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState({ mode: null, targetId: null });
  const [form, setForm] = useState(emptyForm);

  const canManageGroups = Boolean(user?.permissions?.groups);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (!canManageGroups) {
      navigate('/dashboard', { replace: true });
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/groups', { signal: controller.signal });

        if (!response.ok) {
          throw new Error('Unable to load Mik-Groups from the server.');
        }

        const payload = await response.json();
        const loadedGroups = Array.isArray(payload?.groups) ? payload.groups : [];
        const loadedTree = Array.isArray(payload?.tree) ? payload.tree : [];

        setGroups(loadedGroups);
        setTree(loadedTree);
        setStatus({ type: '', message: '' });
      } catch (error) {
        if (error.name !== 'AbortError') {
          setStatus({
            type: 'error',
            message:
              error.message ||
              'Group management is unavailable right now. Confirm the API is reachable and refresh the page.'
          });
        }
      } finally {
        setLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, [canManageGroups, navigate, user]);

  const flattenedGroups = useMemo(() => flattenTree(tree.slice()), [tree]);

  const closeModal = () => {
    setModal({ mode: null, targetId: null });
    setForm(emptyForm);
    setSaving(false);
  };

  const refreshGroups = async () => {
    try {
      const response = await fetch('/api/groups');
      if (!response.ok) {
        throw new Error('Unable to refresh groups.');
      }
      const payload = await response.json();
      setGroups(Array.isArray(payload?.groups) ? payload.groups : []);
      setTree(Array.isArray(payload?.tree) ? payload.tree : []);
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Unable to refresh groups.' });
    }
  };

  const buildErrorMessage = async (response, fallback) => {
    const statusCode = response.status;
    const contentType = response.headers.get('content-type') ?? '';
    let message = fallback;

    if (statusCode === 502) {
      message = 'The API returned 502 Bad Gateway. Confirm the backend service is online.';
    } else if (statusCode >= 500 && statusCode !== 502) {
      message = `The server returned an unexpected error (${statusCode}).`;
    }

    if (contentType.includes('application/json')) {
      const payload = await response.json().catch(() => ({}));
      if (payload?.message) {
        message = payload.message;
      }
    } else {
      const text = await response.text().catch(() => '');
      if (text) {
        message = text;
      }
    }

    return message;
  };

  const openCreate = (parentId = '') => {
    setForm({ name: '', parentId: parentId ? String(parentId) : '' });
    setModal({ mode: 'create', targetId: parentId || null });
  };

  const openView = (groupId) => {
    setModal({ mode: 'view', targetId: groupId });
  };

  const openEdit = (groupId) => {
    const selected = groups.find((group) => group.id === groupId);
    if (!selected) {
      setStatus({ type: 'error', message: 'Unable to load the selected group.' });
      return;
    }

    setForm({
      name: selected.name ?? '',
      parentId: selected.parentId ? String(selected.parentId) : ''
    });
    setModal({ mode: 'edit', targetId: groupId });
  };

  const openDelete = (groupId) => {
    setModal({ mode: 'delete', targetId: groupId });
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const submitCreate = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setStatus({ type: 'error', message: 'Group name is required.' });
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: form.name,
          parentId: form.parentId ? Number.parseInt(form.parentId, 10) : null
        })
      });

      if (!response.ok) {
        const message = await buildErrorMessage(response, 'Group creation failed.');
        throw new Error(message);
      }

      const payload = await response.json();
      if (payload?.group) {
        await refreshGroups();
      }

      setStatus({ type: 'success', message: payload?.message ?? 'Group created successfully.' });
      closeModal();
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Group creation failed.' });
      setSaving(false);
    }
  };

  const submitEdit = async (event) => {
    event.preventDefault();

    if (!modal.targetId) {
      setStatus({ type: 'error', message: 'Select a group before saving changes.' });
      return;
    }

    if (!form.name.trim()) {
      setStatus({ type: 'error', message: 'Group name is required.' });
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/groups/${modal.targetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: form.name,
          parentId: form.parentId ? Number.parseInt(form.parentId, 10) : ''
        })
      });

      if (!response.ok) {
        const message = await buildErrorMessage(response, 'Group update failed.');
        throw new Error(message);
      }

      const payload = await response.json();
      if (payload?.group) {
        await refreshGroups();
      }

      setStatus({ type: 'success', message: payload?.message ?? 'Group updated successfully.' });
      closeModal();
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Group update failed.' });
      setSaving(false);
    }
  };

  const submitDelete = async () => {
    if (!modal.targetId) {
      setStatus({ type: 'error', message: 'Select a group before deleting it.' });
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/groups/${modal.targetId}`, {
        method: 'DELETE'
      });

      if (response.status !== 204) {
        const message = await buildErrorMessage(response, 'Group deletion failed.');
        throw new Error(message);
      }

      await refreshGroups();
      setStatus({ type: 'success', message: 'Group deleted successfully.' });
      closeModal();
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Group deletion failed.' });
      setSaving(false);
    }
  };

  if (!user) {
    return null;
  }

  if (!canManageGroups) {
    return (
      <section className="card">
        <h1>Mik-Groups</h1>
        <p className="muted">You do not have permission to manage Mik-Groups.</p>
      </section>
    );
  }

  const parentOptions = useMemo(() => {
    return groups
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((group) => ({ value: String(group.id), label: group.name }));
  }, [groups]);

  const renderModal = () => {
    if (!modal.mode) {
      return null;
    }

    if (modal.mode === 'view') {
      const selected = groups.find((group) => group.id === modal.targetId);
      if (!selected) {
        return null;
      }

      const parentName = selected.parentId
        ? groups.find((group) => group.id === selected.parentId)?.name || '—'
        : '—';

      return (
        <Modal title="Group details" onClose={closeModal}>
          <dl className="detail-list">
            <div>
              <dt>Name</dt>
              <dd>{selected.name}</dd>
            </div>
            <div>
              <dt>Parent</dt>
              <dd>{parentName}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{formatDateTime(selected.createdAt) || '—'}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{formatDateTime(selected.updatedAt) || '—'}</dd>
            </div>
          </dl>
        </Modal>
      );
    }

    if (modal.mode === 'create') {
      const parentName = modal.targetId
        ? groups.find((group) => group.id === modal.targetId)?.name || 'Mik-Group Root'
        : 'Mik-Group Root';

      return (
        <Modal
          title="Create group"
          description={`Nest a new Mik-Group under ${parentName}. Use groups to organise routers by site or business unit.`}
          onClose={closeModal}
        >
          <form className="management-form" onSubmit={submitCreate}>
            <label>
              <span>Group name</span>
              <input name="name" value={form.name} onChange={handleFieldChange} required />
            </label>
            <label>
              <span>Parent group</span>
              <select name="parentId" value={form.parentId} onChange={handleFieldChange}>
                <option value="">No parent (top-level)</option>
                {parentOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="management-form__actions">
              <button type="button" className="ghost-button" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="primary-button" disabled={saving}>
                {saving ? 'Creating…' : 'Create group'}
              </button>
            </div>
          </form>
        </Modal>
      );
    }

    if (modal.mode === 'edit') {
      const target = groups.find((group) => group.id === modal.targetId);
      const isRoot = target ? !target.parentId : false;

      return (
        <Modal
          title="Edit group"
          description="Rename the Mik-Group or move it beneath a different parent to keep your hierarchy tidy."
          onClose={closeModal}
        >
          <form className="management-form" onSubmit={submitEdit}>
            <label>
              <span>Group name</span>
              <input name="name" value={form.name} onChange={handleFieldChange} required />
            </label>
            <label>
              <span>Parent group</span>
              <select name="parentId" value={form.parentId} onChange={handleFieldChange} disabled={isRoot}>
                <option value="">No parent (top-level)</option>
                {parentOptions
                  .filter((option) => Number.parseInt(option.value, 10) !== modal.targetId)
                  .map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
              </select>
            </label>
            {isRoot ? <p className="muted">The root Mik-Group cannot be reassigned.</p> : null}
            <div className="management-form__actions">
              <button type="button" className="ghost-button" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="primary-button" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </Modal>
      );
    }

    if (modal.mode === 'delete') {
      const target = groups.find((group) => group.id === modal.targetId);
      const isRoot = target ? !target.parentId : false;
      const hasChildren = target ? groups.some((entry) => entry.parentId === target.id) : false;

      return (
        <Modal title="Delete group" onClose={closeModal}>
          {isRoot ? (
            <p>The root Mik-Group cannot be deleted.</p>
          ) : (
            <>
              <p>
                Are you sure you want to delete <strong>{target?.name ?? 'this group'}</strong>? Any nested groups must be
                removed or reassigned first.
              </p>
              {hasChildren ? (
                <p className="muted">
                  This group currently has child entries. Move them before deleting to avoid data loss.
                </p>
              ) : null}
              <div className="modal-footer">
                <button type="button" className="ghost-button" onClick={closeModal} disabled={saving}>
                  Cancel
                </button>
                <button type="button" className="danger-button" onClick={submitDelete} disabled={saving || hasChildren}>
                  {saving ? 'Removing…' : 'Delete group'}
                </button>
              </div>
            </>
          )}
        </Modal>
      );
    }

    return null;
  };

  return (
    <div className="dashboard">
      <div className="management-toolbar">
        <div className="management-toolbar__title">
          <h1>Mik-Groups</h1>
          <p>Design a clean hierarchy for sites and teams so Mikrotik inventory is effortless to navigate.</p>
        </div>
        <div className="management-toolbar__actions">
          <button type="button" className="primary-button" onClick={() => openCreate()} disabled={loading}>
            Add group
          </button>
        </div>
      </div>

      {status.message ? (
        <div className={`alert ${status.type === 'error' ? 'alert-error' : 'alert-success'}`}>{status.message}</div>
      ) : null}

      {flattenedGroups.length === 0 ? (
        <div className="management-empty">No Mik-Groups exist yet. Start by creating the root categories you need.</div>
      ) : (
        <div className="management-list">
          {flattenedGroups.map((group) => {
            const parentName = group.parentId
              ? groups.find((entry) => entry.id === group.parentId)?.name || '—'
              : 'Mik-Group Root';
            const disableDelete = !group.parentId;

            return (
              <article
                key={group.id}
                className="management-item"
                style={{ '--depth': `${group.depth ?? 0}` }}
              >
                <header className="management-item__header">
                  <h2 className="management-item__title">{group.name}</h2>
                  <div className="management-item__meta">
                    <span>
                      <strong>ID:</strong> {group.id}
                    </span>
                    <span>
                      <strong>Parent:</strong> {parentName}
                    </span>
                    <span>
                      <strong>Created:</strong> {formatDateTime(group.createdAt) || '—'}
                    </span>
                  </div>
                </header>
                <div className="management-item__body">
                  <div className="group-tree" style={{ '--depth': `${group.depth ?? 0}` }}>
                    <div className="group-tree__node" style={{ '--depth': `${group.depth ?? 0}` }}>
                      <span className="group-tree__label">{group.name}</span>
                      <span className="group-tree__meta">
                        Depth {group.depth} · {group.children?.length ?? 0} direct children
                      </span>
                    </div>
                  </div>
                </div>
                <div className="management-item__actions">
                  <button type="button" className="ghost-button" onClick={() => openView(group.id)}>
                    View
                  </button>
                  <button type="button" className="secondary-button" onClick={() => openEdit(group.id)}>
                    Edit
                  </button>
                  <button type="button" className="secondary-button" onClick={() => openCreate(group.id)}>
                    Add child
                  </button>
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => openDelete(group.id)}
                    disabled={disableDelete}
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {renderModal()}
    </div>
  );
};

export default Groups;
