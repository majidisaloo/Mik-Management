import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Modal from '../components/Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import './UsersAndRoles.css';

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

const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
    <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

const emptyUserForm = () => ({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  passwordConfirmation: '',
  roleIds: []
});

const emptyRoleForm = () => ({
  name: '',
  description: '',
  permissions: []
});

const UsersAndRoles = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Active tab state
  const [activeTab, setActiveTab] = useState('users');

  // Common state
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });

  // Auto-dismiss status messages
  useEffect(() => {
    if (status.message) {
      const timer = setTimeout(() => {
        setStatus({ type: '', message: '' });
      }, 4000); // Auto-dismiss after 4 seconds

      return () => clearTimeout(timer);
    }
  }, [status.message]);

  // Users state
  const [users, setUsers] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userFilterRole, setUserFilterRole] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userForm, setUserForm] = useState(emptyUserForm());

  // Roles state
  const [roles, setRoles] = useState([]);
  const [roleSearchTerm, setRoleSearchTerm] = useState('');
  const [debouncedRoleSearch, setDebouncedRoleSearch] = useState('');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [roleForm, setRoleForm] = useState(emptyRoleForm());

  // Filter users
  const filteredUsers = useMemo(() => {
    let filtered = users;

    if (userSearchTerm) {
      const term = userSearchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.firstName?.toLowerCase().includes(term) ||
        user.lastName?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.roles?.some(role => role.name?.toLowerCase().includes(term))
      );
    }

    if (userFilterRole) {
      filtered = filtered.filter(user => 
        user.roles?.some(role => role.id === parseInt(userFilterRole))
      );
    }

    return filtered;
  }, [users, userSearchTerm, userFilterRole]);

  // Debounce role search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedRoleSearch(roleSearchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [roleSearchTerm]);

  // Filter roles
  const filteredRoles = useMemo(() => {
    if (!debouncedRoleSearch || debouncedRoleSearch.trim() === '') {
      return roles;
    }
    
    const term = debouncedRoleSearch.toLowerCase().trim();
    return roles.filter(role => {
      // Check name and description
      if (role.name.toLowerCase().includes(term) || 
          role.description?.toLowerCase().includes(term)) {
        return true;
      }
      
      // Check permissions (handle both array and object formats)
      if (role.permissions) {
        if (Array.isArray(role.permissions)) {
          return role.permissions.some(p => p.toLowerCase().includes(term));
        } else if (typeof role.permissions === 'object') {
          return Object.keys(role.permissions).some(key => 
            key.toLowerCase().includes(term) && role.permissions[key] === true
          );
        }
      }
      
      return false;
    });
  }, [roles, debouncedRoleSearch]);

  // Load users
  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users');

      if (!response.ok) {
        throw new Error('Unable to load users.');
      }

      const payload = await response.json();
      const usersArray = payload.users || payload;
      setUsers(Array.isArray(usersArray) ? usersArray : []);
    } catch (error) {
      console.error('Failed to load users:', error);
      setUsers([]);
    }
  };

  // Load roles
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

    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadUsers(), loadRoles()]);
      setLoading(false);
    };

    loadData();
  }, [navigate, user]);

  // Fix browser back button issue
  useEffect(() => {
    const handlePopState = (event) => {
      // Allow browser back button to work properly
      if (window.history.length > 1) {
        window.history.back();
      } else {
        navigate('/dashboard');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [navigate]);

  // User handlers
  const handleCreateUser = async () => {
    try {
      if (userForm.password !== userForm.passwordConfirmation) {
        setStatus({
          type: 'error',
          message: 'Passwords do not match.'
        });
        return;
      }

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: userForm.firstName,
          lastName: userForm.lastName,
          email: userForm.email,
          password: userForm.password,
          roleIds: userForm.roleIds
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || 'Unable to create user.');
      }

      setUserForm(emptyUserForm());
      setShowUserModal(false);
      await loadUsers();
      setStatus({
        type: 'success',
        message: 'User created successfully.'
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Unable to create user.'
      });
    }
  };

  const handleNewUser = () => {
    console.log('handleNewUser called');
    setUserForm(emptyUserForm());
    setIsEditingUser(false);
    setSelectedUserId(null);
    setShowUserModal(true);
    console.log('User modal should be open now, showUserModal:', true);
  };

  // Role handlers
  const handleCreateRole = async () => {
    try {
      if (!roleForm.name.trim()) {
        setStatus({
          type: 'error',
          message: 'Role name is required.'
        });
        return;
      }

      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: roleForm.name.trim(),
          description: roleForm.description?.trim() || '',
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
      if (!roleForm.name.trim()) {
        setStatus({
          type: 'error',
          message: 'Role name is required.'
        });
        return;
      }

      const response = await fetch(`/api/roles/${selectedRoleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: roleForm.name.trim(),
          description: roleForm.description?.trim() || '',
          permissions: roleForm.permissions
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || 'Unable to update role.');
      }

      setRoleForm(emptyRoleForm());
      setShowRoleModal(false);
      setIsEditingRole(false);
      setSelectedRoleId(null);
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
    const role = roles.find(r => r.id === roleId);
    if (!confirm(`Are you sure you want to delete the role "${role?.name || 'Unknown'}"?`)) {
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
        message: `Role "${role?.name || 'Unknown'}" deleted successfully.`
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Unable to delete role.'
      });
    }
  };

  const handleEditRole = (role) => {
    console.log('handleEditRole called with:', role);
    
    // Convert permissions object to array if needed
    let permissionsArray = [];
    if (role.permissions) {
      if (Array.isArray(role.permissions)) {
        permissionsArray = role.permissions;
      } else if (typeof role.permissions === 'object') {
        // Convert object to array of keys where value is true
        permissionsArray = Object.keys(role.permissions).filter(key => role.permissions[key] === true);
      }
    }
    
    setRoleForm({
      name: role.name || '',
      description: role.description || '',
      permissions: permissionsArray
    });
    setSelectedRoleId(role.id);
    setIsEditingRole(true);
    setShowRoleModal(true);
    console.log('Role modal should be open now, showRoleModal:', true);
  };

  const handleNewRole = () => {
    setRoleForm(emptyRoleForm());
    setSelectedRoleId(null);
    setIsEditingRole(false);
    setShowRoleModal(true);
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getRoleBadgeClass = (roleName) => {
    const role = roleName?.toLowerCase();
    if (role === 'admin') return 'role-badge role-badge--admin';
    if (role === 'user') return 'role-badge role-badge--user';
    if (role === 'viewer') return 'role-badge role-badge--viewer';
    return 'role-badge role-badge--default';
  };

  if (loading) {
    return (
      <div className="users-roles-page">
        <div className="users-roles-header">
          <h1 className="users-roles-title">Users & Roles</h1>
          <p className="users-roles-description">Manage system users and their permissions.</p>
        </div>
        <div className="users-roles-loading">
          <div className="users-roles-loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="users-roles-page">
      <div className="users-roles-header">
        <h1 className="users-roles-title">Users & Roles</h1>
        <p className="users-roles-description">Manage system users and their permissions.</p>
      </div>

      {/* Tabs */}
      <div className="users-roles-tabs">
        <button
          type="button"
          className={`tab-button ${activeTab === 'users' ? 'tab-button--active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <UserIcon />
          Users ({users.length})
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'roles' ? 'tab-button--active' : ''}`}
          onClick={() => setActiveTab('roles')}
        >
          <ShieldIcon />
          Roles ({roles.length})
        </button>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="tab-content">
          <div className="users-actions">
            <div className="users-search">
              <SearchIcon />
              <input
                type="text"
                placeholder="Search users..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="users-search-input"
              />
            </div>
            <select
              value={userFilterRole}
              onChange={(e) => setUserFilterRole(e.target.value)}
              className="users-filter-select"
            >
              <option value="">All Roles</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleNewUser}
            >
              <PlusIcon />
              New User
            </button>
          </div>

          {users.length === 0 ? (
            <div className="users-empty">
              <div className="users-empty-icon">
                <UserIcon />
              </div>
              <h3>No users created yet</h3>
              <p>Create your first user to get started.</p>
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleNewUser}
              >
                <PlusIcon />
                Create First User
              </button>
            </div>
          ) : (
            <div className="users-list">
              {filteredUsers.map((user) => (
                <div key={user.id} className="user-card">
                  <div className="user-avatar">
                    {getInitials(user.firstName, user.lastName)}
                  </div>
                  <div className="user-info">
                    <h3 className="user-name">
                      {user.firstName} {user.lastName}
                    </h3>
                    <p className="user-email">{user.email}</p>
                    <div className="user-roles">
                      {user.roles && user.roles.length > 0 ? (
                        user.roles.map((role) => (
                          <span key={role.id} className={getRoleBadgeClass(role.name)}>
                            {role.name}
                          </span>
                        ))
                      ) : (
                        <span className="no-roles">No roles assigned</span>
                      )}
                    </div>
                  </div>
                  <div className="user-actions">
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Edit user button clicked for:', user);
                        setUserForm({
                          firstName: user.firstName || '',
                          lastName: user.lastName || '',
                          email: user.email || '',
                          password: '',
                          passwordConfirmation: '',
                          roleIds: user.roles?.map(r => r.id) || []
                        });
                        setSelectedUserId(user.id);
                        setIsEditingUser(true);
                        setShowUserModal(true);
                        console.log('User modal should be open now, showUserModal:', true);
                      }}
                    >
                      <EditIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className="tab-content">
          <div className="roles-actions">
            <div className="roles-search">
              <SearchIcon />
              <input
                type="text"
                placeholder="Search roles..."
                value={roleSearchTerm}
                onChange={(e) => setRoleSearchTerm(e.target.value)}
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
          ) : filteredRoles.length === 0 && debouncedRoleSearch ? (
            <div className="roles-empty">
              <div className="roles-empty-icon">
                <SearchIcon />
              </div>
              <h3>No roles found</h3>
              <p>No roles match your search term "{debouncedRoleSearch}".</p>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setRoleSearchTerm('')}
              >
                Clear Search
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
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Edit role button clicked for:', role);
                          handleEditRole(role);
                        }}
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
                        {(() => {
                          let permissionsArray = [];
                          if (role.permissions) {
                            if (Array.isArray(role.permissions)) {
                              permissionsArray = role.permissions;
                            } else if (typeof role.permissions === 'object') {
                              permissionsArray = Object.keys(role.permissions).filter(key => role.permissions[key] === true);
                            }
                          }
                          
                          return permissionsArray.length > 0 ? (
                            permissionsArray.map((permission) => (
                              <span key={permission} className="permission-tag">
                                {permission}
                              </span>
                            ))
                          ) : (
                            <span className="no-permissions">No permissions assigned</span>
                          );
                        })()}
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
        </div>
      )}

      {/* User Modal */}
      {showUserModal && (
        <Modal
          open={showUserModal}
          onClose={() => {
            setShowUserModal(false);
            setUserForm(emptyUserForm());
            setIsEditingUser(false);
            setSelectedUserId(null);
          }}
          title={isEditingUser ? 'Edit User' : 'Create User'}
        >
          <div className="user-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="user-first-name" className="form-label">
                  First Name *
                </label>
                <input
                  id="user-first-name"
                  type="text"
                  className="form-input"
                  value={userForm.firstName}
                  onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                  placeholder="Enter first name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="user-last-name" className="form-label">
                  Last Name *
                </label>
                <input
                  id="user-last-name"
                  type="text"
                  className="form-input"
                  value={userForm.lastName}
                  onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                  placeholder="Enter last name"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="user-email" className="form-label">
                Email Address *
              </label>
              <input
                id="user-email"
                type="email"
                className="form-input"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                placeholder="Enter email address"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="user-password" className="form-label">
                  Password {!isEditingUser && '*'}
                </label>
                <input
                  id="user-password"
                  type="password"
                  className="form-input"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder={isEditingUser ? 'Leave blank to keep current' : 'Enter password'}
                />
              </div>
              <div className="form-group">
                <label htmlFor="user-password-confirmation" className="form-label">
                  Confirm Password {!isEditingUser && '*'}
                </label>
                <input
                  id="user-password-confirmation"
                  type="password"
                  className="form-input"
                  value={userForm.passwordConfirmation}
                  onChange={(e) => setUserForm({ ...userForm, passwordConfirmation: e.target.value })}
                  placeholder={isEditingUser ? 'Leave blank to keep current' : 'Confirm password'}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Roles</label>
              <div className="roles-checkboxes">
                {roles.map((role) => (
                  <label key={role.id} className="role-checkbox">
                    <input
                      type="checkbox"
                      checked={userForm.roleIds.includes(role.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setUserForm({
                            ...userForm,
                            roleIds: [...userForm.roleIds, role.id]
                          });
                        } else {
                          setUserForm({
                            ...userForm,
                            roleIds: userForm.roleIds.filter(id => id !== role.id)
                          });
                        }
                      }}
                      className="role-checkbox-input"
                    />
                    <span className="role-checkbox-label">{role.name}</span>
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
                setShowUserModal(false);
                setUserForm(emptyUserForm());
                setIsEditingUser(false);
                setSelectedUserId(null);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleCreateUser}
            >
              {isEditingUser ? 'Update User' : 'Create User'}
            </button>
          </div>
        </Modal>
      )}

      {/* Role Modal */}
      <Modal
        open={showRoleModal}
        onClose={() => {
          console.log('Role modal closing');
          setShowRoleModal(false);
          setRoleForm(emptyRoleForm());
          setIsEditingRole(false);
          setSelectedRoleId(null);
        }}
        title={isEditingRole ? 'Edit Role' : 'Create Role'}
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
                setIsEditingRole(false);
                setSelectedRoleId(null);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={isEditingRole ? handleUpdateRole : handleCreateRole}
            >
              {isEditingRole ? 'Update Role' : 'Create Role'}
            </button>
          </div>
        </Modal>

    </div>
    
    {/* Status Messages - Outside main container for proper positioning */}
    {status.message && (
      <div className={`status-message status-message--${status.type}`}>
        <span>{status.message}</span>
        <button
          onClick={() => setStatus({ type: '', message: '' })}
          className="status-message__close"
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    )}
  </>;
};

export default UsersAndRoles;
