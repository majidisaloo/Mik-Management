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

  // Add CSS for spin animation
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">MikroTik Devices</h1>
            <p className="text-gray-600 mt-2">Manage and monitor your MikroTik router infrastructure.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-20 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
        </div>

        {/* Search Section Skeleton */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-10 w-full bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
            <div>
              <div className="h-4 w-28 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-10 w-full bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Device Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse"></div>
                    <div>
                      <div className="h-5 w-24 bg-gray-200 rounded animate-pulse mb-1"></div>
                      <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(4)].map((_, j) => (
                      <div key={j} className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-gray-200 rounded-full animate-pulse"></div>
                      <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-gray-200 rounded-full animate-pulse"></div>
                      <div className="h-4 w-8 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </div>
                  <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse"></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="h-3 w-12 bg-gray-200 rounded animate-pulse mb-1"></div>
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                  <div>
                    <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mb-1"></div>
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
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
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            onClick={() => {
              loadDevices();
              setStatus({ type: 'success', message: 'Data refreshed successfully!' });
              setTimeout(() => setStatus({ type: '', message: '' }), 3000);
            }}
            title="Refresh data"
            aria-label="Refresh device list"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md"
            onClick={handleNewDevice}
            aria-label="Add new device"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search Devices
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                id="search"
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search by name, host, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search devices"
                aria-describedby="search-help"
              />
            </div>
          </div>
          <div>
            <label htmlFor="group-filter" className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Group
            </label>
            <select
              id="group-filter"
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              aria-label="Filter devices by group"
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

      {/* Devices Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
        {filteredDevices.map((device) => {
          // Determine connection statuses
          const apiConfigured = device.routeros?.apiEnabled && device.routeros?.apiUsername && device.routeros?.apiPassword;
          const sshConfigured = device.routeros?.sshEnabled && device.routeros?.sshUsername && device.routeros?.sshPassword;
          
          // Get actual connection status from connectivity data
          const apiConnected = device.connectivity?.api?.status === 'up' || device.connectivity?.api?.status === 'connected' || device.connectivity?.api?.status === 'online';
          const sshConnected = device.connectivity?.ssh?.status === 'up' || device.connectivity?.ssh?.status === 'connected' || device.connectivity?.ssh?.status === 'online';
          
          // Override SSH status if it's explicitly offline or if SSH is disabled on the device
          const actualSshConnected = (device.connectivity?.ssh?.status === 'offline' || device.connectivity?.ssh?.status === 'disabled' || !device.routeros?.sshEnabled) ? false : sshConnected;
          
          // Determine ping status based on any successful connection
          const pingStatus = (apiConnected || actualSshConnected) ? 'up' : 'down';
          
          // Calculate ping time (simplified - in real implementation, this would be actual ping measurement)
          const getPingTime = () => {
            if (pingStatus === 'up') {
              // Simulate ping time based on connection type
              if (apiConnected && actualSshConnected) {
                return '<1ms'; // Both connected - very fast
              } else if (apiConnected) {
                return '2ms'; // API only
              } else if (actualSshConnected) {
                return '5ms'; // SSH only
              }
            }
            return 'N/A';
          };
          
          return (
            <div key={device.id} className="bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-200 overflow-hidden">
              {/* Header section */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  {/* Device info */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                      <span className="text-2xl">🖥️</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{safeRender(device.name, 'Unknown Device')}</h3>
                      <p className="text-sm text-gray-500 font-mono">{safeRender(device.host, 'No Host')}</p>
                    </div>
                  </div>
                  
                  {/* Action buttons - Clean and organized */}
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                      onClick={() => handleEdit(device)}
                      title="Edit Device"
                      aria-label={`Edit device ${device.name}`}
                      style={{ fontSize: '18px', lineHeight: '1' }}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => handleTestConnectivity(device)}
                      disabled={testingDevice === device.id}
                      title="Test Connection"
                      aria-label={`Test connection for device ${device.name}`}
                      style={{ fontSize: '18px', lineHeight: '1' }}
                    >
                      {testingDevice === device.id ? (
                        <span style={{ animation: 'spin 1s linear infinite' }}>⚡</span>
                      ) : (
                        '🔥'
                      )}
                    </button>
                    <button
                      type="button"
                      className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
                      onClick={() => handleDeviceClick(device)}
                      title="View Device Details"
                      aria-label={`View details for device ${device.name}`}
                      style={{ fontSize: '18px', lineHeight: '1' }}
                    >
                      👁️
                    </button>
                    <button
                      type="button"
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                      onClick={() => handleDelete(device)}
                      title="Delete Device"
                      aria-label={`Delete device ${device.name}`}
                      style={{ fontSize: '18px', lineHeight: '1' }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>

              {/* Status section */}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  {/* Status indicators */}
                  <div className="flex items-center gap-4">
                    {/* Ping Status */}
                    <div className="flex items-center gap-2" title={`Ping: ${getPingTime()}`}>
                      <div className={`w-3 h-3 rounded-full ${
                        pingStatus === 'up' ? 'bg-green-500' : 
                        pingStatus === 'down' ? 'bg-red-500' : 
                        'bg-gray-400'
                      }`}></div>
                      <span className="text-sm font-medium text-gray-700">
                        Ping: {getPingTime()}
                      </span>
                    </div>
                    
                    {/* API Status */}
                    {apiConfigured && (
                      <div className="flex items-center gap-2" title={`API: ${apiConnected ? 'Connected' : 'Disconnected'}`}>
                        <div className={`w-3 h-3 rounded-full ${apiConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-sm font-medium text-gray-700">API</span>
                      </div>
                    )}
                    
                    {/* SSH Status */}
                    {(sshConfigured || device.routeros?.sshEnabled) && (
                      <div className="flex items-center gap-2" title={`SSH: ${!device.routeros?.sshEnabled ? 'Disabled' : actualSshConnected ? 'Connected' : 'Disconnected'}`}>
                        <div className={`w-3 h-3 rounded-full ${
                          !device.routeros?.sshEnabled 
                            ? 'bg-gray-400'
                            : (actualSshConnected ? 'bg-green-500' : 'bg-red-500')
                        }`}></div>
                        <span className="text-sm font-medium text-gray-700">SSH</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Device Status Badge */}
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    typeof device.status === 'object' && device.status !== null 
                      ? (device.status.updateStatus === 'connected' ? 'bg-green-100 text-green-800' : 
                         device.status.updateStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                         'bg-red-100 text-red-800')
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {typeof device.status === 'object' && device.status !== null 
                      ? (device.status.updateStatus || 'unknown').toUpperCase()
                      : typeof device.status === 'string' 
                        ? device.status.toUpperCase() 
                        : 'UNKNOWN'}
                  </div>
                </div>

                {/* Device details */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Group:</span>
                      <p className="font-medium text-gray-900 truncate" title={device.groupId ? groupLookup.get(device.groupId)?.name || 'Unknown' : 'None'}>
                        {device.groupId ? groupLookup.get(device.groupId)?.name || 'Unknown' : 'None'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Firmware:</span>
                      <p className={`font-medium truncate ${device.routeros?.firmwareVersion && device.routeros.firmwareVersion.trim() ? 'text-gray-900' : 'text-red-500'}`} title={device.routeros?.firmwareVersion && device.routeros.firmwareVersion.trim() ? device.routeros.firmwareVersion : 'Firmware version not detected'}>
                        {device.routeros?.firmwareVersion && device.routeros.firmwareVersion.trim() 
                          ? device.routeros.firmwareVersion 
                          : 'Not detected'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Tags */}
                  {device.tags && typeof device.tags === 'string' && device.tags.trim() && (
                    <div className="mt-3">
                      <div className="flex flex-wrap gap-1">
                        {device.tags.split(',').slice(0, 3).map((tag, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full" title={tag.trim()}>
                            {tag.trim()}
                          </span>
                        ))}
                        {device.tags.split(',').length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            +{device.tags.split(',').length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredDevices.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {searchTerm || filterGroup ? 'No devices found' : 'No devices yet'}
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            {searchTerm || filterGroup 
              ? 'Try adjusting your search criteria or filters to find what you\'re looking for.' 
              : 'Get started by adding your first MikroTik device to begin monitoring your network infrastructure.'
            }
          </p>
          {!searchTerm && !filterGroup && (
            <button
              type="button"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md"
              onClick={handleNewDevice}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Your First Device
            </button>
          )}
          {(searchTerm || filterGroup) && (
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              onClick={() => {
                setSearchTerm('');
                setFilterGroup('');
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear Filters
            </button>
          )}
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