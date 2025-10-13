import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const defaultRouterForm = () => ({
  apiEnabled: false,
  apiSSL: false,
  apiPort: '8728',
  apiUsername: '',
  apiPassword: '',
  verifyTLS: true,
  apiTimeout: '5000',
  apiRetries: '1',
  allowInsecureCiphers: false,
  preferredApiFirst: true
});

const emptyDeviceForm = () => ({
  name: '',
  host: '',
  groupId: '',
  tags: '',
  notes: '',
  routeros: defaultRouterForm()
});

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

const toFormState = (device) => {
  if (!device) {
    return emptyDeviceForm();
  }

  const tags = Array.isArray(device.tags) ? device.tags.join(', ') : '';
  const router = device.routeros ?? {};
  const sslEnabled = Boolean(router.apiSSL);

  return {
    name: device.name ?? '',
    host: device.host ?? '',
    groupId: device.groupId ? String(device.groupId) : '',
    tags,
    notes: device.notes ?? '',
    routeros: {
      apiEnabled: Boolean(router.apiEnabled),
      apiSSL: sslEnabled,
      apiPort: router.apiPort ? String(router.apiPort) : sslEnabled ? '8729' : '8728',
      apiUsername: router.apiUsername ?? '',
      apiPassword: router.apiPassword ?? '',
      verifyTLS: router.verifyTLS !== undefined ? Boolean(router.verifyTLS) : true,
      apiTimeout: router.apiTimeout ? String(router.apiTimeout) : '5000',
      apiRetries: router.apiRetries ? String(router.apiRetries) : '1',
      allowInsecureCiphers:
        router.allowInsecureCiphers !== undefined ? Boolean(router.allowInsecureCiphers) : false,
      preferredApiFirst:
        router.preferredApiFirst !== undefined ? Boolean(router.preferredApiFirst) : true
    }
  };
};

