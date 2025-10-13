import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const emptyGroupForm = {
  name: '',
  parentId: ''
};

const formatDateTime = (value) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
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

const collectTreeIds = (nodes) => {
  const ids = new Set();
  const stack = Array.isArray(nodes) ? [...nodes] : [];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current.id !== 'number') {
      continue;
    }

    ids.add(current.id);

    if (Array.isArray(current.children) && current.children.length > 0) {
      stack.push(...current.children);
    }
  }

  return ids;
};

const filterTreeByQuery = (nodes, query, groups) => {
  if (!query) {
    return nodes;
  }

  const lowerQuery = query.toLowerCase();
  const groupLookup = new Map(groups.map((group) => [group.id, group]));

  const visit = (node) => {
    if (!node) {
      return null;
    }

    const name = (node.name ?? '').toLowerCase();
    const parentName = groupLookup.get(node.parentId)?.name?.toLowerCase() ?? '';
    const childMatches = Array.isArray(node.children)
      ? node.children.map(visit).filter(Boolean)
      : [];

    if (name.includes(lowerQuery) || parentName.includes(lowerQuery)) {
      return { ...node, children: childMatches };
    }

    if (childMatches.length > 0) {
      return { ...node, children: childMatches };
    }

    return null;
  };

  return nodes
    .map((node) => visit(node))
    .filter(Boolean);
};

