import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const emptyIpamForm = {
  name: '',
  baseUrl: '',
  appId: '',
  appCode: '',
  appPermissions: 'Read',
  appSecurity: 'SSL with App code token'
};

const statusVariant = (status) => {
  if (!status) {
    return 'status-pill--unknown';
  }

  const value = status.toLowerCase();

  if (value === 'connected') {
    return 'status-pill--success';
  }

  if (value === 'failed') {
    return 'status-pill--danger';
  }

  return 'status-pill--unknown';
};

const formatTimestamp = (value) => {
  if (!value) {
    return 'Never';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return 'Never';
  }

  return parsed.toLocaleString();
};

const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ipams, setIpams] = useState([]);
  const [ipamLoading, setIpamLoading] = useState(true);
  const [ipamNotice, setIpamNotice] = useState({ type: '', message: '' });
  const [ipamForm, setIpamForm] = useState(emptyIpamForm);
  const [ipamBusy, setIpamBusy] = useState(false);
  const [actionState, setActionState] = useState({});

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (!user.permissions?.settings) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate, user]);

  const loadIpams = useCallback(async () => {
    try {
      setIpamLoading(true);
      const response = await fetch('/api/ipams');

      if (!response.ok) {
        throw new Error('Unable to load phpIPAM integrations.');
      }

      const payload = await response.json();
      setIpams(Array.isArray(payload?.ipams) ? payload.ipams : []);
      setIpamNotice({ type: '', message: '' });
    } catch (error) {
      setIpamNotice({ type: 'error', message: error.message });
    } finally {
      setIpamLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.permissions?.settings) {
      loadIpams();
    }
  }, [loadIpams, user]);

  if (!user?.permissions?.settings) {
    return null;
  }

  const updateActionState = (id, patch) => {
    setActionState((current) => ({
      ...current,
      [id]: {
        ...(current[id] ?? {}),
        ...patch
      }
    }));
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setIpamForm((current) => ({ ...current, [name]: value }));
  };

  const handleCreateIpam = async (event) => {
    event.preventDefault();
    setIpamBusy(true);
    setIpamNotice({ type: '', message: '' });

    try {
      const response = await fetch('/api/ipams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ipamForm)
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = payload?.message || 'Unable to add the phpIPAM integration.';
        throw new Error(message);
      }

      const testStatus = payload?.test?.status;
      const testMessage = payload?.test?.message;
      const noticeType = testStatus === 'failed' ? 'error' : 'success';
      const noticeMessage = payload?.test
        ? testStatus === 'connected'
          ? `phpIPAM integration saved and authenticated (${testMessage || 'Connected successfully.'}).`
          : `Integration saved but the connectivity check failed: ${testMessage || 'verify credentials and API access.'}`
        : 'phpIPAM integration added successfully.';

      setIpamNotice({ type: noticeType, message: noticeMessage });
      setIpamForm(emptyIpamForm);
      await loadIpams();
    } catch (error) {
      setIpamNotice({ type: 'error', message: error.message });
    } finally {
      setIpamBusy(false);
    }
  };

  const handleRemoveIpam = async (ipamId) => {
    if (!window.confirm('Remove this phpIPAM integration?')) {
      return;
    }

    try {
      const response = await fetch(`/api/ipams/${ipamId}`, { method: 'DELETE' });

      if (!response.ok) {
        throw new Error('Unable to remove the integration.');
      }

      setIpamNotice({ type: 'success', message: 'phpIPAM integration removed.' });
      await loadIpams();
    } catch (error) {
      setIpamNotice({ type: 'error', message: error.message || 'Unable to remove the integration.' });
    }
  };

  const handleTestIpam = async (ipamId) => {
    updateActionState(ipamId, { testing: true });
    setIpamNotice({ type: '', message: '' });

    try {
      const response = await fetch(`/api/ipams/${ipamId}/test`, { method: 'POST' });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = payload?.message || 'Unable to test the phpIPAM integration.';
        throw new Error(message);
      }

      setIpamNotice({
        type: payload?.ok === false ? 'error' : 'success',
        message: payload?.message || 'phpIPAM connectivity test completed.'
      });
      await loadIpams();
    } catch (error) {
      setIpamNotice({ type: 'error', message: error.message });
    } finally {
      updateActionState(ipamId, { testing: false });
    }
  };

  const handleSyncIpam = async (ipamId) => {
    updateActionState(ipamId, { syncing: true });
    setIpamNotice({ type: '', message: '' });

    try {
      const response = await fetch(`/api/ipams/${ipamId}/sync`, { method: 'POST' });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = payload?.message || 'Unable to synchronise phpIPAM structure.';
        throw new Error(message);
      }

      const { sections = 0, datacenters = 0, ranges = 0 } = payload ?? {};
      setIpamNotice({
        type: 'success',
        message: `Structure synchronised (${sections} sections, ${datacenters} datacenters, ${ranges} ranges).`
      });
      await loadIpams();
    } catch (error) {
      setIpamNotice({ type: 'error', message: error.message });
    } finally {
      updateActionState(ipamId, { syncing: false });
    }
  };

  const renderCollectionList = (items, emptyMessage) => {
    if (!items?.length) {
      return <li className="ipam-collection__empty">{emptyMessage}</li>;
    }

    return items.slice(0, 6).map((item) => (
      <li key={`${item.id ?? item.name}`}
        className="ipam-collection__item"
      >
        <span className="ipam-collection__name">{item.name}</span>
        {item.metadata?.cidr ? <span className="ipam-collection__meta">{item.metadata.cidr}</span> : null}
        {!item.metadata?.cidr && item.description ? (
          <span className="ipam-collection__meta">{item.description}</span>
        ) : null}
      </li>
    ));
  };

  return (
    <section className="settings-page">
      <header className="settings-page__header">
        <div>
          <h1>Settings & integrations</h1>
          <p className="settings-page__intro">
            Manage phpIPAM connectors, keep MikroTik onboarding details aligned, and prepare DNS helpers for PTR automation.
          </p>
        </div>
      </header>

      {ipamNotice.message ? (
        <p className={`page-status page-status--${ipamNotice.type || 'info'}`}>{ipamNotice.message}</p>
      ) : null}

      <div className="settings-grid">
        <section className="settings-panel">
          <header className="settings-panel__header">
            <div>
              <h2>phpIPAM connectors</h2>
              <p className="settings-panel__subtitle">
                Store App credentials, verify connectivity, and cache sections, datacenters, and allocation ranges for automation.
              </p>
            </div>
          </header>
          <div className="settings-panel__content">
            <form className="ipam-form" onSubmit={handleCreateIpam}>
              <div className="form-grid">
                <label className="form-grid__field">
                  <span className="form-field-label">Display name</span>
                  <input
                    type="text"
                    name="name"
                    value={ipamForm.name}
                    onChange={handleFormChange}
                    required
                  />
                </label>
                <label className="form-grid__field wide">
                  <span className="form-field-label">Base API URL</span>
                  <input
                    type="url"
                    name="baseUrl"
                    placeholder="https://phpipam.example/api"
                    value={ipamForm.baseUrl}
                    onChange={handleFormChange}
                    required
                  />
                </label>
                <label className="form-grid__field">
                  <span className="form-field-label">App ID</span>
                  <input
                    type="text"
                    name="appId"
                    value={ipamForm.appId}
                    onChange={handleFormChange}
                    required
                  />
                </label>
                <label className="form-grid__field">
                  <span className="form-field-label">App code</span>
                  <input
                    type="text"
                    name="appCode"
                    value={ipamForm.appCode}
                    onChange={handleFormChange}
                    required
                  />
                </label>
                <label className="form-grid__field">
                  <span className="form-field-label">Permissions</span>
                  <select name="appPermissions" value={ipamForm.appPermissions} onChange={handleFormChange}>
                    <option value="Read">Read</option>
                    <option value="Read/Write">Read/Write</option>
                    <option value="Full">Full</option>
                  </select>
                </label>
                <label className="form-grid__field">
                  <span className="form-field-label">Security</span>
                  <select name="appSecurity" value={ipamForm.appSecurity} onChange={handleFormChange}>
                    <option value="SSL with App code token">SSL with App code token</option>
                    <option value="SSL with SSL certificate">SSL with SSL certificate</option>
                    <option value="Token only">Token only</option>
                  </select>
                </label>
                <button type="submit" className="primary-button" disabled={ipamBusy}>
                  {ipamBusy ? 'Saving…' : 'Add phpIPAM integration'}
                </button>
              </div>
            </form>

            <div className="ipam-list" role="region" aria-live="polite">
              {ipamLoading ? (
                <p className="muted">Loading integrations…</p>
              ) : ipams.length === 0 ? (
                <p className="muted">
                  No phpIPAM integrations yet. Add an App ID and App Code to begin synchronising structure.
                </p>
              ) : (
                ipams.map((ipam) => (
                  <article key={ipam.id} className="ipam-card">
                    <header className="ipam-card__header">
                      <div>
                        <h3>{ipam.name}</h3>
                        <p className="ipam-card__url">{ipam.baseUrl}</p>
                      </div>
                      <span className={`status-pill ${statusVariant(ipam.lastStatus)}`}>
                        <span className="status-pill__dot" aria-hidden="true" />
                        {ipam.lastStatus || 'unknown'}
                      </span>
                    </header>
                    <dl className="ipam-card__meta">
                      <div>
                        <dt>App ID</dt>
                        <dd>{ipam.appId}</dd>
                      </div>
                      <div>
                        <dt>Permissions</dt>
                        <dd>{ipam.appPermissions}</dd>
                      </div>
                      <div>
                        <dt>Security</dt>
                        <dd>{ipam.appSecurity}</dd>
                      </div>
                      <div>
                        <dt>Last check</dt>
                        <dd>{formatTimestamp(ipam.lastCheckedAt)}</dd>
                      </div>
                    </dl>
                    <div className="ipam-card__collections">
                      <h4>Cached structure</h4>
                      <div className="ipam-collection-grid">
                        <div>
                          <h5>Sections</h5>
                          <ul>{renderCollectionList(ipam.collections?.sections, 'No sections cached.')}</ul>
                        </div>
                        <div>
                          <h5>Datacenters</h5>
                          <ul>{renderCollectionList(ipam.collections?.datacenters, 'No datacenters cached.')}</ul>
                        </div>
                        <div>
                          <h5>Ranges</h5>
                          <ul>{renderCollectionList(ipam.collections?.ranges, 'No ranges cached.')}</ul>
                        </div>
                      </div>
                    </div>
                    <div className="ipam-card__actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => handleSyncIpam(ipam.id)}
                        disabled={Boolean(actionState[ipam.id]?.syncing)}
                      >
                        {actionState[ipam.id]?.syncing ? 'Synchronising…' : 'Sync structure'}
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => handleTestIpam(ipam.id)}
                        disabled={Boolean(actionState[ipam.id]?.testing)}
                      >
                        {actionState[ipam.id]?.testing ? 'Testing…' : 'Test connection'}
                      </button>
                      <button
                        type="button"
                        className="danger-button"
                        onClick={() => handleRemoveIpam(ipam.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="settings-panel">
          <header className="settings-panel__header">
            <div>
              <h2>MikroTik onboarding defaults</h2>
              <p className="settings-panel__subtitle">
                Capture API and SSH preferences once and apply them whenever a new MikroTik joins the inventory.
              </p>
            </div>
          </header>
          <div className="settings-panel__content">
            <p className="muted">
              Set RouterOS targets, API timeouts, and encryption policies from the Mikrotiks workspace. This dashboard will soon
              centralise those defaults and surface live API/SSH diagnostics.
            </p>
            <ul className="settings-hint-list">
              <li>Ensure API services are enabled on the router before triggering connection tests.</li>
              <li>Keep SSH keys enrolled so tunnels and provisioning tasks remain seamless.</li>
              <li>Monitor latency and packet loss from the Dashboard to validate tunnel health after onboarding.</li>
            </ul>
          </div>
        </section>

        <section className="settings-panel">
          <header className="settings-panel__header">
            <div>
              <h2>DNS authorities</h2>
              <p className="settings-panel__subtitle">
                Register DNS servers to automate forward and reverse records for MikroTik WAN and tunnel interfaces.
              </p>
            </div>
          </header>
          <div className="settings-panel__content">
            <p className="muted">
              DNS integrations are under active development. Soon you will be able to push PTR updates directly from tunnel and
              MikroTik management views.
            </p>
            <p className="muted">
              Prepare hostname conventions now so that synchronisation can stamp consistent records across all environments when
              the feature lands.
            </p>
          </div>
        </section>
      </div>
    </section>
  );
};

export default Settings;
