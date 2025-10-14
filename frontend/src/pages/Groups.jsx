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
  if (!Array.isArray(nodes) || targetId == null) {
    return null;
  }

  for (const node of nodes) {
    if (!node) {
      continue;
    }

    if (node.id === targetId) {
      return node;
    }

    const match = findNodeById(node.children ?? [], targetId);
    if (match) {
      return match;
    }
  }

  return null;
};

const collectDescendantIds = (node) => {
  const ids = new Set();

  if (!node || !Array.isArray(node.children) || node.children.length === 0) {
    return ids;
  }

  const stack = [...node.children];

  while (stack.length > 0) {
    const current = stack.pop();

    if (!current) {
      continue;
    }

    ids.add(current.id);

    if (Array.isArray(current.children) && current.children.length > 0) {
      stack.push(...current.children);
    }
  }

  return ids;
};

const filterTreeByQuery = (nodes, query) => {
  if (!Array.isArray(nodes)) {
    return [];
  }

  const trimmed = query.trim().toLowerCase();

  if (!trimmed) {
    return nodes;
  }

  return nodes
    .map((node) => {
      if (!node) {
        return null;
      }

      const children = filterTreeByQuery(node.children ?? [], query);
      const name = (node.name ?? '').toLowerCase();

      if (name.includes(trimmed) || children.length > 0) {
        return { ...node, children };
      }

      return null;
    })
    .filter(Boolean);
};

const countDescendants = (node) => {
  if (!node || !Array.isArray(node.children) || node.children.length === 0) {
    return 0;
  }

  return node.children.reduce((total, child) => total + 1 + countDescendants(child), 0);
};

const indentLabel = (name, depth) => {
  if (!depth) {
    return name;
  }

  const prefix = `${' '.repeat(depth * 2)}↳ `;
  return `${prefix}${name}`;
};

