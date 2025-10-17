import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Modal from '../components/Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import './Users.css';

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
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.35-4.35"/>
  </svg>
);

const Users = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // State
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });

  // User form
  const [userForm, setUserForm] = useState({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  passwordConfirmation: '',
  roleIds: []
  });

  // Role form
  const [roleForm, setRoleForm] = useState({
  name: '',
    description: '',
    permissions: []
  });

  // Filter users
  const filteredUsers = useMemo(() => {
    let filtered = users;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.firstName.toLowerCase().includes(term) ||
          user.lastName.toLowerCase().includes(term) ||
          user.email.toLowerCase().includes(term) ||
          user.roles.some((role) => role.name.toLowerCase().includes(term))
      );
    }

    if (filterRole) {
      filtered = filtered.filter((user) =>
        user.roles.some((role) => role.id === filterRole)
      );
    }

    return filtered;
  }, [users, searchTerm, filterRole]);

  const loadUsers = async () => {
      try {
        setLoading(true);
      const response = await fetch('/api/users');

      if (!response.ok) {
          throw new Error('Unable to load users.');
        }

      const payload = await response.json();
      // API returns { users: [...] } structure
      const usersArray = payload.users || payload;
      setUsers(Array.isArray(usersArray) ? usersArray : []);
        setStatus({ type: '', message: '' });
      } catch (error) {
      setUsers([]);
        setStatus({
          type: 'error',
        message: error.message || 'Unable to load users.'
        });
      } finally {
        setLoading(false);
      }
    };

  const loadRoles = async () => {
    try {
      const response = await fetch('/api/roles');

      if (!response.ok) {
        throw new Error('Unable to load roles.');
      }

      const payload = await response.json();
      // API returns { roles: [...] } structure
      const rolesArray = payload.roles || payload;
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

    loadUsers();
    loadRoles();
  }, [navigate, user]);

  const handleCreateUser = async () => {
    try {
      // Validate password confirmation
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
          passwordConfirmation: userForm.passwordConfirmation
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

  const handleCreateRole = async () => {
    try {
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: roleForm.name,
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

  const handleNewUser = () => {
    console.log('handleNewUser called');
    setUserForm(emptyUserForm());
    setIsEditing(false);
    setSelectedId(null);
    setShowUserModal(true);
    console.log('showUserModal set to true');
  };

  const handleNewRole = () => {
    console.log('handleNewRole called');
    setRoleForm(emptyRoleForm());
    setShowRoleModal(true);
    console.log('showRoleModal set to true');
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

  const getInitials = (firstName, lastName) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getRoleBadgeClass = (roleName) => {
    switch (roleName.toLowerCase()) {
      case 'admin':
        return 'users-role-badge--admin';
      case 'moderator':
        return 'users-role-badge--moderator';
      default:
        return 'users-role-badge--user';
    }
  };

    if (loading) {
    return (
      <div className="users-page">
        <div className="users-header">
          <h1 className="users-title">Users & Roles</h1>
          <p className="users-description">Manage system users and their permissions.</p>
        </div>
        <div className="users-loading">
          <div className="users-loading-spinner"></div>
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  if (status.type === 'error') {
    return (
      <div className="users-page">
        <div className="users-header">
          <h1 className="users-title">Users & Roles</h1>
          <p className="users-description">Manage system users and their permissions.</p>
              </div>
        <div className="users-error">
          <div className="users-error-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
              </div>
          <div className="users-error-title">Error Loading Users</div>
          <div className="users-error-description">{status.message}</div>
            </div>
      </div>
    );
  }

  return (
    <div className="users-page">
      <div className="users-header">
        <h1 className="users-title">Users & Roles</h1>
        <p className="users-description">Manage system users and their permissions.</p>
      </div>

      <div className="users-actions">
              <button
                type="button"
          className="users-action-btn users-action-btn--secondary"
          onClick={handleNewRole}
              >
          <ShieldIcon />
          New Role
              </button>
              <button
                type="button"
          className="users-action-btn users-action-btn--primary"
          onClick={handleNewUser}
        >
          <UserIcon />
          New User
              </button>
            </div>

      <div className="users-filters">
        <div className="users-search">
          <SearchIcon />
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="users-search-input"
          />
        </div>
        <div className="users-filter">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="users-filter-select"
          >
            <option value="">All Roles</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
    </div>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="users-content">
          <div className="users-empty">
            <div className="users-empty-icon">
              <UserIcon />
        </div>
            <div className="users-empty-title">No users found</div>
            <div className="users-empty-description">
              {searchTerm || filterRole
                ? 'No users match your search criteria.'
                : 'Get started by creating your first user.'}
            </div>
            {!searchTerm && !filterRole && (
              <button
                type="button"
                className="users-empty-action"
                onClick={handleNewUser}
              >
                <PlusIcon />
                Create Your First User
            </button>
          )}
        </div>
      </div>
      ) : (
        <div className="users-content">
          <table className="users-table">
            <thead className="users-table-header">
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Roles</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="users-table-row">
                  <td className="users-table-cell">
                    <div className="flex items-center gap-3">
                      <div className="users-avatar">
                        {getInitials(user.firstName, user.lastName)}
                      </div>
                      <div>
                        <div className="users-table-cell--primary">
                          {user.firstName} {user.lastName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="users-table-cell">{user.email}</td>
                  <td className="users-table-cell">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <span
                          key={role.id}
                          className={`users-role-badge ${getRoleBadgeClass(role.name)}`}
                        >
                          {role.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="users-table-cell">
                    <div className="users-actions-cell">
        <button
          type="button"
                        className="users-action-icon"
                        title="Edit user"
                      >
                        <EditIcon />
        </button>
        <button
          type="button"
                        className="users-action-icon users-action-icon--danger"
                        title="Delete user"
                      >
                        <TrashIcon />
        </button>
      </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* User Modal */}
      {showUserModal && (
      <Modal
          open={showUserModal}
          onClose={() => {
            console.log('User Modal onClose called');
            setShowUserModal(false);
            setUserForm(emptyUserForm());
            setIsEditing(false);
            setSelectedId(null);
          }}
          title={isEditing ? 'Edit User' : 'Create User'}
        >
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              required
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
              required
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
              required
            />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label htmlFor="user-password" className="form-label">
                  Password {!isEditing && '*'}
          </label>
            <input
                  id="user-password"
              type="password"
                  className="form-input"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder={isEditing ? 'Leave blank to keep current' : 'Enter password'}
                  required={!isEditing}
                />
              </div>

              <div className="form-group">
                <label htmlFor="user-password-confirmation" className="form-label">
                  Confirm Password {!isEditing && '*'}
          </label>
            <input
                  id="user-password-confirmation"
              type="password"
                  className="form-input"
                  value={userForm.passwordConfirmation}
                  onChange={(e) => setUserForm({ ...userForm, passwordConfirmation: e.target.value })}
                  placeholder={isEditing ? 'Leave blank to keep current' : 'Confirm password'}
                  required={!isEditing}
                />
              </div>
          </div>
        </form>

          <div className="modal__footer">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => {
                setShowUserModal(false);
                setUserForm(emptyUserForm());
                setIsEditing(false);
                setSelectedId(null);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleCreateUser}
            >
              {isEditing ? 'Update User' : 'Create User'}
            </button>
          </div>
      </Modal>
      )}

      {/* Role Modal */}
      {showRoleModal && (
      <Modal
          open={showRoleModal}
          onClose={() => {
            console.log('Role Modal onClose called');
            setShowRoleModal(false);
            setRoleForm(emptyRoleForm());
          }}
          title="Create Role"
        >
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
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
                required
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
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'dashboard', label: 'Dashboard' },
                  { key: 'users', label: 'Users' },
                  { key: 'roles', label: 'Roles' },
                  { key: 'groups', label: 'Groups' },
                  { key: 'mikrotiks', label: 'Mikrotiks' },
                  { key: 'tunnels', label: 'Tunnels' },
                  { key: 'settings', label: 'Settings' }
                ].map((permission) => (
                  <label key={permission.key} className="flex items-center gap-2">
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
                      className="rounded border-primary text-primary focus:ring-focus"
                    />
                    <span className="text-sm">{permission.label}</span>
            </label>
                ))}
              </div>
            </div>
          </form>

          <div className="modal__footer">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => {
                setShowRoleModal(false);
                setRoleForm(emptyRoleForm());
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleCreateRole}
            >
              Create Role
            </button>
          </div>
      </Modal>
      )}

      {/* Status Messages */}
      {status.message && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
          status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
          status.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
          'bg-blue-50 text-blue-700 border border-blue-200'
        }`}>
          {status.message}
        </div>
      )}
    </div>
  );
};

export default Users;