const Groups = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [orderedGroups, setOrderedGroups] = useState([]);
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyGroupForm);
  const [createBusy, setCreateBusy] = useState(false);
  const [manageState, setManageState] = useState({ open: false, groupId: null, form: emptyGroupForm });
  const [manageBusy, setManageBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [filter, setFilter] = useState('');
  const [expandedGroups, setExpandedGroups] = useState(() => new Set());

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (!user.permissions?.groups) {
      navigate('/dashboard', { replace: true });
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/groups', { signal: controller.signal });

        if (!response.ok) {
          throw new Error('Unable to load groups.');
        }

        const payload = await response.json();
        setGroups(Array.isArray(payload?.groups) ? payload.groups : []);
        setOrderedGroups(Array.isArray(payload?.ordered) ? payload.ordered : []);
        setTree(Array.isArray(payload?.tree) ? payload.tree : []);
        setStatus({ type: '', message: '' });
      } catch (error) {
        if (error.name === 'AbortError') {
          return;
        }

        setStatus({
          type: 'error',
          message:
            error.message ||
            'Group management is unavailable right now. Confirm the API is reachable and refresh the page.'
        });
      } finally {
        setLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, [navigate, user]);

  const rootGroupId = useMemo(() => {
    const rootEntry = orderedGroups.find((entry) => entry.name === 'Mik-Group Root');
    return rootEntry ? rootEntry.id : null;
  }, [orderedGroups]);

  const parentOptions = useMemo(() => {
    return orderedGroups.map((entry) => ({
      value: entry.id,
      label: `${'— '.repeat(entry.depth || 0)}${entry.name}`
    }));
  }, [orderedGroups]);

  const query = filter.trim().toLowerCase();
  const filteredTree = useMemo(
    () => filterTreeByQuery(tree, query, groups),
    [tree, query, groups]
  );

  const visibleCount = useMemo(() => collectTreeIds(filteredTree).size, [filteredTree]);

  const availableParentOptions = (groupId) => {
    if (!groupId) {
      return parentOptions;
    }

    const node = findNodeById(tree, groupId);
    const descendants = collectDescendantIds(node);
    const disallowed = new Set([...descendants, groupId]);

    return parentOptions.filter((option) => !disallowed.has(option.value));
  };

  useEffect(() => {
    if (tree.length === 0) {
      return;
    }

    setExpandedGroups((current) => {
      if (current.size > 0) {
        return current;
      }

      const next = new Set();
      if (rootGroupId) {
        next.add(rootGroupId);
      }
      return next;
    });
  }, [tree, rootGroupId]);

  useEffect(() => {
    if (!query) {
      return;
    }

    setExpandedGroups(collectTreeIds(filteredTree));
  }, [query, filteredTree]);

  const toggleGroupExpansion = (groupId) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) {
        if (groupId === rootGroupId) {
          return next;
        }
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const expandAllGroups = () => {
    setExpandedGroups(collectTreeIds(tree));
  };

  const collapseAllGroups = () => {
    const next = new Set();
    if (rootGroupId) {
      next.add(rootGroupId);
    }
    setExpandedGroups(next);
  };

  const renderTree = (nodes, depth = 0) => {
    if (!Array.isArray(nodes) || nodes.length === 0) {
      return null;
    }

    return (
      <ul className="management-tree" role={depth === 0 ? 'tree' : 'group'}>
        {nodes.map((node) => {
          const hasChildren = Array.isArray(node.children) && node.children.length > 0;
          const expanded = expandedGroups.has(node.id) || (query && hasChildren);
          const nodeClasses = ['management-tree__node'];

          if (depth === 0) {
            nodeClasses.push('management-tree__node--root');
          }

          return (
            <li
              key={node.id}
              className={nodeClasses.join(' ')}
              role="treeitem"
              aria-expanded={hasChildren ? expanded : undefined}
              aria-level={depth + 1}
              style={{ '--tree-depth': depth }}
            >
              <div className="management-tree__row">
                {hasChildren ? (
                  <button
                    type="button"
                    className="management-tree__toggle"
                    onClick={() => toggleGroupExpansion(node.id)}
                    aria-expanded={expanded}
                    aria-label={expanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
                  >
                    {expanded ? '−' : '+'}
                  </button>
                ) : (
                  <span className="management-tree__toggle management-tree__toggle--static" aria-hidden="true">
                    ·
                  </span>
                )}
                <div className="management-tree__info">
                  <span className="management-tree__name">{node.name}</span>
                  <div className="management-tree__meta">
                    <span>
                      Parent:{' '}
                      {node.parentId
                        ? groups.find((group) => group.id === node.parentId)?.name || '—'
                        : 'Top-level'}
                    </span>
                    <span>Created: {formatDateTime(node.createdAt)}</span>
                  </div>
                </div>
                <div className="management-list__actions">
                  <button
                    type="button"
                    className="action-button action-button--primary"
                    onClick={() => openManageModal(node)}
                  >
                    Edit
                  </button>
                </div>
              </div>
              {hasChildren && expanded ? (
                <div className="management-tree__children">{renderTree(node.children, depth + 1)}</div>
              ) : null}
            </li>
          );
        })}
      </ul>
    );
  };

  const openCreateModal = () => {
    setCreateForm(emptyGroupForm);
    setCreateOpen(true);
    setStatus({ type: '', message: '' });
  };

  const openManageModal = (groupRecord) => {
    setManageState({
      open: true,
      groupId: groupRecord.id,
      form: {
        name: groupRecord.name ?? '',
        parentId: groupRecord.parentId ?? ''
      }
    });
    setStatus({ type: '', message: '' });
  };

  const closeManageModal = () => {
    setManageState({ open: false, groupId: null, form: emptyGroupForm });
    setManageBusy(false);
    setDeleteBusy(false);
  };

  const refreshGroups = async () => {
    try {
      const response = await fetch('/api/groups');
      if (!response.ok) {
        throw new Error('Unable to refresh groups.');
      }

      const payload = await response.json();
      setGroups(Array.isArray(payload?.groups) ? payload.groups : []);
      setOrderedGroups(Array.isArray(payload?.ordered) ? payload.ordered : []);
      setTree(Array.isArray(payload?.tree) ? payload.tree : []);
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Unable to refresh groups right now.' });
    }
  };

  const handleCreateFieldChange = (event) => {
    const { name, value } = event.target;
    setCreateForm((current) => ({ ...current, [name]: value }));
  };

  const handleManageFieldChange = (event) => {
    const { name, value } = event.target;
    setManageState((current) => ({
      ...current,
      form: {
        ...current.form,
        [name]: value
      }
    }));
  };

  const handleCreateGroup = async (event) => {
    event.preventDefault();
    setCreateBusy(true);
    setStatus({ type: '', message: '' });

    const payload = {
      name: createForm.name,
      parentId: createForm.parentId || null
    };

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = body?.message || 'Unable to create the group.';
        throw new Error(message);
      }

      setStatus({ type: 'success', message: 'Group created successfully.' });
      setCreateOpen(false);
      setCreateForm(emptyGroupForm);
      await refreshGroups();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setCreateBusy(false);
    }
  };

  const handleUpdateGroup = async (event) => {
    event.preventDefault();

    if (!manageState.groupId) {
      return;
    }

    setManageBusy(true);
    setStatus({ type: '', message: '' });

    const payload = {
      name: manageState.form.name,
      parentId: manageState.form.parentId || null
    };

    try {
      const response = await fetch(`/api/groups/${manageState.groupId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = body?.message || 'Unable to update the group.';
        throw new Error(message);
      }

      setStatus({ type: 'success', message: 'Group updated successfully.' });
      closeManageModal();
      await refreshGroups();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setManageBusy(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!manageState.groupId) {
      return;
    }

    setDeleteBusy(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch(`/api/groups/${manageState.groupId}`, {
        method: 'DELETE'
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          body?.message ||
          (response.status === 409
            ? 'This group still has children. Move or remove nested groups before deleting it.'
            : 'Unable to delete the selected group.');
        throw new Error(message);
      }

      setStatus({ type: 'success', message: 'Group removed successfully.' });
      closeManageModal();
      await refreshGroups();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div>
      <div className="management-toolbar management-toolbar--stacked">
        <div>
          <h1>Mik-Groups</h1>
          <p className="management-description">
            Build hierarchical collections to mirror regions, datacenters, or customer environments.
          </p>
        </div>
        <div className="toolbar-actions">
          <input
            type="search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter by name or parent"
            className="toolbar-filter"
          />
          <button type="button" className="action-button action-button--primary" onClick={openCreateModal}>
            Add group
          </button>
        </div>
      </div>

      {status.message ? <div className={`page-status page-status--${status.type}`}>{status.message}</div> : null}

      {loading ? (
        <p>Loading groups…</p>
      ) : visibleCount === 0 ? (
        <p>No groups match the current filters.</p>
      ) : (
        <div>
          <div className="management-tree-controls">
            <div className="toolbar-actions__group">
              <button type="button" className="action-button action-button--ghost" onClick={expandAllGroups}>
                Expand all
              </button>
              <button type="button" className="action-button action-button--ghost" onClick={collapseAllGroups}>
                Collapse all
              </button>
            </div>
          </div>
          {renderTree(filteredTree)}
        </div>
      )}

      {createOpen ? (
        <Modal
          title="Create Mik-Group"
          description="Organise routers and operators by location or responsibility. Nest groups to mirror your topology."
          onClose={() => {
            setCreateOpen(false);
            setCreateBusy(false);
          }}
          actions={
            <>
              <button type="button" className="action-button" onClick={() => setCreateOpen(false)}>
                Cancel
              </button>
              <button
                type="submit"
                form="create-group-form"
                className="action-button action-button--primary"
                disabled={createBusy}
              >
                {createBusy ? 'Saving…' : 'Create group'}
              </button>
            </>
          }
        >
          <form id="create-group-form" onSubmit={handleCreateGroup} className="form-grid">
            <label>
              <span>Group name</span>
              <input name="name" value={createForm.name} onChange={handleCreateFieldChange} required />
            </label>
            <label>
              <span>Parent group</span>
              <select name="parentId" value={createForm.parentId} onChange={handleCreateFieldChange}>
                <option value="">No parent (top-level)</option>
                {parentOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </form>
        </Modal>
      ) : null}

      {manageState.open ? (
        <Modal
          title="Manage Mik-Group"
          description="Rename the group, move it to a different parent, or remove it when it is no longer required."
          onClose={closeManageModal}
          actions={
            <>
              <button type="button" className="action-button" onClick={closeManageModal}>
                Close
              </button>
              <button
                type="button"
                className="action-button action-button--danger"
                onClick={handleDeleteGroup}
                disabled={deleteBusy || manageState.groupId === rootGroupId}
              >
                {manageState.groupId === rootGroupId
                  ? 'Protected'
                  : deleteBusy
                  ? 'Removing…'
                  : 'Delete'}
              </button>
              <button
                type="submit"
                form="manage-group-form"
                className="action-button action-button--primary"
                disabled={manageBusy}
              >
                {manageBusy ? 'Saving…' : 'Save changes'}
              </button>
            </>
          }
        >
          <form id="manage-group-form" onSubmit={handleUpdateGroup} className="form-grid">
            <label>
              <span>Group name</span>
              <input name="name" value={manageState.form.name} onChange={handleManageFieldChange} required />
            </label>
            <label>
              <span>Parent group</span>
              <select name="parentId" value={manageState.form.parentId ?? ''} onChange={handleManageFieldChange}>
                <option value="">No parent (top-level)</option>
                {availableParentOptions(manageState.groupId).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="field-hint">Created {formatDateTime(groups.find((g) => g.id === manageState.groupId)?.createdAt)}</p>
          </form>
        </Modal>
      ) : null}
    </div>
  );
};

export default Groups;
