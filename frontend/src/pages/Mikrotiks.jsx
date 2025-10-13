import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(emptyDeviceForm());
  const [createForm, setCreateForm] = useState(emptyDeviceForm());
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
          throw new Error('Unable to load Mikrotik devices from the server.');
        }

        const payload = await response.json();
        const loadedDevices = Array.isArray(payload?.mikrotiks) ? payload.mikrotiks : [];
        const loadedGroups = Array.isArray(payload?.groups) ? payload.groups : [];

        setMikrotiks(loadedDevices);
        setGroups(loadedGroups);
        setSelectedId((current) => {
          if (current && loadedDevices.some((device) => device.id === current)) {
            return current;
          }

          if (loadedDevices.length > 0) {
            return loadedDevices[0].id;
          }

          return null;
        });
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

  const selectedDevice = useMemo(
    () => mikrotiks.find((entry) => entry.id === selectedId) ?? null,
    [mikrotiks, selectedId]
  );

  useEffect(() => {
    setForm(toFormState(selectedDevice));
  }, [selectedDevice]);

  const handleSelectDevice = (event) => {
    const nextId = Number.parseInt(event.target.value, 10);
    setSelectedId(Number.isInteger(nextId) ? nextId : null);
    setStatus({ type: '', message: '' });
  };

  const handleFormFieldChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value
    }));
  };

  const handleCreateFieldChange = (event) => {
    const { name, value } = event.target;
    setCreateForm((current) => ({
      ...current,
      [name]: value
    }));
  };

  const handleRouterToggle = (formUpdater, field) => {
    formUpdater((current) => {
      const nextValue = !current.routeros[field];
      const nextRouter = { ...current.routeros, [field]: nextValue };

      if (field === 'apiSSL') {
        if (nextValue && (!current.routeros.apiPort || current.routeros.apiPort === '8728')) {
          nextRouter.apiPort = '8729';
        }
        if (!nextValue && current.routeros.apiPort === '8729') {
          nextRouter.apiPort = '8728';
        }
      }

      return {
        ...current,
        routeros: nextRouter
      };
    });
  };

  const handleRouterFieldChange = (formUpdater, field) => (event) => {
    const { value } = event.target;
    formUpdater((current) => ({
      ...current,
      routeros: {
        ...current.routeros,
        [field]: value
      }
    }));
  };

  const buildPayload = (sourceForm) => {
    const payload = {
      name: sourceForm.name,
      host: sourceForm.host,
      groupId: sourceForm.groupId ? Number.parseInt(sourceForm.groupId, 10) : null,
      tags: parseTags(sourceForm.tags),
      notes: sourceForm.notes,
      routeros: buildRouterPayload(sourceForm.routeros)
    };

    if (!payload.groupId) {
      payload.groupId = null;
    }

    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedId) {
      setStatus({ type: 'error', message: 'Select a Mikrotik device before saving changes.' });
      return;
    }

    setSaving(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch(`/api/mikrotiks/${selectedId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(buildPayload(form))
      });

      if (!response.ok) {
        const statusCode = response.status;
        let message = 'Unable to update the Mikrotik device.';

        if (statusCode === 404) {
          message = 'The selected Mikrotik device no longer exists. Refresh and try again.';
        } else if (statusCode === 400) {
          const payload = await response.json().catch(() => ({}));
          message = payload?.message || message;
        } else if (statusCode === 502) {
          message = 'Updates are unavailable (502 Bad Gateway). Confirm the backend service is online.';
        } else if (statusCode >= 500) {
          message = `The server returned an error (${statusCode}). Please retry.`;
        }

        throw new Error(message);
      }

      const payload = await response.json();
      const updated = payload?.mikrotik;

      if (updated) {
        setMikrotiks((current) =>
          current.map((entry) => (entry.id === updated.id ? updated : entry))
        );
        setStatus({ type: 'success', message: 'Mikrotik device updated successfully.' });
      } else {
        setStatus({ type: 'success', message: 'Mikrotik device updated.' });
      }
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Unable to update the Mikrotik device.' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();

    setCreating(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch('/api/mikrotiks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(buildPayload(createForm))
      });

      if (!response.ok) {
        const statusCode = response.status;
        let message = 'Unable to add the Mikrotik device.';

        if (statusCode === 400 || statusCode === 409) {
          const payload = await response.json().catch(() => ({}));
          message = payload?.message || message;
        } else if (statusCode === 502) {
          message = 'Creation is unavailable (502 Bad Gateway). Confirm the backend service is online.';
        } else if (statusCode >= 500) {
          message = `The server returned an error (${statusCode}). Please retry.`;
        }

        throw new Error(message);
      }

      const payload = await response.json();
      const created = payload?.mikrotik;

      if (created) {
        setMikrotiks((current) => [created, ...current]);
        setCreateForm(emptyDeviceForm());
        setSelectedId(created.id);
        setStatus({ type: 'success', message: 'Mikrotik device added successfully.' });
      } else {
        setStatus({ type: 'success', message: 'Mikrotik device added.' });
      }

      const refreshed = await fetch('/api/mikrotiks');
      if (refreshed.ok) {
        const payload = await refreshed.json();
        const loadedDevices = Array.isArray(payload?.mikrotiks) ? payload.mikrotiks : [];
        setMikrotiks(loadedDevices);
        if (!created && loadedDevices.length > 0) {
          setSelectedId(loadedDevices[0].id);
        }
      }
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Unable to add the Mikrotik device.' });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) {
      setStatus({ type: 'error', message: 'Select a Mikrotik device before deleting.' });
      return;
    }

    if (!window.confirm('Delete this Mikrotik device? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch(`/api/mikrotiks/${selectedId}`, {
        method: 'DELETE'
      });

      if (!response.ok && response.status !== 204) {
        const statusCode = response.status;
        let message = 'Unable to delete the Mikrotik device.';

        if (statusCode === 404) {
          message = 'The selected Mikrotik device no longer exists.';
        } else if (statusCode === 502) {
          message = 'Deletion is unavailable (502 Bad Gateway). Confirm the backend service is online.';
        } else if (statusCode >= 500) {
          message = `The server returned an error (${statusCode}). Please retry.`;
        }

        throw new Error(message);
      }

      setMikrotiks((current) => {
        const remaining = current.filter((entry) => entry.id !== selectedId);
        setSelectedId(remaining.length > 0 ? remaining[0].id : null);
        return remaining;
      });
      setStatus({ type: 'success', message: 'Mikrotik device removed.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Unable to delete the Mikrotik device.' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Mikrotiks</h1>
          <p className="muted">
            Catalogue RouterOS endpoints, manage connection defaults, and organise devices by Mik-Groups.
          </p>
        </div>
        <div className="header-actions-single">
          <button type="button" className="danger-button" onClick={handleDelete} disabled={!selectedId || deleting}>
            {deleting ? 'Removing…' : 'Delete device'}
          </button>
        </div>
      </header>

      <section className="mikrotik-management">
        <div className="mikrotik-list">
          <label htmlFor="mikrotik-select">
            <span>Select device</span>
            <select id="mikrotik-select" value={selectedId ?? ''} onChange={handleSelectDevice}>
              {mikrotiks.length === 0 ? (
                <option value="">No Mikrotik devices available</option>
              ) : (
                mikrotiks.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.name} · {device.host}
                  </option>
                ))
              )}
            </select>
          </label>
          <div className="mikrotik-summary">
            {selectedDevice ? (
              <ul>
                <li>
                  <strong>Display name:</strong> {selectedDevice.name}
                </li>
                <li>
                  <strong>Host / IP:</strong> {selectedDevice.host}
                </li>
                <li>
                  <strong>Group:</strong> {selectedDevice.groupName || 'Unassigned'}
                </li>
                <li>
                  <strong>Tags:</strong> {selectedDevice.tags?.length ? selectedDevice.tags.join(', ') : '—'}
                </li>
                <li>
                  <strong>Updated:</strong> {formatDateTime(selectedDevice.updatedAt) || '—'}
                </li>
              </ul>
            ) : (
              <p className="muted">Select a Mikrotik device to review details.</p>
            )}
          </div>
        </div>

        <div className="mikrotik-editor">
          <form className="card" onSubmit={handleSubmit}>
            <h2>Edit Mikrotik</h2>
            <div className="form-grid two-column">
              <label htmlFor="device-name">
                <span>Display name</span>
                <input
                  id="device-name"
                  name="name"
                  value={form.name}
                  onChange={handleFormFieldChange}
                  placeholder="Edge Router"
                  required
                />
              </label>
              <label htmlFor="device-host">
                <span>Host / IP</span>
                <input
                  id="device-host"
                  name="host"
                  value={form.host}
                  onChange={handleFormFieldChange}
                  placeholder="192.0.2.10 or core.example.com"
                  required
                />
              </label>
              <label htmlFor="device-group">
                <span>Site / Group</span>
                <select
                  id="device-group"
                  name="groupId"
                  value={form.groupId}
                  onChange={handleFormFieldChange}
                >
                  <option value="">Unassigned</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="device-tags">
                <span>Tags</span>
                <input
                  id="device-tags"
                  name="tags"
                  value={form.tags}
                  onChange={handleFormFieldChange}
                  placeholder="core, production"
                />
              </label>
            </div>
            <label htmlFor="device-notes" className="wide">
              <span>Notes</span>
              <textarea
                id="device-notes"
                name="notes"
                rows="3"
                value={form.notes}
                onChange={handleFormFieldChange}
                placeholder="Link, rack, or maintenance notes"
              />
            </label>

            <fieldset className="routeros-panel">
              <legend>RouterOS API</legend>
              <div className="toggle-grid">
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={form.routeros.apiEnabled}
                    onChange={() => handleRouterToggle(setForm, 'apiEnabled')}
                  />
                  <span>API enabled</span>
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={form.routeros.apiSSL}
                    onChange={() => handleRouterToggle(setForm, 'apiSSL')}
                  />
                  <span>Use API over TLS</span>
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={form.routeros.verifyTLS}
                    onChange={() => handleRouterToggle(setForm, 'verifyTLS')}
                    disabled={!form.routeros.apiSSL}
                  />
                  <span>Verify TLS certificates</span>
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={form.routeros.allowInsecureCiphers}
                    onChange={() => handleRouterToggle(setForm, 'allowInsecureCiphers')}
                  />
                  <span>Allow insecure ciphers</span>
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={form.routeros.preferredApiFirst}
                    onChange={() => handleRouterToggle(setForm, 'preferredApiFirst')}
                  />
                  <span>Prefer API before SSH fallback</span>
                </label>
              </div>
              <div className="form-grid two-column">
                <label htmlFor="device-api-port">
                  <span>API port</span>
                  <input
                    id="device-api-port"
                    value={form.routeros.apiPort}
                    onChange={handleRouterFieldChange(setForm, 'apiPort')}
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                </label>
                <label htmlFor="device-api-timeout">
                  <span>API timeout (ms)</span>
                  <input
                    id="device-api-timeout"
                    value={form.routeros.apiTimeout}
                    onChange={handleRouterFieldChange(setForm, 'apiTimeout')}
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                </label>
                <label htmlFor="device-api-retries">
                  <span>API retries</span>
                  <input
                    id="device-api-retries"
                    value={form.routeros.apiRetries}
                    onChange={handleRouterFieldChange(setForm, 'apiRetries')}
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                </label>
                <label htmlFor="device-api-username">
                  <span>API username</span>
                  <input
                    id="device-api-username"
                    value={form.routeros.apiUsername}
                    onChange={handleRouterFieldChange(setForm, 'apiUsername')}
                    autoComplete="username"
                    placeholder="automation"
                  />
                </label>
                <label htmlFor="device-api-password">
                  <span>API password</span>
                  <input
                    id="device-api-password"
                    type="password"
                    value={form.routeros.apiPassword}
                    onChange={handleRouterFieldChange(setForm, 'apiPassword')}
                    autoComplete="new-password"
                    placeholder="Use a strong secret"
                  />
                </label>
              </div>
            </fieldset>

            <div className="button-row">
              <button type="submit" className="primary-button" disabled={saving || !selectedId}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>

          <form className="card" onSubmit={handleCreate}>
            <h2>Add Mikrotik</h2>
            <div className="form-grid two-column">
              <label htmlFor="new-device-name">
                <span>Display name</span>
                <input
                  id="new-device-name"
                  name="name"
                  value={createForm.name}
                  onChange={handleCreateFieldChange}
                  placeholder="New edge router"
                  required
                />
              </label>
              <label htmlFor="new-device-host">
                <span>Host / IP</span>
                <input
                  id="new-device-host"
                  name="host"
                  value={createForm.host}
                  onChange={handleCreateFieldChange}
                  placeholder="203.0.113.5"
                  required
                />
              </label>
              <label htmlFor="new-device-group">
                <span>Site / Group</span>
                <select
                  id="new-device-group"
                  name="groupId"
                  value={createForm.groupId}
                  onChange={handleCreateFieldChange}
                >
                  <option value="">Unassigned</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="new-device-tags">
                <span>Tags</span>
                <input
                  id="new-device-tags"
                  name="tags"
                  value={createForm.tags}
                  onChange={handleCreateFieldChange}
                  placeholder="branch, backup"
                />
              </label>
            </div>
            <label htmlFor="new-device-notes" className="wide">
              <span>Notes</span>
              <textarea
                id="new-device-notes"
                name="notes"
                rows="3"
                value={createForm.notes}
                onChange={handleCreateFieldChange}
              />
            </label>

            <fieldset className="routeros-panel">
              <legend>RouterOS API defaults</legend>
              <div className="toggle-grid">
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={createForm.routeros.apiEnabled}
                    onChange={() => handleRouterToggle(setCreateForm, 'apiEnabled')}
                  />
                  <span>API enabled</span>
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={createForm.routeros.apiSSL}
                    onChange={() => handleRouterToggle(setCreateForm, 'apiSSL')}
                  />
                  <span>Use API over TLS</span>
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={createForm.routeros.verifyTLS}
                    onChange={() => handleRouterToggle(setCreateForm, 'verifyTLS')}
                    disabled={!createForm.routeros.apiSSL}
                  />
                  <span>Verify TLS certificates</span>
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={createForm.routeros.allowInsecureCiphers}
                    onChange={() => handleRouterToggle(setCreateForm, 'allowInsecureCiphers')}
                  />
                  <span>Allow insecure ciphers</span>
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={createForm.routeros.preferredApiFirst}
                    onChange={() => handleRouterToggle(setCreateForm, 'preferredApiFirst')}
                  />
                  <span>Prefer API before SSH fallback</span>
                </label>
              </div>
              <div className="form-grid two-column">
                <label htmlFor="new-device-api-port">
                  <span>API port</span>
                  <input
                    id="new-device-api-port"
                    value={createForm.routeros.apiPort}
                    onChange={handleRouterFieldChange(setCreateForm, 'apiPort')}
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                </label>
                <label htmlFor="new-device-api-timeout">
                  <span>API timeout (ms)</span>
                  <input
                    id="new-device-api-timeout"
                    value={createForm.routeros.apiTimeout}
                    onChange={handleRouterFieldChange(setCreateForm, 'apiTimeout')}
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                </label>
                <label htmlFor="new-device-api-retries">
                  <span>API retries</span>
                  <input
                    id="new-device-api-retries"
                    value={createForm.routeros.apiRetries}
                    onChange={handleRouterFieldChange(setCreateForm, 'apiRetries')}
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                </label>
                <label htmlFor="new-device-api-username">
                  <span>API username</span>
                  <input
                    id="new-device-api-username"
                    value={createForm.routeros.apiUsername}
                    onChange={handleRouterFieldChange(setCreateForm, 'apiUsername')}
                    autoComplete="username"
                  />
                </label>
                <label htmlFor="new-device-api-password">
                  <span>API password</span>
                  <input
                    id="new-device-api-password"
                    type="password"
                    value={createForm.routeros.apiPassword}
                    onChange={handleRouterFieldChange(setCreateForm, 'apiPassword')}
                    autoComplete="new-password"
                  />
                </label>
              </div>
            </fieldset>

            <div className="button-row">
              <button type="submit" className="primary-button" disabled={creating}>
                {creating ? 'Adding…' : 'Add Mikrotik'}
              </button>
            </div>
          </form>
        </div>
      </section>

      {loading && <p className="feedback muted">Loading Mikrotik devices…</p>}
      {status.message && (
        <p className={`feedback ${status.type === 'error' ? 'error' : 'success'}`}>{status.message}</p>
      )}
    </div>
  );
};

export default Mikrotiks;
