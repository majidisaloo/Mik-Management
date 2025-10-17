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

const DeviceIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
    <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="2" />
    <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2" />
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

const Mikrotiks = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(emptyDeviceForm());
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [testingDevice, setTestingDevice] = useState(null);

  const groupLookup = useMemo(() => {
    const lookup = new Map();
    groups.forEach((group) => {
      lookup.set(group.id, group);
    });
    return lookup;
  }, [groups]);

  const selectedDevice = useMemo(
    () => (selectedId ? devices.find((device) => device.id === selectedId) : null),
    [devices, selectedId]
  );

  const filteredDevices = useMemo(() => {
    let filtered = devices;

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((device) =>
        device.name?.toLowerCase().includes(searchLower) ||
        device.host?.toLowerCase().includes(searchLower) ||
        device.tags?.toLowerCase().includes(searchLower)
      );
    }

    if (filterGroup) {
      filtered = filtered.filter((device) => device.groupId === Number.parseInt(filterGroup, 10));
    }

    return filtered;
  }, [devices, searchTerm, filterGroup]);

  const loadDevices = async () => {
      try {
        setLoading(true);
      const response = await fetch('/api/mikrotiks');

      if (!response.ok) {
        throw new Error('Unable to load MikroTik devices.');
      }

      const payload = await response.json();
      setDevices(Array.isArray(payload) ? payload : []);
        setStatus({ type: '', message: '' });
      } catch (error) {
      setDevices([]);
        setStatus({
          type: 'error',
        message: error.message || 'Unable to load MikroTik devices.'
        });
      } finally {
        setLoading(false);
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

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    loadDevices();
    loadGroups();
  }, [navigate, user]);

  const handleCreateDevice = async () => {
    try {
      const response = await fetch('/api/mikrotiks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.message || 'Unable to create device.');
      }

      setForm(emptyDeviceForm());
      setShowModal(false);
      await loadDevices();
      setStatus({
        type: 'success',
        message: 'Device created successfully.'
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Unable to create device.'
      });
    }
  };

  const handleUpdateDevice = async () => {
    try {
      const response = await fetch(`/api/mikrotiks/${selectedId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.message || 'Unable to update device.');
      }

      setForm(emptyDeviceForm());
      setShowModal(false);
      setIsEditing(false);
      setSelectedId(null);
      await loadDevices();
      setStatus({
        type: 'success',
        message: 'Device updated successfully.'
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Unable to update device.'
      });
    }
  };

  const handleDeleteDevice = async () => {
    try {
      const response = await fetch(`/api/mikrotiks/${selectedId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.message || 'Unable to delete device.');
      }

      setSelectedId(null);
      await loadDevices();
      setStatus({
        type: 'success',
        message: 'Device deleted successfully.'
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Unable to delete device.'
      });
    }
  };

  const handleTestConnectivity = async (device) => {
    try {
      setTestingDevice(device.id);
      const response = await fetch(`/api/mikrotiks/${device.id}/test`, {
        method: 'POST'
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.message || 'Connection test failed.');
      }

      const result = await response.json();
      setStatus({
        type: result.success ? 'success' : 'error',
        message: result.message || (result.success ? 'Connection successful!' : 'Connection failed.')
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Connection test failed.'
      });
    } finally {
      setTestingDevice(null);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isEditing) {
      handleUpdateDevice();
    } else {
      handleCreateDevice();
    }
  };

  const handleEdit = (device) => {
    setForm({
      name: device.name || '',
      host: device.host || '',
      groupId: device.groupId || '',
      tags: device.tags || '',
      notes: device.notes || '',
      routeros: { ...defaultRouterForm(), ...device.routeros }
    });
    setSelectedId(device.id);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = (device) => {
    setSelectedId(device.id);
    handleDeleteDevice();
  };

  const handleNewDevice = () => {
    setForm(emptyDeviceForm());
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">MikroTik Devices</h1>
            <p className="text-tertiary mt-2">Manage and monitor your MikroTik router infrastructure.</p>
        </div>
        </div>
        <div className="card">
          <div className="card__body">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-tertiary bg-opacity-20 rounded-lg animate-pulse"></div>
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
          <h1 className="text-3xl font-bold text-primary">MikroTik Devices</h1>
          <p className="text-tertiary mt-2">Manage and monitor your MikroTik router infrastructure.</p>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleNewDevice}
        >
          <PlusIcon />
          Add Device
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="search" className="form-label">Search Devices</label>
            <input
                id="search"
                type="text"
                className="form-input"
                placeholder="Search by name, host, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
        </div>
            <div>
              <label htmlFor="group-filter" className="form-label">Filter by Group</label>
              <select
                id="group-filter"
                className="form-input form-select"
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
              >
                <option value="">All Groups</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
          </div>
      </div>
          </div>
        </div>

      {/* Devices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDevices.map((device) => (
          <div key={device.id} className="card">
            <div className="card__body">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-50 rounded-lg">
                    <DeviceIcon />
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary">{device.name}</h3>
                    <p className="text-sm text-tertiary">{device.host}</p>
                  </div>
                  </div>
                <span className={`status-badge ${getStatusColor(device.status)}`}>
                  {device.status || 'Unknown'}
                </span>
        </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-tertiary">Group:</span>
                  <span className="text-secondary">
                    {device.groupId ? groupLookup.get(device.groupId)?.name || 'Unknown' : 'None'}
                  </span>
        </div>
                <div className="flex justify-between text-sm">
                  <span className="text-tertiary">Firmware:</span>
                  <span className="text-secondary">{device.routeros?.firmwareVersion || 'Unknown'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-tertiary">API:</span>
                  <span className="text-secondary">
                    {device.routeros?.apiEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-tertiary">Created:</span>
                  <span className="text-secondary">{formatDateTime(device.createdAt)}</span>
        </div>
      </div>

              {device.tags && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-1">
                    {device.tags.split(',').map((tag, index) => (
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
                  onClick={() => handleEdit(device)}
                >
                  <EditIcon />
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => handleTestConnectivity(device)}
                  disabled={testingDevice === device.id}
                >
                  {testingDevice === device.id ? (
                    <RefreshIcon />
                  ) : (
                    <TestIcon />
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn--danger btn--sm"
                  onClick={() => handleDelete(device)}
                >
                  <TrashIcon />
                </button>
                </div>
              </div>
              </div>
        ))}
      </div>

      {filteredDevices.length === 0 && (
        <div className="card">
          <div className="card__body text-center py-12">
            <DeviceIcon />
            <h3 className="text-lg font-semibold text-primary mt-4">No devices found</h3>
            <p className="text-tertiary mt-2">
              {searchTerm || filterGroup 
                ? 'No devices match your current filters.' 
                : 'Get started by adding your first MikroTik device.'
              }
            </p>
            {!searchTerm && !filterGroup && (
              <button
                type="button"
                className="btn btn--primary mt-4"
                onClick={handleNewDevice}
              >
                <PlusIcon />
                Add Your First Device
              </button>
            )}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
        <Modal
        title={isEditing ? 'Edit Device' : 'Add New Device'}
        description={isEditing ? 'Update the device configuration below.' : 'Add a new MikroTik device to your network.'}
        open={showModal}
          onClose={() => {
          setShowModal(false);
          setForm(emptyDeviceForm());
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
              setForm(emptyDeviceForm());
              setIsEditing(false);
              setSelectedId(null);
            }}
          >
                Cancel
          </button>,
              <button
            key="submit"
                type="submit"
            form="device-form"
            className="btn btn--primary"
            disabled={!form.name.trim() || !form.host.trim()}
          >
            {isEditing ? 'Update Device' : 'Add Device'}
              </button>
        ]}
      >
        <form id="device-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label htmlFor="device-name" className="form-label">
                  Device Name *
            </label>
                <input
                  id="device-name"
                  type="text"
                  className="form-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Router-01"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="device-host" className="form-label">
                  Host Address *
            </label>
                <input
                  id="device-host"
                  type="text"
                  className="form-input"
                  value={form.host}
                  onChange={(e) => setForm({ ...form, host: e.target.value })}
                  placeholder="e.g., 192.168.1.1"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="device-group" className="form-label">
                Group
              </label>
              <select
                id="device-group"
                className="form-input form-select"
                value={form.groupId}
                onChange={(e) => setForm({ ...form, groupId: e.target.value })}
              >
                <option value="">No group</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="device-tags" className="form-label">
                Tags
            </label>
              <input
                id="device-tags"
                type="text"
                className="form-input"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="e.g., production, core, backup"
              />
            </div>

            <div className="form-group">
              <label htmlFor="device-notes" className="form-label">
                Notes
            </label>
              <textarea
                id="device-notes"
                className="form-input form-textarea"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Additional notes about this device..."
                rows={3}
              />
            </div>
          </div>

          {/* RouterOS API Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary">RouterOS API Configuration</h3>
            
            <div className="form-group">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.routeros.apiEnabled}
                  onChange={(e) => setForm({
                    ...form,
                    routeros: { ...form.routeros, apiEnabled: e.target.checked }
                  })}
                />
                <span className="form-label mb-0">Enable RouterOS API</span>
            </label>
            </div>

            {form.routeros.apiEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label htmlFor="api-port" className="form-label">
                    API Port
            </label>
                  <input
                    id="api-port"
                    type="number"
                    className="form-input"
                    value={form.routeros.apiPort}
                    onChange={(e) => setForm({
                      ...form,
                      routeros: { ...form.routeros, apiPort: e.target.value }
                    })}
                    placeholder="8728"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="api-username" className="form-label">
                    Username
            </label>
              <input
                    id="api-username"
                    type="text"
                    className="form-input"
                    value={form.routeros.apiUsername}
                    onChange={(e) => setForm({
                      ...form,
                      routeros: { ...form.routeros, apiUsername: e.target.value }
                    })}
                    placeholder="admin"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="api-password" className="form-label">
                    Password
            </label>
                  <input
                    id="api-password"
                    type="password"
                    className="form-input"
                    value={form.routeros.apiPassword}
                    onChange={(e) => setForm({
                      ...form,
                      routeros: { ...form.routeros, apiPassword: e.target.value }
                    })}
                    placeholder="Enter password"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="api-timeout" className="form-label">
                    Timeout (ms)
            </label>
                  <input
                    id="api-timeout"
                    type="number"
                    className="form-input"
                    value={form.routeros.apiTimeout}
                    onChange={(e) => setForm({
                      ...form,
                      routeros: { ...form.routeros, apiTimeout: e.target.value }
                    })}
                    placeholder="5000"
                  />
            </div>
              </div>
            )}
          </div>
          </form>
        </Modal>
    </div>
  );
};

export default Mikrotiks;