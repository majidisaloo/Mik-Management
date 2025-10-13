import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  passwordConfirmation: '',
  roleIds: []
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

const RolePicker = ({ label, options, selectedIds, onToggle, disabled }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const normalizedSelected = Array.isArray(selectedIds) ? selectedIds : [];

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const selectedLabels = useMemo(() => {
    const labels = options.filter((option) => normalizedSelected.includes(option.value)).map((option) => option.label);
    if (labels.length === 0) {
      return 'No roles selected';
    }

    if (labels.length <= 2) {
      return labels.join(', ');
    }

    return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`;
  }, [options, selectedIds]);

  return (
    <div className={`role-selector${disabled ? ' role-selector--disabled' : ''}`} ref={containerRef}>
      <button
        type="button"
        className="role-selector__trigger"
        onClick={() => (disabled ? null : setOpen((current) => !current))}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
      >
        <span className="role-selector__label">{label}</span>
        <span className="role-selector__value">{selectedLabels}</span>
      </button>
      {open ? (
        <div className="role-selector__panel" role="listbox" aria-label={label}>
          {options.length === 0 ? (
            <p className="role-selector__empty">No roles available.</p>
          ) : (
            options.map((option) => {
              const selected = normalizedSelected.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`role-selector__option${selected ? ' role-selector__option--selected' : ''}`}
                  onClick={() => onToggle(option.value)}
                  role="option"
                  aria-selected={selected}
                >
                  <span className="role-selector__check" aria-hidden="true">
                    {selected ? '✓' : ''}
                  </span>
                  {option.label}
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
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

  const roleOptions = useMemo(
    () => roles.map((role) => ({ value: role.id, label: role.name ?? `Role ${role.id}` })),
    [roles]
  );

  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createUserForm, setCreateUserForm] = useState(emptyCreateUserForm);
  const [createUserBusy, setCreateUserBusy] = useState(false);

  const [manageUserState, setManageUserState] = useState({
    open: false,
    mode: 'edit',
    userId: null,
    form: emptyManageUserForm,
    record: null
  });
  const [manageUserBusy, setManageUserBusy] = useState(false);
  const [deletePrompt, setDeletePrompt] = useState({ open: false, record: null, busy: false });

  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [createRoleForm, setCreateRoleForm] = useState(emptyRoleForm);
  const [createRoleBusy, setCreateRoleBusy] = useState(false);

  const [manageRoleState, setManageRoleState] = useState({
    open: false,
    mode: 'edit',
    roleId: null,
    form: emptyRoleForm,
    record: null
  });
  const [manageRoleBusy, setManageRoleBusy] = useState(false);
  const [roleDeletePrompt, setRoleDeletePrompt] = useState({ open: false, record: null, busy: false });

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
    setCreateUserForm({ ...emptyCreateUserForm, roleIds: [] });
    setCreateUserOpen(true);
    setStatus({ type: '', message: '' });
  };

  const openManageUserModal = (record, mode = 'edit') => {
    setManageUserState({
      open: true,
      mode,
      userId: record.id,
      record,
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

  const openDeleteUserPrompt = (record) => {
    setDeletePrompt({ open: true, record, busy: false });
    setStatus({ type: '', message: '' });
  };

  const closeManageUserModal = () => {
    setManageUserState({ open: false, mode: 'edit', userId: null, record: null, form: emptyManageUserForm });
    setManageUserBusy(false);
  };

  const closeDeletePrompt = () => {
    setDeletePrompt({ open: false, record: null, busy: false });
  };

  const enableUserEditing = () => {
    setManageUserState((current) => ({ ...current, mode: 'edit' }));
  };

  const handleCreateUserFieldChange = (event) => {
    const { name, value } = event.target;
    setCreateUserForm((current) => ({ ...current, [name]: value }));
  };

  const toggleCreateUserRole = (roleId) => {
    const normalizedId = Number.parseInt(roleId, 10);
    if (Number.isNaN(normalizedId)) {
      return;
    }

    setCreateUserForm((current) => {
      const currentRoles = new Set(Array.isArray(current.roleIds) ? current.roleIds : []);

      if (currentRoles.has(normalizedId)) {
        currentRoles.delete(normalizedId);
      } else {
        currentRoles.add(normalizedId);
      }

      return { ...current, roleIds: Array.from(currentRoles) };
    });
  };

  const handleManageUserFieldChange = (event) => {
    if (manageUserState.mode !== 'edit') {
      return;
    }

    const { name, value } = event.target;

    setManageUserState((current) => ({
      ...current,
      form: { ...current.form, [name]: value }
    }));
  };

  const handleUserRoleToggle = (roleId) => {
    if (manageUserState.mode !== 'edit') {
      return;
    }

    const normalizedId = Number.parseInt(roleId, 10);

    setManageUserState((current) => {
      if (!current.open) {
        return current;
      }

      const currentRoles = new Set(Array.isArray(current.form.roleIds) ? current.form.roleIds : []);

      if (currentRoles.has(normalizedId)) {
        currentRoles.delete(normalizedId);
      } else {
        currentRoles.add(normalizedId);
      }

      return {
        ...current,
        form: { ...current.form, roleIds: Array.from(currentRoles) }
      };
    });
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setCreateUserBusy(true);
    setStatus({ type: '', message: '' });

    const payload = {
      firstName: createUserForm.firstName,
      lastName: createUserForm.lastName,
      email: createUserForm.email,
      password: createUserForm.password,
      passwordConfirmation: createUserForm.passwordConfirmation,
      roles: createUserForm.roleIds
    };

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
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
      setCreateUserForm({ ...emptyCreateUserForm, roleIds: [] });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setCreateUserBusy(false);
    }
  };

  const handleUpdateUser = async (event) => {
    event.preventDefault();
    if (!manageUserState.userId || manageUserState.mode !== 'edit') {
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
    if (!deletePrompt.record) {
      return;
    }

    setDeletePrompt((current) => ({ ...current, busy: true }));
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch(`/api/users/${deletePrompt.record.id}`, {
        method: 'DELETE'
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = payload?.message || 'Unable to delete the selected user.';
        throw new Error(message);
      }

      setUsers((current) => current.filter((entry) => entry.id !== deletePrompt.record.id));

      if (user && deletePrompt.record.id === user.id) {
        logout();
      }

      setStatus({ type: 'success', message: 'User removed successfully.' });
      closeDeletePrompt();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setDeletePrompt((current) => ({ ...current, busy: false }));
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
    if (manageRoleState.mode !== 'edit') {
      return;
    }

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

  const openManageRoleModal = (roleRecord, mode = 'edit') => {
    setManageRoleState({
      open: true,
      mode,
      roleId: roleRecord.id,
      record: roleRecord,
      form: {
        name: roleRecord.name ?? '',
        permissions: { ...emptyRoleForm.permissions, ...(roleRecord.permissions ?? {}) }
      }
    });
    setStatus({ type: '', message: '' });
  };

  const closeManageRoleModal = () => {
    setManageRoleState({ open: false, mode: 'edit', roleId: null, record: null, form: emptyRoleForm });
    setManageRoleBusy(false);
  };

  const openRoleDeletePrompt = (roleRecord) => {
    setRoleDeletePrompt({ open: true, record: roleRecord, busy: false });
    setStatus({ type: '', message: '' });
  };

  const closeRoleDeletePrompt = () => {
    setRoleDeletePrompt({ open: false, record: null, busy: false });
  };

  const enableRoleEditing = () => {
    setManageRoleState((current) => ({ ...current, mode: 'edit' }));
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

    if (!manageRoleState.roleId || manageRoleState.mode !== 'edit') {
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
    if (!roleDeletePrompt.record) {
      return;
    }

    setRoleDeletePrompt((current) => ({ ...current, busy: true }));
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch(`/api/roles/${roleDeletePrompt.record.id}`, {
        method: 'DELETE'
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = payload?.message || 'Unable to delete the selected role.';
        throw new Error(message);
      }

      setRoles((current) => current.filter((entry) => entry.id !== roleDeletePrompt.record.id));
      await refreshUsers();
      setStatus({ type: 'success', message: 'Role removed successfully.' });
      setRoleDeletePrompt({ open: false, record: null, busy: false });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setRoleDeletePrompt((current) => ({ ...current, busy: false }));
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
      <div className="directory-grid" role="list" aria-live="polite">
        {filteredUsers.map((entry) => {
          const fullName = `${entry.firstName ?? ''} ${entry.lastName ?? ''}`.trim() || entry.email;
          const createdLabel = entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '—';
          const roleNames = Array.isArray(entry.roles)
            ? entry.roles.map((role) => role.name).filter(Boolean)
            : [];

          return (
            <article key={entry.id} className="directory-card" role="listitem">
              <header className="directory-card__header">
                <div>
                  <h3 className="directory-card__title">{fullName}</h3>
                  <p className="directory-card__subtitle">{entry.email}</p>
                </div>
                <span className="directory-card__badge">ID {entry.id}</span>
              </header>
              <dl className="directory-card__meta">
                <div>
                  <dt>Created</dt>
                  <dd>{createdLabel}</dd>
                </div>
                <div>
                  <dt>Roles</dt>
                  <dd>{roleNames.length > 0 ? roleNames.join(', ') : '—'}</dd>
                </div>
              </dl>
              {roleNames.length > 0 ? (
                <ul className="directory-card__chips">
                  {entry.roles.map((role) => (
                    <li key={`${entry.id}-${role.id}`}>{role.name}</li>
                  ))}
                </ul>
              ) : null}
              <footer className="directory-card__actions">
                <button
                  type="button"
                  className="action-chip"
                  onClick={() => openManageUserModal(entry, 'view')}
                >
                  View
                </button>
                <button
                  type="button"
                  className="action-chip action-chip--primary"
                  onClick={() => openManageUserModal(entry, 'edit')}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="action-chip action-chip--danger"
                  onClick={() => openDeleteUserPrompt(entry)}
                >
                  Delete
                </button>
              </footer>
            </article>
          );
        })}
      </div>
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
      <div className="directory-grid" role="list" aria-live="polite">
        {filteredRoles.map((entry) => {
          const createdLabel = entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '—';
          const permissionLabels = permissionCatalog
            .filter((permission) => Boolean(entry.permissions?.[permission.key]))
            .map((permission) => permission.label);

          return (
            <article key={entry.id} className="directory-card" role="listitem">
              <header className="directory-card__header">
                <div>
                  <h3 className="directory-card__title">{entry.name}</h3>
                  <p className="directory-card__subtitle">
                    Assigned to {entry.assignedCount ?? 0}{' '}
                    {entry.assignedCount === 1 ? 'user' : 'users'}
                  </p>
                </div>
                <span className="directory-card__badge">ID {entry.id}</span>
              </header>
              <dl className="directory-card__meta">
                <div>
                  <dt>Created</dt>
                  <dd>{createdLabel}</dd>
                </div>
                <div>
                  <dt>Permissions</dt>
                  <dd>{permissionLabels.length > 0 ? permissionLabels.join(', ') : '—'}</dd>
                </div>
              </dl>
              {permissionLabels.length > 0 ? (
                <ul className="directory-card__chips">
                  {permissionCatalog
                    .filter((permission) => Boolean(entry.permissions?.[permission.key]))
                    .map((permission) => (
                      <li key={`${entry.id}-${permission.key}`}>{permission.label}</li>
                    ))}
                </ul>
              ) : (
                <p className="directory-card__empty">No permissions assigned yet.</p>
              )}
              <footer className="directory-card__actions">
                <button
                  type="button"
                  className="action-chip"
                  onClick={() => openManageRoleModal(entry, 'view')}
                >
                  View
                </button>
                <button
                  type="button"
                  className="action-chip action-chip--primary"
                  onClick={() => openManageRoleModal(entry, 'edit')}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="action-chip action-chip--danger"
                  onClick={() => openRoleDeletePrompt(entry)}
                >
                  Delete
                </button>
              </footer>
            </article>
          );
        })}
      </div>
    );
  };

  const renderPermissionCheckboxes = (form, onChange, { disabled = false } = {}) => (
    <div className="permission-grid">
      {permissionCatalog.map((permission) => (
        <label key={permission.key} className="permission-checkbox">
          <input
            type="checkbox"
            name={permission.key}
            checked={Boolean(form.permissions?.[permission.key])}
            onChange={onChange}
            disabled={disabled}
          />
          <span>{permission.label}</span>
        </label>
      ))}
    </div>
  );

  const userModalMode = manageUserState.mode || 'edit';
  const userReadOnly = userModalMode !== 'edit';
  const manageUserCreated = manageUserState.record?.createdAt
    ? new Date(manageUserState.record.createdAt).toLocaleString()
    : null;
  const manageUserActions =
    userModalMode === 'edit'
      ? [
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
        ]
      : [
          {
            label: 'Close',
            variant: 'ghost',
            onClick: closeManageUserModal
          },
          {
            label: 'Edit user',
            variant: 'primary',
            onClick: enableUserEditing
          }
        ];

  const roleModalMode = manageRoleState.mode || 'edit';
  const roleReadOnly = roleModalMode !== 'edit';
  const manageRoleCreated = manageRoleState.record?.createdAt
    ? new Date(manageRoleState.record.createdAt).toLocaleString()
    : null;
  const manageRoleActions =
    roleModalMode === 'edit'
      ? [
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
        ]
      : [
          {
            label: 'Close',
            variant: 'ghost',
            onClick: closeManageRoleModal
          },
          {
            label: 'Edit role',
            variant: 'primary',
            onClick: enableRoleEditing
          }
        ];

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
          <div className="form-field-group wide">
            <RolePicker
              label="Assign roles"
              options={roleOptions}
              selectedIds={createUserForm.roleIds}
              onToggle={toggleCreateUserRole}
              disabled={createUserBusy || roles.length === 0}
            />
            <p className="field-hint">
              {roles.length === 0
                ? 'Create your first role in the Roles tab to assign access.'
                : 'Select one or more roles to grant access immediately.'}
            </p>
          </div>
        </form>
      </Modal>

      <Modal
        title="Remove user"
        open={deletePrompt.open}
        onClose={deletePrompt.busy ? () => {} : closeDeletePrompt}
        actions={[
          {
            label: 'Cancel',
            variant: 'ghost',
            onClick: closeDeletePrompt,
            disabled: deletePrompt.busy
          },
          {
            label: deletePrompt.busy ? 'Deleting…' : 'Delete user',
            variant: 'danger',
            onClick: handleDeleteUser,
            disabled: deletePrompt.busy
          }
        ]}
      >
        <p className="management-list__subtitle">
          Removing <strong>{deletePrompt.record?.email ?? 'this account'}</strong> will revoke their access immediately. This
          action cannot be undone.
        </p>
      </Modal>

      <Modal
        title="Manage user"
        open={manageUserState.open}
        onClose={closeManageUserModal}
        actions={manageUserActions}
      >
        <form id="manage-user-form" className="form-sections" onSubmit={handleUpdateUser}>
          <div className="management-list__meta">
            <span>ID: {manageUserState.record?.id ?? '—'}</span>
            {manageUserCreated ? <span>Created: {manageUserCreated}</span> : null}
          </div>
          <div className="form-section">
            <p className="form-section__title">Profile</p>
            <div className="form-section__grid">
              <label>
                <span>First name</span>
                <input
                  name="firstName"
                  value={manageUserState.form.firstName}
                  onChange={handleManageUserFieldChange}
                  autoComplete="given-name"
                  required
                  disabled={userReadOnly || manageUserBusy}
                />
              </label>
              <label>
                <span>Last name</span>
                <input
                  name="lastName"
                  value={manageUserState.form.lastName}
                  onChange={handleManageUserFieldChange}
                  autoComplete="family-name"
                  required
                  disabled={userReadOnly || manageUserBusy}
                />
              </label>
              <label>
                <span>Email</span>
                <input
                  type="email"
                  name="email"
                  value={manageUserState.form.email}
                  onChange={handleManageUserFieldChange}
                  autoComplete="email"
                  required
                  disabled={userReadOnly || manageUserBusy}
                />
              </label>
            </div>
          </div>
          <div className="form-section">
            <p className="form-section__title">Credentials</p>
            <div className="form-section__grid">
              <label>
                <span>New password</span>
                <input
                  type="password"
                  name="password"
                  value={manageUserState.form.password}
                  onChange={handleManageUserFieldChange}
                  minLength={8}
                  autoComplete="new-password"
                  placeholder={userReadOnly ? '••••••••' : 'Set a new password'}
                  disabled={userReadOnly || manageUserBusy}
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
                  placeholder={userReadOnly ? '••••••••' : 'Confirm new password'}
                  disabled={userReadOnly || manageUserBusy}
                />
              </label>
            </div>
          </div>
          <div className="form-section">
            <p className="form-section__title">Roles</p>
            <RolePicker
              label="Assigned roles"
              options={roleOptions}
              selectedIds={manageUserState.form.roleIds}
              onToggle={handleUserRoleToggle}
              disabled={userReadOnly || manageUserBusy || roles.length === 0}
            />
            <p className="field-hint">
              {roles.length === 0
                ? 'No roles are available yet. Create one from the Roles tab.'
                : 'Use the selector above to adjust access while keeping the modal compact.'}
            </p>
          </div>
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
        actions={manageRoleActions}
      >
        <form id="manage-role-form" className="form-sections" onSubmit={handleUpdateRole}>
          <div className="management-list__meta">
            <span>ID: {manageRoleState.record?.id ?? '—'}</span>
            {manageRoleCreated ? <span>Created: {manageRoleCreated}</span> : null}
          </div>
          <div className="form-section">
            <p className="form-section__title">Role details</p>
            <div className="form-section__grid">
              <label>
                <span>Role name</span>
                <input
                  name="name"
                  value={manageRoleState.form.name}
                  onChange={handleManageRoleFieldChange}
                  required
                  disabled={roleReadOnly || manageRoleBusy}
                />
              </label>
            </div>
          </div>
          <div className="form-section">
            <p className="form-section__title">Permissions</p>
            {renderPermissionCheckboxes(manageRoleState.form, handleManageRoleFieldChange, {
              disabled: roleReadOnly || manageRoleBusy
            })}
            <p className="management-list__subtitle">
              Toggle the areas of MikroManage that members of this role can access.
            </p>
          </div>
        </form>
      </Modal>

      <Modal
        title="Remove role"
        open={roleDeletePrompt.open}
        onClose={roleDeletePrompt.busy ? () => {} : closeRoleDeletePrompt}
        actions={[
          {
            label: 'Cancel',
            variant: 'ghost',
            onClick: closeRoleDeletePrompt,
            disabled: roleDeletePrompt.busy
          },
          {
            label: roleDeletePrompt.busy ? 'Deleting…' : 'Delete role',
            variant: 'danger',
            onClick: handleDeleteRole,
            disabled: roleDeletePrompt.busy
          }
        ]}
      >
        <p className="management-list__subtitle">
          Removing the <strong>{roleDeletePrompt.record?.name ?? 'selected role'}</strong> role will unassign it from any users.
          Confirm that no critical accounts depend on it before continuing.
        </p>
      </Modal>
    </div>
  );
};

export default Users;
