import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const blankPermissions = () => ({
  dashboard: true,
  users: false,
  roles: false,
  groups: false,
  mikrotiks: false,
  settings: false
});

const permissionLabels = {
  dashboard: 'Dashboard',
  users: 'Users',
  roles: 'Roles',
  groups: 'Mik-Groups',
  mikrotiks: "Mikrotik's",
  settings: 'Settings'
};

const Roles = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState({ mode: null, targetId: null });
  const [draft, setDraft] = useState({ name: '', permissions: blankPermissions() });

  const sortedRoles = useMemo(
    () => roles.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [roles]
  );

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (!user.permissions?.roles) {
      navigate('/dashboard', { replace: true });
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/roles', { signal: controller.signal });

        if (!response.ok) {
          throw new Error('Unable to load roles from the server.');
        }

        const payload = await response.json();
        setRoles(Array.isArray(payload?.roles) ? payload.roles : []);
        setStatus({ type: '', message: '' });
      } catch (error) {
        if (error.name !== 'AbortError') {
          setStatus({
            type: 'error',
            message:
              error.message ||
              'Role management is unavailable right now. Confirm the API is reachable and refresh the page.'
          });
        }
      } finally {
        setLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, [navigate, user]);

  const closeModal = () => {
    setModal({ mode: null, targetId: null });
    setDraft({ name: '', permissions: blankPermissions() });
    setSaving(false);
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

  const openCreate = () => {
    setStatus({ type: '', message: '' });
    setDraft({ name: '', permissions: blankPermissions() });
    setModal({ mode: 'create', targetId: null });
  };

  const openView = (targetId) => {
    setModal({ mode: 'view', targetId });
  };

  const openEdit = (targetId) => {
    const target = roles.find((entry) => entry.id === targetId);
    if (!target) {
      setStatus({ type: 'error', message: 'Unable to load the selected role.' });
      return;
    }

    setDraft({
      name: target.name ?? '',
      permissions: {
        dashboard: Boolean(target.permissions?.dashboard),
        users: Boolean(target.permissions?.users),
        roles: Boolean(target.permissions?.roles),
        groups: Boolean(target.permissions?.groups),
        mikrotiks: Boolean(target.permissions?.mikrotiks),
        settings: Boolean(target.permissions?.settings)
      }
    });
    setModal({ mode: 'edit', targetId });
  };

  const openDelete = (targetId) => {
    setModal({ mode: 'delete', targetId });
  };

  const handleDraftNameChange = (event) => {
    setDraft((current) => ({ ...current, name: event.target.value }));
  };

  const handleDraftPermissionToggle = (event) => {
    const key = event.target.value;
    setDraft((current) => ({
      ...current,
      permissions: {
        ...current.permissions,
        [key]: !current.permissions[key]
      }
    }));
  };

  const submitCreate = async (event) => {
    event.preventDefault();

    if (!draft.name.trim()) {
      setStatus({ type: 'error', message: 'Role name is required.' });
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: draft.name, permissions: draft.permissions })
      });

      if (!response.ok) {
        const message = await buildErrorMessage(response, 'Role creation failed.');
        throw new Error(message);
      }

      const payload = await response.json();
      if (payload?.role) {
        setRoles((current) => [...current, payload.role]);
      }

      setStatus({ type: 'success', message: payload?.message ?? 'Role created successfully.' });
      closeModal();
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Role creation failed.' });
      setSaving(false);
    }
  };

  const submitEdit = async (event) => {
    event.preventDefault();

    if (!modal.targetId) {
      setStatus({ type: 'error', message: 'A role must be selected before saving changes.' });
      return;
    }

    if (!draft.name.trim()) {
      setStatus({ type: 'error', message: 'Role name is required.' });
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/roles/${modal.targetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: draft.name, permissions: draft.permissions })
      });

      if (!response.ok) {
        const message = await buildErrorMessage(response, 'Role update failed.');
        throw new Error(message);
      }

      const payload = await response.json();
      const updated = payload?.role;

      if (updated) {
        setRoles((current) => current.map((role) => (role.id === updated.id ? updated : role)));
      }

      setStatus({ type: 'success', message: payload?.message ?? 'Role updated successfully.' });
      closeModal();
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Role update failed.' });
      setSaving(false);
    }
  };

  const submitDelete = async () => {
    if (!modal.targetId) {
      setStatus({ type: 'error', message: 'A role must be selected before deletion.' });
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/roles/${modal.targetId}`, {
        method: 'DELETE'
      });

      if (response.status !== 204) {
        const message = await buildErrorMessage(response, 'Role deletion failed.');
        throw new Error(message);
      }

      setRoles((current) => current.filter((role) => role.id !== modal.targetId));
      setStatus({ type: 'success', message: 'Role deleted successfully.' });
      closeModal();
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Role deletion failed.' });
      setSaving(false);
    }
  };

  if (!user) {
    return null;
  }

  if (!user.permissions?.roles) {
    return (
      <section className="card">
        <h1>Role management</h1>
        <p className="muted">You do not have permission to view role definitions.</p>
      </section>
    );
  }

  const renderPermissionGrid = (permissions) => (
    <ul className="chip-grid">
      {Object.entries(permissionLabels).map(([key, label]) => (
        <li key={key} className={permissions[key] ? 'chip chip--active' : 'chip'}>
          {label}
        </li>
      ))}
    </ul>
  );

  const renderPermissionChoices = () => (
    <div className="permission-grid">
      {Object.entries(permissionLabels).map(([key, label]) => (
        <label key={key} className="checkbox">
          <input type="checkbox" value={key} checked={draft.permissions[key]} onChange={handleDraftPermissionToggle} />
          <span>{label}</span>
        </label>
      ))}
    </div>
  );

  const renderModal = () => {
    if (!modal.mode) {
      return null;
    }

    if (modal.mode === 'view') {
      const selected = roles.find((entry) => entry.id === modal.targetId);
      if (!selected) {
        return null;
      }

      return (
        <Modal title="Role details" onClose={closeModal}>
          <dl className="detail-list">
            <div>
              <dt>Name</dt>
              <dd>{selected.name}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{selected.createdAt ? new Date(selected.createdAt).toLocaleString() : '—'}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{selected.updatedAt ? new Date(selected.updatedAt).toLocaleString() : '—'}</dd>
            </div>
          </dl>
          <h3>Permissions</h3>
          {renderPermissionGrid(selected.permissions || {})}
        </Modal>
      );
    }

    if (modal.mode === 'create') {
      return (
        <Modal
          title="Create role"
          description="Bundle access scopes so you can assign consistent permissions across multiple operators."
          onClose={closeModal}
        >
          <form className="management-form" onSubmit={submitCreate}>
            <label>
              <span>Role name</span>
              <input value={draft.name} onChange={handleDraftNameChange} required />
            </label>
            <fieldset>
              <legend>Permissions</legend>
              {renderPermissionChoices()}
            </fieldset>
            <div className="management-form__actions">
              <button type="button" className="ghost-button" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="primary-button" disabled={saving}>
                {saving ? 'Creating…' : 'Create role'}
              </button>
            </div>
          </form>
        </Modal>
      );
    }

    if (modal.mode === 'edit') {
      return (
        <Modal
          title="Edit role"
          description="Adjust the permissions this role grants. Changes apply to every user assigned to the role."
          onClose={closeModal}
        >
          <form className="management-form" onSubmit={submitEdit}>
            <label>
              <span>Role name</span>
              <input value={draft.name} onChange={handleDraftNameChange} required />
            </label>
            <fieldset>
              <legend>Permissions</legend>
              {renderPermissionChoices()}
            </fieldset>
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
      const selected = roles.find((entry) => entry.id === modal.targetId);
      const displayName = selected ? selected.name : 'this role';

      return (
        <Modal title="Delete role" onClose={closeModal}>
          <p>
            Are you sure you want to delete <strong>{displayName}</strong>? Any users assigned to this role will lose the
            associated permissions.
          </p>
          <div className="modal-footer">
            <button type="button" className="ghost-button" onClick={closeModal} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="danger-button" onClick={submitDelete} disabled={saving}>
              {saving ? 'Removing…' : 'Delete role'}
            </button>
          </div>
        </Modal>
      );
    }

    return null;
  };

  return (
    <div className="dashboard">
      <div className="management-toolbar">
        <div className="management-toolbar__title">
          <h1>Role management</h1>
          <p>Model least-privilege access by grouping permissions and applying them consistently across the team.</p>
        </div>
        <div className="management-toolbar__actions">
          <button type="button" className="primary-button" onClick={openCreate} disabled={loading}>
            Add role
          </button>
        </div>
      </div>

      {status.message ? (
        <div className={`alert ${status.type === 'error' ? 'alert-error' : 'alert-success'}`}>{status.message}</div>
      ) : null}

      {sortedRoles.length === 0 ? (
        <div className="management-empty">No roles exist yet. Use the Add role button to define your first permission set.</div>
      ) : (
        <div className="management-list">
          {sortedRoles.map((role) => (
            <article key={role.id} className="management-item">
              <header className="management-item__header">
                <h2 className="management-item__title">{role.name}</h2>
                <div className="management-item__meta">
                  <span>
                    <strong>ID:</strong> {role.id}
                  </span>
                  <span>
                    <strong>Created:</strong> {role.createdAt ? new Date(role.createdAt).toLocaleString() : '—'}
                  </span>
                  <span>
                    <strong>Updated:</strong> {role.updatedAt ? new Date(role.updatedAt).toLocaleString() : '—'}
                  </span>
                </div>
              </header>
              <div className="management-item__body">
                <h3>Effective access</h3>
                {renderPermissionGrid(role.permissions || {})}
              </div>
              <div className="management-item__actions">
                <button type="button" className="ghost-button" onClick={() => openView(role.id)}>
                  View
                </button>
                <button type="button" className="secondary-button" onClick={() => openEdit(role.id)}>
                  Edit
                </button>
                <button type="button" className="danger-button" onClick={() => openDelete(role.id)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {renderModal()}
    </div>
  );
};

export default Roles;
