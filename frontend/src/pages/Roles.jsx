import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const blankPermissions = () => ({
  dashboard: true,
  users: false,
  roles: false,
  groups: false
});

const Roles = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(true);
  const [savingRoleId, setSavingRoleId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', permissions: blankPermissions() });

  const canManageRoles = Boolean(user?.permissions?.roles);

  const sortedRoles = useMemo(() => roles.slice().sort((a, b) => a.name.localeCompare(b.name)), [roles]);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (!canManageRoles) {
      navigate('/dashboard', { replace: true });
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/roles', { signal: controller.signal });

        if (!response.ok) {
          throw new Error('Unable to load roles from the server.');
        }

        const payload = await response.json();
        const loadedRoles = Array.isArray(payload?.roles) ? payload.roles : [];

        setRoles(loadedRoles);
        setDrafts(
          loadedRoles.reduce((acc, role) => {
            acc[role.id] = {
              name: role.name,
              permissions: {
                dashboard: Boolean(role.permissions?.dashboard),
                users: Boolean(role.permissions?.users),
                roles: Boolean(role.permissions?.roles),
                groups: Boolean(role.permissions?.groups)
              }
            };
            return acc;
          }, {})
        );
        setStatus({ type: '', message: '' });
      } catch (error) {
        if (error.name !== 'AbortError') {
          setStatus({
            type: 'error',
            message:
              error.message ||
              'Role management is unavailable right now. Confirm the API is reachable and refresh the page.'
          });
        }
      } finally {
        setLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, [canManageRoles, navigate, user]);

  const handleDraftNameChange = (roleId, value) => {
    setDrafts((current) => ({
      ...current,
      [roleId]: {
        ...current[roleId],
        name: value
      }
    }));
  };

  const handleDraftPermissionToggle = (roleId, permission) => {
    setDrafts((current) => ({
      ...current,
      [roleId]: {
        ...current[roleId],
        permissions: {
          ...current[roleId]?.permissions,
          [permission]: !current[roleId]?.permissions?.[permission]
        }
      }
    }));
  };

  const handleSaveRole = async (roleId) => {
    const draft = drafts[roleId];

    if (!draft?.name) {
      setStatus({ type: 'error', message: 'Role name is required before saving.' });
      return;
    }

    setSavingRoleId(roleId);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch(`/api/roles/${roleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: draft.name, permissions: draft.permissions })
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type') ?? '';
        let message = 'Role update failed.';

        if (response.status === 502) {
          message = 'Role updates are unavailable (502 Bad Gateway). Confirm the backend service is online.';
        }

        if (response.status >= 500 && response.status !== 502) {
          message = `The server returned an error (${response.status}). Please retry.`;
        }

        if (contentType.includes('application/json')) {
          const payload = await response.json().catch(() => ({}));
          if (payload?.message) {
            message = payload.message;
          }
        } else {
          const fallbackText = await response.text().catch(() => '');
          if (fallbackText) {
            message = fallbackText;
          }
        }

        throw new Error(message);
      }

      const payload = await response.json();
      const updatedRole = payload?.role;

      if (updatedRole) {
        setRoles((current) => current.map((role) => (role.id === updatedRole.id ? updatedRole : role)));
        setDrafts((current) => ({
          ...current,
          [roleId]: {
            name: updatedRole.name,
            permissions: {
              dashboard: Boolean(updatedRole.permissions?.dashboard),
              users: Boolean(updatedRole.permissions?.users),
              roles: Boolean(updatedRole.permissions?.roles),
              groups: Boolean(updatedRole.permissions?.groups)
            }
          }
        }));
      }

      setStatus({ type: 'success', message: payload?.message ?? 'Role updated successfully.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Role update failed.' });
    } finally {
      setSavingRoleId(null);
    }
  };

  const handleDeleteRole = async (roleId) => {
    setSavingRoleId(roleId);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch(`/api/roles/${roleId}`, {
        method: 'DELETE'
      });

      if (response.status === 204) {
        setRoles((current) => current.filter((role) => role.id !== roleId));
        setDrafts((current) => {
          const next = { ...current };
          delete next[roleId];
          return next;
        });
        setStatus({ type: 'success', message: 'Role deleted successfully.' });
        return;
      }

      const contentType = response.headers.get('content-type') ?? '';
      let message = 'Role deletion failed.';

      if (response.status === 409) {
        message =
          'This role is still assigned to one or more users. Update the users before removing the role.';
      }

      if (contentType.includes('application/json')) {
        const payload = await response.json().catch(() => ({}));
        if (payload?.message) {
          message = payload.message;
        }
      } else {
        const fallbackText = await response.text().catch(() => '');
        if (fallbackText) {
          message = fallbackText;
        }
      }

      throw new Error(message);
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Role deletion failed.' });
    } finally {
      setSavingRoleId(null);
    }
  };

  const handleNewRoleFieldChange = (event) => {
    const { name, value } = event.target;
    setNewRole((current) => ({ ...current, [name]: value }));
  };

  const handleNewRoleToggle = (permission) => {
    setNewRole((current) => ({
      ...current,
      permissions: {
        ...current.permissions,
        [permission]: !current.permissions[permission]
      }
    }));
  };

  const handleCreateRole = async (event) => {
    event.preventDefault();

    const trimmedName = newRole.name.trim();
    if (!trimmedName) {
      setStatus({ type: 'error', message: 'Enter a name before creating the role.' });
      return;
    }

    setCreating(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: trimmedName, permissions: newRole.permissions })
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type') ?? '';
        let message = 'Role creation failed.';

        if (response.status === 502) {
          message = 'Role creation is unavailable (502 Bad Gateway). Confirm the backend service is online.';
        }

        if (response.status >= 500 && response.status !== 502) {
          message = `The server returned an error (${response.status}). Please retry.`;
        }

        if (contentType.includes('application/json')) {
          const payload = await response.json().catch(() => ({}));
          if (payload?.message) {
            message = payload.message;
          }
        } else {
          const fallbackText = await response.text().catch(() => '');
          if (fallbackText) {
            message = fallbackText;
          }
        }

        throw new Error(message);
      }

      const payload = await response.json();
      const createdRole = payload?.role;

      if (createdRole) {
        setRoles((current) => [...current, createdRole]);
        setDrafts((current) => ({
          ...current,
          [createdRole.id]: {
            name: createdRole.name,
            permissions: {
              dashboard: Boolean(createdRole.permissions?.dashboard),
              users: Boolean(createdRole.permissions?.users),
              roles: Boolean(createdRole.permissions?.roles),
              groups: Boolean(createdRole.permissions?.groups)
            }
          }
        }));
      }

      setNewRole({ name: '', permissions: blankPermissions() });
      setStatus({ type: 'success', message: payload?.message ?? 'Role created successfully.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Role creation failed.' });
    } finally {
      setCreating(false);
    }
  };

  if (!user) {
    return null;
  }

  if (!canManageRoles) {
    return (
      <section className="card">
        <h1>Role management</h1>
        <p className="muted">You do not have permission to manage roles.</p>
      </section>
    );
  }

  return (
    <div className="dashboard">
      <section className="card">
        <header className="card-header">
          <div>
            <h1>Role management</h1>
            <p className="card-intro">
              Define reusable permission sets, assign them to users, and control which areas of MikroManage are visible to each
              team.
            </p>
          </div>
        </header>
        <div className="role-management">
          <div className="existing-roles">
            <h2>Existing roles</h2>
            {sortedRoles.length === 0 && <p className="muted">No roles have been configured yet.</p>}
            <ul className="role-list">
              {sortedRoles.map((role) => {
                const draft = drafts[role.id] ?? { name: role.name, permissions: blankPermissions() };

                return (
                  <li key={role.id} className="role-card">
                    <div className="role-card-header">
                      <input
                        type="text"
                        value={draft.name}
                        onChange={(event) => handleDraftNameChange(role.id, event.target.value)}
                        aria-label={`Role name for ${role.name}`}
                      />
                      <div className="role-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => handleSaveRole(role.id)}
                          disabled={savingRoleId === role.id}
                        >
                          {savingRoleId === role.id ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => handleDeleteRole(role.id)}
                          disabled={savingRoleId === role.id}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="role-permissions">
                      <label>
                        <input
                          type="checkbox"
                          checked={Boolean(draft.permissions.dashboard)}
                          onChange={() => handleDraftPermissionToggle(role.id, 'dashboard')}
                        />
                        <span>Dashboard</span>
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={Boolean(draft.permissions.users)}
                          onChange={() => handleDraftPermissionToggle(role.id, 'users')}
                        />
                        <span>Users</span>
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={Boolean(draft.permissions.roles)}
                          onChange={() => handleDraftPermissionToggle(role.id, 'roles')}
                        />
                        <span>Roles</span>
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={Boolean(draft.permissions.groups)}
                          onChange={() => handleDraftPermissionToggle(role.id, 'groups')}
                        />
                        <span>Mik-Groups</span>
                      </label>
                    </div>
                    <p className="role-summary">
                      Effective access: {draft.permissions.dashboard ? 'Dashboard' : 'No dashboard'}
                      {draft.permissions.users ? ' · Users' : ''}
                      {draft.permissions.roles ? ' · Roles' : ''}
                      {draft.permissions.groups ? ' · Mik-Groups' : ''}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
          <form className="new-role" onSubmit={handleCreateRole}>
            <h2>Create a new role</h2>
            <label className="wide">
              <span>Role name</span>
              <input
                name="name"
                value={newRole.name}
                onChange={handleNewRoleFieldChange}
                placeholder="e.g. Sales"
                required
              />
            </label>
            <fieldset className="wide">
              <legend>Permissions</legend>
              <label>
                <input
                  type="checkbox"
                  checked={newRole.permissions.dashboard}
                  onChange={() => handleNewRoleToggle('dashboard')}
                />
                <span>Dashboard</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={newRole.permissions.users}
                  onChange={() => handleNewRoleToggle('users')}
                />
                <span>Users</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={newRole.permissions.roles}
                  onChange={() => handleNewRoleToggle('roles')}
                />
                <span>Roles</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={newRole.permissions.groups}
                  onChange={() => handleNewRoleToggle('groups')}
                />
                <span>Mik-Groups</span>
              </label>
            </fieldset>
            <div className="wide button-row">
              <button type="submit" className="primary-button" disabled={creating}>
                {creating ? 'Creating…' : 'Create role'}
              </button>
            </div>
          </form>
        </div>
        {loading && <p className="feedback muted">Loading roles…</p>}
        {status.message && (
          <p className={`feedback ${status.type === 'error' ? 'error' : 'success'}`}>{status.message}</p>
        )}
      </section>
    </div>
  );
};

export default Roles;
