import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';

// Modern Icons
const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polyline points="3,6 5,6 21,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TunnelIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TestIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c1.3 0 2.52.28 3.64.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 3v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 21v-5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const statusOptions = [
  { value: 'up', label: 'Up' },
  { value: 'down', label: 'Down' },
  { value: 'maintenance', label: 'Maintenance' }
];

const tunnelTypeOptions = [
  { value: 'GRE', label: 'GRE (IPv4)' },
  { value: 'GREV6', label: 'GRE (IPv6)' },
  { value: 'IPIP', label: 'IPIP' },
  { value: 'IPIPV6', label: 'IPIPv6' },
  { value: 'EOIP', label: 'EoIP' },
  { value: 'EOIPV6', label: 'EoIPv6' },
  { value: '6TO4', label: '6to4' },
  { value: '6TO4-OVER-IPIP', label: '6to4 over IPIP' },
  { value: '6TO4-OVER-GRE', label: '6to4 over GRE' },
  { value: '6TO4-OVER-EOIP', label: '6to4 over EoIP' }
];

const emptyTunnelForm = () => ({
  name: '',
  type: 'GRE',
  status: 'up',
  sourceDeviceId: '',
  targetDeviceId: '',
  sourceInterface: '',
  targetInterface: '',
  sourceAddress: '',
  targetAddress: '',
  mtu: '1476',
  keepalive: '10s,10',
  comment: '',
  tags: '',
  failoverCandidates: [],
  allocateFromIpam: false,
  ipamId: '',
  parentRangeCidr: '',
  mask: '30'
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

const Tunnels = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tunnels, setTunnels] = useState([]);
  const [devices, setDevices] = useState([]);
  const [groups, setGroups] = useState([]);
  const [ipams, setIpams] = useState([]);
  const [sectionOptions, setSectionOptions] = useState([]);
  const [rangeOptions, setRangeOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(emptyTunnelForm());
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [testingTunnel, setTestingTunnel] = useState(null);

  const deviceLookup = useMemo(() => {
    const lookup = new Map();
    devices.forEach((device) => {
      lookup.set(device.id, device);
    });
    return lookup;
  }, [devices]);

  const groupLookup = useMemo(() => {
    const lookup = new Map();
    groups.forEach((group) => {
      lookup.set(group.id, group);
    });
    return lookup;
  }, [groups]);

  const selectedTunnel = useMemo(
    () => (selectedId ? tunnels.find((tunnel) => tunnel.id === selectedId) : null),
    [tunnels, selectedId]
  );

  const filteredTunnels = useMemo(() => {
    let filtered = tunnels;

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((tunnel) =>
        tunnel.name?.toLowerCase().includes(searchLower) ||
        tunnel.comment?.toLowerCase().includes(searchLower) ||
        tunnel.tags?.toLowerCase().includes(searchLower)
      );
    }

    if (filterStatus) {
      filtered = filtered.filter((tunnel) => tunnel.status === filterStatus);
    }

    if (filterType) {
      filtered = filtered.filter((tunnel) => tunnel.type === filterType);
    }

    return filtered;
  }, [tunnels, searchTerm, filterStatus, filterType]);

  const loadTunnels = async () => {
      try {
        setLoading(true);
      const response = await fetch('/api/tunnels');

        if (!response.ok) {
          throw new Error('Unable to load tunnels.');
        }

        const payload = await response.json();
      setTunnels(Array.isArray(payload) ? payload : []);
        setStatus({ type: '', message: '' });
      } catch (error) {
      setTunnels([]);
        setStatus({
          type: 'error',
        message: error.message || 'Unable to load tunnels.'
        });
      } finally {
        setLoading(false);
      }
    };

  const loadDevices = async () => {
    try {
      const response = await fetch('/api/mikrotiks');

      if (!response.ok) {
        throw new Error('Unable to load devices.');
      }

      const payload = await response.json();
      setDevices(Array.isArray(payload) ? payload : []);
    } catch (error) {
      console.error('Failed to load devices:', error);
      setDevices([]);
    }
  };

  const loadGroups = async () => {
    try {
      const response = await fetch('/api/groups');

      if (!response.ok) {
        throw new Error('Unable to load groups.');
      }

      const payload = await response.json();
      setGroups(Array.isArray(payload) ? payload : []);
    } catch (error) {
      console.error('Failed to load groups:', error);
      setGroups([]);
    }
  };

  const loadIpams = async () => {
    try {
      const res = await fetch('/api/ipams');
      if (res.ok) {
        const data = await res.json();
        setIpams(Array.isArray(data) ? data : (data.items || []));
      }
    } catch (e) {
      console.error('Failed to load IPAMs', e);
      setIpams([]);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    loadTunnels();
    loadDevices();
    loadGroups();
    loadIpams();
  }, [navigate, user]);

  const handleCreateTunnel = async () => {
    try {
      const response = await fetch('/api/tunnels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: form.name,
          connectionType: form.type,
          status: form.status,
          sourceId: form.sourceDeviceId,
          targetId: form.targetDeviceId,
          notes: form.comment,
          tags: form.tags
        })
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.message || 'Unable to create tunnel.');
      }

      const created = await response.json();
      const tunnelId = created?.tunnel?.id;

      // If IPAM allocation requested, queue provision call
      if (form.allocateFromIpam && tunnelId && form.ipamId && (form.parentRangeCidr)) {
        try {
          const prov = await fetch(`/api/tunnels/${tunnelId}/provision`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ipamId: Number(form.ipamId),
              parentRangeCidr: form.parentRangeCidr,
              mask: Number(form.mask) || 30,
              description: `Tunnel ${form.name}`
            })
          });
          if (prov.status === 202) {
            setStatus({ type: 'info', message: 'Provision queued. See Queue & Logs.' });
          }
        } catch (e) {
          console.error('Provision queue failed', e);
        }
      }

      setForm(emptyTunnelForm());
      setShowModal(false);
      await loadTunnels();
      setStatus({ type: 'success', message: 'Tunnel created successfully.' });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Unable to create tunnel.'
      });
    }
  };

  const handleUpdateTunnel = async () => {
    try {
      const response = await fetch(`/api/tunnels/${selectedId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.message || 'Unable to update tunnel.');
      }

      setForm(emptyTunnelForm());
      setShowModal(false);
      setIsEditing(false);
      setSelectedId(null);
      await loadTunnels();
      setStatus({
        type: 'success',
        message: 'Tunnel updated successfully.'
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Unable to update tunnel.'
      });
    }
  };

  const handleDeleteTunnel = async () => {
    try {
      const response = await fetch(`/api/tunnels/${selectedId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.message || 'Unable to delete tunnel.');
      }

      setSelectedId(null);
      await loadTunnels();
      setStatus({
        type: 'success',
        message: 'Tunnel deleted successfully.'
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Unable to delete tunnel.'
      });
    }
  };

  const handleTestTunnel = async (tunnel) => {
    try {
      setTestingTunnel(tunnel.id);
      const response = await fetch(`/api/tunnels/${tunnel.id}/test`, {
        method: 'POST'
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.message || 'Tunnel test failed.');
      }

      const result = await response.json();
      setStatus({
        type: result.success ? 'success' : 'error',
        message: result.message || (result.success ? 'Tunnel test successful!' : 'Tunnel test failed.')
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Tunnel test failed.'
      });
    } finally {
      setTestingTunnel(null);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isEditing) {
      handleUpdateTunnel();
    } else {
      handleCreateTunnel();
    }
  };

  const handleEdit = (tunnel) => {
    setForm({
      name: tunnel.name || '',
      type: tunnel.type || 'GRE',
      status: tunnel.status || 'up',
      sourceDeviceId: tunnel.sourceDeviceId || '',
      targetDeviceId: tunnel.targetDeviceId || '',
      sourceInterface: tunnel.sourceInterface || '',
      targetInterface: tunnel.targetInterface || '',
      sourceAddress: tunnel.sourceAddress || '',
      targetAddress: tunnel.targetAddress || '',
      mtu: tunnel.mtu || '1476',
      keepalive: tunnel.keepalive || '10s,10',
      comment: tunnel.comment || '',
      tags: tunnel.tags || '',
      failoverCandidates: tunnel.failoverCandidates || []
    });
    setSelectedId(tunnel.id);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = (tunnel) => {
    setSelectedId(tunnel.id);
    handleDeleteTunnel();
  };

  const handleNewTunnel = () => {
    setForm(emptyTunnelForm());
    setSelectedId(null);
    setIsEditing(false);
    setShowModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'up': return 'status-badge--success';
      case 'down': return 'status-badge--error';
      case 'maintenance': return 'status-badge--warning';
      default: return 'status-badge--info';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'GRE': return 'bg-primary-50 text-primary-700';
      case 'IPIP': return 'bg-info-50 text-info-700';
      case 'EOIP': return 'bg-success-50 text-success-700';
      default: return 'bg-tertiary-50 text-tertiary-700';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Tunnels</h1>
            <p className="text-tertiary mt-2">Manage inter-site tunnels and connectivity.</p>
            </div>
              </div>
        <div className="card">
          <div className="card__body">
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-tertiary bg-opacity-20 rounded-lg animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

    return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Tunnels</h1>
          <p className="text-tertiary mt-2">Manage inter-site tunnels and connectivity.</p>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleNewTunnel}
        >
          <PlusIcon />
          New Tunnel
        </button>
      </div>

      {/* Status Message */}
      {status.message && (
        <div className={`p-4 rounded-xl border ${
          status.type === 'error' 
            ? 'bg-error-50 border-error-200 text-error-700' 
            : 'bg-success-50 border-success-200 text-success-700'
        }`}>
          {status.message}
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="card__body">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
            <div className="flex-1 min-w-0">
              <label htmlFor="search" className="form-label">Search Tunnels</label>
              <input
                id="search"
                type="text"
                className="form-input"
                placeholder="Search by name, comment, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
              <div className="w-full sm:w-40">
                <label htmlFor="status-filter" className="form-label">Filter by Status</label>
                <select
                  id="status-filter"
                  className="form-input form-select"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-full sm:w-40">
                <label htmlFor="type-filter" className="form-label">Filter by Type</label>
                <select
                  id="type-filter"
                  className="form-input form-select"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="">All Types</option>
                  {tunnelTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tunnels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredTunnels.map((tunnel) => (
          <div key={tunnel.id} className="card">
            <div className="card__body">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-50 rounded-lg">
                    <TunnelIcon />
              </div>
                  <div>
                    <h3 className="font-semibold text-primary">{tunnel.name}</h3>
                    <p className="text-sm text-tertiary">{tunnel.type}</p>
            </div>
          </div>
                <span className={`status-badge ${getStatusColor(tunnel.status)}`}>
                  {tunnel.status || 'Unknown'}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-tertiary">Source:</span>
                  <span className="text-secondary">
                    {tunnel.sourceDeviceId ? deviceLookup.get(tunnel.sourceDeviceId)?.name || 'Unknown' : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-tertiary">Target:</span>
                  <span className="text-secondary">
                    {tunnel.targetDeviceId ? deviceLookup.get(tunnel.targetDeviceId)?.name || 'Unknown' : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-tertiary">Addresses:</span>
                  <span className="text-secondary">
                    {tunnel.sourceAddress && tunnel.targetAddress 
                      ? `${tunnel.sourceAddress} → ${tunnel.targetAddress}`
                      : '—'
                    }
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-tertiary">MTU:</span>
                  <span className="text-secondary">{tunnel.mtu || '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-tertiary">Created:</span>
                  <span className="text-secondary">{formatDateTime(tunnel.createdAt)}</span>
                </div>
          </div>

              {tunnel.comment && (
                <div className="mb-4">
                  <p className="text-sm text-tertiary italic">"{tunnel.comment}"</p>
                </div>
              )}

              {tunnel.tags && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-1">
                    {tunnel.tags.split(',').map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-tertiary bg-opacity-20 text-xs rounded-full">
                        {tag.trim()}
                      </span>
                    ))}
            </div>
                </div>
              )}

              <div className="flex gap-2">
                  <button
                    type="button"
                  className="btn btn--secondary btn--sm flex-1"
                  onClick={() => handleEdit(tunnel)}
                  >
                  <EditIcon />
                  Edit
                  </button>
              <button
                type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => handleTestTunnel(tunnel)}
                  disabled={testingTunnel === tunnel.id}
                >
                  {testingTunnel === tunnel.id ? (
                    <RefreshIcon />
                  ) : (
                    <TestIcon />
                  )}
              </button>
                  <button
                    type="button"
                  className="btn btn--danger btn--sm"
                  onClick={() => handleDelete(tunnel)}
                  >
                  <TrashIcon />
                  </button>
              </div>
            </div>
                </div>
              ))}
            </div>

      {filteredTunnels.length === 0 && (
        <div className="card">
          <div className="card__body text-center py-12">
            <TunnelIcon />
            <h3 className="text-lg font-semibold text-primary mt-4">No tunnels found</h3>
            <p className="text-tertiary mt-2">
              {searchTerm || filterStatus || filterType
                ? 'No tunnels match your current filters.' 
                : 'Get started by creating your first tunnel.'
              }
            </p>
            {!searchTerm && !filterStatus && !filterType && (
                  <button
                    type="button"
                className="btn btn--primary mt-4"
                onClick={handleNewTunnel}
                  >
                <PlusIcon />
                Create Your First Tunnel
                  </button>
            )}
                </div>
            </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        title={isEditing ? 'Edit Tunnel' : 'Create New Tunnel'}
        description={isEditing ? 'Update the tunnel configuration below.' : 'Create a new tunnel between two MikroTik devices.'}
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setForm(emptyTunnelForm());
          setIsEditing(false);
          setSelectedId(null);
        }}
        actions={[
                    <button
            key="cancel"
                      type="button"
            className="btn btn--ghost"
            onClick={() => {
              setShowModal(false);
              setForm(emptyTunnelForm());
              setIsEditing(false);
              setSelectedId(null);
            }}
          >
            Cancel
          </button>,
                <button
            key="submit"
            type="submit"
            form="tunnel-form"
            className="btn btn--primary"
            disabled={!form.name.trim() || !form.sourceDeviceId || !form.targetDeviceId}
          >
            {isEditing ? 'Update Tunnel' : 'Create Tunnel'}
                </button>
        ]}
      >
        <form id="tunnel-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label htmlFor="tunnel-name" className="form-label">
                  Tunnel Name *
                    </label>
                      <input
                  id="tunnel-name"
                  type="text"
                  className="form-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Site-A to Site-B"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="tunnel-type" className="form-label">
                  Tunnel Type *
                    </label>
                <select
                  id="tunnel-type"
                  className="form-input form-select"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  required
                >
                  {tunnelTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
            </div>
          </div>

            <div className="form-group">
              <label htmlFor="tunnel-status" className="form-label">
                Status
              </label>
              <select
                id="tunnel-status"
                className="form-input form-select"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              </div>
            </div>

          {/* Device Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary">Device Configuration</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label htmlFor="source-device" className="form-label">
                  Source Device *
            </label>
              <select
                  id="source-device"
                  className="form-input form-select"
                  value={form.sourceDeviceId}
                  onChange={(e) => setForm({ ...form, sourceDeviceId: e.target.value })}
                  required
                >
                  <option value="">Select source device</option>
                  {devices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.name} ({device.host})
                    </option>
                  ))}
              </select>
          </div>

              <div className="form-group">
                <label htmlFor="target-device" className="form-label">
                  Target Device *
                  </label>
                <select
                  id="target-device"
                  className="form-input form-select"
                  value={form.targetDeviceId}
                  onChange={(e) => setForm({ ...form, targetDeviceId: e.target.value })}
                  required
                >
                  <option value="">Select target device</option>
                  {devices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.name} ({device.host})
                    </option>
                  ))}
                </select>
            </div>
          </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label htmlFor="source-interface" className="form-label">
                  Source Interface
                  </label>
                    <input
                  id="source-interface"
                  type="text"
                  className="form-input"
                  value={form.sourceInterface}
                  onChange={(e) => setForm({ ...form, sourceInterface: e.target.value })}
                  placeholder="e.g., ether1"
                />
              </div>

              <div className="form-group">
                <label htmlFor="target-interface" className="form-label">
                  Target Interface
                  </label>
                    <input
                  id="target-interface"
                  type="text"
                  className="form-input"
                  value={form.targetInterface}
                  onChange={(e) => setForm({ ...form, targetInterface: e.target.value })}
                  placeholder="e.g., ether1"
                />
            </div>
          </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label htmlFor="source-address" className="form-label">
                  Source Address
                  </label>
                    <input
                  id="source-address"
                  type="text"
                  className="form-input"
                  value={form.sourceAddress}
                  onChange={(e) => setForm({ ...form, sourceAddress: e.target.value })}
                  placeholder="e.g., 192.168.1.1"
                />
              </div>

              <div className="form-group">
                <label htmlFor="target-address" className="form-label">
                  Target Address
                  </label>
                    <input
                  id="target-address"
                  type="text"
                  className="form-input"
                  value={form.targetAddress}
                  onChange={(e) => setForm({ ...form, targetAddress: e.target.value })}
                  placeholder="e.g., 192.168.2.1"
                />
                </div>
            </div>
          </div>

          {/* Advanced Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary">Advanced Configuration</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label htmlFor="tunnel-mtu" className="form-label">
                  MTU
                  </label>
                    <input
                  id="tunnel-mtu"
                      type="number"
                  className="form-input"
                  value={form.mtu}
                  onChange={(e) => setForm({ ...form, mtu: e.target.value })}
                  placeholder="1476"
                />
              </div>

              <div className="form-group">
                <label htmlFor="tunnel-keepalive" className="form-label">
                  Keepalive
                  </label>
                    <input
                  id="tunnel-keepalive"
                  type="text"
                  className="form-input"
                  value={form.keepalive}
                  onChange={(e) => setForm({ ...form, keepalive: e.target.value })}
                  placeholder="10s,10"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="tunnel-comment" className="form-label">
                Comment
                  </label>
              <textarea
                id="tunnel-comment"
                className="form-input form-textarea"
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
                placeholder="Additional notes about this tunnel..."
                rows={3}
              />
                </div>

            <div className="form-group">
              <label htmlFor="tunnel-tags" className="form-label">
                Tags
                  </label>
                    <input
                id="tunnel-tags"
                type="text"
                className="form-input"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="e.g., production, backup, critical"
              />
                </div>
              </div>

          {/* IPAM Provisioning (Optional) */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary">IPAM Provisioning (Optional)</h3>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.allocateFromIpam}
                onChange={(e) => setForm({ ...form, allocateFromIpam: e.target.checked })}
              />
              <span className="text-sm text-secondary">Allocate /30 (or custom) from PHP‑IPAM</span>
            </label>

            {form.allocateFromIpam && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">IPAM</label>
                    <select
                      className="form-input form-select"
                      value={form.ipamId}
                      onChange={async (e) => {
                        const ipamId = e.target.value;
                        setForm({ ...form, ipamId, parentRangeCidr: '' });
                        setSectionOptions([]);
                        setRangeOptions([]);
                        if (ipamId) {
                          const res = await fetch(`/api/ipams/${ipamId}`);
                          if (res.ok) {
                            const data = await res.json();
                            setSectionOptions(data.collections?.sections || []);
                          }
                        }
                      }}
                    >
                      <option value="">Select IPAM</option>
                      {ipams.map((i) => (
                        <option key={i.id} value={i.id}>{i.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mask</label>
                    <input
                      type="number"
                      className="form-input"
                      value={form.mask}
                      onChange={(e) => setForm({ ...form, mask: e.target.value })}
                      placeholder="30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Section</label>
                    <select
                      className="form-input form-select"
                      value={form.sectionId || ''}
                      onChange={async (e) => {
                        const sectionId = e.target.value;
                        setForm({ ...form, sectionId, parentRangeCidr: '' });
                        setRangeOptions([]);
                        if (form.ipamId && sectionId) {
                          const res = await fetch(`/api/ipams/${form.ipamId}/sections/${sectionId}`);
                          if (res.ok) {
                            const data = await res.json();
                            const roots = (data.ranges || []).filter(r => !r?.metadata?.masterSubnetId || r?.metadata?.masterSubnetId == 0);
                            setRangeOptions(roots);
                          }
                        }
                      }}
                    >
                      <option value="">Select section</option>
                      {sectionOptions.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Parent Range</label>
                    <select
                      className="form-input form-select"
                      value={form.parentRangeCidr}
                      onChange={(e) => setForm({ ...form, parentRangeCidr: e.target.value })}
                    >
                      <option value="">Select parent range</option>
                      {rangeOptions.map((r) => (
                        <option key={r.id} value={r.metadata?.cidr || ''}>{r.metadata?.cidr || r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>
      </Modal>

      {/* IPAM Provisioning Options inside modal body */}
    </div>
  );
};

export default Tunnels;