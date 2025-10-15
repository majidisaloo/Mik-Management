import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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

const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polyline points="6,9 12,15 18,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const RoleDropdown = ({ roles, selectedIds, onToggle, disabled = false, placeholder = 'Assign roles' }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (disabled && open) {
      setOpen(false);
    }
  }, [disabled, open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const selectedRoles = roles.filter((role) => selectedIds.includes(role.id));
  const summary = selectedRoles.length
    ? selectedRoles.map((role) => (
        <span key={role.id} className="px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded-full">
          {role.name}
        </span>
      ))
    : [
        <span key="placeholder" className="text-tertiary text-sm">
          {placeholder}
        </span>
      ];

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className={`w-full flex items-center justify-between gap-2 p-3 border rounded-lg text-left transition-colors ${
          disabled
            ? 'bg-tertiary bg-opacity-20 border-tertiary text-tertiary cursor-not-allowed'
            : 'bg-surface-primary border-primary hover:border-secondary focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus focus:ring-opacity-20'
        }`}
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <div className="flex flex-wrap gap-1 min-h-[20px]">{summary}</div>
        <ChevronDownIcon />
      </button>

      {open && !disabled && (
        <div className="absolute z-dropdown w-full mt-1 bg-surface-elevated border border-primary rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {roles.map((role) => {
            const isSelected = selectedIds.includes(role.id);
            return (
              <button
                key={role.id}
                type="button"
                className={`w-full flex items-center gap-3 p-3 text-left hover:bg-surface-secondary transition-colors ${
                  isSelected ? 'bg-primary-50 text-primary-700' : 'text-secondary'
                }`}
                onClick={() => onToggle(role.id)}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}}
                  className="rounded border-primary text-primary focus:ring-focus"
                />
                <div className="flex-1">
                  <div className="font-medium">{role.name}</div>
                  {role.description && (
                    <div className="text-sm text-tertiary">{role.description}</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const emptyUserForm = () => ({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  passwordConfirmation: '',
  roles: []
});

const emptyRoleForm = () => ({
  name: '',
  description: '',
  permissions: {
    users: false,
    groups: false,
    mikrotiks: false,
    tunnels: false
  }
});

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

const Users = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [selectedId, setSelectedId] = useState(null);
  const [userForm, setUserForm] = useState(emptyUserForm());
  const [roleForm, setRoleForm] = useState(emptyRoleForm());
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');

  const roleLookup = useMemo(() => {
    const lookup = new Map();
    roles.forEach((role) => {
      lookup.set(role.id, role);
    });
    return lookup;
  }, [roles]);

  const selectedUser = useMemo(
    () => (selectedId ? users.find((user) => user.id === selectedId) : null),
    [users, selectedId]
  );

  const filteredUsers = useMemo(() => {
    let filtered = users;

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((user) =>
        user.firstName?.toLowerCase().includes(searchLower) ||
        user.lastName?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower)
      );
    }

    if (filterRole) {
      filtered = filtered.filter((user) => user.roles.includes(Number.parseInt(filterRole, 10)));
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
      setUsers(payload);
      setStatus({ type: '', message: '' });
    } catch (error) {
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
      setRoles(payload);
    } catch (error) {
      console.error('Failed to load roles:', error);
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
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userForm)
      });

      if (!response.ok) {
        const payload = await response.json();
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

  const handleUpdateUser = async () => {
    try {
      const response = await fetch(`/api/users/${selectedId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userForm)
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.message || 'Unable to update user.');
      }

      setUserForm(emptyUserForm());
      setShowUserModal(false);
      setIsEditing(false);
      setSelectedId(null);
      await loadUsers();
      setStatus({
        type: 'success',
        message: 'User updated successfully.'
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Unable to update user.'
      });
    }
  };

  const handleDeleteUser = async () => {
    try {
      const response = await fetch(`/api/users/${selectedId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.message || 'Unable to delete user.');
      }

      setSelectedId(null);
      await loadUsers();
      setStatus({
        type: 'success',
        message: 'User deleted successfully.'
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Unable to delete user.'
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
        body: JSON.stringify(roleForm)
      });

      if (!response.ok) {
        const payload = await response.json();
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
        body: JSON.stringify(roleForm)
      });

      if (!response.ok) {
        const payload = await response.json();
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

  const handleDeleteRole = async () => {
    try {
      const response = await fetch(`/api/roles/${selectedId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.message || 'Unable to delete role.');
      }

      setSelectedId(null);
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

  const handleUserSubmit = (event) => {
    event.preventDefault();
    if (isEditing) {
      handleUpdateUser();
    } else {
      handleCreateUser();
    }
  };

  const handleRoleSubmit = (event) => {
    event.preventDefault();
    if (isEditing) {
      handleUpdateRole();
    } else {
      handleCreateRole();
    }
  };

  const handleEditUser = (user) => {
    setUserForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      password: '',
      passwordConfirmation: '',
      roles: user.roles || []
    });
    setSelectedId(user.id);
    setIsEditing(true);
    setShowUserModal(true);
  };

  const handleDeleteUserClick = (user) => {
    setSelectedId(user.id);
    handleDeleteUser();
  };

  const handleEditRole = (role) => {
    setRoleForm({
      name: role.name || '',
      description: role.description || '',
      permissions: { ...role.permissions }
    });
    setSelectedId(role.id);
    setIsEditing(true);
    setShowRoleModal(true);
  };

  const handleDeleteRoleClick = (role) => {
    setSelectedId(role.id);
    handleDeleteRole();
  };

  const handleNewUser = () => {
    setUserForm(emptyUserForm());
    setSelectedId(null);
    setIsEditing(false);
    setShowUserModal(true);
  };

  const handleNewRole = () => {
    setRoleForm(emptyRoleForm());
    setSelectedId(null);
    setIsEditing(false);
    setShowRoleModal(true);
  };

  const toggleUserRole = (roleId) => {
    setUserForm((prev) => ({
      ...prev,
      roles: prev.roles.includes(roleId)
        ? prev.roles.filter((id) => id !== roleId)
        : [...prev.roles, roleId]
    }));
  };

  const toggleRolePermission = (permission) => {
    setRoleForm((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: !prev.permissions[permission]
      }
    }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Users & Roles</h1>
            <p className="text-tertiary mt-2">Manage system users and their permissions.</p>
          </div>
        </div>
        <div className="card">
          <div className="card__body">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-tertiary bg-opacity-20 rounded-lg animate-pulse"></div>
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
          <h1 className="text-3xl font-bold text-primary">Users & Roles</h1>
          <p className="text-tertiary mt-2">Manage system users and their permissions.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={handleNewRole}
          >
            <ShieldIcon />
            New Role
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleNewUser}
          >
            <PlusIcon />
            New User
          </button>
        </div>
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

      {/* Filters */}
      <div className="card">
        <div className="card__body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="search" className="form-label">Search Users</label>
              <input
                id="search"
                type="text"
                className="form-input"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="role-filter" className="form-label">Filter by Role</label>
              <select
                id="role-filter"
                className="form-input form-select"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
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
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((user) => (
          <div key={user.id} className="card">
            <div className="card__body">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-50 rounded-lg">
                    <UserIcon />
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary">
                      {user.firstName} {user.lastName}
                    </h3>
                    <p className="text-sm text-tertiary">{user.email}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => handleEditUser(user)}
                    aria-label={`Edit ${user.firstName} ${user.lastName}`}
                  >
                    <EditIcon />
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm text-error"
                    onClick={() => handleDeleteUserClick(user)}
                    aria-label={`Delete ${user.firstName} ${user.lastName}`}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-secondary">Roles</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {user.roles?.length > 0 ? (
                      user.roles.map((roleId) => {
                        const role = roleLookup.get(roleId);
                        return role ? (
                          <span key={roleId} className="px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded-full">
                            {role.name}
                          </span>
                        ) : null;
                      })
                    ) : (
                      <span className="text-sm text-tertiary">No roles assigned</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-tertiary">Created:</span>
                  <span className="text-secondary">{formatDateTime(user.createdAt)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-tertiary">Last Login:</span>
                  <span className="text-secondary">{formatDateTime(user.lastLoginAt)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="card">
          <div className="card__body text-center py-12">
            <UserIcon />
            <h3 className="text-lg font-semibold text-primary mt-4">No users found</h3>
            <p className="text-tertiary mt-2">
              {searchTerm || filterRole
                ? 'No users match your current filters.' 
                : 'Get started by creating your first user.'
              }
            </p>
            {!searchTerm && !filterRole && (
              <button
                type="button"
                className="btn btn--primary mt-4"
                onClick={handleNewUser}
              >
                <PlusIcon />
                Create Your First User
              </button>
            )}
          </div>
        </div>
      )}

      {/* Create/Edit User Modal */}
      <Modal
        title={isEditing ? 'Edit User' : 'Create New User'}
        description={isEditing ? 'Update the user information below.' : 'Create a new user account with appropriate roles.'}
        open={showUserModal}
        onClose={() => {
          setShowUserModal(false);
          setUserForm(emptyUserForm());
          setIsEditing(false);
          setSelectedId(null);
        }}
        actions={[
          <button
            key="cancel"
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              setShowUserModal(false);
              setUserForm(emptyUserForm());
              setIsEditing(false);
              setSelectedId(null);
            }}
          >
            Cancel
          </button>,
          <button
            key="submit"
            type="submit"
            form="user-form"
            className="btn btn--primary"
            disabled={!userForm.firstName.trim() || !userForm.lastName.trim() || !userForm.email.trim()}
          >
            {isEditing ? 'Update User' : 'Create User'}
          </button>
        ]}
      >
        <form id="user-form" onSubmit={handleUserSubmit} className="space-y-4">
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

          <div className="form-group">
            <label className="form-label">Roles</label>
            <RoleDropdown
              roles={roles}
              selectedIds={userForm.roles}
              onToggle={toggleUserRole}
              placeholder="Select roles for this user"
            />
          </div>
        </form>
      </Modal>

      {/* Create/Edit Role Modal */}
      <Modal
        title={isEditing ? 'Edit Role' : 'Create New Role'}
        description={isEditing ? 'Update the role information below.' : 'Create a new role with specific permissions.'}
        open={showRoleModal}
        onClose={() => {
          setShowRoleModal(false);
          setRoleForm(emptyRoleForm());
          setIsEditing(false);
          setSelectedId(null);
        }}
        actions={[
          <button
            key="cancel"
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              setShowRoleModal(false);
              setRoleForm(emptyRoleForm());
              setIsEditing(false);
              setSelectedId(null);
            }}
          >
            Cancel
          </button>,
          <button
            key="submit"
            type="submit"
            form="role-form"
            className="btn btn--primary"
            disabled={!roleForm.name.trim()}
          >
            {isEditing ? 'Update Role' : 'Create Role'}
          </button>
        ]}
      >
        <form id="role-form" onSubmit={handleRoleSubmit} className="space-y-4">
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
              rows={3}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Permissions</label>
            <div className="space-y-3">
              {Object.entries(roleForm.permissions).map(([permission, enabled]) => (
                <label key={permission} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => toggleRolePermission(permission)}
                    className="rounded border-primary text-primary focus:ring-focus"
                  />
                  <span className="capitalize">{permission}</span>
                </label>
              ))}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Users;