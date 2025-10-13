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
    .map((tag) => tag.trim())
    .filter(Boolean);
};

const toPayload = (form) => ({
  name: form.name,
  host: form.host,
  groupId: form.groupId ? Number.parseInt(form.groupId, 10) : null,
  tags: parseTags(form.tags),
  notes: form.notes,
  routeros: {
    apiEnabled: Boolean(form.routeros.apiEnabled),
    apiSSL: Boolean(form.routeros.apiSSL),
    apiPort: form.routeros.apiPort ? Number.parseInt(form.routeros.apiPort, 10) : undefined,
    apiUsername: form.routeros.apiUsername,
    apiPassword: form.routeros.apiPassword,
    verifyTLS: Boolean(form.routeros.verifyTLS),
    apiTimeout: form.routeros.apiTimeout ? Number.parseInt(form.routeros.apiTimeout, 10) : undefined,
    apiRetries: form.routeros.apiRetries ? Number.parseInt(form.routeros.apiRetries, 10) : undefined,
    allowInsecureCiphers: Boolean(form.routeros.allowInsecureCiphers),
    preferredApiFirst: Boolean(form.routeros.preferredApiFirst)
  }
});

const Mikrotiks = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyDeviceForm());
  const [createBusy, setCreateBusy] = useState(false);
  const [manageState, setManageState] = useState({ open: false, deviceId: null, form: emptyDeviceForm() });
  const [manageBusy, setManageBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (!user.permissions?.mikrotiks) {
      navigate('/dashboard', { replace: true });
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      try {
        setLoading(true);
        const [deviceResponse, groupResponse] = await Promise.all([
          fetch('/api/mikrotiks', { signal: controller.signal }),
          fetch('/api/groups', { signal: controller.signal })
        ]);

        if (!deviceResponse.ok) {
          throw new Error('Unable to load Mikrotik devices.');
        }

        if (!groupResponse.ok) {
          throw new Error('Unable to load Mik-Groups.');
        }

        const devicePayload = await deviceResponse.json();
        const groupPayload = await groupResponse.json();

        setDevices(Array.isArray(devicePayload?.mikrotiks) ? devicePayload.mikrotiks : []);
        setGroups(Array.isArray(groupPayload?.groups) ? groupPayload.groups : []);
        setStatus({ type: '', message: '' });
      } catch (error) {
        if (error.name === 'AbortError') {
          return;
        }

        setStatus({
          type: 'error',
          message:
            error.message ||
            'Device management is unavailable right now. Confirm the API is reachable and refresh the page.'
        });
      } finally {
        setLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, [navigate, user]);

  const sortedDevices = useMemo(() => {
    return [...devices].sort((a, b) => a.name.localeCompare(b.name));
  }, [devices]);

  const openCreateModal = () => {
    setCreateForm(emptyDeviceForm());
    setCreateOpen(true);
    setStatus({ type: '', message: '' });
  };

  const openManageModal = (device) => {
    setManageState({ open: true, deviceId: device.id, form: toFormState(device) });
    setStatus({ type: '', message: '' });
  };

  const closeManageModal = () => {
    setManageState({ open: false, deviceId: null, form: emptyDeviceForm() });
    setManageBusy(false);
    setDeleteBusy(false);
  };

  const refreshDevices = async () => {
    try {
      const response = await fetch('/api/mikrotiks');
      if (!response.ok) {
        throw new Error('Unable to refresh the Mikrotik inventory.');
      }

      const payload = await response.json();
      setDevices(Array.isArray(payload?.mikrotiks) ? payload.mikrotiks : []);
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Unable to refresh the Mikrotik inventory.' });
    }
  };

  const handleCreateFieldChange = (event) => {
    const { name, value } = event.target;
    setCreateForm((current) => ({
      ...current,
      [name]: name === 'groupId' ? value : value
    }));
  };

  const handleCreateRouterToggle = (key) => {
    setCreateForm((current) => {
      const nextValue = !current.routeros[key];
      let nextPort = current.routeros.apiPort;

      if (key === 'apiSSL') {
        if (nextValue && (!nextPort || nextPort === '8728')) {
          nextPort = '8729';
        }

        if (!nextValue && nextPort === '8729') {
          nextPort = '8728';
        }
      }

      return {
        ...current,
        routeros: {
          ...current.routeros,
          [key]: nextValue,
          apiPort: nextPort
        }
      };
    });
  };

  const handleCreateRouterField = (event) => {
    const { name, value } = event.target;
    setCreateForm((current) => ({
      ...current,
      routeros: {
        ...current.routeros,
        [name]: value
      }
    }));
  };

  const handleManageFieldChange = (event) => {
    const { name, value } = event.target;
    setManageState((current) => ({
      ...current,
      form: {
        ...current.form,
        [name]: name === 'groupId' ? value : value
      }
    }));
  };

  const handleManageRouterToggle = (key) => {
    setManageState((current) => {
      const nextValue = !current.form.routeros[key];
      let nextPort = current.form.routeros.apiPort;

      if (key === 'apiSSL') {
        if (nextValue && (!nextPort || nextPort === '8728')) {
          nextPort = '8729';
        }

        if (!nextValue && nextPort === '8729') {
          nextPort = '8728';
        }
      }

      return {
        ...current,
        form: {
          ...current.form,
          routeros: {
            ...current.form.routeros,
            [key]: nextValue,
            apiPort: nextPort
          }
        }
      };
    });
  };

  const handleManageRouterField = (event) => {
    const { name, value } = event.target;
    setManageState((current) => ({
      ...current,
      form: {
        ...current.form,
        routeros: {
          ...current.form.routeros,
          [name]: value
        }
      }
    }));
  };

  const handleCreateDevice = async (event) => {
    event.preventDefault();
    setCreateBusy(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch('/api/mikrotiks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(toPayload(createForm))
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = payload?.message || 'Unable to register the Mikrotik device.';
        throw new Error(message);
      }

      setStatus({ type: 'success', message: 'Mikrotik added successfully.' });
      setCreateOpen(false);
      setCreateForm(emptyDeviceForm());
      await refreshDevices();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setCreateBusy(false);
    }
  };

  const handleUpdateDevice = async (event) => {
    event.preventDefault();

    if (!manageState.deviceId) {
      return;
    }

    setManageBusy(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch(`/api/mikrotiks/${manageState.deviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(toPayload(manageState.form))
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = payload?.message || 'Unable to update the Mikrotik device.';
        throw new Error(message);
      }

      setStatus({ type: 'success', message: 'Mikrotik updated successfully.' });
      closeManageModal();
      await refreshDevices();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setManageBusy(false);
    }
  };

  const handleDeleteDevice = async () => {
    if (!manageState.deviceId) {
      return;
    }

    setDeleteBusy(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch(`/api/mikrotiks/${manageState.deviceId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message = payload?.message || 'Unable to delete the Mikrotik device.';
        throw new Error(message);
      }

      setStatus({ type: 'success', message: 'Mikrotik removed successfully.' });
      closeManageModal();
      await refreshDevices();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setDeleteBusy(false);
    }
  };

  const renderRouterFields = (formState, onToggle, onFieldChange) => (
    <fieldset>
      <legend>RouterOS API</legend>
      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={formState.routeros.apiEnabled}
          onChange={() => onToggle('apiEnabled')}
        />
        <span>API enabled</span>
      </label>
      <label className="checkbox-field">
        <input type="checkbox" checked={formState.routeros.apiSSL} onChange={() => onToggle('apiSSL')} />
        <span>Use API over TLS (port 8729)</span>
      </label>
      <div className="form-grid">
        <label>
          <span>API port</span>
          <input
            name="apiPort"
            type="number"
            min="1"
            value={formState.routeros.apiPort}
            onChange={onFieldChange}
          />
        </label>
        <label>
          <span>Username</span>
          <input name="apiUsername" value={formState.routeros.apiUsername} onChange={onFieldChange} />
        </label>
        <label>
          <span>Password / token</span>
          <input
            name="apiPassword"
            type="password"
            autoComplete="off"
            value={formState.routeros.apiPassword}
            onChange={onFieldChange}
          />
        </label>
        <label className="checkbox-field">
          <input type="checkbox" checked={formState.routeros.verifyTLS} onChange={() => onToggle('verifyTLS')} />
          <span>Verify TLS certificates</span>
        </label>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={formState.routeros.allowInsecureCiphers}
            onChange={() => onToggle('allowInsecureCiphers')}
          />
          <span>Allow insecure ciphers</span>
        </label>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={formState.routeros.preferredApiFirst}
            onChange={() => onToggle('preferredApiFirst')}
          />
          <span>Prefer API before SSH fallback</span>
        </label>
        <label>
          <span>Timeout (ms)</span>
          <input
            name="apiTimeout"
            type="number"
            min="100"
            step="100"
            value={formState.routeros.apiTimeout}
            onChange={onFieldChange}
          />
        </label>
        <label>
          <span>Retries</span>
          <input
            name="apiRetries"
            type="number"
            min="0"
            max="5"
            value={formState.routeros.apiRetries}
            onChange={onFieldChange}
          />
        </label>
      </div>
    </fieldset>
  );

  return (
    <div>
      <div className="management-toolbar">
        <h1>Mikrotik inventory</h1>
        <button type="button" className="action-button action-button--primary" onClick={openCreateModal}>
          Add Mikrotik
        </button>
      </div>

      {status.message ? <div className={`page-status page-status--${status.type}`}>{status.message}</div> : null}

      {loading ? (
        <p>Loading Mikrotik devices…</p>
      ) : sortedDevices.length === 0 ? (
        <p>No Mikrotik devices have been added yet.</p>
      ) : (
        <ul className="management-list" aria-live="polite">
          {sortedDevices.map((entry) => (
            <li key={entry.id} className="management-list__item">
              <div className="management-list__summary">
                <span className="management-list__title">{entry.name}</span>
                <div className="management-list__meta">
                  <span>{entry.host}</span>
                  <span>{entry.groupName ? `Group: ${entry.groupName}` : 'No group assigned'}</span>
                  <span>{entry.routeros?.apiEnabled ? 'API enabled' : 'API disabled'}</span>
                  <span>Created {formatDateTime(entry.createdAt)}</span>
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
          title="Add Mikrotik"
          description="Register a RouterOS device so MikroManage can organise credentials and metadata."
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
                form="create-device-form"
                className="action-button action-button--primary"
                disabled={createBusy}
              >
                {createBusy ? 'Saving…' : 'Create device'}
              </button>
            </>
          }
        >
          <form id="create-device-form" onSubmit={handleCreateDevice} className="form-grid">
            <label>
              <span>Display name</span>
              <input name="name" value={createForm.name} onChange={handleCreateFieldChange} required />
            </label>
            <label>
              <span>Host / IP</span>
              <input name="host" value={createForm.host} onChange={handleCreateFieldChange} required />
            </label>
            <label>
              <span>Group</span>
              <select name="groupId" value={createForm.groupId} onChange={handleCreateFieldChange}>
                <option value="">No group</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Tags</span>
              <input
                name="tags"
                value={createForm.tags}
                onChange={handleCreateFieldChange}
                placeholder="Comma separated"
              />
            </label>
            <label className="wide">
              <span>Notes</span>
              <textarea
                name="notes"
                rows="3"
                value={createForm.notes}
                onChange={handleCreateFieldChange}
                placeholder="Deployment notes, on-call hints, or maintenance reminders"
              />
            </label>
            {renderRouterFields(createForm, handleCreateRouterToggle, handleCreateRouterField)}
          </form>
        </Modal>
      ) : null}

      {manageState.open ? (
        <Modal
          title="Manage Mikrotik"
          description="Update connection settings or remove devices that are no longer part of this network."
          onClose={closeManageModal}
          actions={
            <>
              <button type="button" className="action-button" onClick={closeManageModal}>
                Close
              </button>
              <button
                type="button"
                className="action-button action-button--danger"
                onClick={handleDeleteDevice}
                disabled={deleteBusy}
              >
                {deleteBusy ? 'Removing…' : 'Delete'}
              </button>
              <button
                type="submit"
                form="manage-device-form"
                className="action-button action-button--primary"
                disabled={manageBusy}
              >
                {manageBusy ? 'Saving…' : 'Save changes'}
              </button>
            </>
          }
        >
          <form id="manage-device-form" onSubmit={handleUpdateDevice} className="form-grid">
            <label>
              <span>Display name</span>
              <input name="name" value={manageState.form.name} onChange={handleManageFieldChange} required />
            </label>
            <label>
              <span>Host / IP</span>
              <input name="host" value={manageState.form.host} onChange={handleManageFieldChange} required />
            </label>
            <label>
              <span>Group</span>
              <select name="groupId" value={manageState.form.groupId} onChange={handleManageFieldChange}>
                <option value="">No group</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Tags</span>
              <input
                name="tags"
                value={manageState.form.tags}
                onChange={handleManageFieldChange}
                placeholder="Comma separated"
              />
            </label>
            <label className="wide">
              <span>Notes</span>
              <textarea
                name="notes"
                rows="3"
                value={manageState.form.notes}
                onChange={handleManageFieldChange}
                placeholder="Deployment notes, on-call hints, or maintenance reminders"
              />
            </label>
            {renderRouterFields(manageState.form, handleManageRouterToggle, handleManageRouterField)}
            <p className="field-hint">Created {formatDateTime(devices.find((d) => d.id === manageState.deviceId)?.createdAt)}</p>
          </form>
        </Modal>
      ) : null}
    </div>
  );
};

export default Mikrotiks;
