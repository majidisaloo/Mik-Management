import { useCallback, useEffect, useMemo, useState } from 'react';
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

const flattenTreeIds = (nodes, target = []) => {
  if (!Array.isArray(nodes)) {
    return target;
  }

  for (const node of nodes) {
    if (!node) {
      continue;
    }

    target.push(node.id);

    if (Array.isArray(node.children) && node.children.length > 0) {
      flattenTreeIds(node.children, target);
    }
  }

  return target;
};

const filterTreeByQuery = (nodes, query, lookup) => {
  if (!Array.isArray(nodes)) {
    return [];
  }

  if (!query) {
    return nodes;
  }

  const loweredQuery = query.toLowerCase();

  return nodes
    .map((node) => {
      if (!node) {
        return null;
      }

      const children = filterTreeByQuery(node.children ?? [], query, lookup);
      const name = (node.name ?? '').toLowerCase();
      const parentName = node.parentId ? (lookup.get(node.parentId)?.name ?? '').toLowerCase() : '';
      const matches = name.includes(loweredQuery) || parentName.includes(loweredQuery);

      if (matches || children.length > 0) {
        return { ...node, children };
      }

      return null;
    })
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
  const [expandedNodes, setExpandedNodes] = useState(() => new Set());
  const [selectedGroupId, setSelectedGroupId] = useState(null);

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

  const groupLookup = useMemo(() => {
    const map = new Map();
    groups.forEach((group) => {
      if (group) {
        map.set(group.id, group);
      }
    });
    return map;
  }, [groups]);

  const childCountMap = useMemo(() => {
    const counts = new Map();

    groups.forEach((group) => {
      if (group?.parentId) {
        counts.set(group.parentId, (counts.get(group.parentId) ?? 0) + 1);
      }
    });

    return counts;
  }, [groups]);

  const query = filter.trim().toLowerCase();

  const filteredTree = useMemo(() => filterTreeByQuery(tree, query, groupLookup), [tree, query, groupLookup]);
  const allTreeIds = useMemo(() => flattenTreeIds(tree, []), [tree]);
  const filteredTreeIds = useMemo(() => flattenTreeIds(filteredTree, []), [filteredTree]);
  const topLevelIds = useMemo(() => tree.map((entry) => entry.id), [tree]);

  useEffect(() => {
    if (!tree.length) {
      setExpandedNodes(new Set());
      return;
    }

    setExpandedNodes((current) => {
      const next = new Set(current);

      if (next.size === 0) {
        tree.forEach((node) => {
          if (node) {
            next.add(node.id);
          }
        });
      } else {
        tree.forEach((node) => {
          if (node && !next.has(node.id)) {
            next.add(node.id);
          }
        });
      }

      return next;
    });
  }, [tree]);

  const toggleNode = useCallback((groupId) => {
    setExpandedNodes((current) => {
      const next = new Set(current);

      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }

      return next;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    const ids = query ? filteredTreeIds : allTreeIds;
    setExpandedNodes(new Set(ids));
  }, [allTreeIds, filteredTreeIds, query]);

  const handleCollapseAll = useCallback(() => {
    setExpandedNodes(new Set(topLevelIds));
  }, [topLevelIds]);

  const parentOptions = useMemo(() => {
    return orderedGroups.map((entry) => ({
      value: entry.id,
      label: `${'— '.repeat(entry.depth || 0)}${entry.name}`
    }));
  }, [orderedGroups]);

  const availableParentOptions = (groupId) => {
    if (!groupId) {
      return parentOptions;
    }

    const node = findNodeById(tree, groupId);
    const descendants = collectDescendantIds(node);
    const disallowed = new Set([...descendants, groupId]);

    return parentOptions.filter((option) => !disallowed.has(option.value));
  };

  const openCreateModal = (parentId = '') => {
    setCreateForm({ name: '', parentId: parentId || '' });
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

  useEffect(() => {
    if (!selectedGroupId && rootGroupId) {
      setSelectedGroupId(rootGroupId);
    }
  }, [rootGroupId, selectedGroupId]);

  useEffect(() => {
    if (selectedGroupId && !groupLookup.has(selectedGroupId)) {
      if (rootGroupId) {
        setSelectedGroupId(rootGroupId);
      } else if (orderedGroups.length > 0) {
        setSelectedGroupId(orderedGroups[0].id);
      } else {
        setSelectedGroupId(null);
      }
    }
  }, [groupLookup, orderedGroups, rootGroupId, selectedGroupId]);

  useEffect(() => {
    if (!filteredTreeIds.length) {
      return;
    }

    if (!selectedGroupId || !filteredTreeIds.includes(selectedGroupId)) {
      setSelectedGroupId(filteredTreeIds[0]);
    }
  }, [filteredTreeIds, selectedGroupId]);

  useEffect(() => {
    if (!loading && filteredTreeIds.length === 0) {
      setSelectedGroupId(null);
    }
  }, [filteredTreeIds, loading]);

  const selectedGroup = useMemo(() => (selectedGroupId ? groupLookup.get(selectedGroupId) ?? null : null), [
    selectedGroupId,
    groupLookup
  ]);

  const selectedTreeNode = useMemo(() => findNodeById(tree, selectedGroupId), [tree, selectedGroupId]);

  const descendantCount = useMemo(() => {
    if (!selectedTreeNode) {
      return 0;
    }

    return collectDescendantIds(selectedTreeNode).size;
  }, [selectedTreeNode]);

  const directChildren = useMemo(
    () => groups.filter((group) => group.parentId === (selectedGroup ? selectedGroup.id : null)),
    [groups, selectedGroup]
  );

  const selectedBreadcrumb = useMemo(() => {
    if (!selectedGroup) {
      return [];
    }

    const chain = [];
    let current = selectedGroup;
    const guard = new Set();

    while (current && !guard.has(current.id)) {
      chain.unshift(current.name);
      guard.add(current.id);

      if (!current.parentId) {
        break;
      }

      current = groupLookup.get(current.parentId) ?? null;
    }

    return chain;
  }, [groupLookup, selectedGroup]);

  const hasTreeResults = filteredTree.length > 0;

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

  const renderTreeNodes = (nodes, depth = 0) => {
    if (!Array.isArray(nodes) || nodes.length === 0) {
      return null;
    }

    return nodes.map((node) => {
      if (!node) {
        return null;
      }

      const childNodes = Array.isArray(node.children) ? node.children : [];
      const hasVisibleChildren = childNodes.length > 0;
      const totalChildren = childCountMap.get(node.id) ?? 0;
      const canToggle = hasVisibleChildren || (!query && totalChildren > 0);
      const isExpanded = expandedNodes.has(node.id);
      const shouldShowChildren = query ? true : isExpanded;
      const parentName = node.parentId ? groupLookup.get(node.parentId)?.name ?? '—' : '';
      const childLabel =
        totalChildren > 0 ? `${totalChildren} ${totalChildren === 1 ? 'child' : 'children'}` : 'No children';
      const isActive = selectedGroupId === node.id;

      return (
        <li
          key={node.id}
          className={`group-tree__item${depth > 0 ? ' group-tree__branch' : ''}${isActive ? ' group-tree__item--active' : ''}`}
          style={depth > 0 ? { marginLeft: '0.35rem' } : undefined}
        >
          <div className="group-tree__header">
            <div className="group-tree__title">
              {canToggle ? (
                <button
                  type="button"
                  className="group-tree__toggle"
                  onClick={() => toggleNode(node.id)}
                  aria-expanded={query ? true : shouldShowChildren}
                  aria-label={`${query || shouldShowChildren ? 'Collapse' : 'Expand'} ${node.name}`}
                >
                  {query || shouldShowChildren ? '−' : '+'}
                </button>
              ) : (
                <span className="group-tree__toggle group-tree__toggle--spacer" aria-hidden="true">
                  ·
                </span>
              )}
              <button
                type="button"
                className={`group-tree__select${isActive ? ' is-active' : ''}`}
                onClick={() => setSelectedGroupId(node.id)}
              >
                {node.name}
              </button>
            </div>
            <div className="group-tree__controls">
              <button
                type="button"
                className="action-button action-button--ghost action-button--icon"
                onClick={() => openManageModal(node)}
                aria-label={`Edit ${node.name}`}
              >
                ✏️
              </button>
            </div>
          </div>
          <div className="group-tree__meta">
            <span>{node.parentId ? `Parent: ${parentName || '—'}` : 'Top-level group'}</span>
            <span>Created {formatDateTime(node.createdAt)}</span>
            <span>{childLabel}</span>
          </div>
          {canToggle && (query || shouldShowChildren) ? (
            <ul className="group-tree__children">{renderTreeNodes(childNodes, depth + 1)}</ul>
          ) : null}
        </li>
      );
    });
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
          <div className="toolbar-actions__cluster" role="group" aria-label="Group tree controls">
            <button type="button" className="action-button action-button--ghost" onClick={handleExpandAll}>
              Expand all
            </button>
            <button type="button" className="action-button action-button--ghost" onClick={handleCollapseAll}>
              Collapse all
            </button>
          </div>
          <button
            type="button"
            className="action-button action-button--primary"
            onClick={() => openCreateModal(selectedGroupId ?? '')}
          >
            Add group
          </button>
        </div>
      </div>

      {status.message ? <div className={`page-status page-status--${status.type}`}>{status.message}</div> : null}

      <div className="group-workspace">
        <aside className="group-workspace__tree" aria-live="polite">
          {loading ? (
            <p>Loading groups…</p>
          ) : filteredTree.length === 0 ? (
            <p>{query ? 'No groups match your filter.' : 'No groups available yet.'}</p>
          ) : (
            <ul className="group-tree">{renderTreeNodes(filteredTree)}</ul>
          )}
        </aside>
        <section className="group-workspace__detail">
          {hasTreeResults && selectedGroup ? (
            <article className="group-detail">
              <header className="group-detail__header">
                <div>
                  <p className="group-detail__path">{selectedBreadcrumb.join(' / ')}</p>
                  <h2>{selectedGroup.name}</h2>
                </div>
                <div className="group-detail__actions">
                  <button
                    type="button"
                    className="action-button action-button--ghost"
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
              <div className="group-detail__meta">
                <div>
                  <span>Parent</span>
                  <strong>{selectedGroup.parentId ? groupLookup.get(selectedGroup.parentId)?.name ?? '—' : 'Top level'}</strong>
                </div>
                <div>
                  <span>Created</span>
                  <strong>{formatDateTime(selectedGroup.createdAt)}</strong>
                </div>
                <div>
                  <span>Updated</span>
                  <strong>{formatDateTime(selectedGroup.updatedAt)}</strong>
                </div>
                <div>
                  <span>Children</span>
                  <strong>{childCountMap.get(selectedGroup.id) ?? 0}</strong>
                </div>
                <div>
                  <span>Total descendants</span>
                  <strong>{descendantCount}</strong>
                </div>
              </div>
              <div className="group-detail__children">
                <h3>Direct descendants</h3>
                {directChildren.length > 0 ? (
                  <ul>
                    {directChildren.map((child) => (
                      <li key={child.id}>
                        <button type="button" className="link-button" onClick={() => setSelectedGroupId(child.id)}>
                          {child.name}
                        </button>
                        <span>{formatDateTime(child.updatedAt)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">No child groups yet.</p>
                )}
              </div>
            </article>
          ) : (
            <div className="group-detail group-detail--empty">
              <p className="muted">
                {query && !hasTreeResults
                  ? 'No groups match your filter.'
                  : 'Select a group from the tree to review its metadata.'}
              </p>
            </div>
          )}
        </section>
      </div>

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
