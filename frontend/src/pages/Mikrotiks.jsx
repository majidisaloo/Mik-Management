import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import './Mikrotiks.css';

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

const SSHIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="16" r="1" fill="currentColor" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const NetworkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polyline points="9,18 15,12 9,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polyline points="6,9 12,15 18,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const FolderIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
  sshEnabled: false,
  sshPort: '22',
  sshUsername: 'admin',
  sshPassword: '',
  sshKeyFile: '',
  sshAcceptNewHostKeys: true,
  preferredApiFirst: true,
  firmwareVersion: ''
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

  // Handle object values
  if (typeof value === 'object') {
    console.log('formatDateTime received object:', value);
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

const safeRender = (value, fallback = '—') => {
  if (value === null || value === undefined) {
    return fallback;
  }
  
  if (typeof value === 'object') {
    console.log('safeRender received object:', value);
    return fallback;
  }
  
  return String(value);
};

const Mikrotiks = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [successAlert, setSuccessAlert] = useState({ show: false, message: '' });
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(emptyDeviceForm());
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [testingDevice, setTestingDevice] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState(() => {
    try {
      const saved = sessionStorage.getItem('mikrotiks-groups-expanded');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const groupLookup = useMemo(() => {
    const lookup = new Map();
    groups.forEach((group) => {
      lookup.set(group.id, group);
    });
    return lookup;
  }, [groups]);

  const groupTree = useMemo(() => {
    const nodeLookup = new Map();
    const roots = [];

    groups.forEach((group) => {
      const node = {
        ...group,
        children: []
      };
      nodeLookup.set(group.id, node);
    });

    groups.forEach((group) => {
      const node = nodeLookup.get(group.id);
      if (group.parentId) {
        const parent = nodeLookup.get(group.parentId);
        if (parent) {
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    const sortNodes = (nodes) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name));
      nodes.forEach((node) => {
        if (node.children.length > 0) {
          sortNodes(node.children);
        }
      });
    };

    sortNodes(roots);
    return roots;
  }, [groups]);


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
      const response = await fetch(`/api/mikrotiks?t=${Date.now()}`);

      if (!response.ok) {
        throw new Error('Unable to load MikroTik devices.');
      }

      const payload = await response.json();
      console.log('Mikrotiks API response:', payload);
      
      // Handle different response structures
      let devicesArray = [];
      if (Array.isArray(payload)) {
        devicesArray = payload;
      } else if (payload && Array.isArray(payload.devices)) {
        devicesArray = payload.devices;
      } else if (payload && Array.isArray(payload.mikrotiks)) {
        devicesArray = payload.mikrotiks;
      }
      
      console.log('Devices array:', devicesArray);
      if (devicesArray.length > 0) {
        console.log('First device object:', devicesArray[0]);
        console.log('Device keys:', Object.keys(devicesArray[0]));
      }
      setDevices(devicesArray);
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
      console.log('Loading groups for Mikrotiks...');
      const response = await fetch('/api/groups');

      if (!response.ok) {
        throw new Error('Unable to load groups.');
      }

      const payload = await response.json();
      console.log('Groups payload:', payload);
      
      // Handle both array and object response formats
      let groupsArray = [];
      if (Array.isArray(payload)) {
        groupsArray = payload;
      } else if (payload && Array.isArray(payload.groups)) {
        groupsArray = payload.groups;
      }
      
      console.log('Groups array:', groupsArray);
      setGroups(groupsArray);
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
    
    // Auto-refresh data every 30 seconds
    const interval = setInterval(() => {
      loadDevices();
    }, 30000);
    
    return () => clearInterval(interval);
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
      setSuccessAlert({
        show: true,
        message: 'MikroTik device added successfully!'
      });
      // Auto-hide success alert after 3 seconds
      setTimeout(() => {
        setSuccessAlert({ show: false, message: '' });
      }, 3000);
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
      
      const response = await fetch(`/api/mikrotiks/${device.id}/test-connectivity`, {
        method: 'POST'
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.message || 'Connection test failed.');
      }

      const result = await response.json();
      
      // Refresh the devices list to show updated connectivity status
      await loadDevices();
      
      // Show success message with green hover effect
      setStatus({
        type: 'success',
        message: result.message || 'Connectivity refreshed successfully!'
      });
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setStatus({ type: '', message: '' });
      }, 3000);
      
    } catch (error) {
      // Show error message with red hover effect
      setStatus({
        type: 'error',
        message: error.message || 'Connection test failed.'
      });
      
      // Auto-hide error message after 5 seconds
      setTimeout(() => {
        setStatus({ type: '', message: '' });
      }, 5000);
    } finally {
      setTestingDevice(null);
    }
  };

  const handleSSHConnection = async (device) => {
    try {
      // Check if SSH is enabled for this device
      if (!device.routeros?.sshEnabled) {
        setStatus({
          type: 'error',
          message: `SSH is not enabled for ${device.name}. Please enable SSH in device settings.`
        });
      return;
    }

      // Simulate SSH connection
      setStatus({
        type: 'success',
        message: `SSH connection initiated for ${device.name} (${device.host}:${device.routeros.sshPort})`
      });

      // In a real implementation, this would open an SSH terminal or redirect to SSH client
      console.log('SSH Connection details:', {
        host: device.host,
        port: device.routeros.sshPort,
        username: device.routeros.sshUsername,
        keyFile: device.routeros.sshKeyFile
      });

    } catch (error) {
      setStatus({
        type: 'error',
        message: `SSH connection failed for ${device.name}: ${error.message}`
      });
    }
  };

  const toggleExpanded = (groupId) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      try {
        sessionStorage.setItem('mikrotiks-groups-expanded', JSON.stringify([...newSet]));
      } catch (error) {
        console.warn('Failed to save expanded state:', error);
      }
      return newSet;
    });
  };

  const renderGroupOption = (node, depth = 0) => {
    const indent = '　'.repeat(depth * 2); // Using full-width spaces for indentation
    const prefix = depth > 0 ? '└─ ' : '';
    
    return (
      <React.Fragment key={node.id}>
        <option value={node.id}>
          {indent}{prefix}{node.name}
        </option>
        {node.children?.map((child) => renderGroupOption(child, depth + 1))}
      </React.Fragment>
    );
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

  const handleDeviceClick = (device) => {
    navigate(`/mikrotiks/${device.id}`);
  };

  const getStatusColor = (status) => {
    // Handle object status (from backend API)
    if (typeof status === 'object' && status !== null) {
      const updateStatus = status.updateStatus || 'unknown';
      switch (updateStatus.toLowerCase()) {
        case 'updated':
        case 'connected':
          return 'status-badge--success';
        case 'pending':
          return 'status-badge--warning';
        case 'unknown':
        default:
          return 'status-badge--error';
      }
    }
    
    // Handle string status (legacy or direct string)
    const statusStr = String(status).toLowerCase();
    switch (statusStr) {
      case 'up': 
      case 'online':
      case 'connected':
      case 'updated':
        return 'status-badge--success';
      case 'down': 
      case 'offline':
      case 'disconnected':
      case 'unknown':
        return 'status-badge--error';
      case 'maintenance': 
      case 'maintenance mode':
      case 'pending':
        return 'status-badge--warning';
      default: 
        return 'status-badge--error';
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
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn btn--ghost hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 hover:scale-105"
            onClick={() => {
              loadDevices();
              setStatus({ type: 'success', message: 'Data refreshed successfully!' });
              setTimeout(() => setStatus({ type: '', message: '' }), 3000);
            }}
            title="Refresh data"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <button
            type="button"
            className="btn btn--primary hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            onClick={handleNewDevice}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Device
          </button>
        </div>
        </div>

      {/* Status Message with Enhanced Hover Effects */}
      {status.message && (
        <div className={`p-4 rounded-xl border transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${
          status.type === 'error' 
            ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300' 
            : status.type === 'info'
            ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300'
            : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:border-green-300'
        }`}>
          <div className="flex items-center gap-2">
            {status.type === 'success' && (
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
            )}
            {status.type === 'error' && (
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
            )}
            {status.type === 'info' && (
              <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
            )}
            <span className="font-medium">{status.message}</span>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {successAlert.show && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c1.3 0 2.52.28 3.64.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-medium">{successAlert.message}</span>
          <button
            onClick={() => setSuccessAlert({ show: false, message: '' })}
            className="ml-2 text-white/80 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="card mt-8">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-3">
        {filteredDevices.map((device) => {
          // Determine connection statuses
          const apiConfigured = device.routeros?.apiEnabled && device.routeros?.apiUsername && device.routeros?.apiPassword;
          const sshConfigured = device.routeros?.sshEnabled && device.routeros?.sshUsername && device.routeros?.sshPassword;
          
          // Get actual connection status from connectivity data
          const apiConnected = device.connectivity?.api?.status === 'up' || device.connectivity?.api?.status === 'connected' || device.connectivity?.api?.status === 'online';
          const sshConnected = device.connectivity?.ssh?.status === 'up' || device.connectivity?.ssh?.status === 'connected' || device.connectivity?.ssh?.status === 'online';
          
          // Override SSH status if it's explicitly offline or if SSH is disabled on the device
          const actualSshConnected = (device.connectivity?.ssh?.status === 'offline' || !device.routeros?.sshEnabled) ? false : sshConnected;
          
          // Determine ping status based on any successful connection
          const pingStatus = (apiConnected || actualSshConnected) ? 'up' : 'down';
          
          return (
            <div key={device.id} className="card hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
              <div className="card__body p-3">
                {/* Header with device info and action buttons */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="p-1 bg-primary-50 rounded-lg flex-shrink-0">
                      <DeviceIcon />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-primary text-sm truncate" title={safeRender(device.name, 'Unknown Device')}>
                        {safeRender(device.name, 'Unknown Device')}
                      </h3>
                      <p className="text-xs text-tertiary truncate" title={safeRender(device.host, 'No Host')}>
                        {safeRender(device.host, 'No Host')}
                      </p>
                    </div>
                  </div>
                  
                  {/* Action buttons in top-right */}
                  <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="p-2 text-tertiary hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 hover:scale-110"
                      onClick={() => handleEdit(device)}
                      title="Edit Device"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="p-2 text-tertiary hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200 hover:scale-110 group relative"
                      onClick={() => handleTestConnectivity(device)}
                      disabled={testingDevice === device.id}
                      title="Test Connection - Click to refresh connectivity status"
                    >
                      {testingDevice === device.id ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      {/* Enhanced hover tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-20 pointer-events-none">
                        Test Connectivity
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="p-2 text-tertiary hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 hover:scale-110"
                      onClick={() => handleDelete(device)}
                      title="Delete Device"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Status indicators - compact row */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {/* Ping Status */}
                    <div className="flex items-center gap-1 group cursor-help" title={`Ping: ${pingStatus === 'up' ? 'Connected' : pingStatus === 'down' ? 'Disconnected' : 'Unknown'}`}>
                      <div className={`w-2 h-2 rounded-full transition-colors ${
                        pingStatus === 'up' ? 'bg-green-500 group-hover:bg-green-400' : 
                        pingStatus === 'down' ? 'bg-red-500 group-hover:bg-red-400' : 
                        'bg-gray-400 group-hover:bg-gray-300'
                      }`}></div>
                      <span className="text-xs text-tertiary">Ping</span>
                    </div>
                    
                    {/* API Status - only show if configured */}
                    {apiConfigured && (
                      <div className="flex items-center gap-1 group cursor-help" title={`API: ${apiConnected ? 'Connected' : 'Disconnected'}`}>
                        <div className={`w-2 h-2 rounded-full transition-colors ${apiConnected ? 'bg-green-500 group-hover:bg-green-400' : 'bg-red-500 group-hover:bg-red-400'}`}></div>
                        <span className="text-xs text-tertiary">API</span>
                      </div>
                    )}
                    
                    {/* SSH Status - show if configured or enabled */}
                    {(sshConfigured || device.routeros?.sshEnabled) && (
                      <div className="flex items-center gap-1 group cursor-help" title={`SSH: ${!device.routeros?.sshEnabled ? 'Disabled on device' : actualSshConnected ? 'Connected' : 'Disconnected'}`}>
                        <div className={`w-2 h-2 rounded-full transition-colors ${
                          !device.routeros?.sshEnabled 
                            ? 'bg-gray-400 group-hover:bg-gray-300'
                            : (actualSshConnected ? 'bg-green-500 group-hover:bg-green-400' : 'bg-red-500 group-hover:bg-red-400')
                        }`}></div>
                        <span className="text-xs text-tertiary">SSH</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Device Status Badge */}
                  <span className={`status-badge status-badge--sm ${getStatusColor(device.status)}`} title={
                    typeof device.status === 'object' && device.status !== null 
                      ? `Update Status: ${device.status.updateStatus || 'unknown'}`
                      : 'Device status unknown'
                  }>
                    {typeof device.status === 'object' && device.status !== null 
                      ? (device.status.updateStatus || 'unknown').toUpperCase()
                      : typeof device.status === 'string' 
                        ? device.status.toUpperCase() 
                        : 'UNKNOWN'}
                  </span>
                </div>

                {/* Device details in compact format */}
                <div className="space-y-1 mb-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-tertiary">Group:</span>
                    <span className="text-secondary truncate ml-2" title={device.groupId ? groupLookup.get(device.groupId)?.name || 'Unknown' : 'None'}>
                      {device.groupId ? groupLookup.get(device.groupId)?.name || 'Unknown' : 'None'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-tertiary">Firmware:</span>
                    <span className={`truncate ml-2 ${device.routeros?.firmwareVersion && device.routeros.firmwareVersion.trim() ? 'text-secondary' : 'text-red-500'}`} title={device.routeros?.firmwareVersion && device.routeros.firmwareVersion.trim() ? device.routeros.firmwareVersion : 'Firmware version not detected - run connection test'}>
                      {device.routeros?.firmwareVersion && device.routeros.firmwareVersion.trim() 
                        ? device.routeros.firmwareVersion 
                        : 'Not detected'}
                    </span>
                  </div>
                </div>

                {/* Tags - compact */}
                {device.tags && typeof device.tags === 'string' && device.tags.trim() && (
                  <div className="flex flex-wrap gap-1">
                    {device.tags.split(',').slice(0, 2).map((tag, index) => (
                      <span key={index} className="px-1.5 py-0.5 bg-tertiary bg-opacity-20 text-xs rounded-full truncate max-w-[60px]" title={tag.trim()}>
                        {tag.trim()}
                      </span>
                    ))}
                    {device.tags.split(',').length > 2 && (
                      <span className="px-1.5 py-0.5 bg-tertiary bg-opacity-20 text-xs rounded-full">
                        +{device.tags.split(',').length - 2}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
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
                {groupTree.map((node) => renderGroupOption(node, 0))}
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

          {/* SSH Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary">SSH Configuration</h3>
            
            <div className="form-group">
              <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                  checked={form.routeros.sshEnabled}
                  onChange={(e) => setForm({
                    ...form,
                    routeros: { ...form.routeros, sshEnabled: e.target.checked }
                  })}
                />
                <span className="form-label mb-0">Enable SSH Connection</span>
                    </label>
                  </div>

            {form.routeros.sshEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label htmlFor="ssh-port" className="form-label">
                    SSH Port
                  </label>
            <input
                    id="ssh-port"
                    type="number"
                    className="form-input"
                    value={form.routeros.sshPort}
                    onChange={(e) => setForm({
                      ...form,
                      routeros: { ...form.routeros, sshPort: e.target.value }
                    })}
                    placeholder="22"
                  />
        </div>

                <div className="form-group">
                  <label htmlFor="ssh-username" className="form-label">
                    SSH Username
                  </label>
              <input
                    id="ssh-username"
                    type="text"
                    className="form-input"
                    value={form.routeros.sshUsername}
                    onChange={(e) => setForm({
                      ...form,
                      routeros: { ...form.routeros, sshUsername: e.target.value }
                    })}
                    placeholder="admin"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="ssh-password" className="form-label">
                    SSH Password
            </label>
              <input
                    id="ssh-password"
                type="password"
                    className="form-input"
                    value={form.routeros.sshPassword}
                    onChange={(e) => setForm({
                      ...form,
                      routeros: { ...form.routeros, sshPassword: e.target.value }
                    })}
                    placeholder="Enter SSH password"
                  />
          </div>

                <div className="form-group">
                  <label htmlFor="ssh-keyfile" className="form-label">
                    SSH Key File (Optional)
                  </label>
            <input
                    id="ssh-keyfile"
                    type="text"
                    className="form-input"
                    value={form.routeros.sshKeyFile}
                    onChange={(e) => setForm({
                      ...form,
                      routeros: { ...form.routeros, sshKeyFile: e.target.value }
                    })}
                    placeholder="/path/to/private/key"
                  />
        </div>

                <div className="form-group md:col-span-2">
                  <label className="flex items-center gap-2">
              <input
                      type="checkbox"
                      checked={form.routeros.sshAcceptNewHostKeys}
                      onChange={(e) => setForm({
                        ...form,
                        routeros: { ...form.routeros, sshAcceptNewHostKeys: e.target.checked }
                      })}
                    />
                    <span className="form-label mb-0">Accept new host keys automatically</span>
            </label>
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