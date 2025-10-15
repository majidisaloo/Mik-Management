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
  preferredApiFirst: true,
  firmwareVersion: '',
  sshEnabled: false,
  sshPort: '22',
  sshUsername: '',
  sshPassword: '',
  sshAcceptNewHostKeys: true
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

const formatConnectivityLabel = (status) => {
  if (!status) {
    return 'Unknown';
  }

  const normalized = status.toLowerCase();
  if (normalized === 'online') {
    return 'Online';
  }
  if (normalized === 'offline') {
    return 'Offline';
  }
  if (normalized === 'disabled') {
    return 'Disabled';
  }
  return 'Unknown';
};

function getConnectivityStatusClass(status) {
  if (!status) {
    return 'unknown';
  }

  const normalized = status.toLowerCase();
  if (normalized === 'online') {
    return 'success';
  }
  if (normalized === 'offline') {
    return 'danger';
  }
  if (normalized === 'disabled') {
    return 'info';
  }
  return 'unknown';
}

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
        router.preferredApiFirst !== undefined ? Boolean(router.preferredApiFirst) : true,
      firmwareVersion: router.firmwareVersion ?? '',
      sshEnabled: router.sshEnabled !== undefined ? Boolean(router.sshEnabled) : false,
      sshPort: router.sshPort ? String(router.sshPort) : '22',
      sshUsername: router.sshUsername ?? '',
      sshPassword: router.sshPassword ?? '',
      sshAcceptNewHostKeys:
        router.sshAcceptNewHostKeys !== undefined ? Boolean(router.sshAcceptNewHostKeys) : true
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
    preferredApiFirst: Boolean(form.routeros.preferredApiFirst),
    firmwareVersion: form.routeros.firmwareVersion,
    sshEnabled: Boolean(form.routeros.sshEnabled),
    sshPort: form.routeros.sshPort ? Number.parseInt(form.routeros.sshPort, 10) : undefined,
    sshUsername: form.routeros.sshUsername,
    sshPassword: form.routeros.sshPassword,
    sshAcceptNewHostKeys: Boolean(form.routeros.sshAcceptNewHostKeys)
  }
});