const Groups = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [tree, setTree] = useState([]);
  const [ordered, setOrdered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [filter, setFilter] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyGroupForm);
  const [createBusy, setCreateBusy] = useState(false);
  const [manageState, setManageState] = useState({ open: false, groupId: null, form: emptyGroupForm });
  const [manageBusy, setManageBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const applyPayload = (payload) => {
    const nextGroups = Array.isArray(payload?.groups) ? payload.groups : [];
    const nextTree = Array.isArray(payload?.tree) ? payload.tree : [];
    const nextOrdered = Array.isArray(payload?.ordered) ? payload.ordered : [];

    setGroups(nextGroups);
    setTree(nextTree);
    setOrdered(nextOrdered);
    setSelectedId((current) => {
      if (current && nextOrdered.some((entry) => entry.id === current)) {
        return current;
      }

      const rootEntry = nextOrdered.find((entry) => entry.name === 'Mik-Group Root');
      if (rootEntry) {
        return rootEntry.id;
      }

      return nextOrdered.length > 0 ? nextOrdered[0].id : null;
    });
  };

  const fetchGroups = async (signal) => {
    const response = await fetch('/api/groups', signal ? { signal } : undefined);
    if (!response.ok) {
      throw new Error('Unable to load groups.');
    }

    return response.json();
  };

  const refreshGroups = async () => {
    try {
      const payload = await fetchGroups();
      applyPayload(payload);
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Unable to refresh groups right now.'
      });
    }
  };

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
        const payload = await fetchGroups(controller.signal);
        applyPayload(payload);
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

  const groupLookup = useMemo(() => {
    const map = new Map();
    groups.forEach((group) => {
      if (group) {
        map.set(group.id, group);
      }
    });
    return map;
  }, [groups]);

  const selectedGroup = selectedId ? groupLookup.get(selectedId) ?? null : null;
  const selectedNode = useMemo(() => findNodeById(tree, selectedId), [tree, selectedId]);
  const filteredTree = useMemo(() => filterTreeByQuery(tree, filter), [tree, filter]);
  const selectedDescendants = useMemo(() => countDescendants(selectedNode), [selectedNode]);
  const selectedChildrenCount = selectedNode?.children?.length ?? 0;
  const canDeleteSelectedGroup = useMemo(() => {
    if (!selectedGroup) {
      return false;
    }

    if (selectedGroup.name === 'Mik-Group Root') {
      return false;
    }

    return selectedChildrenCount === 0;
  }, [selectedChildrenCount, selectedGroup]);

  const managedNode = useMemo(
    () => (manageState.open ? findNodeById(tree, manageState.groupId) : null),
    [manageState.groupId, manageState.open, tree]
  );

  const invalidParentIds = useMemo(() => {
    if (!manageState.open || !manageState.groupId) {
      return new Set();
    }

    const ids = collectDescendantIds(managedNode);
    ids.add(manageState.groupId);
    return ids;
  }, [manageState.groupId, manageState.open, managedNode]);

  const parentOptionsForManage = useMemo(() => {
    if (!Array.isArray(ordered)) {
      return [];
    }

    if (!manageState.open || !manageState.groupId) {
      return ordered;
    }

    return ordered.filter((entry) => !invalidParentIds.has(entry.id));
  }, [invalidParentIds, manageState.groupId, manageState.open, ordered]);

  const parentOptionsForCreate = useMemo(() => (Array.isArray(ordered) ? ordered : []), [ordered]);

  const selectedParentName = selectedGroup?.parentId
    ? groupLookup.get(selectedGroup.parentId)?.name ?? '—'
    : 'Root level';

  const canDeleteManagedGroup = useMemo(() => {
    if (!manageState.groupId) {
      return false;
    }

    const group = groupLookup.get(manageState.groupId);
    if (!group || group.name === 'Mik-Group Root') {
      return false;
    }

    return (managedNode?.children?.length ?? 0) === 0;
  }, [groupLookup, manageState.groupId, managedNode]);

  const handleSelectGroup = (groupId) => {
    setSelectedId(groupId);
  };

  const openCreateModal = (parentId = '') => {
    setCreateForm({ name: '', parentId: parentId ? String(parentId) : '' });
    setCreateOpen(true);
    setStatus({ type: '', message: '' });
  };

  const openManageModal = (group) => {
    setManageState({
      open: true,
      groupId: group.id,
      form: {
        name: group.name ?? '',
        parentId: group.parentId ? String(group.parentId) : ''
      }
    });
    setStatus({ type: '', message: '' });
  };

  const closeManageModal = () => {
    setManageState({ open: false, groupId: null, form: emptyGroupForm });
    setManageBusy(false);
    setDeleteBusy(false);
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

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: createForm.name,
          parentId: createForm.parentId !== '' ? createForm.parentId : null
        })
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = payload?.message || 'Unable to create the group.';
        throw new Error(message);
      }

      setStatus({ type: 'success', message: payload?.message || 'Group created successfully.' });
      setCreateOpen(false);
      setCreateForm(emptyGroupForm);
      if (payload?.group?.id) {
        setSelectedId(payload.group.id);
      }
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

    try {
      const response = await fetch(`/api/groups/${manageState.groupId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: manageState.form.name,
          parentId: manageState.form.parentId !== '' ? manageState.form.parentId : null
        })
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = payload?.message || 'Unable to update the group.';
        throw new Error(message);
      }

      setStatus({ type: 'success', message: payload?.message || 'Group updated successfully.' });
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

    const targetId = manageState.groupId;
    const fallbackParentId = groupLookup.get(targetId)?.parentId ?? null;

    setDeleteBusy(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch(`/api/groups/${targetId}`, {
        method: 'DELETE'
      });

      let payload = {};
      if (response.status !== 204) {
        payload = await response.json().catch(() => ({}));
      }

      if (!response.ok) {
        const message = payload?.message || 'Unable to delete the group.';
        throw new Error(message);
      }

      setStatus({ type: 'success', message: payload?.message || 'Group removed successfully.' });
      setSelectedId((current) => (current === targetId ? fallbackParentId : current));
      closeManageModal();
      await refreshGroups();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setDeleteBusy(false);
    }
  };

  const renderTree = (nodes, depth = 0) => {
    if (!Array.isArray(nodes) || nodes.length === 0) {
      return null;
    }

    return (
      <ul className="group-tree__list">
        {nodes.map((node) => (
          <li key={node.id} className="group-tree__item">
            <button
              type="button"
              className={`group-tree__button${selectedId === node.id ? ' is-active' : ''}`}
              onClick={() => handleSelectGroup(node.id)}
              style={{ '--depth': depth }}
            >
              <span className="group-tree__name">{node.name}</span>
              {Array.isArray(node.children) && node.children.length > 0 ? (
                <span className="group-tree__badge" aria-label={`${node.children.length} child groups`}>
                  {node.children.length}
                </span>
              ) : null}
            </button>
            {renderTree(node.children ?? [], depth + 1)}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div>
      <div className="page-header">
        <h1>Mik-Group management</h1>
        <p className="page-header__subtitle">
          Organise MikroTik devices into clear, hierarchical groups and keep the structure easy to scan.
        </p>
      </div>

      {status.message ? <div className={`page-status page-status--${status.type}`}>{status.message}</div> : null}

      {loading ? (
        <p>Loading groups…</p>
      ) : (
        <div className="group-layout">
          <section className="group-tree" aria-label="Group hierarchy">
            <div className="group-tree__header">
              <h2>Hierarchy</h2>
              <button type="button" className="secondary-button" onClick={() => openCreateModal('')}>
                Add root group
              </button>
            </div>
            <input
              type="search"
              className="group-tree__filter"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Search groups"
              aria-label="Search groups"
            />
            <div className="group-tree__body" role="tree">
              {filteredTree.length > 0 ? (
                renderTree(filteredTree)
              ) : (
                <p className="empty-hint">No groups match your search.</p>
              )}
            </div>
          </section>

          <section className="group-details" aria-live="polite">
            {selectedGroup ? (
              <>
                <header className="group-details__header">
                  <div>
                    <h2>{selectedGroup.name}</h2>
                    <p className="muted">{selectedParentName}</p>
                  </div>
                  <div className="group-details__actions">
                    <button
                      type="button"
                      className="action-button"
                      onClick={() => openManageModal(selectedGroup)}
                    >
                      Edit group
                    </button>
                    <button
                      type="button"
                      className="action-button action-button--primary"
                      onClick={() => openCreateModal(selectedGroup.id)}
                    >
                      Add subgroup
                    </button>
                  </div>
                </header>

                <dl className="group-details__stats">
                  <div>
                    <dt>Direct children</dt>
                    <dd>{selectedChildrenCount}</dd>
                  </div>
                  <div>
                    <dt>Total descendants</dt>
                    <dd>{selectedDescendants}</dd>
                  </div>
                  <div>
                    <dt>Created</dt>
                    <dd>{formatDateTime(selectedGroup.createdAt)}</dd>
                  </div>
                  <div>
                    <dt>Last updated</dt>
                    <dd>{formatDateTime(selectedGroup.updatedAt)}</dd>
                  </div>
                </dl>

                <p className="group-details__hint">
                  Use subgroups to mirror your MikroTik topology or customer boundaries. Keep group names short
                  so they remain scannable in the hierarchy panel.
                </p>

                {!canDeleteSelectedGroup && selectedGroup.name !== 'Mik-Group Root' && selectedChildrenCount > 0 ? (
                  <p className="group-details__warning">
                    Remove or move the {selectedChildrenCount === 1 ? 'child group' : 'child groups'} before deleting
                    this group.
                  </p>
                ) : null}
              </>
            ) : (
              <div className="group-details__empty">
                <h2>Select a group</h2>
                <p className="muted">Choose a group from the hierarchy to see its details and available actions.</p>
              </div>
            )}
          </section>
        </div>
      )}

      {createOpen ? (
        <Modal
          title="Add group"
          description="Create a Mik-Group to organise your MikroTik inventory."
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
                {createBusy ? 'Saving…' : 'Save group'}
              </button>
            </>
          }
        >
          <form id="create-group-form" onSubmit={handleCreateGroup} className="form-grid">
            <label className="wide">
              <span>Group name</span>
              <input
                name="name"
                value={createForm.name}
                onChange={handleCreateFieldChange}
                placeholder="e.g. Data centre, Customer, Region"
                required
              />
            </label>
            <label className="wide">
              <span>Parent group</span>
              <select name="parentId" value={createForm.parentId} onChange={handleCreateFieldChange}>
                <option value="">No parent (root level)</option>
                {parentOptionsForCreate.map((option) => (
                  <option key={option.id} value={option.id}>
                    {indentLabel(option.name, option.depth)}
                  </option>
                ))}
              </select>
            </label>
          </form>
        </Modal>
      ) : null}

      {manageState.open ? (
        <Modal
          title="Edit group"
          description="Rename the group or move it to a different parent."
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
                disabled={!canDeleteManagedGroup || deleteBusy}
              >
                {deleteBusy ? 'Removing…' : 'Delete group'}
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
            <label className="wide">
              <span>Group name</span>
              <input
                name="name"
                value={manageState.form.name}
                onChange={handleManageFieldChange}
                required
              />
            </label>
            <label className="wide">
              <span>Parent group</span>
              <select name="parentId" value={manageState.form.parentId} onChange={handleManageFieldChange}>
                <option value="">No parent (root level)</option>
                {parentOptionsForManage.map((option) => (
                  <option key={option.id} value={option.id}>
                    {indentLabel(option.name, option.depth)}
                  </option>
                ))}
              </select>
            </label>
            {!canDeleteManagedGroup ? (
              <p className="group-details__warning">
                Move child groups elsewhere before deleting, and note that Mik-Group Root cannot be removed.
              </p>
            ) : null}
          </form>
        </Modal>
      ) : null}
    </div>
  );
};

export default Groups;
