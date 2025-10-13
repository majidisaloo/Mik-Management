import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const emptyEditForm = {
  name: '',
  parentId: ''
};

const emptyCreateForm = {
  name: '',
  parentId: ''
};

const findNodeById = (nodes, targetId) => {
  for (const node of nodes) {
    if (node.id === targetId) {
      return node;
    }

    if (Array.isArray(node.children) && node.children.length > 0) {
      const match = findNodeById(node.children, targetId);
      if (match) {
        return match;
      }
    }
  }

  return null;
};

const collectDescendantIds = (node) => {
  if (!node || !Array.isArray(node.children)) {
    return new Set();
  }

  const ids = new Set();
  const stack = [...node.children];

  while (stack.length > 0) {
    const current = stack.pop();
    ids.add(current.id);

    if (Array.isArray(current.children) && current.children.length > 0) {
      stack.push(...current.children);
    }
  }

  return ids;
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

const Groups = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [tree, setTree] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

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

    const loadGroups = async () => {
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

        setSelectedGroupId((current) => {
          if (current && loadedGroups.some((group) => group.id === current)) {
            return current;
          }

          if (loadedTree.length > 0) {
            return loadedTree[0].id;
          }

          return null;
        });

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

    loadGroups();

    return () => controller.abort();
  }, [canManageGroups, navigate, user]);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId]
  );

  const selectedNode = useMemo(() => findNodeById(tree, selectedGroupId), [tree, selectedGroupId]);

  const descendantIds = useMemo(() => collectDescendantIds(selectedNode), [selectedNode]);

  const parentOptions = useMemo(() => {
    return groups
      .filter((group) => group.id !== selectedGroupId && !descendantIds.has(group.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [descendantIds, groups, selectedGroupId]);

  const selectableParentsForCreate = useMemo(
    () => groups.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [groups]
  );

  useEffect(() => {
    if (!selectedGroup) {
      setEditForm(emptyEditForm);
      return;
    }

    setEditForm({
      name: selectedGroup.name ?? '',
      parentId: selectedGroup.parentId ? String(selectedGroup.parentId) : ''
    });
  }, [selectedGroup]);

  const handleSelectGroup = (groupId) => {
    setSelectedGroupId(groupId);
    setStatus({ type: '', message: '' });
  };

  const handleEditFieldChange = (event) => {
    const { name, value } = event.target;
    setEditForm((current) => ({ ...current, [name]: value }));
  };

  const handleCreateFieldChange = (event) => {
    const { name, value } = event.target;
    setCreateForm((current) => ({ ...current, [name]: value }));
  };

  const reloadGroups = async (preserveSelection = false) => {
    try {
      const response = await fetch('/api/groups');

      if (!response.ok) {
        throw new Error('Unable to refresh the current Mik-Groups.');
      }

      const payload = await response.json();
      const loadedGroups = Array.isArray(payload?.groups) ? payload.groups : [];
      const loadedTree = Array.isArray(payload?.tree) ? payload.tree : [];

      setGroups(loadedGroups);
      setTree(loadedTree);

      setSelectedGroupId((current) => {
        if (preserveSelection && current && loadedGroups.some((group) => group.id === current)) {
          return current;
        }

        if (loadedTree.length > 0) {
          return loadedTree[0].id;
        }

        return null;
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Unable to refresh the current Mik-Groups.'
      });
    }
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();

    if (!selectedGroupId) {
      setStatus({ type: 'error', message: 'Select a group before saving changes.' });
      return;
    }

    const trimmedName = editForm.name.trim();

    if (!trimmedName) {
      setStatus({ type: 'error', message: 'Enter a name for the Mik-Group before saving.' });
      return;
    }

    setSaving(true);
    setStatus({ type: '', message: '' });

    const payload = {
      name: trimmedName,
      parentId: editForm.parentId === '' ? null : Number.parseInt(editForm.parentId, 10)
    };

    try {
      const response = await fetch(`/api/groups/${selectedGroupId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type') ?? '';
        let message = 'Group update failed.';

        if (response.status === 502) {
          message = 'Mik-Group updates are unavailable (502 Bad Gateway). Confirm the backend service is online.';
        }

        if (response.status >= 500 && response.status !== 502) {
          message = `The server returned an error (${response.status}). Please retry.`;
        }

        if (contentType.includes('application/json')) {
          const errorPayload = await response.json().catch(() => ({}));
          if (errorPayload?.message) {
            message = errorPayload.message;
          }
        } else {
          const fallbackText = await response.text().catch(() => '');
          if (fallbackText) {
            message = fallbackText;
          }
        }

        throw new Error(message);
      }

      const responsePayload = await response.json();
      await reloadGroups(true);
      setStatus({ type: 'success', message: responsePayload?.message ?? 'Group updated successfully.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Group update failed.' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSubmit = async (event) => {
    event.preventDefault();

    const trimmedName = createForm.name.trim();

    if (!trimmedName) {
      setStatus({ type: 'error', message: 'Enter a name for the new Mik-Group.' });
      return;
    }

    setCreating(true);
    setStatus({ type: '', message: '' });

    const payload = {
      name: trimmedName,
      parentId: createForm.parentId === '' ? null : Number.parseInt(createForm.parentId, 10)
    };

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type') ?? '';
        let message = 'Group creation failed.';

        if (response.status === 502) {
          message = 'Mik-Group creation is unavailable (502 Bad Gateway). Confirm the backend service is online.';
        }

        if (response.status >= 500 && response.status !== 502) {
          message = `The server returned an error (${response.status}). Please retry.`;
        }

        if (contentType.includes('application/json')) {
          const errorPayload = await response.json().catch(() => ({}));
          if (errorPayload?.message) {
            message = errorPayload.message;
          }
        } else {
          const fallbackText = await response.text().catch(() => '');
          if (fallbackText) {
            message = fallbackText;
          }
        }

        throw new Error(message);
      }

      const responsePayload = await response.json();
      await reloadGroups(true);
      setCreateForm(emptyCreateForm);
      setStatus({ type: 'success', message: responsePayload?.message ?? 'Group created successfully.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Group creation failed.' });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroupId) {
      return;
    }

    setDeleting(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch(`/api/groups/${selectedGroupId}`, {
        method: 'DELETE'
      });

      if (response.status === 204) {
        await reloadGroups(false);
        setStatus({ type: 'success', message: 'Group deleted successfully.' });
        return;
      }

      const contentType = response.headers.get('content-type') ?? '';
      let message = 'Group deletion failed.';

      if (response.status === 409) {
        message = 'Reassign or remove child groups before deleting this Mik-Group.';
      }

      if (contentType.includes('application/json')) {
        const payload = await response.json().catch(() => ({}));
        if (payload?.message) {
          message = payload.message;
        }
      } else {
        const fallbackText = await response.text().catch(() => '');
        if (fallbackText) {
          message = fallbackText;
        }
      }

      throw new Error(message);
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Group deletion failed.' });
    } finally {
      setDeleting(false);
    }
  };

  const renderTree = (nodes) => {
    if (!Array.isArray(nodes) || nodes.length === 0) {
      return <p className="muted small">No Mik-Groups have been configured.</p>;
    }

    return (
      <ul className="group-tree__list">
        {nodes.map((node) => (
          <li key={node.id}>
            <button
              type="button"
              className={`group-tree__item${node.id === selectedGroupId ? ' group-tree__item--active' : ''}`}
              onClick={() => handleSelectGroup(node.id)}
            >
              <span>{node.name}</span>
              {Array.isArray(node.children) && node.children.length > 0 ? (
                <span className="group-tree__count">{node.children.length}</span>
              ) : null}
            </button>
            {Array.isArray(node.children) && node.children.length > 0 ? renderTree(node.children) : null}
          </li>
        ))}
      </ul>
    );
  };

  if (!user || !canManageGroups) {
    return null;
  }

  const isRootGroup = selectedGroup?.parentId === null;
  const hasChildGroups = Boolean(selectedNode?.children && selectedNode.children.length > 0);
  const canDeleteSelected = Boolean(selectedGroupId) && !isRootGroup && !hasChildGroups;

  return (
    <div className="dashboard">
      <section className="card">
        <header className="card-header">
          <div>
            <h1>Mik-Group directory</h1>
            <p className="card-intro">
              Model your organisation with nested Mik-Groups. Place departments inside parent groups to reflect reporting
              structure and simplify user access management.
            </p>
          </div>
        </header>
        <div className="group-management">
          <aside className="group-tree" aria-label="Mik-Group hierarchy">
            <h2>Hierarchy</h2>
            {renderTree(tree)}
          </aside>
          <div className="group-editor">
            <form className="group-editor__form" onSubmit={handleEditSubmit}>
              <h2>Update group</h2>
              {!selectedGroup ? (
                <p className="muted">Select a Mik-Group from the hierarchy to edit its details.</p>
              ) : (
                <>
                  <label className="wide">
                    <span>Group name</span>
                    <input
                      name="name"
                      value={editForm.name}
                      onChange={handleEditFieldChange}
                      required
                    />
                  </label>
                  <label className="wide">
                    <span>Parent group</span>
                    <select
                      name="parentId"
                      value={editForm.parentId}
                      onChange={handleEditFieldChange}
                      disabled={isRootGroup}
                    >
                      <option value="">No parent (top-level)</option>
                      {parentOptions.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                    {isRootGroup ? (
                      <span className="muted small">The root Mik-Group cannot be nested inside another group.</span>
                    ) : null}
                  </label>
                  <div className="group-metadata">
                    <p>
                      Created
                      <br />
                      <time dateTime={selectedGroup.createdAt}>{formatDateTime(selectedGroup.createdAt)}</time>
                    </p>
                    <p>
                      Last updated
                      <br />
                      <time dateTime={selectedGroup.updatedAt}>{formatDateTime(selectedGroup.updatedAt)}</time>
                    </p>
                  </div>
                  <div className="button-row">
                    <button type="submit" className="primary-button" disabled={saving}>
                      {saving ? 'Saving…' : 'Save changes'}
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={handleDeleteGroup}
                      disabled={!canDeleteSelected || deleting}
                    >
                      {deleting ? 'Removing…' : 'Delete group'}
                    </button>
                  </div>
                  {!canDeleteSelected && !isRootGroup && hasChildGroups ? (
                    <p className="muted small">Detach child groups before deleting this entry.</p>
                  ) : null}
                  {isRootGroup ? (
                    <p className="muted small">Rename the root as needed, but it will always remain the top-level group.</p>
                  ) : null}
                </>
              )}
            </form>
            <form className="group-editor__form" onSubmit={handleCreateSubmit}>
              <h2>Create new group</h2>
              <label className="wide">
                <span>Group name</span>
                <input
                  name="name"
                  value={createForm.name}
                  onChange={handleCreateFieldChange}
                  placeholder="e.g. Sales Team"
                  required
                />
              </label>
              <label className="wide">
                <span>Parent group</span>
                <select name="parentId" value={createForm.parentId} onChange={handleCreateFieldChange}>
                  <option value="">No parent (top-level)</option>
                  {selectableParentsForCreate.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="button-row">
                <button type="submit" className="secondary-button" disabled={creating}>
                  {creating ? 'Creating…' : 'Create group'}
                </button>
              </div>
            </form>
          </div>
        </div>
        {loading && <p className="feedback muted">Loading Mik-Groups…</p>}
        {status.message && (
          <p className={`feedback ${status.type === 'error' ? 'error' : 'success'}`}>{status.message}</p>
        )}
      </section>
    </div>
  );
};

export default Groups;
