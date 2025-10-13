import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Modal from '../components/Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const permissionCatalog = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'users', label: 'Users' },
  { key: 'roles', label: 'Roles' },
  { key: 'groups', label: 'Mik-Groups' },
  { key: 'mikrotiks', label: 'Mikrotiks' },
  { key: 'tunnels', label: 'Tunnels' },
  { key: 'settings', label: 'Settings' }
];

const emptyCreateUserForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  passwordConfirmation: ''
};

const emptyManageUserForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  passwordConfirmation: '',
  roleIds: []
};

const emptyRoleForm = {
  name: '',
  permissions: permissionCatalog.reduce((acc, { key }) => ({ ...acc, [key]: false }), {})
};

const Users = ({ initialTab = 'users' }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();

  const [activeTab, setActiveTab] = useState(initialTab);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [filters, setFilters] = useState({ users: '', roles: '' });

  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createUserForm, setCreateUserForm] = useState(emptyCreateUserForm);
  const [createUserBusy, setCreateUserBusy] = useState(false);

  const [manageUserState, setManageUserState] = useState({ open: false, userId: null, form: emptyManageUserForm });
  const [manageUserBusy, setManageUserBusy] = useState(false);
  const [deleteUserBusy, setDeleteUserBusy] = useState(false);

  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [createRoleForm, setCreateRoleForm] = useState(emptyRoleForm);
  const [createRoleBusy, setCreateRoleBusy] = useState(false);

  const [manageRoleState, setManageRoleState] = useState({ open: false, roleId: null, form: emptyRoleForm });
  const [manageRoleBusy, setManageRoleBusy] = useState(false);
  const [deleteRoleBusy, setDeleteRoleBusy] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (!user.permissions?.users && !user.permissions?.roles) {
      navigate('/dashboard', { replace: true });
      return;
    }

    const controller = new AbortController();

    const loadData = async () => {
      try {
        setLoading(true);
        const [userResponse, roleResponse] = await Promise.all([
          fetch('/api/users', { signal: controller.signal }),
          fetch('/api/roles', { signal: controller.signal })
        ]);

        if (!userResponse.ok) {
          throw new Error('Unable to load users.');
        }

        if (!roleResponse.ok) {
          throw new Error('Unable to load roles.');
        }

        const usersPayload = await userResponse.json();
        const rolesPayload = await roleResponse.json();

        setUsers(Array.isArray(usersPayload?.users) ? usersPayload.users : []);
        setRoles(Array.isArray(rolesPayload?.roles) ? rolesPayload.roles : []);
        setStatus({ type: '', message: '' });
      } catch (error) {
        if (error.name === 'AbortError') {
          return;
        }
        setStatus({
          type: 'error',
          message: error.message || 'Directory data is unavailable. Confirm the API is reachable and refresh the page.'
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();

    return () => controller.abort();
  }, [navigate, user, location.pathname]);

  const refreshUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Unable to refresh the user directory.');
      }
      const payload = await response.json();
      setUsers(Array.isArray(payload?.users) ? payload.users : []);
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Unable to refresh the user directory right now.' });
    }
  }, []);

  const refreshRoles = useCallback(async () => {
    try {
      const response = await fetch('/api/roles');
      if (!response.ok) {
        throw new Error('Unable to refresh the role directory.');
      }
      const payload = await response.json();
      setRoles(Array.isArray(payload?.roles) ? payload.roles : []);
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Unable to refresh the role directory right now.' });
    }
  }, []);

  const filteredUsers = useMemo(() => {
    const query = filters.users.trim().toLowerCase();
    if (!query) {
      return users;
    }

    return users.filter((entry) => {
      const nameMatch = `${entry.firstName ?? ''} ${entry.lastName ?? ''}`.toLowerCase().includes(query);
      const emailMatch = (entry.email ?? '').toLowerCase().includes(query);
      const roleMatch = Array.isArray(entry.roles)
        ? entry.roles.some((role) => role.name?.toLowerCase().includes(query))
        : false;
      return nameMatch || emailMatch || roleMatch;
    });
  }, [filters.users, users]);

  const filteredRoles = useMemo(() => {
    const query = filters.roles.trim().toLowerCase();
    if (!query) {
      return roles;
    }

    return roles.filter((entry) => {
      const nameMatch = (entry.name ?? '').toLowerCase().includes(query);
      const permissionMatch = permissionCatalog.some((permission) =>
        entry.permissions?.[permission.key] && permission.label.toLowerCase().includes(query)
      );
      return nameMatch || permissionMatch;
    });
  }, [filters.roles, roles]);

  const openCreateUserModal = () => {
    setCreateUserForm(emptyCreateUserForm);
    setCreateUserOpen(true);
    setStatus({ type: '', message: '' });
  };

  const openManageUserModal = (record) => {
    setManageUserState({
      open: true,
      userId: record.id,
      form: {
        firstName: record.firstName ?? '',
        lastName: record.lastName ?? '',
        email: record.email ?? '',
        password: '',
        passwordConfirmation: '',
        roleIds: Array.isArray(record.roleIds) ? record.roleIds : []
      }
    });
    setStatus({ type: '', message: '' });
  };

  const closeManageUserModal = () => {
    setManageUserState({ open: false, userId: null, form: emptyManageUserForm });
    setManageUserBusy(false);
    setDeleteUserBusy(false);
  };

  const handleCreateUserFieldChange = (event) => {
    const { name, value } = event.target;
    setCreateUserForm((current) => ({ ...current, [name]: value }));
  };

  const handleManageUserFieldChange = (event) => {
    const { name, value, type, checked } = event.target;
    if (name === 'roleIds') {
      const roleId = Number.parseInt(value, 10);
      setManageUserState((current) => {
        const currentRoles = new Set(current.form.roleIds);
        if (checked) {
          currentRoles.add(roleId);
        } else {
          currentRoles.delete(roleId);
        }
        return {
          ...current,
          form: { ...current.form, roleIds: Array.from(currentRoles) }
        };
      });
      return;
    }

    if (type === 'checkbox') {
      setManageUserState((current) => ({
        ...current,
        form: { ...current.form, [name]: checked }
      }));
      return;
    }

    setManageUserState((current) => ({
      ...current,
      form: { ...current.form, [name]: value }
    }));
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setCreateUserBusy(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createUserForm)
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          payload?.message ||
          (response.status === 502
            ? 'User creation is unavailable (502 Bad Gateway). Confirm the backend is reachable.'
            : 'Unable to create the user.');
        throw new Error(message);
      }

      if (payload?.user) {
        setUsers((current) => [...current, payload.user]);
      } else {
        await refreshUsers();
      }

      setStatus({ type: 'success', message: 'User created successfully.' });
      setCreateUserOpen(false);
      setCreateUserForm(emptyCreateUserForm);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setCreateUserBusy(false);
    }
  };

  const handleUpdateUser = async (event) => {
    event.preventDefault();
    if (!manageUserState.userId) {
      return;
    }

    setManageUserBusy(true);
    setStatus({ type: '', message: '' });

    const payload = {
      firstName: manageUserState.form.firstName,
      lastName: manageUserState.form.lastName,
      email: manageUserState.form.email,
      roles: manageUserState.form.roleIds
    };

    if (manageUserState.form.password || manageUserState.form.passwordConfirmation) {
      payload.password = manageUserState.form.password;
      payload.passwordConfirmation = manageUserState.form.passwordConfirmation;
    }

    try {
      const response = await fetch(`/api/users/${manageUserState.userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const responseBody = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          responseBody?.message ||
          (response.status === 502
            ? 'Updates are unavailable (502 Bad Gateway). Confirm the backend is reachable.'
            : 'Unable to update the user.');
        throw new Error(message);
      }

      const updatedUser = responseBody?.user ?? null;

      if (updatedUser) {
        setUsers((current) => current.map((entry) => (entry.id === updatedUser.id ? updatedUser : entry)));

        if (user && updatedUser.id === user.id) {
          updateUser((current) => ({ ...current, ...updatedUser }));
        }
      } else {
        await refreshUsers();
      }

      setStatus({ type: 'success', message: 'User details updated successfully.' });
      closeManageUserModal();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setManageUserBusy(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!manageUserState.userId) {
      return;
    }

    setDeleteUserBusy(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch(`/api/users/${manageUserState.userId}`, {
        method: 'DELETE'
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = payload?.message || 'Unable to delete the selected user.';
        throw new Error(message);
      }

      setUsers((current) => current.filter((entry) => entry.id !== manageUserState.userId));

      if (user && manageUserState.userId === user.id) {
        logout();
      }

      setStatus({ type: 'success', message: 'User removed successfully.' });
      closeManageUserModal();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setDeleteUserBusy(false);
    }
  };

  const handleCreateRoleFieldChange = (event) => {
    const { name, value, type, checked } = event.target;
    if (type === 'checkbox') {
      setCreateRoleForm((current) => ({
        ...current,
        permissions: { ...current.permissions, [name]: checked }
      }));
      return;
    }

    setCreateRoleForm((current) => ({ ...current, [name]: value }));
  };

  const handleManageRoleFieldChange = (event) => {
    const { name, value, type, checked } = event.target;

    if (type === 'checkbox') {
      setManageRoleState((current) => ({
        ...current,
        form: {
          ...current.form,
          permissions: { ...current.form.permissions, [name]: checked }
        }
      }));
      return;
    }

    setManageRoleState((current) => ({
      ...current,
      form: { ...current.form, [name]: value }
    }));
  };

  const openCreateRoleModal = () => {
    setCreateRoleForm(emptyRoleForm);
    setCreateRoleOpen(true);
    setStatus({ type: '', message: '' });
  };

  const openManageRoleModal = (roleRecord) => {
    setManageRoleState({
      open: true,
      roleId: roleRecord.id,
      form: {
        name: roleRecord.name ?? '',
        permissions: { ...emptyRoleForm.permissions, ...(roleRecord.permissions ?? {}) }
      }
    });
    setStatus({ type: '', message: '' });
  };

  const closeManageRoleModal = () => {
    setManageRoleState({ open: false, roleId: null, form: emptyRoleForm });
    setManageRoleBusy(false);
    setDeleteRoleBusy(false);
  };

  const handleCreateRole = async (event) => {
    event.preventDefault();
    setCreateRoleBusy(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createRoleForm)
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = payload?.message || 'Unable to create the role.';
        throw new Error(message);
      }

      if (payload?.role) {
        setRoles((current) => [...current, payload.role]);
      } else {
        await refreshRoles();
      }

      setStatus({ type: 'success', message: 'Role created successfully.' });
      setCreateRoleOpen(false);
      setCreateRoleForm(emptyRoleForm);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setCreateRoleBusy(false);
    }
  };

  const handleUpdateRole = async (event) => {
    event.preventDefault();

    if (!manageRoleState.roleId) {
      return;
    }

    setManageRoleBusy(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch(`/api/roles/${manageRoleState.roleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(manageRoleState.form)
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = payload?.message || 'Unable to update the role.';
        throw new Error(message);
      }

      if (payload?.role) {
        setRoles((current) => current.map((entry) => (entry.id === payload.role.id ? payload.role : entry)));
        await refreshUsers();
      } else {
        await Promise.all([refreshRoles(), refreshUsers()]);
      }

      setStatus({ type: 'success', message: 'Role updated successfully.' });
      closeManageRoleModal();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setManageRoleBusy(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!manageRoleState.roleId) {
      return;
    }

    setDeleteRoleBusy(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch(`/api/roles/${manageRoleState.roleId}`, {
        method: 'DELETE'
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = payload?.message || 'Unable to delete the selected role.';
        throw new Error(message);
      }

      setRoles((current) => current.filter((entry) => entry.id !== manageRoleState.roleId));
      await refreshUsers();
      setStatus({ type: 'success', message: 'Role removed successfully.' });
      closeManageRoleModal();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setDeleteRoleBusy(false);
    }
  };

  const renderUserList = () => {
    if (loading) {
      return <p>Loading users…</p>;
    }

    if (filteredUsers.length === 0) {
      return <p>No users found.</p>;
    }

    return (
      <ul className="management-list" aria-live="polite">
        {filteredUsers.map((entry) => (
          <li key={entry.id} className="management-list__item">
            <div className="management-list__summary">
              <span className="management-list__title">
                {entry.firstName} {entry.lastName}
              </span>
              <div className="management-list__meta">
                <span>{entry.email}</span>
                <span>Created {new Date(entry.createdAt).toLocaleString()}</span>
                <span>
                  Roles:{' '}
                  {Array.isArray(entry.roles) && entry.roles.length > 0
                    ? entry.roles.map((role) => role.name).join(', ')
                    : '—'}
                </span>
              </div>
            </div>
            <div className="management-list__actions">
              <button type="button" className="action-button" onClick={() => openManageUserModal(entry)}>
                Manage
              </button>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  const renderRoleList = () => {
    if (loading) {
      return <p>Loading roles…</p>;
    }

    if (filteredRoles.length === 0) {
      return <p>No roles found.</p>;
    }

    return (
      <ul className="management-list" aria-live="polite">
        {filteredRoles.map((entry) => (
          <li key={entry.id} className="management-list__item">
            <div className="management-list__summary">
              <span className="management-list__title">{entry.name}</span>
              <div className="management-list__meta">
                <span>Created {new Date(entry.createdAt).toLocaleString()}</span>
                <span>
                  Permissions:{' '}
                  {permissionCatalog
                    .filter((permission) => Boolean(entry.permissions?.[permission.key]))
                    .map((permission) => permission.label)
                    .join(', ') || '—'}
                </span>
              </div>
            </div>
            <div className="management-list__actions">
              <button type="button" className="action-button" onClick={() => openManageRoleModal(entry)}>
                Manage
              </button>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  const renderPermissionCheckboxes = (form, onChange) => (
    <div className="permission-grid">
      {permissionCatalog.map((permission) => (
        <label key={permission.key} className="permission-checkbox">
          <input
            type="checkbox"
            name={permission.key}
            checked={Boolean(form.permissions?.[permission.key])}
            onChange={onChange}
          />
          <span>{permission.label}</span>
        </label>
      ))}
    </div>
  );

  return (
    <div className="management-page">
      <div className="management-toolbar management-toolbar--stacked">
        <div>
          <h1>User &amp; Role directory</h1>
          <p className="management-description">
            Invite operators, reset credentials, and curate role-based permissions from a single workspace.
          </p>
        </div>
        <div className="toolbar-actions">
          <input
            type="search"
            value={activeTab === 'users' ? filters.users : filters.roles}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                [activeTab]: event.target.value
              }))
            }
            placeholder={activeTab === 'users' ? 'Filter by name, email, or role' : 'Filter by role or permission'}
            className="toolbar-filter"
          />
          {activeTab === 'users' ? (
            <button type="button" className="action-button action-button--primary" onClick={openCreateUserModal}>
              Add user
            </button>
          ) : (
            <button type="button" className="action-button action-button--primary" onClick={openCreateRoleModal}>
              Add role
            </button>
          )}
        </div>
      </div>

      <div className="tab-strip" role="tablist">
        <button
          type="button"
          className={`tab-strip__tab${activeTab === 'users' ? ' tab-strip__tab--active' : ''}`}
          role="tab"
          aria-selected={activeTab === 'users'}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button
          type="button"
          className={`tab-strip__tab${activeTab === 'roles' ? ' tab-strip__tab--active' : ''}`}
          role="tab"
          aria-selected={activeTab === 'roles'}
          onClick={() => setActiveTab('roles')}
        >
          Roles
        </button>
      </div>

      {status.message ? <p className={`page-status page-status--${status.type}`}>{status.message}</p> : null}

      <section className="tab-panel" role="tabpanel">
        {activeTab === 'users' ? renderUserList() : renderRoleList()}
      </section>

      <Modal
        title="Add user"
        open={createUserOpen}
        onClose={() => setCreateUserOpen(false)}
        actions={[
          {
            label: 'Cancel',
            variant: 'ghost',
            onClick: () => setCreateUserOpen(false),
            disabled: createUserBusy
          },
          {
            label: createUserBusy ? 'Creating…' : 'Create user',
            variant: 'primary',
            type: 'submit',
            form: 'create-user-form',
            disabled: createUserBusy
          }
        ]}
      >
        <form id="create-user-form" className="form-grid" onSubmit={handleCreateUser}>
          <label>
            <span>First name</span>
            <input
              name="firstName"
              value={createUserForm.firstName}
              onChange={handleCreateUserFieldChange}
              autoComplete="given-name"
              required
            />
          </label>
          <label>
            <span>Last name</span>
            <input
              name="lastName"
              value={createUserForm.lastName}
              onChange={handleCreateUserFieldChange}
              autoComplete="family-name"
              required
            />
          </label>
          <label className="wide">
            <span>Email</span>
            <input
              type="email"
              name="email"
              value={createUserForm.email}
              onChange={handleCreateUserFieldChange}
              autoComplete="email"
              required
            />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              name="password"
              value={createUserForm.password}
              onChange={handleCreateUserFieldChange}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <label>
            <span>Confirm password</span>
            <input
              type="password"
              name="passwordConfirmation"
              value={createUserForm.passwordConfirmation}
              onChange={handleCreateUserFieldChange}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
        </form>
      </Modal>

      <Modal
        title="Manage user"
        open={manageUserState.open}
        onClose={closeManageUserModal}
        actions={[
          {
            label: deleteUserBusy ? 'Deleting…' : 'Delete',
            variant: 'danger',
            onClick: handleDeleteUser,
            disabled: manageUserBusy || deleteUserBusy
          },
          {
            label: 'Cancel',
            variant: 'ghost',
            onClick: closeManageUserModal,
            disabled: manageUserBusy
          },
          {
            label: manageUserBusy ? 'Saving…' : 'Save changes',
            variant: 'primary',
            type: 'submit',
            form: 'manage-user-form',
            disabled: manageUserBusy
          }
        ]}
      >
        <form id="manage-user-form" className="form-grid" onSubmit={handleUpdateUser}>
          <label>
            <span>First name</span>
            <input
              name="firstName"
              value={manageUserState.form.firstName}
              onChange={handleManageUserFieldChange}
              required
            />
          </label>
          <label>
            <span>Last name</span>
            <input
              name="lastName"
              value={manageUserState.form.lastName}
              onChange={handleManageUserFieldChange}
              required
            />
          </label>
          <label className="wide">
            <span>Email</span>
            <input
              type="email"
              name="email"
              value={manageUserState.form.email}
              onChange={handleManageUserFieldChange}
              required
            />
          </label>
          <fieldset className="wide">
            <legend>Assign roles</legend>
            <div className="role-checkboxes">
              {roles.map((role) => (
                <label key={role.id}>
                  <input
                    type="checkbox"
                    name="roleIds"
                    value={role.id}
                    checked={manageUserState.form.roleIds.includes(role.id)}
                    onChange={handleManageUserFieldChange}
                  />
                  <span>{role.name}</span>
                </label>
              ))}
              {roles.length === 0 ? <p className="muted">No roles defined yet.</p> : null}
            </div>
          </fieldset>
          <label>
            <span>New password</span>
            <input
              type="password"
              name="password"
              value={manageUserState.form.password}
              onChange={handleManageUserFieldChange}
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <label>
            <span>Confirm password</span>
            <input
              type="password"
              name="passwordConfirmation"
              value={manageUserState.form.passwordConfirmation}
              onChange={handleManageUserFieldChange}
              minLength={8}
              autoComplete="new-password"
            />
          </label>
        </form>
      </Modal>

      <Modal
        title="Add role"
        open={createRoleOpen}
        onClose={() => setCreateRoleOpen(false)}
        actions={[
          {
            label: 'Cancel',
            variant: 'ghost',
            onClick: () => setCreateRoleOpen(false),
            disabled: createRoleBusy
          },
          {
            label: createRoleBusy ? 'Creating…' : 'Create role',
            variant: 'primary',
            type: 'submit',
            form: 'create-role-form',
            disabled: createRoleBusy
          }
        ]}
      >
        <form id="create-role-form" className="form-grid" onSubmit={handleCreateRole}>
          <label className="wide">
            <span>Role name</span>
            <input name="name" value={createRoleForm.name} onChange={handleCreateRoleFieldChange} required />
          </label>
          <fieldset className="wide">
            <legend>Permissions</legend>
            {renderPermissionCheckboxes(createRoleForm, handleCreateRoleFieldChange)}
          </fieldset>
        </form>
      </Modal>

      <Modal
        title="Manage role"
        open={manageRoleState.open}
        onClose={closeManageRoleModal}
        actions={[
          {
            label: deleteRoleBusy ? 'Deleting…' : 'Delete',
            variant: 'danger',
            onClick: handleDeleteRole,
            disabled: manageRoleBusy || deleteRoleBusy
          },
          {
            label: 'Cancel',
            variant: 'ghost',
            onClick: closeManageRoleModal,
            disabled: manageRoleBusy
          },
          {
            label: manageRoleBusy ? 'Saving…' : 'Save changes',
            variant: 'primary',
            type: 'submit',
            form: 'manage-role-form',
            disabled: manageRoleBusy
          }
        ]}
      >
        <form id="manage-role-form" className="form-grid" onSubmit={handleUpdateRole}>
          <label className="wide">
            <span>Role name</span>
            <input name="name" value={manageRoleState.form.name} onChange={handleManageRoleFieldChange} required />
          </label>
          <fieldset className="wide">
            <legend>Permissions</legend>
            {renderPermissionCheckboxes(manageRoleState.form, handleManageRoleFieldChange)}
          </fieldset>
        </form>
      </Modal>
    </div>
  );
};

export default Users;
