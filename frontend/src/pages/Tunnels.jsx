import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const statusOptions = [
  { value: 'up', label: 'Up' },
  { value: 'down', label: 'Down' },
  { value: 'maintenance', label: 'Maintenance' }
];

const emptyTunnelForm = {
  name: '',
  groupId: '',
  sourceId: '',
  targetId: '',
  connectionType: 'GRE',
  status: 'down',
  enabled: true,
  tags: '',
  notes: '',
  latencyMs: '',
  packetLoss: '',
  lastCheckedAt: ''
};

const parseTags = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const toNumber = (value) => {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const Tunnels = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tunnels, setTunnels] = useState([]);
  const [groups, setGroups] = useState([]);
  const [mikrotiks, setMikrotiks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [filter, setFilter] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyTunnelForm);
  const [createBusy, setCreateBusy] = useState(false);

  const [manageState, setManageState] = useState({ open: false, tunnelId: null, form: emptyTunnelForm });
  const [manageBusy, setManageBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (!user.permissions?.tunnels) {
      navigate('/dashboard', { replace: true });
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/tunnels', { signal: controller.signal });

        if (!response.ok) {
          throw new Error('Unable to load tunnels.');
        }

        const payload = await response.json();
        setTunnels(Array.isArray(payload?.tunnels) ? payload.tunnels : []);
        setGroups(Array.isArray(payload?.groups) ? payload.groups : []);
        setMikrotiks(Array.isArray(payload?.mikrotiks) ? payload.mikrotiks : []);
        setStatus({ type: '', message: '' });
      } catch (error) {
        if (error.name === 'AbortError') {
          return;
        }
        setStatus({
          type: 'error',
          message: error.message || 'Tunnel management is unavailable right now. Confirm the API is reachable and refresh the page.'
        });
      } finally {
        setLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, [navigate, user]);

  const filteredTunnels = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) {
      return tunnels;
    }

    return tunnels.filter((entry) => {
      const nameMatch = entry.name?.toLowerCase().includes(query);
      const sourceMatch = entry.sourceName?.toLowerCase().includes(query);
      const targetMatch = entry.targetName?.toLowerCase().includes(query);
      const groupMatch = entry.groupName?.toLowerCase().includes(query);
      const tagMatch = Array.isArray(entry.tags)
        ? entry.tags.some((tag) => tag.toLowerCase().includes(query))
        : false;
      return nameMatch || sourceMatch || targetMatch || groupMatch || tagMatch;
    });
  }, [filter, tunnels]);

  const resetManageState = () => {
    setManageState({ open: false, tunnelId: null, form: emptyTunnelForm });
    setManageBusy(false);
    setDeleteBusy(false);
  };

  const openCreateModal = () => {
    setCreateForm(emptyTunnelForm);
    setCreateOpen(true);
    setStatus({ type: '', message: '' });
  };

  const openManageModal = (record) => {
    setManageState({
      open: true,
      tunnelId: record.id,
      form: {
        name: record.name ?? '',
        groupId: record.groupId ?? '',
        sourceId: record.sourceId ?? '',
        targetId: record.targetId ?? '',
        connectionType: record.connectionType ?? 'GRE',
        status: record.status ?? 'down',
        enabled: Boolean(record.enabled),
        tags: Array.isArray(record.tags) ? record.tags.join(', ') : '',
        notes: record.notes ?? '',
        latencyMs: record.metrics?.latencyMs ?? '',
        packetLoss: record.metrics?.packetLoss ?? '',
        lastCheckedAt: record.metrics?.lastCheckedAt ?? ''
      }
    });
    setStatus({ type: '', message: '' });
  };

  const handleCreateFieldChange = (event) => {
    const { name, value, type, checked } = event.target;
    setCreateForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleManageFieldChange = (event) => {
    const { name, value, type, checked } = event.target;
    setManageState((current) => ({
      ...current,
      form: {
        ...current.form,
        [name]: type === 'checkbox' ? checked : value
      }
    }));
  };

  const refreshTunnels = async () => {
    try {
      const response = await fetch('/api/tunnels');
      if (!response.ok) {
        throw new Error('Unable to refresh tunnels.');
      }
      const payload = await response.json();
      setTunnels(Array.isArray(payload?.tunnels) ? payload.tunnels : []);
      setGroups(Array.isArray(payload?.groups) ? payload.groups : []);
      setMikrotiks(Array.isArray(payload?.mikrotiks) ? payload.mikrotiks : []);
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Unable to refresh the tunnels list right now.' });
    }
  };

  const buildPayload = (form) => ({
    name: form.name,
    groupId: form.groupId || null,
    sourceId: form.sourceId,
    targetId: form.targetId,
    connectionType: form.connectionType,
    status: form.status,
    enabled: Boolean(form.enabled),
    tags: parseTags(form.tags),
    notes: form.notes,
    metrics: {
      latencyMs: toNumber(form.latencyMs),
      packetLoss: toNumber(form.packetLoss),
      lastCheckedAt: form.lastCheckedAt || undefined
    }
  });

  const handleCreateTunnel = async (event) => {
    event.preventDefault();
    setCreateBusy(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch('/api/tunnels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(buildPayload(createForm))
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = payload?.message || 'Unable to create the tunnel.';
        throw new Error(message);
      }

      if (payload?.tunnel) {
        setTunnels((current) => [...current, payload.tunnel]);
      } else {
        await refreshTunnels();
      }

      setStatus({ type: 'success', message: 'Tunnel created successfully.' });
      setCreateOpen(false);
      setCreateForm(emptyTunnelForm);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setCreateBusy(false);
    }
  };

  const handleUpdateTunnel = async (event) => {
    event.preventDefault();
    if (!manageState.tunnelId) {
      return;
    }

    setManageBusy(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch(`/api/tunnels/${manageState.tunnelId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(buildPayload(manageState.form))
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = payload?.message || 'Unable to update the tunnel.';
        throw new Error(message);
      }

      if (payload?.tunnel) {
        setTunnels((current) => current.map((entry) => (entry.id === payload.tunnel.id ? payload.tunnel : entry)));
      } else {
        await refreshTunnels();
      }

      setStatus({ type: 'success', message: 'Tunnel updated successfully.' });
      resetManageState();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setManageBusy(false);
    }
  };

  const handleDeleteTunnel = async () => {
    if (!manageState.tunnelId) {
      return;
    }

    setDeleteBusy(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch(`/api/tunnels/${manageState.tunnelId}`, {
        method: 'DELETE'
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = payload?.message || 'Unable to delete the selected tunnel.';
        throw new Error(message);
      }

      setTunnels((current) => current.filter((entry) => entry.id !== manageState.tunnelId));
      setStatus({ type: 'success', message: 'Tunnel removed successfully.' });
      resetManageState();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="management-page">
      <div className="management-toolbar">
        <div>
          <h1>Tunnels</h1>
          <p className="management-description">
            Model inter-site connectivity, monitor latency, and keep RouterOS peers aligned with their intended configuration.
          </p>
        </div>
        <div className="toolbar-actions">
          <input
            type="search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter by name, endpoint, group, or tag"
            className="toolbar-filter"
          />
          <button type="button" className="action-button action-button--primary" onClick={openCreateModal}>
            Add tunnel
          </button>
        </div>
      </div>

      {status.message ? <p className={`page-status page-status--${status.type}`}>{status.message}</p> : null}

      {loading ? (
        <p>Loading tunnels…</p>
      ) : filteredTunnels.length === 0 ? (
        <p>No tunnels have been defined yet.</p>
      ) : (
        <ul className="management-list" aria-live="polite">
          {filteredTunnels.map((entry) => (
            <li key={entry.id} className="management-list__item">
              <div className="management-list__summary">
                <span className="management-list__title">{entry.name}</span>
                <div className="management-list__meta">
                  <span>
                    {entry.sourceName || 'Unknown source'} → {entry.targetName || 'Unknown target'}
                  </span>
                  <span>{entry.groupName ? `Group: ${entry.groupName}` : 'No group assigned'}</span>
                  <span className={`status-pill status-pill--${entry.status}`}>{entry.status}</span>
                  <span>Latency: {entry.metrics?.latencyMs !== null ? `${entry.metrics.latencyMs} ms` : '—'}</span>
                  <span>Packet loss: {entry.metrics?.packetLoss !== null ? `${entry.metrics.packetLoss}%` : '—'}</span>
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

      <Modal
        title="Add tunnel"
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        actions={[
          {
            label: 'Cancel',
            variant: 'ghost',
            onClick: () => setCreateOpen(false),
            disabled: createBusy
          },
          {
            label: createBusy ? 'Creating…' : 'Create tunnel',
            variant: 'primary',
            type: 'submit',
            form: 'create-tunnel-form',
            disabled: createBusy
          }
        ]}
      >
        <form id="create-tunnel-form" className="form-grid" onSubmit={handleCreateTunnel}>
          <label>
            <span>Name</span>
            <input name="name" value={createForm.name} onChange={handleCreateFieldChange} required />
          </label>
          <label>
            <span>Connection type</span>
            <input name="connectionType" value={createForm.connectionType} onChange={handleCreateFieldChange} />
          </label>
          <label>
            <span>Source Mikrotik</span>
            <select name="sourceId" value={createForm.sourceId} onChange={handleCreateFieldChange} required>
              <option value="">Select a Mikrotik</option>
              {mikrotiks.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Target Mikrotik</span>
            <select name="targetId" value={createForm.targetId} onChange={handleCreateFieldChange} required>
              <option value="">Select a Mikrotik</option>
              {mikrotiks.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name}
                </option>
              ))}
            </select>
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
            <span>Status</span>
            <select name="status" value={createForm.status} onChange={handleCreateFieldChange}>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="toggle-field">
            <input
              type="checkbox"
              name="enabled"
              checked={createForm.enabled}
              onChange={handleCreateFieldChange}
            />
            <span>Enabled</span>
          </label>
          <label className="wide">
            <span>Tags</span>
            <input
              name="tags"
              value={createForm.tags}
              onChange={handleCreateFieldChange}
              placeholder="core, backbone, test"
            />
          </label>
          <label className="wide">
            <span>Notes</span>
            <textarea name="notes" value={createForm.notes} onChange={handleCreateFieldChange} rows={3} />
          </label>
          <label>
            <span>Latency (ms)</span>
            <input name="latencyMs" value={createForm.latencyMs} onChange={handleCreateFieldChange} type="number" min="0" />
          </label>
          <label>
            <span>Packet loss (%)</span>
            <input
              name="packetLoss"
              value={createForm.packetLoss}
              onChange={handleCreateFieldChange}
              type="number"
              min="0"
              max="100"
            />
          </label>
          <label className="wide">
            <span>Last checked at</span>
            <input
              name="lastCheckedAt"
              value={createForm.lastCheckedAt}
              onChange={handleCreateFieldChange}
              type="datetime-local"
            />
          </label>
        </form>
      </Modal>

      <Modal
        title="Manage tunnel"
        open={manageState.open}
        onClose={resetManageState}
        actions={[
          {
            label: deleteBusy ? 'Deleting…' : 'Delete',
            variant: 'danger',
            onClick: handleDeleteTunnel,
            disabled: manageBusy || deleteBusy
          },
          {
            label: 'Cancel',
            variant: 'ghost',
            onClick: resetManageState,
            disabled: manageBusy
          },
          {
            label: manageBusy ? 'Saving…' : 'Save changes',
            variant: 'primary',
            type: 'submit',
            form: 'manage-tunnel-form',
            disabled: manageBusy
          }
        ]}
      >
        <form id="manage-tunnel-form" className="form-grid" onSubmit={handleUpdateTunnel}>
          <label>
            <span>Name</span>
            <input name="name" value={manageState.form.name} onChange={handleManageFieldChange} required />
          </label>
          <label>
            <span>Connection type</span>
            <input
              name="connectionType"
              value={manageState.form.connectionType}
              onChange={handleManageFieldChange}
            />
          </label>
          <label>
            <span>Source Mikrotik</span>
            <select name="sourceId" value={manageState.form.sourceId} onChange={handleManageFieldChange} required>
              <option value="">Select a Mikrotik</option>
              {mikrotiks.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Target Mikrotik</span>
            <select name="targetId" value={manageState.form.targetId} onChange={handleManageFieldChange} required>
              <option value="">Select a Mikrotik</option>
              {mikrotiks.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name}
                </option>
              ))}
            </select>
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
            <span>Status</span>
            <select name="status" value={manageState.form.status} onChange={handleManageFieldChange}>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="toggle-field">
            <input
              type="checkbox"
              name="enabled"
              checked={manageState.form.enabled}
              onChange={handleManageFieldChange}
            />
            <span>Enabled</span>
          </label>
          <label className="wide">
            <span>Tags</span>
            <input name="tags" value={manageState.form.tags} onChange={handleManageFieldChange} />
          </label>
          <label className="wide">
            <span>Notes</span>
            <textarea name="notes" value={manageState.form.notes} onChange={handleManageFieldChange} rows={3} />
          </label>
          <label>
            <span>Latency (ms)</span>
            <input name="latencyMs" value={manageState.form.latencyMs} onChange={handleManageFieldChange} type="number" />
          </label>
          <label>
            <span>Packet loss (%)</span>
            <input
              name="packetLoss"
              value={manageState.form.packetLoss}
              onChange={handleManageFieldChange}
              type="number"
            />
          </label>
          <label className="wide">
            <span>Last checked at</span>
            <input
              name="lastCheckedAt"
              value={manageState.form.lastCheckedAt}
              onChange={handleManageFieldChange}
              type="datetime-local"
            />
          </label>
        </form>
      </Modal>
    </div>
  );
};

export default Tunnels;
