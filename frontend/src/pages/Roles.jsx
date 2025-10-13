import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const permissionCatalog = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'users', label: 'Users' },
  { key: 'roles', label: 'Roles' },
  { key: 'groups', label: 'Mik-Groups' },
  { key: 'mikrotiks', label: "Mikrotik's" },
  { key: 'settings', label: 'Settings' }
];

const emptyRoleForm = {
  name: '',
  permissions: permissionCatalog.reduce((acc, { key }) => ({ ...acc, [key]: false }), {})
};

const Roles = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyRoleForm);
  const [createBusy, setCreateBusy] = useState(false);
  const [manageState, setManageState] = useState({ open: false, roleId: null, form: emptyRoleForm });
  const [manageBusy, setManageBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (!user.permissions?.roles) {
      navigate('/dashboard', { replace: true });
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/roles', { signal: controller.signal });

        if (!response.ok) {
          throw new Error('Unable to load roles.');
        }

        const payload = await response.json();
        setRoles(Array.isArray(payload?.roles) ? payload.roles : []);
        setStatus({ type: '', message: '' });
      } catch (error) {
        if (error.name === 'AbortError') {
          return;
        }

        setStatus({
          type: 'error',
          message:
            error.message ||
            'Role management is unavailable right now. Confirm the API is reachable and refresh the page.'
        });
      } finally {
        setLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, [navigate, user]);

  const sortedRoles = useMemo(() => {
    return [...roles].sort((a, b) => a.name.localeCompare(b.name));
  }, [roles]);

  const openCreateModal = () => {
    setCreateForm(emptyRoleForm);
    setCreateOpen(true);
    setStatus({ type: '', message: '' });
  };

  const openManageModal = (roleRecord) => {
    setManageState({
      open: true,
      roleId: roleRecord.id,
      form: {
        name: roleRecord.name ?? '',
        permissions: { ...emptyRoleForm.permissions, ...(roleRecord.permissions ?? {}) }
      }
    });
    setStatus({ type: '', message: '' });
  };

  const closeManageModal = () => {
    setManageState({ open: false, roleId: null, form: emptyRoleForm });
    setManageBusy(false);
    setDeleteBusy(false);
  };

  const handlePermissionToggle = (formSetter) => (permissionKey) => {
    formSetter((current) => ({
      ...current,
      form: {
        ...current.form,
        permissions: {
          ...current.form.permissions,
          [permissionKey]: !current.form.permissions[permissionKey]
        }
      }
    }));
  };

  const handleCreateToggle = (permissionKey) => {
    setCreateForm((current) => ({
      ...current,
      permissions: { ...current.permissions, [permissionKey]: !current.permissions[permissionKey] }
    }));
  };

  const handleCreateFieldChange = (event) => {
    const { value } = event.target;
    setCreateForm((current) => ({ ...current, name: value }));
  };

  const handleManageFieldChange = (event) => {
    const { value } = event.target;
    setManageState((current) => ({
      ...current,
      form: {
        ...current.form,
        name: value
      }
    }));
  };

  const handleCreateRole = async (event) => {
    event.preventDefault();
    setCreateBusy(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createForm)
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = payload?.message || 'Unable to create the role.';
        throw new Error(message);
      }

      const createdRole = payload?.role;
      if (createdRole) {
        setRoles((current) => [...current, createdRole]);
      } else {
        const refresh = await fetch('/api/roles');
        if (refresh.ok) {
          const data = await refresh.json();
          setRoles(Array.isArray(data?.roles) ? data.roles : []);
        }
      }

      setStatus({ type: 'success', message: 'Role created successfully.' });
      setCreateOpen(false);
      setCreateForm(emptyRoleForm);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setCreateBusy(false);
    }
  };

  const handleUpdateRole = async (event) => {
    event.preventDefault();

    if (!manageState.roleId) {
      return;
    }

    setManageBusy(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch(`/api/roles/${manageState.roleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(manageState.form)
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = payload?.message || 'Unable to update the role.';
        throw new Error(message);
      }

      const updatedRole = payload?.role;
      if (updatedRole) {
        setRoles((current) => current.map((entry) => (entry.id === updatedRole.id ? updatedRole : entry)));
      }

      setStatus({ type: 'success', message: 'Role updated successfully.' });
      closeManageModal();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setManageBusy(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!manageState.roleId) {
      return;
    }

    setDeleteBusy(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch(`/api/roles/${manageState.roleId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          payload?.message ||
          (response.status === 409
            ? 'This role is assigned to users. Reassign accounts before deleting it.'
            : 'Unable to delete the selected role.');
        throw new Error(message);
      }

      setRoles((current) => current.filter((entry) => entry.id !== manageState.roleId));
      setStatus({ type: 'success', message: 'Role removed successfully.' });
      closeManageModal();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setDeleteBusy(false);
    }
  };

  const describePermissions = (roleRecord) => {
    const enabled = permissionCatalog.filter(({ key }) => roleRecord.permissions?.[key]);
    if (enabled.length === 0) {
      return 'No access assigned';
    }

    if (enabled.length === permissionCatalog.length) {
      return 'Full access';
    }

    return enabled.map((entry) => entry.label).join(', ');
  };

  return (
    <div>
      <div className="management-toolbar">
        <h1>Role management</h1>
        <button type="button" className="action-button action-button--primary" onClick={openCreateModal}>
          Add role
        </button>
      </div>

      {status.message ? <div className={`page-status page-status--${status.type}`}>{status.message}</div> : null}

      {loading ? (
        <p>Loading roles…</p>
      ) : sortedRoles.length === 0 ? (
        <p>No roles configured yet.</p>
      ) : (
        <ul className="management-list" aria-live="polite">
          {sortedRoles.map((entry) => (
            <li key={entry.id} className="management-list__item">
              <div className="management-list__summary">
                <span className="management-list__title">{entry.name}</span>
                <div className="management-list__meta">
                  <span>Created {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : '—'}</span>
                  <span>{describePermissions(entry)}</span>
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
          title="Create role"
          description="Bundle permissions to quickly assign consistent access to each operator."
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
                form="create-role-form"
                className="action-button action-button--primary"
                disabled={createBusy}
              >
                {createBusy ? 'Saving…' : 'Create role'}
              </button>
            </>
          }
        >
          <form id="create-role-form" onSubmit={handleCreateRole} className="form-grid">
            <label>
              <span>Role name</span>
              <input name="name" value={createForm.name} onChange={handleCreateFieldChange} required />
            </label>
            <fieldset>
              <legend>Permissions</legend>
              {permissionCatalog.map((permission) => (
                <label key={permission.key} className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={Boolean(createForm.permissions[permission.key])}
                    onChange={() => handleCreateToggle(permission.key)}
                  />
                  <span>{permission.label}</span>
                </label>
              ))}
            </fieldset>
          </form>
        </Modal>
      ) : null}

      {manageState.open ? (
        <Modal
          title="Manage role"
          description="Rename the role or adjust which areas of MikroManage are available to assigned users."
          onClose={closeManageModal}
          actions={
            <>
              <button type="button" className="action-button" onClick={closeManageModal}>
                Close
              </button>
              <button
                type="button"
                className="action-button action-button--danger"
                onClick={handleDeleteRole}
                disabled={deleteBusy}
              >
                {deleteBusy ? 'Removing…' : 'Delete'}
              </button>
              <button
                type="submit"
                form="manage-role-form"
                className="action-button action-button--primary"
                disabled={manageBusy}
              >
                {manageBusy ? 'Saving…' : 'Save changes'}
              </button>
            </>
          }
        >
          <form id="manage-role-form" onSubmit={handleUpdateRole} className="form-grid">
            <label>
              <span>Role name</span>
              <input name="name" value={manageState.form.name} onChange={handleManageFieldChange} required />
            </label>
            <fieldset>
              <legend>Permissions</legend>
              {permissionCatalog.map((permission) => (
                <label key={permission.key} className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={Boolean(manageState.form.permissions[permission.key])}
                    onChange={() => handlePermissionToggle(setManageState)(permission.key)}
                  />
                  <span>{permission.label}</span>
                </label>
              ))}
            </fieldset>
          </form>
        </Modal>
      ) : null}
    </div>
  );
};

export default Roles;
