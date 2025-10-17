import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';

// Modern Icons
const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polyline points="3,6 5,6 21,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const FolderIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

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

const Groups = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(emptyGroupForm);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const groupLookup = useMemo(() => {
    const lookup = new Map();
    groups.forEach((group) => {
      lookup.set(group.id, group);
    });
    return lookup;
  }, [groups]);

  const selectedGroup = useMemo(
    () => (selectedId ? groupLookup.get(selectedId) ?? null : null),
    [groupLookup, selectedId]
  );

  const groupTree = useMemo(() => {
    const nodeLookup = new Map();
    const roots = [];

    groups.forEach((group) => {
      const node = {
        ...group,
        children: []
      };
      nodeLookup.set(group.id, node);
    });

    groups.forEach((group) => {
      const node = nodeLookup.get(group.id);
      if (group.parentId) {
        const parent = nodeLookup.get(group.parentId);
        if (parent) {
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    const sortNodes = (entries) => {
      entries.sort((a, b) => {
        const nameA = a.name?.toLowerCase() ?? '';
        const nameB = b.name?.toLowerCase() ?? '';
        return nameA.localeCompare(nameB);
      });

      entries.forEach((entry) => {
        if (entry.children?.length > 0) {
          sortNodes(entry.children);
        }
      });
    };

    sortNodes(roots);
    return roots;
  }, [groups]);

  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) {
      return groupTree;
    }

    const searchLower = searchTerm.toLowerCase();
    const filterNodes = (nodes) => {
      return nodes.filter((node) => {
        const matchesSearch = node.name?.toLowerCase().includes(searchLower);
        const children = filterNodes(node.children || []);
        
        if (matchesSearch || children.length > 0) {
          return {
            ...node,
            children: children
          };
        }
        return false;
      });
    };

    return filterNodes(groupTree);
  }, [groupTree, searchTerm]);

  const directChildren = useMemo(
    () => groups.filter((group) => group.parentId === (selectedGroup ? selectedGroup.id : null)),
    [groups, selectedGroup]
  );

  const loadGroups = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/groups');

      if (!response.ok) {
        throw new Error('Unable to load groups.');
      }

      const payload = await response.json();
      setGroups(Array.isArray(payload) ? payload : []);
      setStatus({ type: '', message: '' });
    } catch (error) {
      setGroups([]);
      setStatus({
        type: 'error',
        message: error.message || 'Unable to load groups.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    loadGroups();
  }, [navigate, user]);

  const handleCreateGroup = async () => {
    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.message || 'Unable to create group.');
      }

      setForm(emptyGroupForm);
      setShowModal(false);
      await loadGroups();
      setStatus({
        type: 'success',
        message: 'Group created successfully.'
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Unable to create group.'
      });
    }
  };

  const handleUpdateGroup = async () => {
    try {
      const response = await fetch(`/api/groups/${selectedId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.message || 'Unable to update group.');
      }

      setForm(emptyGroupForm);
      setShowModal(false);
      setIsEditing(false);
      setSelectedId(null);
      await loadGroups();
      setStatus({
        type: 'success',
        message: 'Group updated successfully.'
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Unable to update group.'
      });
    }
  };

  const handleDeleteGroup = async () => {
    try {
      const response = await fetch(`/api/groups/${selectedId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.message || 'Unable to delete group.');
      }

      setSelectedId(null);
      await loadGroups();
      setStatus({
        type: 'success',
        message: 'Group deleted successfully.'
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Unable to delete group.'
      });
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isEditing) {
      handleUpdateGroup();
    } else {
      handleCreateGroup();
    }
  };

  const handleEdit = (group) => {
    setForm({
      name: group.name || '',
      parentId: group.parentId || ''
    });
    setSelectedId(group.id);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = (group) => {
    setSelectedId(group.id);
    handleDeleteGroup();
  };

  const handleNewGroup = () => {
    setForm(emptyGroupForm);
    setSelectedId(null);
    setIsEditing(false);
    setShowModal(true);
  };

  const renderGroupNode = (node, depth = 0) => {
    const indent = depth * 24;

    return (
      <div key={node.id} className="group-node">
        <div 
          className={`group-item ${selectedId === node.id ? 'group-item--selected' : ''}`}
          style={{ paddingLeft: `${indent + 16}px` }}
          onClick={() => setSelectedId(node.id)}
        >
          <div className="flex items-center gap-3">
            <FolderIcon />
            <div className="flex-1">
              <h3 className="font-medium text-primary">{node.name}</h3>
              <p className="text-sm text-tertiary">
                {node.children?.length || 0} sub-groups • Created {formatDateTime(node.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(node);
                }}
                aria-label={`Edit ${node.name}`}
              >
                <EditIcon />
              </button>
            <button
              type="button"
                className="btn btn--ghost btn--sm text-error"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(node);
                }}
                aria-label={`Delete ${node.name}`}
              >
                <TrashIcon />
            </button>
            </div>
          </div>
        </div>
        {node.children?.map((child) => renderGroupNode(child, depth + 1))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Mik-Groups</h1>
            <p className="text-tertiary mt-2">Organize your MikroTik devices into hierarchical groups.</p>
          </div>
        </div>
        <div className="card">
          <div className="card__body">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-tertiary bg-opacity-20 rounded-lg animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
    <div>
          <h1 className="text-3xl font-bold text-primary">Mik-Groups</h1>
          <p className="text-tertiary mt-2">Organize your MikroTik devices into hierarchical groups.</p>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleNewGroup}
        >
          <PlusIcon />
          New Group
        </button>
      </div>

      {/* Status Message */}
      {status.message && (
        <div className={`p-4 rounded-xl border ${
          status.type === 'error' 
            ? 'bg-error-50 border-error-200 text-error-700' 
            : 'bg-success-50 border-success-200 text-success-700'
        }`}>
          {status.message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Groups Tree */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card__header">
              <h2 className="card__title">Groups Hierarchy</h2>
              <p className="card__subtitle">Click on a group to view details</p>
            </div>
            <div className="card__body">
              <div className="mb-4">
            <input
                  type="text"
                  className="form-input"
                  placeholder="Search groups..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                {filteredGroups.length > 0 ? (
                  filteredGroups.map((node) => renderGroupNode(node))
                ) : (
                  <div className="text-center py-8 text-tertiary">
                    {searchTerm ? 'No groups found matching your search.' : 'No groups created yet.'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Group Details */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="card__header">
              <h2 className="card__title">Group Details</h2>
            </div>
            <div className="card__body">
            {selectedGroup ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-primary">{selectedGroup.name}</h3>
                    <p className="text-sm text-tertiary">Group Information</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-secondary">Created</label>
                      <p className="text-sm text-tertiary">{formatDateTime(selectedGroup.createdAt)}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-secondary">Sub-groups</label>
                      <p className="text-sm text-tertiary">{directChildren.length}</p>
                    </div>
                    
                    {selectedGroup.parentId && (
                      <div>
                        <label className="text-sm font-medium text-secondary">Parent Group</label>
                        <p className="text-sm text-tertiary">
                          {groupLookup.get(selectedGroup.parentId)?.name || 'Unknown'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4">
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm flex-1"
                      onClick={() => handleEdit(selectedGroup)}
                    >
                      <EditIcon />
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger btn--sm flex-1"
                      onClick={() => handleDelete(selectedGroup)}
                    >
                      <TrashIcon />
                      Delete
                    </button>
                  </div>
                  </div>
              ) : (
                <div className="text-center py-8 text-tertiary">
                  <FolderIcon />
                  <p className="mt-2">Select a group to view details</p>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
        <Modal
        title={isEditing ? 'Edit Group' : 'Create New Group'}
        description={isEditing ? 'Update the group information below.' : 'Create a new group to organize your MikroTik devices.'}
        open={showModal}
          onClose={() => {
          setShowModal(false);
          setForm(emptyGroupForm);
          setIsEditing(false);
          setSelectedId(null);
        }}
        actions={[
          <button
            key="cancel"
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              setShowModal(false);
              setForm(emptyGroupForm);
              setIsEditing(false);
              setSelectedId(null);
            }}
          >
                Cancel
          </button>,
              <button
            key="submit"
                type="submit"
            form="group-form"
            className="btn btn--primary"
            disabled={!form.name.trim()}
          >
            {isEditing ? 'Update Group' : 'Create Group'}
              </button>
        ]}
      >
        <form id="group-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <label htmlFor="group-name" className="form-label">
              Group Name *
            </label>
              <input
              id="group-name"
              type="text"
              className="form-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Enter group name"
                required
              />
          </div>

          <div className="form-group">
            <label htmlFor="group-parent" className="form-label">
              Parent Group
            </label>
            <select
              id="group-parent"
              className="form-input form-select"
              value={form.parentId}
              onChange={(e) => setForm({ ...form, parentId: e.target.value })}
            >
              <option value="">No parent (root group)</option>
              {groups
                .filter((group) => group.id !== selectedId)
                .map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
          </div>
          </form>
        </Modal>
    </div>
  );
};

export default Groups;