const parseTags = (value) => {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const buildRouterPayload = (form) => ({
  apiEnabled: Boolean(form.apiEnabled),
  apiSSL: Boolean(form.apiSSL),
  apiPort: form.apiPort ? Number.parseInt(form.apiPort, 10) : undefined,
  apiUsername: form.apiUsername?.trim() ?? '',
  apiPassword: form.apiPassword ?? '',
  verifyTLS: Boolean(form.verifyTLS),
  apiTimeout: form.apiTimeout ? Number.parseInt(form.apiTimeout, 10) : undefined,
  apiRetries: form.apiRetries ? Number.parseInt(form.apiRetries, 10) : undefined,
  allowInsecureCiphers: Boolean(form.allowInsecureCiphers),
  preferredApiFirst: Boolean(form.preferredApiFirst)
});

const Mikrotiks = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mikrotiks, setMikrotiks] = useState([]);
  const [groups, setGroups] = useState([]);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState({ mode: null, targetId: null });
  const [form, setForm] = useState(emptyDeviceForm());

  const canManageMikrotiks = Boolean(user?.permissions?.mikrotiks);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (!canManageMikrotiks) {
      navigate('/dashboard', { replace: true });
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/mikrotiks', { signal: controller.signal });

        if (!response.ok) {
          throw new Error('Unable to load Mikrotik inventory from the server.');
        }

        const payload = await response.json();
        const loadedDevices = Array.isArray(payload?.mikrotiks) ? payload.mikrotiks : [];
        const loadedGroups = Array.isArray(payload?.groups) ? payload.groups : [];

        setMikrotiks(loadedDevices);
        setGroups(loadedGroups);
        setStatus({ type: '', message: '' });
      } catch (error) {
        if (error.name !== 'AbortError') {
          setStatus({
            type: 'error',
            message:
              error.message ||
              'Mikrotik management is unavailable right now. Confirm the API is reachable and refresh the page.'
          });
        }
      } finally {
        setLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, [canManageMikrotiks, navigate, user]);

  const sortedDevices = useMemo(
    () =>
      mikrotiks
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name) || a.host.localeCompare(b.host)),
    [mikrotiks]
  );

  const closeModal = () => {
    setModal({ mode: null, targetId: null });
    setForm(emptyDeviceForm());
    setSaving(false);
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

  const refreshDevices = async () => {
    try {
      const response = await fetch('/api/mikrotiks');
      if (!response.ok) {
        throw new Error('Unable to refresh Mikrotik devices.');
      }
      const payload = await response.json();
      setMikrotiks(Array.isArray(payload?.mikrotiks) ? payload.mikrotiks : []);
      setGroups(Array.isArray(payload?.groups) ? payload.groups : []);
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Unable to refresh Mikrotik devices.' });
    }
  };

  const openCreate = () => {
    setForm(emptyDeviceForm());
    setModal({ mode: 'create', targetId: null });
  };

  const openView = (targetId) => {
    setModal({ mode: 'view', targetId });
  };

  const openEdit = (targetId) => {
    const target = mikrotiks.find((entry) => entry.id === targetId);
    if (!target) {
      setStatus({ type: 'error', message: 'Unable to load the selected Mikrotik.' });
      return;
    }

    setForm(toFormState(target));
    setModal({ mode: 'edit', targetId });
  };

  const openDelete = (targetId) => {
    setModal({ mode: 'delete', targetId });
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleRouterFieldChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      routeros: {
        ...current.routeros,
        [name]: type === 'checkbox' ? checked : value
      }
    }));
  };

  const submitCreate = async (event) => {
    event.preventDefault();

    if (!form.name.trim() || !form.host.trim()) {
      setStatus({ type: 'error', message: 'Name and host/IP are required.' });
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/mikrotiks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: form.name,
          host: form.host,
          groupId: form.groupId ? Number.parseInt(form.groupId, 10) : null,
          tags: parseTags(form.tags),
          notes: form.notes,
          routeros: buildRouterPayload(form.routeros)
        })
      });

      if (!response.ok) {
        const message = await buildErrorMessage(response, 'Device creation failed.');
        throw new Error(message);
      }

      const payload = await response.json();
      if (payload?.mikrotik) {
        await refreshDevices();
      }

      setStatus({ type: 'success', message: payload?.message ?? 'Device created successfully.' });
      closeModal();
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Device creation failed.' });
      setSaving(false);
    }
  };

  const submitEdit = async (event) => {
    event.preventDefault();

    if (!modal.targetId) {
      setStatus({ type: 'error', message: 'Select a device before saving changes.' });
      return;
    }

    if (!form.name.trim() || !form.host.trim()) {
      setStatus({ type: 'error', message: 'Name and host/IP are required.' });
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/mikrotiks/${modal.targetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: form.name,
          host: form.host,
          groupId: form.groupId === '' ? null : Number.parseInt(form.groupId, 10),
          tags: parseTags(form.tags),
          notes: form.notes,
          routeros: buildRouterPayload(form.routeros)
        })
      });

      if (!response.ok) {
        const message = await buildErrorMessage(response, 'Device update failed.');
        throw new Error(message);
      }

      const payload = await response.json();
      if (payload?.mikrotik) {
        await refreshDevices();
      }

      setStatus({ type: 'success', message: payload?.message ?? 'Device updated successfully.' });
      closeModal();
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Device update failed.' });
      setSaving(false);
    }
  };

  const submitDelete = async () => {
    if (!modal.targetId) {
      setStatus({ type: 'error', message: 'Select a device before deleting it.' });
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/mikrotiks/${modal.targetId}`, {
        method: 'DELETE'
      });

      if (response.status !== 204) {
        const message = await buildErrorMessage(response, 'Device deletion failed.');
        throw new Error(message);
      }

      await refreshDevices();
      setStatus({ type: 'success', message: 'Device deleted successfully.' });
      closeModal();
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Device deletion failed.' });
      setSaving(false);
    }
  };

  if (!user) {
    return null;
  }

  if (!canManageMikrotiks) {
    return (
      <section className="card">
        <h1>Mikrotik management</h1>
        <p className="muted">You do not have permission to manage Mikrotik inventory.</p>
      </section>
    );
  }

  const groupOptions = useMemo(
    () =>
      groups
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((group) => ({ value: String(group.id), label: group.name })),
    [groups]
  );

  const renderRouterSettings = () => (
    <fieldset>
      <legend>RouterOS API</legend>
      <div className="management-form__grid">
        <label className="checkbox">
          <input
            type="checkbox"
            name="apiEnabled"
            checked={form.routeros.apiEnabled}
            onChange={handleRouterFieldChange}
          />
          <span>API enabled</span>
        </label>
        <label className="checkbox">
          <input type="checkbox" name="apiSSL" checked={form.routeros.apiSSL} onChange={handleRouterFieldChange} />
          <span>Use SSL (8729)</span>
        </label>
        <label>
          <span>API port</span>
          <input name="apiPort" value={form.routeros.apiPort} onChange={handleRouterFieldChange} />
        </label>
        <label>
          <span>Username</span>
          <input name="apiUsername" value={form.routeros.apiUsername} onChange={handleRouterFieldChange} />
        </label>
        <label>
          <span>Password</span>
          <input
            name="apiPassword"
            type="password"
            value={form.routeros.apiPassword}
            onChange={handleRouterFieldChange}
          />
        </label>
        <label className="checkbox">
          <input type="checkbox" name="verifyTLS" checked={form.routeros.verifyTLS} onChange={handleRouterFieldChange} />
          <span>Verify TLS certificates</span>
        </label>
        <label>
          <span>Timeout (ms)</span>
          <input name="apiTimeout" value={form.routeros.apiTimeout} onChange={handleRouterFieldChange} />
        </label>
        <label>
          <span>Retries</span>
          <input name="apiRetries" value={form.routeros.apiRetries} onChange={handleRouterFieldChange} />
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            name="allowInsecureCiphers"
            checked={form.routeros.allowInsecureCiphers}
            onChange={handleRouterFieldChange}
          />
          <span>Allow insecure ciphers</span>
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            name="preferredApiFirst"
            checked={form.routeros.preferredApiFirst}
            onChange={handleRouterFieldChange}
          />
          <span>Prefer API before SSH fallback</span>
        </label>
      </div>
    </fieldset>
  );

  const renderModal = () => {
    if (!modal.mode) {
      return null;
    }

    if (modal.mode === 'view') {
      const device = mikrotiks.find((entry) => entry.id === modal.targetId);
      if (!device) {
        return null;
      }

      return (
        <Modal title="Mikrotik details" size="lg" onClose={closeModal}>
          <dl className="detail-list">
            <div>
              <dt>Name</dt>
              <dd>{device.name}</dd>
            </div>
            <div>
              <dt>Host / IP</dt>
              <dd>{device.host}</dd>
            </div>
            <div>
              <dt>Group</dt>
              <dd>{device.groupName || '—'}</dd>
            </div>
            <div>
              <dt>Tags</dt>
              <dd>{Array.isArray(device.tags) && device.tags.length > 0 ? device.tags.join(', ') : '—'}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{formatDateTime(device.createdAt) || '—'}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{formatDateTime(device.updatedAt) || '—'}</dd>
            </div>
          </dl>
          <h3>RouterOS API</h3>
          <ul className="chip-grid">
            <li className={device.routeros?.apiEnabled ? 'chip chip--active' : 'chip'}>API enabled</li>
            <li className={device.routeros?.apiSSL ? 'chip chip--active' : 'chip'}>SSL</li>
            <li className="chip">Port {device.routeros?.apiPort ?? '8728'}</li>
            <li className={device.routeros?.verifyTLS ? 'chip chip--active' : 'chip'}>Verify TLS</li>
            <li className="chip">Timeout {device.routeros?.apiTimeout ?? 5000} ms</li>
          </ul>
          {device.notes ? (
            <>
              <h3>Notes</h3>
              <p>{device.notes}</p>
            </>
          ) : null}
        </Modal>
      );
    }

    if (modal.mode === 'create') {
      return (
        <Modal
          title="Add Mikrotik"
          size="lg"
          description="Register a router with connection preferences so you can automate backups and monitoring."
          onClose={closeModal}
        >
          <form className="management-form" onSubmit={submitCreate}>
            <div className="management-form__grid">
              <label>
                <span>Display name</span>
                <input name="name" value={form.name} onChange={handleFieldChange} required />
              </label>
              <label>
                <span>Host / IP</span>
                <input name="host" value={form.host} onChange={handleFieldChange} required />
              </label>
              <label>
                <span>Group</span>
                <select name="groupId" value={form.groupId} onChange={handleFieldChange}>
                  <option value="">Unassigned</option>
                  {groupOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Tags</span>
                <input
                  name="tags"
                  value={form.tags}
                  onChange={handleFieldChange}
                  placeholder="Edge, core, datacenter"
                />
              </label>
              <label>
                <span>Notes</span>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleFieldChange}
                  rows={3}
                  placeholder="Document context such as rack location or maintenance windows."
                />
              </label>
            </div>
            {renderRouterSettings()}
            <div className="management-form__actions">
              <button type="button" className="ghost-button" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="primary-button" disabled={saving}>
                {saving ? 'Creating…' : 'Add Mikrotik'}
              </button>
            </div>
          </form>
        </Modal>
      );
    }

    if (modal.mode === 'edit') {
      return (
        <Modal
          title="Edit Mikrotik"
          size="lg"
          description="Update device ownership, adjust API credentials, or add context notes for operators."
          onClose={closeModal}
        >
          <form className="management-form" onSubmit={submitEdit}>
            <div className="management-form__grid">
              <label>
                <span>Display name</span>
                <input name="name" value={form.name} onChange={handleFieldChange} required />
              </label>
              <label>
                <span>Host / IP</span>
                <input name="host" value={form.host} onChange={handleFieldChange} required />
              </label>
              <label>
                <span>Group</span>
                <select name="groupId" value={form.groupId} onChange={handleFieldChange}>
                  <option value="">Unassigned</option>
                  {groupOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Tags</span>
                <input name="tags" value={form.tags} onChange={handleFieldChange} />
              </label>
              <label>
                <span>Notes</span>
                <textarea name="notes" value={form.notes} onChange={handleFieldChange} rows={3} />
              </label>
            </div>
            {renderRouterSettings()}
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
      const device = mikrotiks.find((entry) => entry.id === modal.targetId);
      const displayName = device ? device.name : 'this Mikrotik';

      return (
        <Modal title="Delete Mikrotik" onClose={closeModal}>
          <p>
            Are you sure you want to delete <strong>{displayName}</strong>? Remove the device only when it is fully
            decommissioned.
          </p>
          <div className="modal-footer">
            <button type="button" className="ghost-button" onClick={closeModal} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="danger-button" onClick={submitDelete} disabled={saving}>
              {saving ? 'Removing…' : 'Delete device'}
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
          <h1>Mikrotik management</h1>
          <p>Track every RouterOS endpoint, standardise API settings, and annotate context for the field engineers.</p>
        </div>
        <div className="management-toolbar__actions">
          <button type="button" className="primary-button" onClick={openCreate} disabled={loading}>
            Add Mikrotik
          </button>
        </div>
      </div>

      {status.message ? (
        <div className={`alert ${status.type === 'error' ? 'alert-error' : 'alert-success'}`}>{status.message}</div>
      ) : null}

      {sortedDevices.length === 0 ? (
        <div className="management-empty">No Mikrotik devices are registered yet. Use the Add button to onboard routers.</div>
      ) : (
        <div className="management-list">
          {sortedDevices.map((device) => (
            <article key={device.id} className="management-item">
              <header className="management-item__header">
                <h2 className="management-item__title">{device.name}</h2>
                <div className="management-item__meta">
                  <span>
                    <strong>ID:</strong> {device.id}
                  </span>
                  <span>
                    <strong>Host/IP:</strong> {device.host}
                  </span>
                  <span>
                    <strong>Group:</strong> {device.groupName || 'Unassigned'}
                  </span>
                  <span>
                    <strong>Updated:</strong> {formatDateTime(device.updatedAt) || '—'}
                  </span>
                </div>
              </header>
              <div className="management-item__body">
                <p>
                  RouterOS API:{' '}
                  {device.routeros?.apiEnabled ? 'Enabled' : 'Disabled'} · Port {device.routeros?.apiPort ?? 8728}{' '}
                  {device.routeros?.apiSSL ? '(SSL)' : ''}
                </p>
                {Array.isArray(device.tags) && device.tags.length > 0 ? (
                  <p>Tags: {device.tags.join(', ')}</p>
                ) : (
                  <p>No tags assigned.</p>
                )}
              </div>
              <div className="management-item__actions">
                <button type="button" className="ghost-button" onClick={() => openView(device.id)}>
                  View
                </button>
                <button type="button" className="secondary-button" onClick={() => openEdit(device.id)}>
                  Edit
                </button>
                <button type="button" className="danger-button" onClick={() => openDelete(device.id)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {renderModal()}
    </div>
  );
};

export default Mikrotiks;
