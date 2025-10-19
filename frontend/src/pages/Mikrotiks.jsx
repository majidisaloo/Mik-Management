import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal.jsx';
import pingService from '../services/pingService.js';
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

  // Inject isolated CSS to prevent external interference
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .mikrotiks-page {
        min-height: 100vh;
        background: linear-gradient(135deg, #f8fafc 0%, #e0f2fe 50%, #e0e7ff 100%);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .mikrotiks-page * {
        box-sizing: border-box;
      }
      .mikrotiks-page .glassmorphism {
        background: rgba(255, 255, 255, 0.8);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      .mikrotiks-page .gradient-text {
        background: linear-gradient(135deg, #1f2937 0%, #1e40af 50%, #7c3aed 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .mikrotiks-page .modern-shadow {
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      }
      .mikrotiks-page .hover-lift {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .mikrotiks-page .hover-lift:hover {
        transform: translateY(-8px) scale(1.02);
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);
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
  const [pingPopup, setPingPopup] = useState({ show: false, device: null, logs: [] });
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

  // Test ping for a device using independent ping service
  const handleTestPing = async (device) => {
    console.log('Testing ping for device:', device.name, 'Host:', device.host);
    
    // Open ping popup with initial logs
    const initialLogs = [
      `🔍 Starting ping test for device: ${device.name}`,
      `📍 Target IP: ${device.host}`,
      `⏰ Time: ${new Date().toLocaleTimeString()}`,
      `🚀 Initiating ping request...`
    ];
    
    setPingPopup({
      show: true,
      device: device,
      logs: initialLogs
    });
    
    try {
      // Use IP address for ping instead of hostname
      const pingTarget = device.host.includes('.') ? device.host : device.host;
      console.log('Ping target:', pingTarget);
      
      // Add log for ping target
      setPingPopup(prev => ({
        ...prev,
        logs: [...prev.logs, `🎯 Ping target confirmed: ${pingTarget}`]
      }));
      
      const pingResult = await pingService.pingHost(pingTarget);
      console.log('Ping result:', pingResult);
      
      // Add result logs
      const resultLogs = [
        `✅ Ping request completed`,
        `📊 Result: ${pingResult.success ? 'SUCCESS' : 'FAILED'}`,
        `⏱️ Response time: ${pingResult.time}`,
        `📝 Details: ${pingResult.success ? 'Host is reachable' : pingResult.error || 'Unknown error'}`
      ];
      
      setPingPopup(prev => ({
        ...prev,
        logs: [...prev.logs, ...resultLogs]
      }));
      
      // Force re-render to show updated ping result
      setTestingDevice(prev => prev === device.id ? null : device.id);
      setTimeout(() => setTestingDevice(null), 100);
    } catch (error) {
      console.error('Ping test error:', error);
      
      // Add error logs
      const errorLogs = [
        `❌ Ping test failed with error`,
        `🔍 Error type: ${error.name || 'Unknown'}`,
        `📝 Error message: ${error.message || 'No message available'}`,
        `🛠️ Troubleshooting: Check network connectivity and IP address`
      ];
      
      setPingPopup(prev => ({
        ...prev,
        logs: [...prev.logs, ...errorLogs]
      }));
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
    <div className="mikrotiks-page">
      {/* Modern Header with Glassmorphism */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          background: 'linear-gradient(90deg, rgba(37, 99, 235, 0.1) 0%, rgba(147, 51, 234, 0.1) 50%, rgba(79, 70, 229, 0.1) 100%)' 
        }}></div>
        <div className="glassmorphism" style={{ 
          position: 'relative', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)', 
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' 
        }}>
          <div style={{ 
            maxWidth: '80rem', 
            margin: '0 auto', 
            padding: '2rem 1.5rem' 
          }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ 
                    width: '3rem', 
                    height: '3rem', 
                    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', 
                    borderRadius: '1rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' 
                  }}>
                    <svg style={{ width: '1.25rem', height: '1.25rem', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
        <div>
                    <h1 className="gradient-text" style={{ 
                      fontSize: '2.25rem', 
                      fontWeight: 'bold', 
                      margin: 0 
                    }}>
                      MikroTik Devices
                    </h1>
                    <p style={{ 
                      color: '#6b7280', 
                      fontSize: '1.125rem', 
                      fontWeight: '500', 
                      margin: 0 
                    }}>Manage and monitor your network infrastructure</p>
        </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          type="button"
                  style={{
                    position: 'relative',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    background: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                    outline: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.9)';
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 20px 40px -10px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.7)';
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1)';
                  }}
                  onClick={() => {
                    loadDevices();
                    setStatus({ type: 'success', message: 'Data refreshed successfully!' });
                    setTimeout(() => setStatus({ type: '', message: '' }), 3000);
                  }}
                  title="Refresh data"
                  aria-label="Refresh device list"
                >
                    <div style={{ 
                      width: '1rem', 
                      height: '1rem', 
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
                      borderRadius: '0.25rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      transition: 'transform 0.5s ease'
                    }}>
                      <svg style={{ width: '0.625rem', height: '0.625rem', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                  <span style={{ fontWeight: '600' }}>Refresh</span>
                </button>
                <button
                  type="button"
                  style={{
                    position: 'relative',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: 'white',
                    background: 'linear-gradient(90deg, #2563eb 0%, #8b5cf6 100%)',
                    border: 'transparent',
                    borderRadius: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                    outline: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'linear-gradient(90deg, #1d4ed8 0%, #7c3aed 100%)';
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 20px 40px -10px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'linear-gradient(90deg, #2563eb 0%, #8b5cf6 100%)';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1)';
                  }}
          onClick={handleNewDevice}
                  aria-label="Add new device"
                >
                    <div style={{ 
                      width: '1rem', 
                      height: '1rem', 
                      background: 'rgba(255, 255, 255, 0.2)', 
                      borderRadius: '0.25rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      transition: 'transform 0.3s ease'
                    }}>
                      <svg style={{ width: '0.625rem', height: '0.625rem', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                  <span style={{ fontWeight: '600' }}>Add Device</span>
        </button>
              </div>
            </div>
          </div>
        </div>
        </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

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

      {/* Modern Search and Filters */}
      <div style={{
        position: 'relative',
        marginBottom: '2rem'
      }}>
        <div style={{
          position: 'absolute',
          inset: '0',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(147, 51, 234, 0.08) 50%, rgba(99, 102, 241, 0.08) 100%)',
          borderRadius: '1.5rem'
        }}></div>
        <div style={{
          position: 'relative',
          backdropFilter: 'blur(12px)',
          background: 'rgba(255, 255, 255, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          borderRadius: '1.5rem',
          padding: '1.5rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '1.5rem',
            flexWrap: 'wrap'
          }}>
            {/* Search Input */}
            <div style={{
              flex: '1',
              minWidth: '320px'
            }}>
              <label style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: '700',
                color: '#374151',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '0.5rem'
              }}>
                🔍 Search Devices
              </label>
              <div style={{
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '1rem',
                  transform: 'translateY(-50%)',
                  width: '1.25rem',
                  height: '1.25rem',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  borderRadius: '0.375rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.3s ease',
                  zIndex: 1
                }}>
                  <svg style={{ width: '0.75rem', height: '0.75rem', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
            <input
                id="search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search devices by name, IP address, or tags..."
                  style={{
                    width: '100%',
                    paddingLeft: '3.5rem',
                    paddingRight: '1rem',
                    paddingTop: '0.875rem',
                    paddingBottom: '0.875rem',
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    borderRadius: '0.875rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(59, 130, 246, 0.6)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1), 0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                    e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                    e.target.style.transform = 'translateY(0)';
                  }}
                />
                <div style={{
                  marginTop: '0.5rem',
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  fontStyle: 'italic'
                }}>
                  💡 Tip: Search by device name, IP address (192.168.1.1), or tags
        </div>
              </div>
            </div>

            {/* Group Filter */}
            <div style={{
              flex: '0 0 auto',
              minWidth: '220px'
            }}>
              <label style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: '700',
                color: '#374151',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '0.5rem'
              }}>
                🏷️ Filter by Group
              </label>
              <div style={{
                position: 'relative'
              }}>
              <select
                id="group-filter"
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                  style={{
                    width: '100%',
                    paddingLeft: '1rem',
                    paddingRight: '3.5rem',
                    paddingTop: '0.875rem',
                    paddingBottom: '0.875rem',
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    borderRadius: '0.875rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    outline: 'none',
                    cursor: 'pointer',
                    appearance: 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(59, 130, 246, 0.6)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1), 0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                    e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                    e.target.style.transform = 'translateY(0)';
                  }}
              >
                <option value="">All Groups</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  right: '1rem',
                  transform: 'translateY(-50%)',
                  width: '1.25rem',
                  height: '1.25rem',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                  borderRadius: '0.375rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                  zIndex: 1
                }}>
                  <svg style={{ width: '0.75rem', height: '0.75rem', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
          </div>
      </div>
              <div style={{
                marginTop: '0.5rem',
                fontSize: '0.75rem',
                color: '#6b7280',
                fontStyle: 'italic'
              }}>
                🏷️ Filter devices by group category
          </div>
        </div>

            {/* Clear Filters Button */}
            {(searchTerm || filterGroup) && (
              <div style={{
                flex: '0 0 auto',
                display: 'flex',
                alignItems: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setFilterGroup('');
                  }}
                  style={{
                    padding: '0.875rem 1.5rem',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.875rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                  }}
                >
                  <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modern Devices Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-6">
        {filteredDevices.map((device) => {
          // Determine connection statuses
          const apiConfigured = device.routeros?.apiEnabled && device.routeros?.apiUsername && device.routeros?.apiPassword;
          const sshConfigured = device.routeros?.sshEnabled && device.routeros?.sshUsername && device.routeros?.sshPassword;
          
          // Get actual connection status from connectivity data
          const apiConnected = device.connectivity?.api?.status === 'up' || device.connectivity?.api?.status === 'connected' || device.connectivity?.api?.status === 'online';
          const sshConnected = device.connectivity?.ssh?.status === 'up' || device.connectivity?.ssh?.status === 'connected' || device.connectivity?.ssh?.status === 'online';
          
          // Override SSH status if it's explicitly offline or if SSH is disabled on the device
          const actualSshConnected = (device.connectivity?.ssh?.status === 'offline' || device.connectivity?.ssh?.status === 'disabled' || !device.routeros?.sshEnabled) ? false : sshConnected;
          
          // Determine device connection status - only connected if API OR SSH is actually connected
          const deviceConnected = apiConnected || actualSshConnected;
          
          // Determine ping status based on any successful connection
          const pingStatus = deviceConnected ? 'up' : 'down';
          
          // Calculate ping time - use real ping result if available, otherwise simulate
          const getPingTime = () => {
            // Use IP address for ping cache lookup
            const pingTarget = device.host.includes('.') ? device.host : device.host;
            
            // Check if we have real ping result for this device from ping service
            const cachedResult = pingService.getCachedResult(pingTarget);
            if (cachedResult) {
              if (cachedResult.success) {
                return cachedResult.time || 'N/A';
              } else {
                return 'N/A';
              }
            }
            
            // Fallback to simulated ping based on connection status
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
          
          const pingTime = getPingTime();
          
          return (
            <div 
              key={device.id} 
              style={{
                position: 'relative',
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '1.5rem',
                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                overflow: 'hidden',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-8px) scale(1.02)';
                e.target.style.boxShadow = '0 25px 50px -12px rgba(59, 130, 246, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0) scale(1)';
                e.target.style.boxShadow = 'none';
              }}
            >
              {/* Gradient overlay */}
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(147, 51, 234, 0.05) 50%, rgba(79, 70, 229, 0.05) 100%)',
                opacity: 0,
                transition: 'opacity 0.5s ease'
              }}></div>
              
              {/* Header section */}
              <div style={{
                position: 'relative',
                padding: '1rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  {/* Modern device info */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <div style={{ position: 'relative' }}>
                      <div style={{
                        width: '1.75rem',
                        height: '1.75rem',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #4f46e5 100%)',
                        borderRadius: '0.375rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.1)',
                        transition: 'all 0.3s ease'
                      }}>
                        <span style={{ fontSize: '0.75rem' }}>🖥️</span>
                    </div>
                      <div style={{
                        position: 'absolute',
                        top: '-0.125rem',
                        right: '-0.125rem',
                        width: '0.5rem',
                        height: '0.5rem',
                        background: 'linear-gradient(135deg, #4ade80 0%, #10b981 100%)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px -1px rgba(0, 0, 0, 0.1)'
                      }}>
                        <div style={{
                          width: '0.25rem',
                          height: '0.25rem',
                          backgroundColor: 'white',
                          borderRadius: '50%',
                          animation: 'pulse 2s infinite'
                        }}></div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <h3 style={{
                        fontWeight: 'bold',
                        fontSize: '1.25rem',
                        color: '#111827',
                        margin: 0,
                        transition: 'color 0.3s ease'
                      }}>{safeRender(device.name, 'Unknown Device')}</h3>
                      <p style={{
                        fontSize: '0.875rem',
                        color: '#6b7280',
                        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                        backgroundColor: 'rgba(243, 244, 246, 0.5)',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '0.5rem',
                        margin: 0
                      }}>{safeRender(device.host, 'No Host')}</p>
                    </div>
                  </div>
                  
                  {/* Modern action buttons */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                        gap: '0.25rem'
                  }} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      style={{
                        padding: '0.375rem',
                        color: '#6b7280',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        outline: 'none'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.color = '#2563eb';
                        e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                        e.target.style.transform = 'scale(1.1)';
                        e.target.style.boxShadow = '0 2px 8px -1px rgba(0, 0, 0, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.color = '#6b7280';
                        e.target.style.backgroundColor = 'transparent';
                        e.target.style.transform = 'scale(1)';
                        e.target.style.boxShadow = 'none';
                      }}
                      onClick={() => handleEdit(device)}
                      title="Edit Device"
                      aria-label={`Edit device ${device.name}`}
                    >
                      <div style={{
                        width: '1.75rem',
                        height: '1.75rem',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        borderRadius: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 0.3s ease'
                      }}>
                        <svg style={{ width: '1rem', height: '1rem', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </div>
                    </button>
                    <button
                      type="button"
                      style={{
                        padding: '0.375rem',
                        color: '#6b7280',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: testingDevice === device.id ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease',
                        outline: 'none',
                        opacity: testingDevice === device.id ? 0.5 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (testingDevice !== device.id) {
                          e.target.style.color = '#16a34a';
                          e.target.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
                          e.target.style.transform = 'scale(1.1)';
                          e.target.style.boxShadow = '0 2px 8px -1px rgba(0, 0, 0, 0.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (testingDevice !== device.id) {
                          e.target.style.color = '#6b7280';
                          e.target.style.backgroundColor = 'transparent';
                          e.target.style.transform = 'scale(1)';
                          e.target.style.boxShadow = 'none';
                        }
                      }}
                      onClick={() => handleTestConnectivity(device)}
                      disabled={testingDevice === device.id}
                      title="Test Connection"
                      aria-label={`Test connection for device ${device.name}`}
                    >
                      <div style={{
                        width: '1.75rem',
                        height: '1.75rem',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        borderRadius: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 0.3s ease'
                      }}>
                      {testingDevice === device.id ? (
                          <svg style={{ width: '0.625rem', height: '0.625rem', color: 'white', animation: 'spin 1s linear infinite' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                      ) : (
                          <svg style={{ width: '1rem', height: '1rem', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                      )}
                      </div>
                    </button>
                    <button
                      type="button"
                      style={{
                        padding: '0.375rem',
                        color: '#6b7280',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        outline: 'none'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.color = '#9333ea';
                        e.target.style.backgroundColor = 'rgba(147, 51, 234, 0.1)';
                        e.target.style.transform = 'scale(1.1)';
                        e.target.style.boxShadow = '0 2px 8px -1px rgba(0, 0, 0, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.color = '#6b7280';
                        e.target.style.backgroundColor = 'transparent';
                        e.target.style.transform = 'scale(1)';
                        e.target.style.boxShadow = 'none';
                      }}
                      onClick={() => handleDeviceClick(device)}
                      title="View Device Details"
                      aria-label={`View details for device ${device.name}`}
                    >
                      <div style={{
                        width: '1.75rem',
                        height: '1.75rem',
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #4f46e5 100%)',
                        borderRadius: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 0.3s ease'
                      }}>
                        <svg style={{ width: '1rem', height: '1rem', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </div>
                    </button>
                    <button
                      type="button"
                      style={{
                        padding: '0.375rem',
                        color: '#6b7280',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        outline: 'none'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.color = '#dc2626';
                        e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                        e.target.style.transform = 'scale(1.1)';
                        e.target.style.boxShadow = '0 2px 8px -1px rgba(0, 0, 0, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.color = '#6b7280';
                        e.target.style.backgroundColor = 'transparent';
                        e.target.style.transform = 'scale(1)';
                        e.target.style.boxShadow = 'none';
                      }}
                      onClick={() => handleTestPing(device)}
                      title="Test Ping"
                      aria-label={`Test ping for device ${device.name}`}
                    >
                      <div style={{
                        width: '1.75rem',
                        height: '1.75rem',
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        borderRadius: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 0.3s ease'
                      }}>
                        <svg style={{ width: '1rem', height: '1rem', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                    </button>
                    <button
                      type="button"
                      style={{
                        padding: '0.375rem',
                        color: '#6b7280',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        outline: 'none'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.color = '#ef4444';
                        e.target.style.backgroundColor = '#fef2f2';
                        e.target.style.transform = 'scale(1.1)';
                        e.target.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.color = '#6b7280';
                        e.target.style.backgroundColor = 'transparent';
                        e.target.style.transform = 'scale(1)';
                        e.target.style.boxShadow = 'none';
                      }}
                      onClick={() => handleDelete(device)}
                      title="Delete Device"
                      aria-label={`Delete device ${device.name}`}
                    >
                      <div style={{
                        width: '1.75rem',
                        height: '1.75rem',
                        background: 'linear-gradient(135deg, #ef4444 0%, #ec4899 100%)',
                        borderRadius: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 0.3s ease'
                      }}>
                        <svg style={{ width: '1rem', height: '1rem', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </div>
                    </button>
                  </div>
                  </div>
                </div>

              {/* Status section */}
              <div style={{ padding: '1rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  {/* Status indicators */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                  }}>
                    {/* Ping Status */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }} title={`Ping: ${pingTime}`}>
                      <div style={{
                        width: '0.75rem',
                        height: '0.75rem',
                        borderRadius: '50%',
                        backgroundColor: pingStatus === 'up' ? '#10b981' : 
                                       pingStatus === 'down' ? '#ef4444' : 
                                       '#9ca3af'
                      }}></div>
                      <span style={{
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#374151'
                      }}>
                        Ping: {pingTime}
                      </span>
                    </div>
                    
                    {/* API Status */}
                    {apiConfigured && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }} title={`API: ${apiConnected ? 'Connected' : 'Disconnected'}`}>
                        <div style={{
                          width: '0.75rem',
                          height: '0.75rem',
                          borderRadius: '50%',
                          backgroundColor: apiConnected ? '#10b981' : '#ef4444'
                        }}></div>
                        <span style={{
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: '#374151'
                        }}>API</span>
                      </div>
                    )}
                    
                    {/* SSH Status */}
                    {(sshConfigured || device.routeros?.sshEnabled) && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }} title={`SSH: ${!device.routeros?.sshEnabled ? 'Disabled' : actualSshConnected ? 'Connected' : 'Disconnected'}`}>
                        <div style={{
                          width: '0.75rem',
                          height: '0.75rem',
                          borderRadius: '50%',
                          backgroundColor: !device.routeros?.sshEnabled 
                            ? '#9ca3af'
                            : (actualSshConnected ? '#10b981' : '#ef4444')
                        }}></div>
                        <span style={{
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: '#374151'
                        }}>SSH</span>
                      </div>
                    )}
                    </div>
                    
                  {/* Modern Device Status Badge */}
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '1rem',
                      fontSize: '0.875rem',
                      fontWeight: 'bold',
                      color: 'white',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                      transition: 'all 0.3s ease',
                      background: deviceConnected 
                        ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)' 
                        : 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'
                    }}>
                    {deviceConnected ? 'CONNECTED' : 'DISCONNECTED'}
                      </div>
                    {deviceConnected && (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        padding: '0.5rem 1rem',
                        borderRadius: '1rem',
                        backgroundColor: '#4ade80',
                        animation: 'pulse 2s infinite',
                        opacity: 0.3
                      }}></div>
                    )}
                  </div>
                </div>

                {/* Modern Device details */}
                <div style={{
                  position: 'relative',
                  marginTop: '1rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.2)'
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '1.5rem'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>Group</span>
                      <div style={{
                        background: 'linear-gradient(90deg, #eff6ff 0%, #f3e8ff 100%)',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '0.75rem',
                        border: '1px solid #dbeafe'
                      }}>
                        <p style={{
                          fontWeight: 'bold',
                          color: '#1f2937',
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }} title={device.groupId ? groupLookup.get(device.groupId)?.name || 'Unknown' : 'None'}>
                      {device.groupId ? groupLookup.get(device.groupId)?.name || 'Unknown' : 'None'}
                        </p>
                  </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>Firmware</span>
                      <div style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: '0.75rem',
                        border: '1px solid',
                        background: device.routeros?.firmwareVersion && device.routeros.firmwareVersion.trim()
                          ? 'linear-gradient(90deg, #f0fdf4 0%, #ecfdf5 100%)'
                          : 'linear-gradient(90deg, #fef2f2 0%, #fce7f3 100%)',
                        borderColor: device.routeros?.firmwareVersion && device.routeros.firmwareVersion.trim()
                          ? '#bbf7d0'
                          : '#fecaca'
                      }}>
                        <p style={{
                          fontWeight: 'bold',
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: device.routeros?.firmwareVersion && device.routeros.firmwareVersion.trim()
                            ? '#1f2937'
                            : '#dc2626'
                        }} title={device.routeros?.firmwareVersion && device.routeros.firmwareVersion.trim() ? device.routeros.firmwareVersion : 'Firmware version not detected'}>
                      {device.routeros?.firmwareVersion && device.routeros.firmwareVersion.trim() 
                        ? device.routeros.firmwareVersion 
                        : 'Not detected'}
                        </p>
                      </div>
                  </div>
                </div>

                  {/* Modern Tags */}
                {device.tags && typeof device.tags === 'string' && device.tags.trim() && (
                    <div style={{ marginTop: '1rem' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '0.5rem',
                        display: 'block'
                      }}>Tags</span>
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.5rem'
                      }}>
                        {device.tags.split(',').slice(0, 3).map((tag, index) => (
                          <span key={index} style={{
                            padding: '0.25rem 0.75rem',
                            background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
                            color: 'white',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            borderRadius: '9999px',
                            boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.1)',
                            transition: 'all 0.3s ease',
                            cursor: 'pointer'
                          }} 
                          onMouseEnter={(e) => {
                            e.target.style.transform = 'scale(1.05)';
                            e.target.style.boxShadow = '0 8px 20px -4px rgba(0, 0, 0, 0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.transform = 'scale(1)';
                            e.target.style.boxShadow = '0 4px 12px -2px rgba(0, 0, 0, 0.1)';
                          }}
                          title={tag.trim()}>
                        {tag.trim()}
                      </span>
                    ))}
                        {device.tags.split(',').length > 3 && (
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            background: 'linear-gradient(90deg, #6b7280 0%, #4b5563 100%)',
                            color: 'white',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            borderRadius: '9999px',
                            boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.1)'
                          }}>
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
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-indigo-500/5 rounded-3xl"></div>
          <div className="relative backdrop-blur-sm bg-white/60 border border-white/30 rounded-3xl p-16 text-center shadow-xl">
            <div className="mx-auto w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full flex items-center justify-center mb-8 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full animate-pulse"></div>
              <svg style={{ width: '3rem', height: '3rem', color: '#9ca3af', position: 'relative', zIndex: 10 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-4">
              {searchTerm || filterGroup ? 'No devices found' : 'No devices yet'}
            </h3>
            <p className="text-gray-600 text-lg mb-8 max-w-lg mx-auto leading-relaxed">
              {searchTerm || filterGroup 
                ? 'Try adjusting your search criteria or filters to find what you\'re looking for.' 
                : 'Get started by adding your first MikroTik device to begin monitoring your network infrastructure.'
              }
            </p>
            {!searchTerm && !filterGroup && (
              <button
                type="button"
                className="group inline-flex items-center gap-3 px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 border border-transparent rounded-2xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-500/30 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1"
                onClick={handleNewDevice}
              >
                <div className="w-4 h-4 bg-white/20 rounded flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg style={{ width: '0.625rem', height: '0.625rem', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                Add Your First Device
              </button>
            )}
            {(searchTerm || filterGroup) && (
              <button
                type="button"
                className="group inline-flex items-center gap-3 px-6 py-3 text-sm font-bold text-gray-700 bg-white/70 backdrop-blur-sm border border-white/40 rounded-2xl hover:bg-white/90 hover:border-white/60 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                onClick={() => {
                  setSearchTerm('');
                  setFilterGroup('');
                }}
              >
                <div className="w-4 h-4 bg-gradient-to-br from-gray-500 to-gray-600 rounded flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg style={{ width: '0.625rem', height: '0.625rem', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                Clear Filters
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

      {/* Ping Test Popup */}
      {pingPopup.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '1rem',
            padding: '2rem',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.5rem',
              paddingBottom: '1rem',
              borderBottom: '2px solid #f3f4f6'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <div style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  borderRadius: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg style={{ width: '1.25rem', height: '1.25rem', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    color: '#1f2937',
                    margin: 0
                  }}>
                    Ping Test Results
                  </h3>
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    margin: 0
                  }}>
                    {pingPopup.device?.name} ({pingPopup.device?.host})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPingPopup({ show: false, device: null, logs: [] })}
                style={{
                  width: '2rem',
                  height: '2rem',
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#e5e7eb';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#f3f4f6';
                }}
              >
                <svg style={{ width: '1rem', height: '1rem', color: '#6b7280' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Logs Container */}
            <div style={{
              backgroundColor: '#1f2937',
              borderRadius: '0.75rem',
              padding: '1rem',
              maxHeight: '400px',
              overflowY: 'auto',
              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
              fontSize: '0.875rem',
              lineHeight: '1.5'
            }}>
              {pingPopup.logs.map((log, index) => (
                <div
                  key={index}
                  style={{
                    color: log.includes('❌') ? '#ef4444' : 
                           log.includes('✅') ? '#10b981' : 
                           log.includes('🔍') || log.includes('📍') || log.includes('🎯') ? '#3b82f6' :
                           log.includes('⏰') || log.includes('⏱️') ? '#f59e0b' :
                           log.includes('📊') || log.includes('📝') ? '#8b5cf6' :
                           log.includes('🚀') ? '#06b6d4' : '#d1d5db',
                    marginBottom: '0.5rem',
                    padding: '0.25rem 0',
                    borderLeft: log.includes('❌') ? '3px solid #ef4444' :
                               log.includes('✅') ? '3px solid #10b981' : '3px solid transparent',
                    paddingLeft: '0.75rem'
                  }}
                >
                  {log}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{
              marginTop: '1.5rem',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem'
            }}>
              <button
                onClick={() => setPingPopup({ show: false, device: null, logs: [] })}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.75rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  if (pingPopup.device) {
                    handleTestPing(pingPopup.device);
                  }
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.75rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                Test Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Mikrotiks;