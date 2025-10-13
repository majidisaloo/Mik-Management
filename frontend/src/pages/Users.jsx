import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  passwordConfirmation: '',
  roleIds: []
};

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

const Users = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState({ mode: null, targetId: null });
  const [form, setForm] = useState(emptyForm);

  const sortedUsers = useMemo(() => {
    return users
      .slice()
      .sort((a, b) => {
        const aName = `${a.firstName} ${a.lastName}`.trim().toLowerCase();
        const bName = `${b.firstName} ${b.lastName}`.trim().toLowerCase();
        return aName.localeCompare(bName);
      });
  }, [users]);

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

        setUsers(Array.isArray(usersPayload?.users) ? usersPayload.users : []);
        setRoles(Array.isArray(rolesPayload?.roles) ? rolesPayload.roles : []);
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

  const closeModal = () => {
    setModal({ mode: null, targetId: null });
    setForm(emptyForm);
    setSaving(false);
  };

  const handleAdd = () => {
    setStatus({ type: '', message: '' });
    setForm(emptyForm);
    setModal({ mode: 'create', targetId: null });
  };

  const handleView = (targetId) => {
    setModal({ mode: 'view', targetId });
  };

  const handleEdit = (targetId) => {
    const selected = users.find((entry) => entry.id === targetId);
    if (!selected) {
      setStatus({ type: 'error', message: 'Unable to load the requested user.' });
      return;
    }

    setForm({
      firstName: selected.firstName ?? '',
      lastName: selected.lastName ?? '',
      email: selected.email ?? '',
      password: '',
      passwordConfirmation: '',
      roleIds: Array.isArray(selected.roleIds) ? selected.roleIds : []
    });
    setModal({ mode: 'edit', targetId });
  };

  const handleDeletePrompt = (targetId) => {
    setModal({ mode: 'delete', targetId });
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleRoleToggle = (event) => {
    const roleId = Number.parseInt(event.target.value, 10);

    if (!Number.isInteger(roleId)) {
      return;
    }

    setForm((current) => {
      const hasRole = current.roleIds.includes(roleId);
      return {
        ...current,
        roleIds: hasRole
          ? current.roleIds.filter((value) => value !== roleId)
          : [...current.roleIds, roleId]
      };
    });
  };

  const buildErrorMessage = async (response, fallback) => {
    const statusCode = response.status;
    const contentType = response.headers.get('content-type') ?? '';
    let message = fallback;

    if (statusCode === 502) {
      message = 'The API returned 502 Bad Gateway. Confirm the backend service is online.';
    } else if (statusCode >= 500 && statusCode !== 502) {
      message = `The server returned an unexpected error (${statusCode}).`;
    }

    if (contentType.includes('application/json')) {
      const payload = await response.json().catch(() => ({}));
      if (payload?.message) {
        message = payload.message;
      }
    } else {
      const text = await response.text().catch(() => '');
      if (text) {
        message = text;
      }
    }

    return message;
  };

  const submitCreate = async (event) => {
    event.preventDefault();
    setSaving(true);

    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      password: form.password,
      passwordConfirmation: form.passwordConfirmation,
      roles: form.roleIds
    };

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const message = await buildErrorMessage(response, 'User creation failed.');
        throw new Error(message);
      }

      const payloadBody = await response.json();
      const created = payloadBody?.user;

      if (created) {
        setUsers((current) => [...current, created]);
      }

      setStatus({ type: 'success', message: payloadBody?.message ?? 'User created successfully.' });
      closeModal();
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'User creation failed.' });
      setSaving(false);
    }
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    if (!modal.targetId) {
      setStatus({ type: 'error', message: 'A valid user must be selected before updating.' });
      return;
    }

    setSaving(true);

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
      const response = await fetch(`/api/users/${modal.targetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const message = await buildErrorMessage(response, 'User update failed.');
        throw new Error(message);
      }

      const payloadBody = await response.json();
      const updated = payloadBody?.user;

      if (updated) {
        setUsers((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
        if (user && updated.id === user.id) {
          updateUser(updated);
        }
      }

      setStatus({ type: 'success', message: payloadBody?.message ?? 'User updated successfully.' });
      closeModal();
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'User update failed.' });
      setSaving(false);
    }
  };

  const submitDelete = async () => {
    if (!modal.targetId) {
      setStatus({ type: 'error', message: 'A valid user is required for deletion.' });
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/users/${modal.targetId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const message = await buildErrorMessage(response, 'User deletion failed.');
        throw new Error(message);
      }

      setUsers((current) => current.filter((entry) => entry.id !== modal.targetId));
      setStatus({ type: 'success', message: 'User deleted successfully.' });
      closeModal();
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'User deletion failed.' });
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

  const renderRoleChecklist = () => (
    <div className="role-checklist">
      {roles.map((role) => (
        <label key={role.id} className="checkbox">
          <input
            type="checkbox"
            value={role.id}
            checked={form.roleIds.includes(role.id)}
            onChange={handleRoleToggle}
          />
          <span>{role.name}</span>
        </label>
      ))}
    </div>
  );

  const renderModal = () => {
    if (!modal.mode) {
      return null;
    }

    if (modal.mode === 'view') {
      const selected = users.find((entry) => entry.id === modal.targetId);
      if (!selected) {
        return null;
      }

      const roleNames = Array.isArray(selected.roles)
        ? selected.roles.map((role) => role.name).join(', ')
        : '';

      return (
        <Modal title="User details" onClose={closeModal}>
          <dl className="detail-list">
            <div>
              <dt>Name</dt>
              <dd>{`${selected.firstName} ${selected.lastName}`.trim()}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{selected.email}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{formatDateTime(selected.createdAt) || '—'}</dd>
            </div>
            <div>
              <dt>Roles</dt>
              <dd>{roleNames || '—'}</dd>
            </div>
          </dl>
        </Modal>
      );
    }

    if (modal.mode === 'create') {
      return (
        <Modal
          title="Create user"
          description="Register a new operator and assign their starting roles. Passwords must be at least eight characters."
          onClose={closeModal}
        >
          <form className="management-form" onSubmit={submitCreate}>
            <div className="management-form__grid">
              <label>
                <span>First name</span>
                <input
                  name="firstName"
                  value={form.firstName}
                  onChange={handleFormChange}
                  autoComplete="given-name"
                  required
                />
              </label>
              <label>
                <span>Last name</span>
                <input
                  name="lastName"
                  value={form.lastName}
                  onChange={handleFormChange}
                  autoComplete="family-name"
                  required
                />
              </label>
              <label>
                <span>Email</span>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleFormChange}
                  autoComplete="email"
                  required
                />
              </label>
              <label>
                <span>Password</span>
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleFormChange}
                  autoComplete="new-password"
                  required
                />
              </label>
              <label>
                <span>Confirm password</span>
                <input
                  name="passwordConfirmation"
                  type="password"
                  value={form.passwordConfirmation}
                  onChange={handleFormChange}
                  autoComplete="new-password"
                  required
                />
              </label>
            </div>
            <fieldset>
              <legend>Roles</legend>
              {roles.length > 0 ? renderRoleChecklist() : <p className="muted">No roles are available yet.</p>}
            </fieldset>
            <div className="management-form__actions">
              <button type="button" className="ghost-button" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="primary-button" disabled={saving}>
                {saving ? 'Creating…' : 'Create user'}
              </button>
            </div>
          </form>
        </Modal>
      );
    }

    if (modal.mode === 'edit') {
      return (
        <Modal
          title="Edit user"
          description="Update profile details, reset the password, or adjust role assignments for this operator."
          onClose={closeModal}
        >
          <form className="management-form" onSubmit={submitEdit}>
            <div className="management-form__grid">
              <label>
                <span>First name</span>
                <input
                  name="firstName"
                  value={form.firstName}
                  onChange={handleFormChange}
                  autoComplete="given-name"
                  required
                />
              </label>
              <label>
                <span>Last name</span>
                <input
                  name="lastName"
                  value={form.lastName}
                  onChange={handleFormChange}
                  autoComplete="family-name"
                  required
                />
              </label>
              <label>
                <span>Email</span>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleFormChange}
                  autoComplete="email"
                  required
                />
              </label>
              <label>
                <span>New password</span>
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleFormChange}
                  autoComplete="new-password"
                  placeholder="Leave blank to keep the current password"
                />
              </label>
              <label>
                <span>Confirm password</span>
                <input
                  name="passwordConfirmation"
                  type="password"
                  value={form.passwordConfirmation}
                  onChange={handleFormChange}
                  autoComplete="new-password"
                  placeholder="Repeat the new password"
                />
              </label>
            </div>
            <fieldset>
              <legend>Roles</legend>
              {roles.length > 0 ? renderRoleChecklist() : <p className="muted">No roles are available yet.</p>}
            </fieldset>
            <div className="management-form__actions">
              <button type="button" className="ghost-button" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="primary-button" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </Modal>
      );
    }

    if (modal.mode === 'delete') {
      const selected = users.find((entry) => entry.id === modal.targetId);
      const displayName = selected ? `${selected.firstName} ${selected.lastName}`.trim() : 'this user';

      return (
        <Modal title="Delete user" onClose={closeModal}>
          <p>
            Are you sure you want to delete <strong>{displayName}</strong>? This action permanently removes the account and
            cannot be undone.
          </p>
          <div className="modal-footer">
            <button type="button" className="ghost-button" onClick={closeModal} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="danger-button" onClick={submitDelete} disabled={saving}>
              {saving ? 'Removing…' : 'Delete user'}
            </button>
          </div>
        </Modal>
      );
    }

    return null;
  };

  return (
    <div className="dashboard">
      <div className="management-toolbar">
        <div className="management-toolbar__title">
          <h1>User management</h1>
          <p>Audit every operator, reset credentials, and align permissions with the correct responsibilities.</p>
        </div>
        <div className="management-toolbar__actions">
          <button type="button" className="primary-button" onClick={handleAdd} disabled={loading}>
            Add user
          </button>
        </div>
      </div>

      {status.message ? (
        <div className={`alert ${status.type === 'error' ? 'alert-error' : 'alert-success'}`}>{status.message}</div>
      ) : null}

      {sortedUsers.length === 0 ? (
        <div className="management-empty">No users are registered yet. Use the Add user button to get started.</div>
      ) : (
        <div className="management-list">
          {sortedUsers.map((entry) => {
            const roleNames = Array.isArray(entry.roles)
              ? entry.roles.map((role) => role.name).join(', ')
              : '';

            return (
              <article key={entry.id} className="management-item">
                <header className="management-item__header">
                  <h2 className="management-item__title">{`${entry.firstName} ${entry.lastName}`.trim()}</h2>
                  <div className="management-item__meta">
                    <span>
                      <strong>ID:</strong> {entry.id}
                    </span>
                    <span>
                      <strong>Email:</strong> {entry.email}
                    </span>
                    <span>
                      <strong>Created:</strong> {formatDateTime(entry.createdAt) || '—'}
                    </span>
                  </div>
                </header>
                <div className="management-item__body">
                  <p>{roleNames ? `Roles: ${roleNames}` : 'No roles assigned yet.'}</p>
                </div>
                <div className="management-item__actions">
                  <button type="button" className="ghost-button" onClick={() => handleView(entry.id)}>
                    View
                  </button>
                  <button type="button" className="secondary-button" onClick={() => handleEdit(entry.id)}>
                    Edit
                  </button>
                  <button type="button" className="danger-button" onClick={() => handleDeletePrompt(entry.id)}>
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {renderModal()}
    </div>
  );
};

export default Users;
