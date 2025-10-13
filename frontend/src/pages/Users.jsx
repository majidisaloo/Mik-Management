import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const emptyCreateForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  passwordConfirmation: ''
};

const emptyManageForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  passwordConfirmation: '',
  roleIds: []
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

const Users = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [createBusy, setCreateBusy] = useState(false);
  const [manageState, setManageState] = useState({ open: false, userId: null, form: emptyManageForm });
  const [manageBusy, setManageBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (!user.permissions?.users) {
      navigate('/dashboard', { replace: true });
      return;
    }

    const controller = new AbortController();

    const load = async () => {
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
          message:
            error.message ||
            'User management is unavailable right now. Confirm the API is reachable and refresh the page.'
        });
      } finally {
        setLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, [navigate, user]);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const createdA = new Date(a.createdAt || 0).getTime();
      const createdB = new Date(b.createdAt || 0).getTime();
      if (Number.isNaN(createdA) || Number.isNaN(createdB)) {
        return a.firstName.localeCompare(b.firstName);
      }
      return createdA - createdB;
    });
  }, [users]);

  const openCreateModal = () => {
    setCreateForm(emptyCreateForm);
    setCreateOpen(true);
    setStatus({ type: '', message: '' });
  };

  const openManageModal = (userRecord) => {
    setManageState({
      open: true,
      userId: userRecord.id,
      form: {
        firstName: userRecord.firstName ?? '',
        lastName: userRecord.lastName ?? '',
        email: userRecord.email ?? '',
        password: '',
        passwordConfirmation: '',
        roleIds: Array.isArray(userRecord.roleIds) ? userRecord.roleIds : []
      }
    });
    setStatus({ type: '', message: '' });
  };

  const closeManageModal = () => {
    setManageState({ open: false, userId: null, form: emptyManageForm });
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

  const handleRoleToggle = (roleId) => {
    setManageState((current) => {
      const existing = new Set(current.form.roleIds ?? []);
      if (existing.has(roleId)) {
        existing.delete(roleId);
      } else {
        existing.add(roleId);
      }

      return {
        ...current,
        form: { ...current.form, roleIds: [...existing] }
      };
    });
  };

  const refreshUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Unable to refresh the user directory.');
      }
      const payload = await response.json();
      setUsers(Array.isArray(payload?.users) ? payload.users : []);
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Unable to refresh the user directory right now.'
      });
    }
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setCreateBusy(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createForm)
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          payload?.message ||
          (response.status === 502
            ? 'Registration is unavailable (502 Bad Gateway). Confirm the API service is online.'
            : 'Unable to create the user.');
        throw new Error(message);
      }

      setStatus({ type: 'success', message: 'User created successfully.' });
      setCreateOpen(false);
      setCreateForm(emptyCreateForm);
      await refreshUsers();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setCreateBusy(false);
    }
  };

  const handleUpdateUser = async (event) => {
    event.preventDefault();
    if (!manageState.userId) {
      return;
    }

    setManageBusy(true);
    setStatus({ type: '', message: '' });

    const payload = {
      firstName: manageState.form.firstName,
      lastName: manageState.form.lastName,
      email: manageState.form.email,
      roles: manageState.form.roleIds
    };

    if (manageState.form.password || manageState.form.passwordConfirmation) {
      payload.password = manageState.form.password;
      payload.passwordConfirmation = manageState.form.passwordConfirmation;
    }

    try {
      const response = await fetch(`/api/users/${manageState.userId}`, {
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
      closeManageModal();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setManageBusy(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!manageState.userId) {
      return;
    }

    setDeleteBusy(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch(`/api/users/${manageState.userId}`, {
        method: 'DELETE'
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = payload?.message || 'Unable to delete the selected user.';
        throw new Error(message);
      }

      setUsers((current) => current.filter((entry) => entry.id !== manageState.userId));

      if (user && manageState.userId === user.id) {
        logout();
      }

      setStatus({ type: 'success', message: 'User removed successfully.' });
      closeManageModal();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div>
      <div className="management-toolbar">
        <h1>User management</h1>
        <button type="button" className="action-button action-button--primary" onClick={openCreateModal}>
          Add user
        </button>
      </div>

      {status.message ? <div className={`page-status page-status--${status.type}`}>{status.message}</div> : null}

      {loading ? (
        <p>Loading users…</p>
      ) : sortedUsers.length === 0 ? (
        <p>No users have been registered yet.</p>
      ) : (
        <ul className="management-list" aria-live="polite">
          {sortedUsers.map((entry) => (
            <li key={entry.id} className="management-list__item">
              <div className="management-list__summary">
                <span className="management-list__title">
                  {entry.firstName} {entry.lastName}
                </span>
                <div className="management-list__meta">
                  <span>{entry.email}</span>
                  <span>Created {formatDateTime(entry.createdAt)}</span>
                  <span>
                    Roles:
                    {Array.isArray(entry.roles) && entry.roles.length > 0
                      ? ` ${entry.roles.map((role) => role.name).join(', ')}`
                      : ' —'}
                  </span>
                </div>
              </div>
              <div className="management-list__actions">
                <button
                  type="button"
                  className="action-button action-button--ghost"
                  onClick={() => openManageModal(entry)}
                >
                  Manage
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {createOpen ? (
        <Modal
          title="Create user"
          description="Provide contact details and a strong password to add a new operator to MikroManage."
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
                form="create-user-form"
                className="action-button action-button--primary"
                disabled={createBusy}
              >
                {createBusy ? 'Saving…' : 'Create'}
              </button>
            </>
          }
        >
          <form id="create-user-form" onSubmit={handleCreateUser} className="form-grid">
            <label>
              <span>First name</span>
              <input
                name="firstName"
                value={createForm.firstName}
                onChange={handleCreateFieldChange}
                required
              />
            </label>
            <label>
              <span>Last name</span>
              <input name="lastName" value={createForm.lastName} onChange={handleCreateFieldChange} required />
            </label>
            <label>
              <span>Email</span>
              <input
                name="email"
                type="email"
                value={createForm.email}
                onChange={handleCreateFieldChange}
                required
              />
            </label>
            <label>
              <span>Password</span>
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                value={createForm.password}
                onChange={handleCreateFieldChange}
                required
              />
            </label>
            <label>
              <span>Confirm password</span>
              <input
                name="passwordConfirmation"
                type="password"
                autoComplete="new-password"
                value={createForm.passwordConfirmation}
                onChange={handleCreateFieldChange}
                required
              />
            </label>
          </form>
        </Modal>
      ) : null}

      {manageState.open ? (
        <Modal
          title="Manage user"
          description="Update profile details, rotate credentials, or assign roles to control access."
          onClose={closeManageModal}
          actions={
            <>
              <button type="button" className="action-button" onClick={closeManageModal}>
                Close
              </button>
              <button
                type="button"
                className="action-button action-button--danger"
                onClick={handleDeleteUser}
                disabled={deleteBusy}
              >
                {deleteBusy ? 'Removing…' : 'Delete'}
              </button>
              <button
                type="submit"
                form="manage-user-form"
                className="action-button action-button--primary"
                disabled={manageBusy}
              >
                {manageBusy ? 'Saving…' : 'Save changes'}
              </button>
            </>
          }
        >
          <form id="manage-user-form" onSubmit={handleUpdateUser} className="form-grid">
            <label>
              <span>First name</span>
              <input
                name="firstName"
                value={manageState.form.firstName}
                onChange={handleManageFieldChange}
                required
              />
            </label>
            <label>
              <span>Last name</span>
              <input
                name="lastName"
                value={manageState.form.lastName}
                onChange={handleManageFieldChange}
                required
              />
            </label>
            <label>
              <span>Email</span>
              <input
                name="email"
                type="email"
                value={manageState.form.email}
                onChange={handleManageFieldChange}
                required
              />
            </label>
            <fieldset className="form-fieldset">
              <legend>Assign roles</legend>
              {roles.length === 0 ? (
                <p>No roles available yet.</p>
              ) : (
                roles.map((role) => {
                  const checked = manageState.form.roleIds?.includes(role.id);
                  return (
                    <label key={role.id} className="checkbox-field">
                      <input
                        type="checkbox"
                        value={role.id}
                        checked={checked}
                        onChange={() => handleRoleToggle(role.id)}
                      />
                      <span>
                        {role.name}
                        <small>{role.description}</small>
                      </span>
                    </label>
                  );
                })
              )}
            </fieldset>
            <label>
              <span>New password (optional)</span>
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="Leave blank to keep the current password"
                value={manageState.form.password}
                onChange={handleManageFieldChange}
              />
            </label>
            <label>
              <span>Confirm password</span>
              <input
                name="passwordConfirmation"
                type="password"
                autoComplete="new-password"
                value={manageState.form.passwordConfirmation}
                onChange={handleManageFieldChange}
              />
            </label>
          </form>
        </Modal>
      ) : null}
    </div>
  );
};

export default Users;
