import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import './Roles.css';

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

const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

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

const emptyRoleForm = () => ({
  name: '',
  description: '',
  permissions: []
});

const Roles = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });

  // Role form
  const [roleForm, setRoleForm] = useState(emptyRoleForm());

  // Filter roles
  const filteredRoles = useMemo(() => {
    if (!searchTerm) return roles;
    
    const term = searchTerm.toLowerCase();
    return roles.filter(role => 
      role.name.toLowerCase().includes(term) ||
      role.description?.toLowerCase().includes(term) ||
      role.permissions?.some(p => p.toLowerCase().includes(term))
    );
  }, [roles, searchTerm]);

  const loadRoles = async () => {
    try {
      console.log('Loading roles...');
      const response = await fetch('/api/roles');
      console.log('Roles response status:', response.status);

      if (!response.ok) {
        throw new Error('Unable to load roles.');
      }

      const payload = await response.json();
      console.log('Roles payload:', payload);
      // API returns { roles: [...] } structure
      const rolesArray = payload.roles || payload;
      console.log('Roles array:', rolesArray);
      setRoles(Array.isArray(rolesArray) ? rolesArray : []);
    } catch (error) {
      console.error('Failed to load roles:', error);
      setRoles([]);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    console.log('Loading roles...');
    loadRoles();
  }, [navigate, user]);

  const handleCreateRole = async () => {
    try {
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: roleForm.name,
          description: roleForm.description,
          permissions: roleForm.permissions
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || 'Unable to create role.');
      }

      setRoleForm(emptyRoleForm());
      setShowRoleModal(false);
      await loadRoles();
      setStatus({
        type: 'success',
        message: 'Role created successfully.'
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Unable to create role.'
      });
    }
  };

  const handleUpdateRole = async () => {
    try {
      const response = await fetch(`/api/roles/${selectedId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: roleForm.name,
          description: roleForm.description,
          permissions: roleForm.permissions
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || 'Unable to update role.');
      }

      setRoleForm(emptyRoleForm());
      setShowRoleModal(false);
      setIsEditing(false);
      setSelectedId(null);
      await loadRoles();
      setStatus({
        type: 'success',
        message: 'Role updated successfully.'
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Unable to update role.'
      });
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!confirm('Are you sure you want to delete this role?')) {
      return;
    }

    try {
      const response = await fetch(`/api/roles/${roleId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.message || 'Unable to delete role.');
      }

      await loadRoles();
      setStatus({
        type: 'success',
        message: 'Role deleted successfully.'
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Unable to delete role.'
      });
    }
  };

  const handleEdit = (role) => {
    setRoleForm({
      name: role.name || '',
      description: role.description || '',
      permissions: role.permissions || []
    });
    setSelectedId(role.id);
    setIsEditing(true);
    setShowRoleModal(true);
  };

  const handleNewRole = () => {
    setRoleForm(emptyRoleForm());
    setSelectedId(null);
    setIsEditing(false);
    setShowRoleModal(true);
  };

  if (loading) {
    return (
      <div className="roles-page">
        <div className="roles-header">
          <h1 className="roles-title">Roles Management</h1>
          <p className="roles-description">Manage system roles and permissions.</p>
        </div>
        <div className="roles-loading">
          <div className="roles-loading-spinner"></div>
          <p>Loading roles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="roles-page">
      <div className="roles-header">
        <h1 className="roles-title">Roles Management</h1>
        <p className="roles-description">Manage system roles and permissions.</p>
      </div>

      <div className="roles-actions">
        <div className="roles-search">
          <input
            type="text"
            placeholder="Search roles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="roles-search-input"
          />
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleNewRole}
        >
          <PlusIcon />
          New Role
        </button>
      </div>

      {roles.length === 0 ? (
        <div className="roles-empty">
          <div className="roles-empty-icon">
            <ShieldIcon />
          </div>
          <h3>No roles created yet</h3>
          <p>Create your first role to manage user permissions.</p>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleNewRole}
          >
            <PlusIcon />
            Create First Role
          </button>
        </div>
      ) : (
        <div className="roles-list">
          {filteredRoles.map((role) => (
            <div key={role.id} className="role-card">
              <div className="role-card-header">
                <div className="role-info">
                  <h3 className="role-name">{role.name}</h3>
                  {role.description && (
                    <p className="role-description">{role.description}</p>
                  )}
                </div>
                <div className="role-actions">
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => handleEdit(role)}
                  >
                    <EditIcon />
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm text-error"
                    onClick={() => handleDeleteRole(role.id)}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
              
              <div className="role-permissions">
                <h4>Permissions:</h4>
                <div className="permissions-list">
                  {role.permissions && role.permissions.length > 0 ? (
                    role.permissions.map((permission) => (
                      <span key={permission} className="permission-tag">
                        {permission}
                      </span>
                    ))
                  ) : (
                    <span className="no-permissions">No permissions assigned</span>
                  )}
                </div>
              </div>
              
              <div className="role-meta">
                <span>Created: {formatDateTime(role.createdAt)}</span>
                {role.updatedAt !== role.createdAt && (
                  <span>Updated: {formatDateTime(role.updatedAt)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Role Modal */}
      {showRoleModal && (
        <Modal
          open={showRoleModal}
          onClose={() => {
            setShowRoleModal(false);
            setRoleForm(emptyRoleForm());
            setIsEditing(false);
            setSelectedId(null);
          }}
          title={isEditing ? 'Edit Role' : 'Create Role'}
        >
          <div className="role-form">
            <div className="form-group">
              <label htmlFor="role-name" className="form-label">
                Role Name *
              </label>
              <input
                id="role-name"
                type="text"
                className="form-input"
                value={roleForm.name}
                onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                placeholder="Enter role name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="role-description" className="form-label">
                Description
              </label>
              <textarea
                id="role-description"
                className="form-input form-textarea"
                value={roleForm.description}
                onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                placeholder="Enter role description"
                rows="3"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Permissions</label>
              <div className="permissions-grid">
                {[
                  { key: 'dashboard', label: 'Dashboard' },
                  { key: 'users', label: 'Users' },
                  { key: 'roles', label: 'Roles' },
                  { key: 'groups', label: 'Groups' },
                  { key: 'mikrotiks', label: 'MikroTiks' },
                  { key: 'tunnels', label: 'Tunnels' },
                  { key: 'settings', label: 'Settings' }
                ].map((permission) => (
                  <label key={permission.key} className="permission-checkbox">
                    <input
                      type="checkbox"
                      checked={roleForm.permissions.includes(permission.key)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setRoleForm({
                            ...roleForm,
                            permissions: [...roleForm.permissions, permission.key]
                          });
                        } else {
                          setRoleForm({
                            ...roleForm,
                            permissions: roleForm.permissions.filter(p => p !== permission.key)
                          });
                        }
                      }}
                      className="permission-input"
                    />
                    <span className="permission-label">{permission.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="modal__footer">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => {
                setShowRoleModal(false);
                setRoleForm(emptyRoleForm());
                setIsEditing(false);
                setSelectedId(null);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={isEditing ? handleUpdateRole : handleCreateRole}
            >
              {isEditing ? 'Update Role' : 'Create Role'}
            </button>
          </div>
        </Modal>
      )}

      {/* Status Messages */}
      {status.message && (
        <div className={`status-message status-message--${status.type}`}>
          {status.message}
        </div>
      )}
    </div>
  );
};

export default Roles;