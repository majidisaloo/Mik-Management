import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  passwordConfirmation: '',
  roleIds: []
};

const Users = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const selectedUser = useMemo(
    () => users.find((entry) => entry.id === selectedUserId) ?? null,
    [users, selectedUserId]
  );

  const formatDateTime = (value) => {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
        const [usersResponse, rolesResponse] = await Promise.all([
          fetch('/api/users', { signal: controller.signal }),
          fetch('/api/roles', { signal: controller.signal })
        ]);

        if (!usersResponse.ok) {
          throw new Error('Unable to load users from the server.');
        }

        if (!rolesResponse.ok) {
          throw new Error('Unable to load roles from the server.');
        }

        const usersPayload = await usersResponse.json();
        const rolesPayload = await rolesResponse.json();

        const loadedUsers = Array.isArray(usersPayload?.users) ? usersPayload.users : [];
        const loadedRoles = Array.isArray(rolesPayload?.roles) ? rolesPayload.roles : [];

        setUsers(loadedUsers);
        setRoles(loadedRoles);

        if (loadedUsers.length > 0) {
          setSelectedUserId(loadedUsers[0].id);
        } else {
          setSelectedUserId(null);
        }

        setStatus({ type: '', message: '' });
      } catch (error) {
        if (error.name !== 'AbortError') {
          setStatus({
            type: 'error',
            message:
              error.message ||
              'User management is unavailable right now. Confirm the API is reachable and refresh the page.'
          });
        }
      } finally {
        setLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, [navigate, user]);

  useEffect(() => {
    if (!selectedUser) {
      setForm(emptyForm);
      return;
    }

    setForm({
      firstName: selectedUser.firstName ?? '',
      lastName: selectedUser.lastName ?? '',
      email: selectedUser.email ?? '',
      password: '',
      passwordConfirmation: '',
      roleIds: Array.isArray(selectedUser.roleIds) ? selectedUser.roleIds : []
    });
  }, [selectedUser]);

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleUserChange = (event) => {
    const nextId = Number.parseInt(event.target.value, 10);
    setSelectedUserId(Number.isInteger(nextId) ? nextId : null);
    setStatus({ type: '', message: '' });
  };

  const handleRoleToggle = (event) => {
    const roleId = Number.parseInt(event.target.value, 10);

    if (!Number.isInteger(roleId)) {
      return;
    }

    setForm((current) => {
      const hasRole = current.roleIds.includes(roleId);
      const nextRoles = hasRole
        ? current.roleIds.filter((value) => value !== roleId)
        : [...current.roleIds, roleId];
      return { ...current, roleIds: nextRoles };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedUserId) {
      setStatus({ type: 'error', message: 'Select a user to update before saving changes.' });
      return;
    }

    setSaving(true);
    setStatus({ type: '', message: '' });

    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      roles: form.roleIds
    };

    if (form.password || form.passwordConfirmation) {
      payload.password = form.password;
      payload.passwordConfirmation = form.passwordConfirmation;
    }

    try {
      const response = await fetch(`/api/users/${selectedUserId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const statusCode = response.status;
        const contentType = response.headers.get('content-type') ?? '';
        let message = 'User update failed.';

        if (statusCode === 502) {
          message = 'Updates are unavailable (502 Bad Gateway). Confirm the backend service is online.';
        }

        if (statusCode >= 500 && statusCode !== 502) {
          message = `The server returned an error (${statusCode}). Please retry.`;
        }

        if (contentType.includes('application/json')) {
          const payloadBody = await response.json().catch(() => ({}));
          if (payloadBody?.message) {
            message = payloadBody.message;
          }
        } else {
          const fallbackText = await response.text().catch(() => '');
          if (fallbackText) {
            message = fallbackText;
          }
        }

        throw new Error(message);
      }

      const payloadBody = await response.json();
      const updatedUser = payloadBody?.user;

      if (updatedUser) {
        setUsers((current) => current.map((entry) => (entry.id === updatedUser.id ? updatedUser : entry)));

        if (user && updatedUser.id === user.id) {
          updateUser(updatedUser);
        }
      }

      setForm((current) => ({ ...current, password: '', passwordConfirmation: '' }));
      setStatus({ type: 'success', message: payloadBody?.message ?? 'User updated successfully.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'User update failed.' });
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return null;
  }

  if (!user.permissions?.users) {
    return (
      <section className="card">
        <h1>User management</h1>
        <p className="muted">You do not have permission to view the user directory.</p>
      </section>
    );
  }

  return (
    <div className="dashboard">
      <section className="card">
        <header className="card-header">
          <div>
            <h1>User management</h1>
            <p className="card-intro">
              Review every account, update contact details, rotate passwords, and assign roles so each operator only sees the
              areas they need.
            </p>
          </div>
        </header>
        <div className="management-grid">
          <div className="management-list">
            <label className="wide">
              <span>Select user</span>
              <select value={selectedUserId ?? ''} onChange={handleUserChange} disabled={loading}>
                {users.length === 0 && <option value="">No users available</option>}
                {users.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.firstName} {entry.lastName} ({entry.email})
                  </option>
                ))}
              </select>
            </label>
            <div className="user-table-wrapper">
              <table className="user-table">
                <thead>
                  <tr>
                    <th scope="col">ID</th>
                    <th scope="col">Name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Created</th>
                    <th scope="col">Roles</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((entry) => {
                    const roleNames = Array.isArray(entry.roles)
                      ? entry.roles.map((role) => role.name).join(', ')
                      : '';
                    const createdDisplay = formatDateTime(entry.createdAt);

                    return (
                      <tr key={entry.id} className={entry.id === selectedUserId ? 'active-row' : ''}>
                        <td>{entry.id}</td>
                        <td>{`${entry.firstName} ${entry.lastName}`.trim()}</td>
                        <td>{entry.email}</td>
                        <td>{createdDisplay || '—'}</td>
                        <td>{roleNames || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <form className="form-grid management-form" onSubmit={handleSubmit}>
            <h2 className="wide">Update details</h2>
            <label>
              <span>First name</span>
              <input
                name="firstName"
                value={form.firstName}
                onChange={handleFieldChange}
                autoComplete="given-name"
                required
              />
            </label>
            <label>
              <span>Last name</span>
              <input
                name="lastName"
                value={form.lastName}
                onChange={handleFieldChange}
                autoComplete="family-name"
                required
              />
            </label>
            <label className="wide">
              <span>Email</span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleFieldChange}
                autoComplete="email"
                required
              />
            </label>
            <fieldset className="wide">
              <legend>Password reset (optional)</legend>
              <p className="muted small">Leave blank to keep the current password.</p>
              {selectedUser?.createdAt ? (
                <p className="muted small">
                  Account created{' '}
                  <time dateTime={selectedUser.createdAt}>{formatDateTime(selectedUser.createdAt)}</time>
                </p>
              ) : null}
              <label>
                <span>New password</span>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleFieldChange}
                  autoComplete="new-password"
                  placeholder="••••••••"
                />
              </label>
              <label>
                <span>Confirm password</span>
                <input
                  type="password"
                  name="passwordConfirmation"
                  value={form.passwordConfirmation}
                  onChange={handleFieldChange}
                  autoComplete="new-password"
                  placeholder="••••••••"
                />
              </label>
            </fieldset>
            <fieldset className="wide">
              <legend>Roles</legend>
              <div className="role-grid">
                {roles.length === 0 ? (
                  <p className="muted small">Create roles from the Roles workspace to assign access levels.</p>
                ) : (
                  roles.map((role) => (
                    <label key={role.id} className="role-option">
                      <input
                        type="checkbox"
                        value={role.id}
                        checked={form.roleIds.includes(role.id)}
                        onChange={handleRoleToggle}
                      />
                      <span className="role-name">{role.name}</span>
                      <span className="role-detail">
                        Access:
                        {role.permissions.dashboard ? ' Dashboard' : ''}
                        {role.permissions.users ? ' · Users' : ''}
                        {role.permissions.roles ? ' · Roles' : ''}
                        {role.permissions.groups ? ' · Mik-Groups' : ''}
                        {role.permissions.mikrotiks ? " · Mikrotik's" : ''}
                        {role.permissions.settings ? ' · Settings' : ''}
                        {!role.permissions.dashboard &&
                        !role.permissions.users &&
                        !role.permissions.roles &&
                        !role.permissions.groups &&
                        !role.permissions.mikrotiks &&
                        !role.permissions.settings
                          ? ' None'
                          : ''}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </fieldset>
            <div className="wide button-row">
              <button type="submit" className="primary-button" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
        {loading && <p className="feedback muted">Loading users…</p>}
        {status.message && (
          <p className={`feedback ${status.type === 'error' ? 'error' : 'success'}`}>{status.message}</p>
        )}
      </section>
    </div>
  );
};

export default Users;