const Mikrotiks = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [filter, setFilter] = useState('');
  const [targetVersion, setTargetVersion] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyDeviceForm());
  const [createBusy, setCreateBusy] = useState(false);
  const [manageState, setManageState] = useState({
    open: false,
    deviceId: null,
    form: emptyDeviceForm(),
    details: null
  });
  const [manageBusy, setManageBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [testBusy, setTestBusy] = useState(false);

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
        setTargetVersion(
          typeof devicePayload?.targetRouterOs === 'string' ? devicePayload.targetRouterOs : ''
        );
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

  const filteredDevices = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) {
      return devices;
    }

    return devices.filter((device) => {
      const nameMatch = device.name?.toLowerCase().includes(query);
      const hostMatch = device.host?.toLowerCase().includes(query);
      const groupMatch = device.groupName?.toLowerCase().includes(query);
      const tagMatch = Array.isArray(device.tags)
        ? device.tags.some((tag) => tag.toLowerCase().includes(query))
        : false;
      const statusMatch = device.status?.updateStatus?.toLowerCase().includes(query);
      return nameMatch || hostMatch || groupMatch || tagMatch || statusMatch;
    });
  }, [devices, filter]);

  const sortedDevices = useMemo(() => {
    return [...filteredDevices].sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredDevices]);

  const openCreateModal = () => {
    setCreateForm(emptyDeviceForm());
    setCreateOpen(true);
    setStatus({ type: '', message: '' });
  };

  const openManageModal = (device) => {
    setManageState({ open: true, deviceId: device.id, form: toFormState(device), details: device });
    setStatus({ type: '', message: '' });
  };

  const closeManageModal = () => {
    setManageState({ open: false, deviceId: null, form: emptyDeviceForm(), details: null });
    setManageBusy(false);
    setDeleteBusy(false);
    setTestBusy(false);
  };

  const refreshDevices = async () => {
    try {
      const response = await fetch('/api/mikrotiks');
      if (!response.ok) {
        throw new Error('Unable to refresh the Mikrotik inventory.');
      }

      const payload = await response.json();
      setDevices(Array.isArray(payload?.mikrotiks) ? payload.mikrotiks : []);
      setTargetVersion(typeof payload?.targetRouterOs === 'string' ? payload.targetRouterOs : '');
      if (manageState.open && manageState.deviceId && Array.isArray(payload?.mikrotiks)) {
        const updated = payload.mikrotiks.find((item) => item.id === manageState.deviceId);
        if (updated) {
          setManageState((current) => ({
            ...current,
            form: toFormState(updated),
            details: updated
          }));
        }
      }
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

  const handleTestConnectivity = async () => {
    if (!manageState.deviceId) {
      return;
    }

    setTestBusy(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch(`/api/mikrotiks/${manageState.deviceId}/test-connectivity`, {
        method: 'POST'
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = payload?.message || 'Unable to verify connectivity.';
        throw new Error(message);
      }

      if (payload?.mikrotik) {
        setManageState((current) => ({
          ...current,
          form: toFormState(payload.mikrotik),
          details: payload.mikrotik
        }));
      }

      setStatus({ type: 'success', message: payload?.message || 'Connectivity refreshed.' });
      await refreshDevices();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setTestBusy(false);
    }
  };

  const renderRouterFields = (formState, onToggle, onFieldChange) => {
    const apiActive = formState.routeros.apiEnabled;
    const tlsActive = apiActive && formState.routeros.apiSSL;
    const sshActive = formState.routeros.sshEnabled;

    return (
      <div className="routeros-panel routeros-config">
        <div className="routeros-config__header">
          <h3>Access channels</h3>
          <p className="routeros-config__intro">
            Choose which management paths MikroManage should use and configure their credentials.
          </p>
        </div>

        <div className="routeros-config__toggles">
          <label className={`toggle-chip${sshActive ? ' toggle-chip--active' : ''}`}>
            <input type="checkbox" checked={sshActive} onChange={() => onToggle('sshEnabled')} />
            <span>SSH access</span>
          </label>
          <label className={`toggle-chip${apiActive ? ' toggle-chip--active' : ''}`}>
            <input type="checkbox" checked={apiActive} onChange={() => onToggle('apiEnabled')} />
            <span>RouterOS API</span>
          </label>
          <label className={`toggle-chip${tlsActive ? ' toggle-chip--active' : ''}`} aria-disabled={!apiActive}>
            <input
              type="checkbox"
              checked={formState.routeros.apiSSL}
              onChange={() => onToggle('apiSSL')}
              disabled={!apiActive}
            />
            <span>Use TLS (8729)</span>
          </label>
          <label className={`toggle-chip${formState.routeros.preferredApiFirst ? ' toggle-chip--active' : ''}`}>
            <input
              type="checkbox"
              checked={formState.routeros.preferredApiFirst}
              onChange={() => onToggle('preferredApiFirst')}
            />
            <span>Prefer API before SSH</span>
          </label>
          <label className={`toggle-chip${sshActive ? ' toggle-chip--active' : ''}`}>
            <input type="checkbox" checked={sshActive} onChange={() => onToggle('sshEnabled')} />
            <span>SSH access</span>
          </label>
          <label
            className={`toggle-chip${formState.routeros.sshAcceptNewHostKeys ? ' toggle-chip--active' : ''}`}
            aria-disabled={!sshActive}
          >
            <input
              type="checkbox"
              checked={formState.routeros.sshAcceptNewHostKeys}
              onChange={() => onToggle('sshAcceptNewHostKeys')}
              disabled={!sshActive}
            />
            <span>Auto-accept fingerprints</span>
          </label>
        </div>

        <div className="routeros-config__layout">
          <section className="routeros-config__column">
            <header className="routeros-config__column-header">
              <h4>SSH settings</h4>
              <p>Used for CLI automations, diagnostics, and failover commands.</p>
            </header>
            {sshActive ? (
              <>
                <div className="form-grid routeros-config__grid routeros-config__grid--compact">
                  <label>
                    <span>SSH port</span>
                    <input
                      name="sshPort"
                      type="number"
                      min="1"
                      value={formState.routeros.sshPort}
                      onChange={onFieldChange}
                    />
                  </label>
                  <label>
                    <span>Username</span>
                    <input name="sshUsername" value={formState.routeros.sshUsername} onChange={onFieldChange} />
                  </label>
                  <label>
                    <span>Password / key</span>
                    <input
                      name="sshPassword"
                      type="password"
                      autoComplete="off"
                      value={formState.routeros.sshPassword}
                      onChange={onFieldChange}
                    />
                  </label>
                </div>
                <label className="toggle-field toggle-field--soft">
                  <input
                    type="checkbox"
                    checked={formState.routeros.autoAcceptFingerprints}
                    onChange={() => onToggle('autoAcceptFingerprints')}
                  />
                  <span>Auto-accept fingerprints</span>
                </label>
              </>
            ) : (
              <p className="empty-hint">
                Enable SSH access to fall back to RouterOS CLI automation when the API is unavailable.
              </p>
            )}
          </section>

          <section className="routeros-config__column">
            <header className="routeros-config__column-header">
              <h4>API settings</h4>
              <p>Configure the RouterOS API listener and authentication details.</p>
            </header>
            {apiActive ? (
              <>
                <label className="toggle-field toggle-field--soft">
                  <input
                    type="checkbox"
                    checked={formState.routeros.apiSSL}
                    onChange={() => onToggle('apiSSL')}
                  />
                  <span>Use TLS (8729)</span>
                </label>
                <div className="form-grid routeros-config__grid routeros-config__grid--compact">
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
                {tlsActive ? (
                  <div className="routeros-config__subtoggles">
                    <label className="toggle-field toggle-field--soft">
                      <input
                        type="checkbox"
                        checked={formState.routeros.verifyTLS}
                        onChange={() => onToggle('verifyTLS')}
                      />
                      <span>Verify TLS certificates</span>
                    </label>
                    <label className="toggle-field toggle-field--soft">
                      <input
                        type="checkbox"
                        checked={formState.routeros.allowInsecureCiphers}
                        onChange={() => onToggle('allowInsecureCiphers')}
                      />
                      <span>Allow legacy ciphers</span>
                    </label>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="empty-hint">Enable the RouterOS API to configure ports and credentials.</p>
            )}
          </section>
        </div>

        <div className="routeros-config__version">
          <label>
            <span>Detected RouterOS version</span>
            <input
              name="firmwareVersion"
              value={formState.routeros.firmwareVersion}
              onChange={onFieldChange}
              placeholder="Detected after connectivity test"
              readOnly
            />
          </label>
          <p className="muted">Target version: {targetVersion || '—'}</p>
        </div>

        {sshActive ? (
          <div className="form-grid routeros-config__grid">
            <label>
              <span>SSH port</span>
              <input
                name="sshPort"
                type="number"
                min="1"
                value={formState.routeros.sshPort}
                onChange={onFieldChange}
              />
            </label>
            <label>
              <span>SSH username</span>
              <input name="sshUsername" value={formState.routeros.sshUsername} onChange={onFieldChange} />
            </label>
            <label>
              <span>SSH password</span>
              <input
                name="sshPassword"
                type="password"
                autoComplete="off"
                value={formState.routeros.sshPassword}
                onChange={onFieldChange}
              />
            </label>
          </div>
        ) : (
          <p className="empty-hint">Enable SSH to configure fallback credentials.</p>
        )}

        <div className="routeros-config__version">
          <label>
            <span>Detected RouterOS version</span>
            <input
              name="firmwareVersion"
              value={formState.routeros.firmwareVersion}
              onChange={onFieldChange}
              placeholder="Detected after connectivity test"
              readOnly
            />
          </label>
          <p className="muted">Target version: {targetVersion || '—'}</p>
        </div>

        {sshActive ? (
          <div className="form-grid routeros-config__grid">
            <label>
              <span>SSH port</span>
              <input
                name="sshPort"
                type="number"
                min="1"
                value={formState.routeros.sshPort}
                onChange={onFieldChange}
              />
            </label>
            <label>
              <span>SSH username</span>
              <input name="sshUsername" value={formState.routeros.sshUsername} onChange={onFieldChange} />
            </label>
            <label>
              <span>SSH password</span>
              <input
                name="sshPassword"
                type="password"
                autoComplete="off"
                value={formState.routeros.sshPassword}
                onChange={onFieldChange}
              />
            </label>
          </div>
        ) : (
          <p className="empty-hint">Enable SSH to configure fallback credentials.</p>
        )}
      </div>
    );
  };

  const renderConnectivityPanel = (device) => {
    if (!device) {
      return null;
    }

    const connectivity = device.routeros?.connectivity ?? {};
    const channels = [
      {
        key: 'api',
        label: 'RouterOS API',
        endpoint:
          connectivity.api?.endpoint ||
          (device.routeros?.apiEnabled ? `${device.host}:${device.routeros?.apiPort ?? 8728}` : 'Disabled'),
        status: connectivity.api?.status || (device.routeros?.apiEnabled ? 'unknown' : 'disabled'),
        latency: connectivity.api?.latencyMs ?? null,
        lastCheckedAt: connectivity.api?.lastCheckedAt ?? null
      },
      {
        key: 'ssh',
        label: 'SSH',
        endpoint:
          connectivity.ssh?.endpoint ||
          (device.routeros?.sshEnabled ? `${device.host}:${device.routeros?.sshPort ?? 22}` : 'Disabled'),
        status: connectivity.ssh?.status || (device.routeros?.sshEnabled ? 'unknown' : 'disabled'),
        latency: connectivity.ssh?.latencyMs ?? null,
        lastCheckedAt: connectivity.ssh?.lastCheckedAt ?? null
      }
    ];

    return (
      <section className="connectivity-panel" aria-labelledby="connectivity-status-heading">
        <div className="connectivity-panel__header">
          <div>
            <h3 id="connectivity-status-heading">Connectivity status</h3>
            <p>Latest health checks for MikroTik access channels.</p>
          </div>
        </div>
        <div className="connectivity-panel__grid">
          {channels.map((channel) => {
            const variant = normalizeStatusVariant(channel.status);
            const statusLabel = channel.status === 'disabled' ? 'Disabled' : formatConnectivityStatus(channel.status);

            return (
              <article key={channel.key} className={`connectivity-card connectivity-card--${variant}`}>
                <header className="connectivity-card__header">
                  <span className="connectivity-card__title">{channel.label}</span>
                  <span className={`status-pill status-pill--${variant}`}>{statusLabel}</span>
                </header>
                <dl className="connectivity-card__meta">
                  <div>
                    <dt>Endpoint</dt>
                    <dd>{channel.endpoint || '—'}</dd>
                  </div>
                  <div>
                    <dt>Latest latency</dt>
                    <dd>{formatLatency(channel.latency)}</dd>
                  </div>
                  <div>
                    <dt>Last check</dt>
                    <dd>{formatDateTime(channel.lastCheckedAt)}</dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      </section>
    );
  };

  const connectivityPanel = renderConnectivityPanel(managedDevice);

  return (
    <div>
      <div className="management-toolbar management-toolbar--stacked">
        <div>
          <h1>Mikrotik inventory</h1>
          <p className="management-description">
            Track RouterOS devices, API credentials, and firmware status across your MikroTik footprint.
          </p>
        </div>
        <div className="toolbar-actions">
          <input
            type="search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter by name, host, group, status, or tag"
            className="toolbar-filter"
          />
          <button type="button" className="action-button action-button--primary" onClick={openCreateModal}>
            Add Mikrotik
          </button>
        </div>
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
                  <span
                    className={`status-pill status-pill--${(entry.status?.updateStatus || 'unknown').toLowerCase()}`}
                  >
                    {entry.status?.updateStatus ?? 'unknown'}
                  </span>
                  <span
                    className={`status-pill status-pill--${getConnectivityStatusClass(
                      entry.connectivity?.api?.status
                    )}`}
                  >
                    API {formatConnectivityLabel(entry.connectivity?.api?.status)}
                  </span>
                  <span
                    className={`status-pill status-pill--${getConnectivityStatusClass(
                      entry.connectivity?.ssh?.status
                    )}`}
                  >
                    SSH {formatConnectivityLabel(entry.connectivity?.ssh?.status)}
                  </span>
                  <span>
                    Version {entry.routeros?.firmwareVersion || '—'} · Target{' '}
                    {entry.status?.targetVersion || targetVersion || '—'}
                  </span>
                  <span>Created {formatDateTime(entry.createdAt)}</span>
                </div>
              </div>
              <div className="management-list__actions">
                <button type="button" className="action-button" onClick={() => openManageModal(entry)}>
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
            <div className="connectivity-summary">
              <h3 className="connectivity-summary__title">Connectivity status</h3>
              <ul className="connectivity-summary__list">
                <li>
                  <span
                    className={`status-pill status-pill--${getConnectivityStatusClass(
                      manageState.details?.connectivity?.api?.status
                    )}`}
                  >
                    API {formatConnectivityLabel(manageState.details?.connectivity?.api?.status)}
                  </span>
                  <span className="muted">
                    Last check: {formatDateTime(manageState.details?.connectivity?.api?.lastCheckedAt)}
                  </span>
                </li>
                <li>
                  <span
                    className={`status-pill status-pill--${getConnectivityStatusClass(
                      manageState.details?.connectivity?.ssh?.status
                    )}`}
                  >
                    SSH {formatConnectivityLabel(manageState.details?.connectivity?.ssh?.status)}
                  </span>
                  <span className="muted">
                    Last check: {formatDateTime(manageState.details?.connectivity?.ssh?.lastCheckedAt)}
                  </span>
                </li>
              </ul>
              <button
                type="button"
                className="secondary-button"
                onClick={handleTestConnectivity}
                disabled={testBusy}
              >
                {testBusy ? 'Testing…' : 'Test connectivity'}
              </button>
            </div>
            {renderRouterFields(manageState.form, handleManageRouterToggle, handleManageRouterField)}
            {connectivityPanel ? <div className="form-grid__full">{connectivityPanel}</div> : null}
            <p className="field-hint">Created {formatDateTime(devices.find((d) => d.id === manageState.deviceId)?.createdAt)}</p>
          </form>
        </Modal>
      ) : null}
    </div>
  );
};

export default Mikrotiks;
