import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { createPortal } from 'react-dom';

const DeviceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [interfaces, setInterfaces] = useState([]);
  const [ipAddresses, setIpAddresses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [firewallRules, setFirewallRules] = useState([]);
  const [natRules, setNatRules] = useState([]);
  const [mangleRules, setMangleRules] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [connectivity, setConnectivity] = useState(null);
  const [safeMode, setSafeMode] = useState(false);
  const [connectivityTesting, setConnectivityTesting] = useState(false);
  const [lastConnectivityCheck, setLastConnectivityCheck] = useState(null);
  const [connectivityNotification, setConnectivityNotification] = useState(null);
  
  // Logs state
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState(null);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsSearch, setLogsSearch] = useState('');
  const [logsSource, setLogsSource] = useState('unknown');
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  
  // Modal states
  const [showAddIpModal, setShowAddIpModal] = useState(false);
  const [showAddInterfaceModal, setShowAddInterfaceModal] = useState(false);
  const [showAddRouteModal, setShowAddRouteModal] = useState(false);
  const [showAddFirewallModal, setShowAddFirewallModal] = useState(false);
  const [showEditFirewallModal, setShowEditFirewallModal] = useState(false);
  const [showEditMangleModal, setShowEditMangleModal] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    address: '',
    network: '',
    interface: '',
    comment: '',
    distance: '',
    markRoute: '',
    sourceAddress: '',
    sourceAddressList: '',
    destinationAddress: '',
    destinationAddressList: '',
    protocol: '',
    port: '',
    action: 'accept'
  });

  useEffect(() => {
    loadDevice();
  }, [id]);

  // URL routing logic
  useEffect(() => {
    const path = location.pathname;
    if (path.endsWith('/logs')) {
      setActiveTab('logs');
      loadLogs(1, logsSearch);
    } else if (path.endsWith('/interfaces')) {
      setActiveTab('interfaces');
    } else if (path.endsWith('/ip-addresses')) {
      setActiveTab('ip-addresses');
    } else if (path.endsWith('/routes')) {
      setActiveTab('routes');
    } else if (path.endsWith('/firewall')) {
      setActiveTab('firewall');
    } else if (path.endsWith('/nat')) {
      setActiveTab('nat');
    } else if (path.endsWith('/mangle')) {
      setActiveTab('mangle');
    } else if (path.endsWith('/update')) {
      setActiveTab('update');
    } else {
      setActiveTab('overview');
    }
  }, [location.pathname, logsSearch]);

  const loadDevice = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/mikrotiks/${id}`);
      if (!response.ok) {
        throw new Error('Device not found');
      }
      const data = await response.json();
      setDevice(data);
      
      // Load additional data
      await Promise.all([
        loadInterfaces(),
        loadIpAddresses(),
        loadRoutes(),
        loadFirewallRules(),
        loadNatRules(),
        loadMangleRules(),
        loadSystemLogs(),
        loadUpdateInfo(),
        loadConnectivity()
      ]);

      // Automatically run connectivity test after loading device data
      console.log('🚀 Page loaded, starting automatic connectivity test...');
      await runConnectivityTest();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadInterfaces = async () => {
    try {
      const response = await fetch(`/api/mikrotiks/${id}/interfaces`);
      if (response.ok) {
        const data = await response.json();
        setInterfaces(data.interfaces || []);
      }
    } catch (err) {
      console.error('Error loading interfaces:', err);
    }
  };

  const loadIpAddresses = async () => {
    try {
      const response = await fetch(`/api/mikrotiks/${id}/ip-addresses`);
      if (response.ok) {
        const data = await response.json();
        setIpAddresses(data.addresses || []);
      }
    } catch (err) {
      console.error('Error loading IP addresses:', err);
    }
  };

  const loadRoutes = async () => {
    try {
      const response = await fetch(`/api/mikrotiks/${id}/routes`);
      if (response.ok) {
        const data = await response.json();
        setRoutes(data.routes || []);
      }
    } catch (err) {
      console.error('Error loading routes:', err);
    }
  };

  const loadFirewallRules = async () => {
    try {
      const response = await fetch(`/api/mikrotiks/${id}/firewall`);
      if (response.ok) {
        const data = await response.json();
        setFirewallRules(data.rules || []);
      }
    } catch (err) {
      console.error('Error loading firewall rules:', err);
    }
  };

  const loadNatRules = async () => {
    try {
      const response = await fetch(`/api/mikrotiks/${id}/nat`);
      if (response.ok) {
        const data = await response.json();
        setNatRules(data.rules || []);
      }
    } catch (err) {
      console.error('Error loading NAT rules:', err);
    }
  };

  const loadMangleRules = async () => {
    try {
      const response = await fetch(`/api/mikrotiks/${id}/mangle`);
      if (response.ok) {
        const data = await response.json();
        setMangleRules(data.rules || []);
      }
    } catch (err) {
      console.error('Error loading mangle rules:', err);
    }
  };

  const loadLogs = async (page = 1, search = '') => {
    try {
      setLogsLoading(true);
      setLogsError(null);
      
          const params = new URLSearchParams({
            page: page.toString(),
            limit: '50',
            max: '50'
          });
      
      if (search) {
        params.append('search', search);
      }
      
      const response = await fetch(`/api/mikrotiks/${id}/logs?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
        setLogsPage(data.pagination?.page || page);
        setLogsTotalPages(data.pagination?.totalPages || 1);
        setLogsSource(data.source || 'unknown');
      } else {
        throw new Error('Failed to load logs');
      }
    } catch (err) {
      console.error('Error loading logs:', err);
      setLogsError(err.message);
    } finally {
      setLogsLoading(false);
    }
  };

  const loadSystemLogs = async () => {
    try {
      const response = await fetch(`/api/mikrotiks/${id}/logs`);
      if (response.ok) {
        const data = await response.json();
        setSystemLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Error loading system logs:', err);
    }
  };

  const loadUpdateInfo = async () => {
    try {
      const response = await fetch(`/api/mikrotiks/${id}/update-info`);
      if (response.ok) {
        const data = await response.json();
        setUpdateInfo(data);
      }
    } catch (err) {
      console.error('Error loading update info:', err);
    }
  };

  const loadConnectivity = async () => {
    try {
      const response = await fetch(`/api/mikrotiks/${id}/connectivity`);
      if (response.ok) {
        const data = await response.json();
        setConnectivity(data);
      }
    } catch (err) {
      console.error('Error loading connectivity:', err);
    }
  };

  const runConnectivityTest = async () => {
    try {
      setConnectivityTesting(true);
      console.log('🔍 Starting automatic connectivity test for device:', device?.name);
      
      const response = await fetch(`/api/mikrotiks/${id}/test-connectivity`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Connectivity test completed:', data);
        setConnectivity(data);
        setLastConnectivityCheck(new Date().toLocaleString());
        
        // Show success message
        const apiStatus = data.mikrotik?.connectivity?.api?.status || 'unknown';
        const sshStatus = data.mikrotik?.connectivity?.ssh?.status || 'unknown';
        console.log(`📊 Real-time Status - API: ${apiStatus}, SSH: ${sshStatus}`);
        
        // Show notification
        setConnectivityNotification({
          type: 'success',
          message: `Connectivity test completed! API: ${apiStatus}, SSH: ${sshStatus}`,
          timestamp: new Date()
        });
        
        // Clear notification after 5 seconds
        setTimeout(() => {
          setConnectivityNotification(null);
        }, 5000);
      } else {
        const error = await response.json();
        console.error('❌ Connectivity test failed:', error);
      }
    } catch (err) {
      console.error('❌ Connectivity test error:', err);
    } finally {
      setConnectivityTesting(false);
    }
  };

  const handleAddIpAddress = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/mikrotiks/${id}/ip-addresses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: formData.address,
          network: formData.network || '',
          interface: formData.interface,
          comment: formData.comment || 'test'
        }),
      });

      if (response.ok) {
      const result = await response.json();
        console.log('IP address added successfully:', result);
        await loadIpAddresses();
        await loadSystemLogs();
        setShowAddIpModal(false);
        setFormData({ address: '', network: '', interface: '', comment: '' });
        alert('IP address added successfully!');
      } else {
        const error = await response.json();
        console.error('Error response:', error);
        alert(`Error: ${error.message}`);
      }
    } catch (err) {
      console.error('Error:', err);
      alert(`Error: ${err.message}`);
    }
  };

  const handleAddRoute = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/mikrotiks/${id}/routes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          destination: formData.destination,
          gateway: formData.gateway,
          interface: formData.interface,
          distance: formData.distance,
          markRoute: formData.markRoute,
          comment: formData.comment || 'test'
        }),
      });

      if (response.ok) {
      const result = await response.json();
        console.log('Route added successfully:', result);
        await loadRoutes();
        await loadSystemLogs();
        setShowAddRouteModal(false);
        setFormData({ ...formData, destination: '', gateway: '', distance: '', markRoute: '' });
        alert('Route added successfully!');
      } else {
        const error = await response.json();
        console.error('Error response:', error);
        alert(`Error: ${error.message}`);
      }
    } catch (err) {
      console.error('Error:', err);
      alert(`Error: ${err.message}`);
    }
  };

  const handleAddFirewallRule = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/mikrotiks/${id}/firewall`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceAddress: formData.sourceAddress,
          sourceAddressList: formData.sourceAddressList,
          destinationAddress: formData.destinationAddress,
          destinationAddressList: formData.destinationAddressList,
          protocol: formData.protocol,
          port: formData.port,
          action: formData.action,
          comment: formData.comment || 'test'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Firewall rule added successfully:', result);
        await loadFirewallRules();
        await loadSystemLogs();
        setShowAddFirewallModal(false);
        setFormData({ ...formData, sourceAddress: '', sourceAddressList: '', destinationAddress: '', destinationAddressList: '', protocol: '', port: '', action: 'accept' });
        alert('Firewall rule added successfully!');
      } else {
        const error = await response.json();
        console.error('Error response:', error);
        alert(`Error: ${error.message}`);
      }
    } catch (err) {
      console.error('Error:', err);
      alert(`Error: ${err.message}`);
    }
  };

  const handleAddInterface = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/mikrotiks/${id}/interfaces`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.interfaceName,
          type: formData.interfaceType,
          comment: formData.comment || 'test'
        }),
      });

      if (response.ok) {
      const result = await response.json();
        console.log('Interface added successfully:', result);
        await loadInterfaces();
        await loadSystemLogs();
        setShowAddInterfaceModal(false);
        setFormData({ ...formData, interfaceName: '', interfaceType: '', comment: '' });
        alert('Interface added successfully!');
      } else {
        const error = await response.json();
        console.error('Error response:', error);
        alert(`Error: ${error.message}`);
      }
    } catch (err) {
      console.error('Error:', err);
      alert(`Error: ${err.message}`);
    }
  };

  const handleDownloadUpdate = async () => {
    try {
      const response = await fetch(`/api/mikrotiks/${id}/update/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Update download started:', result);
        await loadSystemLogs();
        alert('Update download started successfully!');
      } else {
        const error = await response.json();
        console.error('Error response:', error);
        alert(`Error: ${error.message}`);
      }
    } catch (err) {
      console.error('Error:', err);
      alert(`Error: ${err.message}`);
    }
  };

  const handleDownloadAndInstallUpdate = async () => {
    try {
      const response = await fetch(`/api/mikrotiks/${id}/update/install`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Update download and install started:', result);
        await loadSystemLogs();
        alert('Update download and install started successfully!');
      } else {
        const error = await response.json();
        console.error('Error response:', error);
        alert(`Error: ${error.message}`);
      }
    } catch (err) {
      console.error('Error:', err);
      alert(`Error: ${err.message}`);
    }
  };

  const handleEditFirewallRule = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/mikrotiks/${id}/firewall/edit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceAddress: formData.sourceAddress,
          sourceAddressList: formData.sourceAddressList,
          destinationAddress: formData.destinationAddress,
          destinationAddressList: formData.destinationAddressList,
          protocol: formData.protocol,
          port: formData.port,
          action: formData.action,
          comment: formData.comment || 'test'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Firewall rule updated successfully:', result);
        await loadFirewallRules();
        await loadSystemLogs();
        setShowEditFirewallModal(false);
        setFormData({ ...formData, sourceAddress: '', sourceAddressList: '', destinationAddress: '', destinationAddressList: '', protocol: '', port: '', action: 'accept' });
        alert('Firewall rule updated successfully!');
      } else {
        const error = await response.json();
        console.error('Error response:', error);
        alert(`Error: ${error.message}`);
      }
    } catch (err) {
      console.error('Error:', err);
      alert(`Error: ${err.message}`);
    }
  };

  const handleEditMangleRule = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/mikrotiks/${id}/mangle/edit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceAddress: formData.sourceAddress,
          sourceAddressList: formData.sourceAddressList,
          destinationAddress: formData.destinationAddress,
          destinationAddressList: formData.destinationAddressList,
          protocol: formData.protocol,
          port: formData.port,
          action: formData.action,
          comment: formData.comment || 'test'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Mangle rule updated successfully:', result);
        await loadMangleRules();
        await loadSystemLogs();
        setShowEditMangleModal(false);
        setFormData({ ...formData, sourceAddress: '', sourceAddressList: '', destinationAddress: '', destinationAddressList: '', protocol: '', port: '', action: 'accept' });
        alert('Mangle rule updated successfully!');
      } else {
        const error = await response.json();
        console.error('Error response:', error);
        alert(`Error: ${error.message}`);
      }
    } catch (err) {
      console.error('Error:', err);
      alert(`Error: ${err.message}`);
    }
  };

  const handleToggleSafeMode = async () => {
    try {
      const response = await fetch(`/api/mikrotiks/${id}/safe-mode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: !safeMode }),
      });

      if (response.ok) {
        const data = await response.json();
        setSafeMode(data.enabled);
        await loadSystemLogs();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleRestartDevice = async () => {
    if (window.confirm('Are you sure you want to restart this device?')) {
      try {
        const response = await fetch(`/api/mikrotiks/${id}/restart`, {
          method: 'POST',
        });

        if (response.ok) {
          alert('Device restart initiated');
          await loadSystemLogs();
        } else {
          const error = await response.json();
          alert(`Error: ${error.message}`);
        }
      } catch (err) {
        alert(`Error: ${err.message}`);
      }
    }
  };

  const handleTestConnectivity = async () => {
    await runConnectivityTest();
    await loadSystemLogs();
  };

  const handleDiagnose = async () => {
    try {
      const response = await fetch(`/api/mikrotiks/${id}/diagnose`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Diagnosis: ${data.message}`);
        await loadSystemLogs();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleEnable = async () => {
    try {
      const response = await fetch(`/api/mikrotiks/${id}/enable`, {
        method: 'POST',
      });

      if (response.ok) {
        alert('Device enabled');
        await loadSystemLogs();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        color: theme === 'dark' ? '#fff' : '#000'
      }}>
        Loading device details...
          </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        color: theme === 'dark' ? '#fff' : '#000'
      }}>
        Error: {error}
      </div>
    );
  }

  if (!device) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        color: theme === 'dark' ? '#fff' : '#000'
      }}>
        Device not found
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'interfaces', label: 'Interfaces' },
    { id: 'ip-addresses', label: 'IP Addresses' },
    { id: 'routes', label: 'Routes' },
    { id: 'firewall', label: 'Firewall' },
    { id: 'nat', label: 'NAT' },
    { id: 'mangle', label: 'Mangle' },
    { id: 'logs', label: 'Logs' },
    { id: 'update', label: 'Update' }
  ];

  return (
    <div style={{ 
      padding: '20px',
      backgroundColor: theme === 'dark' ? '#1a1a1a' : '#f5f5f5',
      minHeight: '100vh',
      color: theme === 'dark' ? '#fff' : '#000'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px'
      }}>
            <div>
          <h1 style={{ margin: 0, fontSize: '2rem' }}>{device.name}</h1>
          <p style={{ margin: '5px 0 0 0', opacity: 0.7 }}>
            {device.host}:{device.port} • {device.firmwareVersion}
          </p>
          
          {/* Real-time Connectivity Status */}
          <div style={{ 
            margin: '10px 0 0 0', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '15px',
            fontSize: '0.9rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: connectivityTesting ? '#f59e0b' : 
                  (connectivity?.mikrotik?.connectivity?.api?.status === 'online' ? '#10b981' : 
                   connectivity?.mikrotik?.connectivity?.api?.status === 'disabled' ? '#6b7280' : '#ef4444')
              }}></div>
              <span>API: {connectivityTesting ? 'Testing...' : 
                (connectivity?.mikrotik?.connectivity?.api?.status || 'Unknown')}</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: connectivityTesting ? '#f59e0b' : 
                  (connectivity?.mikrotik?.connectivity?.ssh?.status === 'online' ? '#10b981' : 
                   connectivity?.mikrotik?.connectivity?.ssh?.status === 'disabled' ? '#6b7280' : '#ef4444')
              }}></div>
              <span>SSH: {connectivityTesting ? 'Testing...' : 
                (connectivity?.mikrotik?.connectivity?.ssh?.status || 'Unknown')}</span>
            </div>
            
            {lastConnectivityCheck && (
              <span style={{ opacity: 0.6, fontSize: '0.8rem' }}>
                Last check: {lastConnectivityCheck}
              </span>
            )}
          </div>
          
          {/* Connectivity Notification */}
          {connectivityNotification && (
            <div style={{
              margin: '10px 0 0 0',
              padding: '8px 12px',
              backgroundColor: connectivityNotification.type === 'success' ? '#10b981' : '#ef4444',
              color: 'white',
              borderRadius: '5px',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>✅</span>
              <span>{connectivityNotification.message}</span>
            </div>
          )}
              </div>
              <button
          onClick={() => navigate('/mikrotiks')}
          style={{
            padding: '10px 20px',
            backgroundColor: theme === 'dark' ? '#333' : '#e0e0e0',
            color: theme === 'dark' ? '#fff' : '#000',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Back to Devices
              </button>
          </div>
          
      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '10px',
        marginBottom: '20px',
        borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`
      }}>
        {tabs.map(tab => (
              <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              // Update URL based on tab
              if (tab.id === 'logs') {
                navigate(`/mikrotiks/${id}/logs`);
                loadLogs(1, logsSearch);
              } else if (tab.id === 'interfaces') {
                navigate(`/mikrotiks/${id}/interfaces`);
              } else if (tab.id === 'ip-addresses') {
                navigate(`/mikrotiks/${id}/ip-addresses`);
              } else if (tab.id === 'routes') {
                navigate(`/mikrotiks/${id}/routes`);
              } else if (tab.id === 'firewall') {
                navigate(`/mikrotiks/${id}/firewall`);
              } else if (tab.id === 'nat') {
                navigate(`/mikrotiks/${id}/nat`);
              } else if (tab.id === 'mangle') {
                navigate(`/mikrotiks/${id}/mangle`);
              } else if (tab.id === 'update') {
                navigate(`/mikrotiks/${id}/update`);
              } else {
                navigate(`/mikrotiks/${id}`);
              }
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: activeTab === tab.id 
                ? (theme === 'dark' ? '#007acc' : '#0066cc')
                : 'transparent',
              color: activeTab === tab.id 
                ? '#fff' 
                : (theme === 'dark' ? '#fff' : '#000'),
              border: 'none',
              borderBottom: activeTab === tab.id 
                ? `2px solid ${theme === 'dark' ? '#007acc' : '#0066cc'}`
                : '2px solid transparent',
              cursor: 'pointer',
              borderRadius: '5px 5px 0 0'
            }}
          >
            {tab.label}
              </button>
        ))}
            </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div>
          <h2>Device Overview</h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px',
            marginBottom: '20px'
          }}>
            {/* Device Info */}
            <div style={{
              backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff',
              padding: '20px',
              borderRadius: '10px',
              border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`
            }}>
              <h3>Device Information</h3>
              <p><strong>Name:</strong> {device.name}</p>
              <p><strong>Host:</strong> {device.host}</p>
              <p><strong>Port:</strong> {device.port}</p>
              <p><strong>Firmware:</strong> {device.firmwareVersion}</p>
              <p><strong>Status:</strong> {device.status?.updateStatus || 'Unknown'}</p>
      </div>

            {/* Quick Actions */}
            <div style={{
              backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff',
              padding: '20px',
              borderRadius: '10px',
              border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`
            }}>
              <h3>Quick Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button 
                  onClick={handleTestConnectivity}
                  disabled={connectivityTesting}
                  style={{
                    padding: '10px',
                    backgroundColor: connectivityTesting ? '#f59e0b' : (theme === 'dark' ? '#333' : '#e0e0e0'),
                    color: theme === 'dark' ? '#fff' : '#000',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: connectivityTesting ? 'not-allowed' : 'pointer',
                    opacity: connectivityTesting ? 0.7 : 1
                  }}
                  title={connectivityTesting ? "Testing connectivity..." : "Test connectivity to device"}
                >
                  {connectivityTesting ? 'Testing...' : 'Test Connectivity'}
          </button>
          <button 
                  onClick={handleDiagnose}
                  style={{
                    padding: '10px',
                    backgroundColor: theme === 'dark' ? '#333' : '#e0e0e0',
                    color: theme === 'dark' ? '#fff' : '#000',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                  title="Run diagnostics"
                >
                  Diagnose
          </button>
          <button 
                  onClick={handleEnable}
                  style={{
                    padding: '10px',
                    backgroundColor: theme === 'dark' ? '#333' : '#e0e0e0',
                    color: theme === 'dark' ? '#fff' : '#000',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                  title="Enable device"
                >
                  Enable
          </button>
          <button 
                  onClick={handleRestartDevice}
                  style={{
                    padding: '10px',
                    backgroundColor: theme === 'dark' ? '#333' : '#e0e0e0',
                    color: theme === 'dark' ? '#fff' : '#000',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                  title="Restart device"
                >
                  Restart
          </button>
              </div>
            </div>

            {/* Safe Mode */}
            <div style={{
              backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff',
              padding: '20px',
              borderRadius: '10px',
              border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`
            }}>
              <h3>Safe Mode</h3>
              <p>Status: {safeMode ? 'Enabled' : 'Disabled'}</p>
          <button 
                onClick={handleToggleSafeMode}
                style={{
                  padding: '10px 20px',
                  backgroundColor: safeMode ? '#dc3545' : '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                {safeMode ? 'Disable Safe Mode' : 'Enable Safe Mode'}
          </button>
            </div>
      </div>

          {/* Project Paths */}
          <div style={{
            backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff',
            padding: '20px',
            borderRadius: '10px',
            border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`
          }}>
            <h3>Project Paths</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}` }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Path</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '10px' }}>/Users/majidisaloo/Desktop/Mik-Management</td>
                  <td style={{ padding: '10px' }}>Project root directory</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px' }}>/Users/majidisaloo/Desktop/Mik-Management/backend</td>
                  <td style={{ padding: '10px' }}>Backend server files</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px' }}>/Users/majidisaloo/Desktop/Mik-Management/frontend</td>
                  <td style={{ padding: '10px' }}>Frontend React application</td>
                </tr>
              </tbody>
            </table>
              </div>
                          </div>
                        )}

      {activeTab === 'interfaces' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Interfaces</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowAddInterfaceModal(true)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: theme === 'dark' ? '#007acc' : '#0066cc',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Add Interface
              </button>
              <button
                onClick={loadInterfaces}
                style={{
                  padding: '10px 20px',
                  backgroundColor: theme === 'dark' ? '#333' : '#e0e0e0',
                  color: theme === 'dark' ? '#fff' : '#000',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Refresh
              </button>
                      </div>
                    </div>
          
          <div style={{
            backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff',
            borderRadius: '10px',
            border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}` }}>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Name</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Type</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>RX</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>TX</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {interfaces.map((iface, index) => (
                  <tr key={index} style={{ borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}` }}>
                    <td style={{ padding: '15px' }}>{iface.name}</td>
                    <td style={{ padding: '15px' }}>{iface.type}</td>
                    <td style={{ padding: '15px' }}>
                      <span style={{
                        padding: '5px 10px',
                        borderRadius: '15px',
                        backgroundColor: iface.status === 'up' ? '#28a745' : '#dc3545',
                        color: '#fff',
                        fontSize: '0.8rem'
                      }}>
                        {iface.status}
                      </span>
                    </td>
                    <td style={{ padding: '15px' }}>{iface.rx || '0'}</td>
                    <td style={{ padding: '15px' }}>{iface.tx || '0'}</td>
                    <td style={{ padding: '15px' }}>
                      <button
                        onClick={() => setShowEditInterfaceModal(true)}
                        style={{
                          padding: '5px 10px',
                          backgroundColor: theme === 'dark' ? '#333' : '#e0e0e0',
                          color: theme === 'dark' ? '#fff' : '#000',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
              </div>
            </div>
          )}

      {activeTab === 'ip-addresses' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>IP Addresses</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowAddIpModal(true)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: theme === 'dark' ? '#007acc' : '#0066cc',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Add IP Address
              </button>
              <button
                onClick={loadIpAddresses}
                style={{
                  padding: '10px 20px',
                  backgroundColor: theme === 'dark' ? '#333' : '#e0e0e0',
                  color: theme === 'dark' ? '#fff' : '#000',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Refresh
              </button>
            </div>
          </div>

          <div style={{
            backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff',
            borderRadius: '10px',
            border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}` }}>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Address</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Network</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Interface</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Comment</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ipAddresses.map((ip, index) => (
                  <tr key={index} style={{ borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}` }}>
                    <td style={{ padding: '15px' }}>{ip.address}</td>
                    <td style={{ padding: '15px' }}>{ip.network}</td>
                    <td style={{ padding: '15px' }}>{ip.interface}</td>
                    <td style={{ padding: '15px' }}>{ip.comment}</td>
                    <td style={{ padding: '15px' }}>
                      <button
                        onClick={() => setShowEditIpModal(true)}
                        style={{
                          padding: '5px 10px',
                          backgroundColor: theme === 'dark' ? '#333' : '#e0e0e0',
                          color: theme === 'dark' ? '#fff' : '#000',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
                </div>
              </div>
      )}

      {activeTab === 'routes' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Routes</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowAddRouteModal(true)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: theme === 'dark' ? '#007acc' : '#0066cc',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Add Route
              </button>
              <button
                onClick={loadRoutes}
                style={{
                  padding: '10px 20px',
                  backgroundColor: theme === 'dark' ? '#333' : '#e0e0e0',
                  color: theme === 'dark' ? '#fff' : '#000',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Refresh
              </button>
            </div>
          </div>

          <div style={{
            backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff',
            borderRadius: '10px',
            border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}` }}>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Destination</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Gateway</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Interface</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Distance</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {routes.map((route, index) => (
                  <tr key={index} style={{ borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}` }}>
                    <td style={{ padding: '15px' }}>{route.destination}</td>
                    <td style={{ padding: '15px' }}>{route.gateway}</td>
                    <td style={{ padding: '15px' }}>{route.interface}</td>
                    <td style={{ padding: '15px' }}>{route.distance}</td>
                    <td style={{ padding: '15px' }}>
                      <button
                        onClick={() => setShowEditRouteModal(true)}
                        style={{
                          padding: '5px 10px',
                          backgroundColor: theme === 'dark' ? '#333' : '#e0e0e0',
                          color: theme === 'dark' ? '#fff' : '#000',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
                </div>
              </div>
      )}

      {activeTab === 'firewall' && (
              <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Firewall Rules</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowAddFirewallModal(true)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: theme === 'dark' ? '#007acc' : '#0066cc',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Add Firewall Rule
              </button>
              <button
                onClick={loadFirewallRules}
                style={{
                  padding: '10px 20px',
                  backgroundColor: theme === 'dark' ? '#333' : '#e0e0e0',
                  color: theme === 'dark' ? '#fff' : '#000',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Refresh
              </button>
          </div>
        </div>

          <div style={{
            backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff',
            borderRadius: '10px',
            border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}` }}>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Chain</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Source Address</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Source Address List</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Destination Address</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Destination Address List</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Protocol</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Port</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Action</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {firewallRules.map((rule, index) => (
                  <tr key={index} style={{ borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}` }}>
                    <td style={{ padding: '15px' }}>{rule.chain}</td>
                    <td style={{ padding: '15px' }}>{rule.sourceAddress}</td>
                    <td style={{ padding: '15px' }}>{rule.sourceAddressList}</td>
                    <td style={{ padding: '15px' }}>{rule.destinationAddress}</td>
                    <td style={{ padding: '15px' }}>{rule.destinationAddressList}</td>
                    <td style={{ padding: '15px' }}>{rule.protocol}</td>
                    <td style={{ padding: '15px' }}>{rule.port}</td>
                    <td style={{ padding: '15px' }}>
                      <span style={{
                        padding: '5px 10px',
                        borderRadius: '15px',
                        backgroundColor: rule.action === 'accept' ? '#28a745' : '#dc3545',
                        color: '#fff',
                        fontSize: '0.8rem'
                      }}>
                        {rule.action}
                </span>
                    </td>
                    <td style={{ padding: '15px' }}>
                      <button
                        onClick={() => setShowEditFirewallModal(true)}
                        style={{
                          padding: '5px 10px',
                          backgroundColor: theme === 'dark' ? '#333' : '#e0e0e0',
                          color: theme === 'dark' ? '#fff' : '#000',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
              </div>
            </div>
      )}

      {activeTab === 'nat' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>NAT Rules</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowAddNatModal(true)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: theme === 'dark' ? '#007acc' : '#0066cc',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Add NAT Rule
              </button>
              <button
                onClick={loadNatRules}
                style={{
                  padding: '10px 20px',
                  backgroundColor: theme === 'dark' ? '#333' : '#e0e0e0',
                  color: theme === 'dark' ? '#fff' : '#000',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Refresh
              </button>
            </div>
          </div>

          <div style={{
            backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff',
            borderRadius: '10px',
            border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}` }}>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Chain</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Source Address</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Source Address List</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Destination Address</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Destination Address List</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Protocol</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Port</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Action</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {natRules.map((rule, index) => (
                  <tr key={index} style={{ borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}` }}>
                    <td style={{ padding: '15px' }}>{rule.chain}</td>
                    <td style={{ padding: '15px' }}>{rule.sourceAddress}</td>
                    <td style={{ padding: '15px' }}>{rule.sourceAddressList}</td>
                    <td style={{ padding: '15px' }}>{rule.destinationAddress}</td>
                    <td style={{ padding: '15px' }}>{rule.destinationAddressList}</td>
                    <td style={{ padding: '15px' }}>{rule.protocol}</td>
                    <td style={{ padding: '15px' }}>{rule.port}</td>
                    <td style={{ padding: '15px' }}>
                      <span style={{
                        padding: '5px 10px',
                        borderRadius: '15px',
                        backgroundColor: rule.action === 'accept' ? '#28a745' : '#dc3545',
                        color: '#fff',
                        fontSize: '0.8rem'
                      }}>
                        {rule.action}
                </span>
                    </td>
                    <td style={{ padding: '15px' }}>
                      <button
                        onClick={() => setShowEditNatModal(true)}
                        style={{
                          padding: '5px 10px',
                          backgroundColor: theme === 'dark' ? '#333' : '#e0e0e0',
                          color: theme === 'dark' ? '#fff' : '#000',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      </div>
    )}

      {activeTab === 'mangle' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Mangle Rules</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowAddMangleModal(true)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: theme === 'dark' ? '#007acc' : '#0066cc',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Add Mangle Rule
              </button>
              <button
                onClick={loadMangleRules}
                style={{
                  padding: '10px 20px',
                  backgroundColor: theme === 'dark' ? '#333' : '#e0e0e0',
                  color: theme === 'dark' ? '#fff' : '#000',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Refresh
              </button>
            </div>
          </div>
          
          <div style={{
            backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff',
            borderRadius: '10px',
            border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}` }}>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Chain</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Source Address</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Source Address List</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Destination Address</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Destination Address List</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Protocol</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Port</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Action</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Actions</th>
                    </tr>
                  </thead>
              <tbody>
                {mangleRules.map((rule, index) => (
                  <tr key={index} style={{ borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}` }}>
                    <td style={{ padding: '15px' }}>{rule.chain}</td>
                    <td style={{ padding: '15px' }}>{rule.sourceAddress}</td>
                    <td style={{ padding: '15px' }}>{rule.sourceAddressList}</td>
                    <td style={{ padding: '15px' }}>{rule.destinationAddress}</td>
                    <td style={{ padding: '15px' }}>{rule.destinationAddressList}</td>
                    <td style={{ padding: '15px' }}>{rule.protocol}</td>
                    <td style={{ padding: '15px' }}>{rule.port}</td>
                    <td style={{ padding: '15px' }}>
                      <span style={{
                        padding: '5px 10px',
                        borderRadius: '15px',
                        backgroundColor: rule.action === 'accept' ? '#28a745' : '#dc3545',
                        color: '#fff',
                        fontSize: '0.8rem'
                      }}>
                        {rule.action}
                          </span>
                        </td>
                    <td style={{ padding: '15px' }}>
                      <button
                        onClick={() => setShowEditMangleModal(true)}
                        style={{
                          padding: '5px 10px',
                          backgroundColor: theme === 'dark' ? '#333' : '#e0e0e0',
                          color: theme === 'dark' ? '#fff' : '#000',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        Edit
                      </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
        </div>
      </div>
    )}


      {activeTab === 'logs' && (
        <div style={{
          // CSS Isolation - Reset all inherited styles
          all: 'initial',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: '14px',
          lineHeight: '1.5',
          color: theme === 'dark' ? '#fff' : '#000',
          backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff',
          padding: '20px',
          borderRadius: '8px',
          border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
          boxShadow: theme === 'dark' ? '0 4px 6px rgba(0, 0, 0, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
          // Prevent external CSS interference
          position: 'relative',
          zIndex: 1,
          // Reset common CSS properties that might be inherited
          margin: 0,
          boxSizing: 'border-box',
          // Ensure proper display
          display: 'block',
          width: '100%',
          minHeight: '400px'
        }}>
          {/* Search Bar */}
          <div style={{ 
            display: 'flex', 
            gap: '10px', 
            alignItems: 'center', 
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: theme === 'dark' ? '#2a2a2a' : '#f8f9fa',
            borderRadius: '8px',
            border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
            // CSS Isolation
            position: 'relative',
            zIndex: 2,
            boxSizing: 'border-box',
            width: '100%'
          }}>
            <input
              type="text"
              placeholder="Search logs by IP, service, or message..."
              value={logsSearch}
              onChange={(e) => setLogsSearch(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  loadLogs(1, logsSearch);
                }
              }}
              style={{
                flex: 1,
                padding: '10px 15px',
                border: `1px solid ${theme === 'dark' ? '#555' : '#ddd'}`,
                borderRadius: '6px',
                backgroundColor: theme === 'dark' ? '#333' : '#fff',
                color: theme === 'dark' ? '#fff' : '#000',
                fontSize: '14px',
                outline: 'none',
                // CSS Isolation
                fontFamily: 'inherit',
                lineHeight: 'inherit',
                boxSizing: 'border-box',
                margin: 0,
                appearance: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none'
              }}
            />
            <button
              onClick={() => {
                setLogsLoading(true);
                loadLogs(1, logsSearch);
              }}
              disabled={logsLoading}
              style={{
                padding: '10px 20px',
                backgroundColor: logsLoading ? (theme === 'dark' ? '#6c757d' : '#6c757d') : (theme === 'dark' ? '#007acc' : '#0066cc'),
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: logsLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: logsLoading ? 0.7 : 1,
                // CSS Isolation
                fontFamily: 'inherit',
                lineHeight: 'inherit',
                boxSizing: 'border-box',
                margin: 0,
                appearance: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                outline: 'none'
              }}
            >
              {logsLoading ? '⏳ Searching...' : '🔍 Search'}
            </button>
            <button
              onClick={() => {
                setLogsLoading(true);
                loadLogs(logsPage, logsSearch);
              }}
              disabled={logsLoading}
              style={{
                padding: '10px 20px',
                backgroundColor: logsLoading ? (theme === 'dark' ? '#6c757d' : '#6c757d') : (theme === 'dark' ? '#28a745' : '#28a745'),
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: logsLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: logsLoading ? 0.7 : 1,
                // CSS Isolation
                fontFamily: 'inherit',
                lineHeight: 'inherit',
                boxSizing: 'border-box',
                margin: 0,
                appearance: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                outline: 'none'
              }}
            >
              {logsLoading ? '⏳ Loading...' : '🔄 Refresh'}
            </button>
          </div>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0 }}>System Logs</h2>
            <div style={{ fontSize: '14px', color: theme === 'dark' ? '#ccc' : '#666' }}>
              {logs.length > 0 && `Showing ${logs.length} logs`}
            </div>
          </div>


          {/* Logs Table */}
          <div style={{
            backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff',
            borderRadius: '10px',
            border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
            overflow: 'hidden',
            // CSS Isolation
            position: 'relative',
            zIndex: 2,
            boxSizing: 'border-box',
            width: '100%',
            margin: 0,
            padding: 0
          }}>
            {logsLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: theme === 'dark' ? '#ccc' : '#666' }}>
                Loading logs...
              </div>
            ) : logsError ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#dc3545' }}>
                Error: {logsError}
              </div>
            ) : logs.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: theme === 'dark' ? '#ccc' : '#666' }}>
                No logs found
              </div>
            ) : (
              <>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse',
                  // CSS Isolation
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                  lineHeight: 'inherit',
                  color: 'inherit',
                  backgroundColor: 'transparent',
                  border: 'none',
                  margin: 0,
                  padding: 0,
                  boxSizing: 'border-box'
                }}>
                  <thead>
                    <tr style={{ 
                      borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
                      backgroundColor: theme === 'dark' ? '#333' : '#f8f9fa'
                    }}>
                      <th 
                        style={{ 
                          padding: '12px', 
                          textAlign: 'left', 
                          fontSize: '14px', 
                          fontWeight: '600',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                        onClick={() => {
                          const newDirection = sortColumn === 'time' && sortDirection === 'asc' ? 'desc' : 'asc';
                          setSortColumn('time');
                          setSortDirection(newDirection);
                          
                          const sortedLogs = [...logs].sort((a, b) => {
                            try {
                              const timeA = new Date(a.time).getTime();
                              const timeB = new Date(b.time).getTime();
                              return newDirection === 'asc' ? timeA - timeB : timeB - timeA;
                            } catch (e) {
                              return 0;
                            }
                          });
                          setLogs(sortedLogs);
                        }}
                      >
                        Time {sortColumn === 'time' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕️'}
                      </th>
                      <th 
                        style={{ 
                          padding: '12px', 
                          textAlign: 'left', 
                          fontSize: '14px', 
                          fontWeight: '600',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                        onClick={() => {
                          const newDirection = sortColumn === 'level' && sortDirection === 'asc' ? 'desc' : 'asc';
                          setSortColumn('level');
                          setSortDirection(newDirection);
                          
                          const sortedLogs = [...logs].sort((a, b) => {
                            const result = a.level.localeCompare(b.level);
                            return newDirection === 'asc' ? result : -result;
                          });
                          setLogs(sortedLogs);
                        }}
                      >
                        Level {sortColumn === 'level' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕️'}
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Topics</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, index) => (
                      <tr 
                        key={log.id || index}
                        style={{ 
                          borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#eee'}`,
                          backgroundColor: index % 2 === 0 ? 'transparent' : (theme === 'dark' ? '#1a1a1a' : '#f8f9fa')
                        }}
                      >
                        <td style={{ 
                          padding: '12px', 
                          fontSize: '13px',
                          fontFamily: 'monospace',
                          color: theme === 'dark' ? '#ccc' : '#666',
                          whiteSpace: 'nowrap'
                        }}>
                          {log.time}
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            backgroundColor: 
                              log.level === 'error' ? '#dc3545' :
                              log.level === 'warning' ? '#ffc107' :
                              log.level === 'info' ? '#17a2b8' :
                              log.level === 'debug' ? '#6c757d' : '#28a745',
                            color: log.level === 'warning' ? '#000' : '#fff'
                          }}>
                            {log.level}
                          </span>
                        </td>
                        <td style={{ 
                          padding: '12px', 
                          fontSize: '13px',
                          color: theme === 'dark' ? '#ccc' : '#666'
                        }}>
                          {log.topics}
                        </td>
                        <td style={{ 
                          padding: '12px', 
                          fontSize: '13px',
                          color: theme === 'dark' ? '#fff' : '#000',
                          wordBreak: 'break-word'
                        }}>
                          {log.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {logsTotalPages > 1 && (
                  <div style={{
                    padding: '15px',
                    borderTop: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: theme === 'dark' ? '#333' : '#f8f9fa'
                  }}>
                    <div style={{ fontSize: '14px', color: theme === 'dark' ? '#ccc' : '#666' }}>
                      Page {logsPage} of {logsTotalPages}
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => loadLogs(logsPage - 1, logsSearch)}
                        disabled={logsPage <= 1}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: logsPage <= 1 ? (theme === 'dark' ? '#444' : '#e0e0e0') : (theme === 'dark' ? '#007acc' : '#0066cc'),
                          color: logsPage <= 1 ? (theme === 'dark' ? '#666' : '#999') : '#fff',
                          border: 'none',
                          borderRadius: '5px',
                          cursor: logsPage <= 1 ? 'not-allowed' : 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => loadLogs(logsPage + 1, logsSearch)}
                        disabled={logsPage >= logsTotalPages}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: logsPage >= logsTotalPages ? (theme === 'dark' ? '#444' : '#e0e0e0') : (theme === 'dark' ? '#007acc' : '#0066cc'),
                          color: logsPage >= logsTotalPages ? (theme === 'dark' ? '#666' : '#999') : '#fff',
                          border: 'none',
                          borderRadius: '5px',
                          cursor: logsPage >= logsTotalPages ? 'not-allowed' : 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'update' && (
        <div>
          <h2>System Update</h2>
          {updateInfo && (
            <div style={{
              backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff',
              padding: '20px',
              borderRadius: '10px',
              border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
              marginBottom: '20px'
            }}>
              <h3>Update Information</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>Current Version:</td>
                    <td style={{ padding: '10px' }}>{updateInfo.currentVersion}</td>
                    </tr>
                  <tr>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>Latest Stable:</td>
                    <td style={{ padding: '10px' }}>{updateInfo.latestStable}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>Latest Beta:</td>
                    <td style={{ padding: '10px' }}>{updateInfo.latestBeta}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>Update Available:</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{
                        padding: '5px 10px',
                        borderRadius: '15px',
                        backgroundColor: updateInfo.updateAvailable ? '#28a745' : '#6c757d',
                        color: '#fff',
                        fontSize: '0.8rem'
                      }}>
                        {updateInfo.updateAvailable ? 'Yes' : 'No'}
                          </span>
                        </td>
                      </tr>
                  </tbody>
                </table>
              
              {updateInfo.updateAvailable && (
                <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                <button
                    onClick={handleDownloadUpdate}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: theme === 'dark' ? '#007acc' : '#0066cc',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    Download
                  </button>
                  <button
                    onClick={handleDownloadAndInstallUpdate}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: theme === 'dark' ? '#28a745' : '#28a745',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    Download and Install
                </button>
              </div>
            )}
          </div>
          )}
      </div>
    )}

      {/* Add IP Address Modal */}
      {showAddIpModal && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff',
            padding: '30px',
            borderRadius: '10px',
            width: '500px',
            maxWidth: '90vw'
          }}>
            <h3 style={{ marginTop: 0 }}>Add IP Address</h3>
            <form onSubmit={handleAddIpAddress}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Address:</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="192.168.1.1/24"
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
                    borderRadius: '5px',
                    backgroundColor: theme === 'dark' ? '#333' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    checked={formData.network !== ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      network: e.target.checked ? formData.network : '' 
                    })}
                  />
                  Network
                </label>
                <input
                  type="text"
                  value={formData.network}
                  onChange={(e) => setFormData({ ...formData, network: e.target.value })}
                  placeholder="192.168.1.0/24"
                  disabled={formData.network === ''}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
                    borderRadius: '5px',
                    backgroundColor: theme === 'dark' ? '#333' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000',
                    marginTop: '5px',
                    opacity: formData.network === '' ? 0.5 : 1
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Interface:</label>
                <select
                  value={formData.interface}
                  onChange={(e) => setFormData({ ...formData, interface: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
                    borderRadius: '5px',
                    backgroundColor: theme === 'dark' ? '#333' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                >
                  <option value="">Select Interface</option>
                  {interfaces.map((iface, index) => (
                    <option key={index} value={iface.name}>{iface.name}</option>
                  ))}
                </select>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Comment:</label>
                <input
                  type="text"
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  placeholder="test"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
                    borderRadius: '5px',
                    backgroundColor: theme === 'dark' ? '#333' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                  type="button"
                  onClick={() => setShowAddIpModal(false)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: theme === 'dark' ? '#333' : '#e0e0e0',
                    color: theme === 'dark' ? '#fff' : '#000',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    backgroundColor: theme === 'dark' ? '#007acc' : '#0066cc',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Add IP Address
              </button>
            </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Add Route Modal */}
      {showAddRouteModal && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff',
            padding: '30px',
            borderRadius: '10px',
            width: '500px',
            maxWidth: '90vw'
          }}>
            <h3 style={{ marginTop: 0 }}>Add Route</h3>
            <form onSubmit={handleAddRoute}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Destination:</label>
                <input
                  type="text"
                  value={formData.destination || ''}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  placeholder="0.0.0.0/0"
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
                    borderRadius: '5px',
                    backgroundColor: theme === 'dark' ? '#333' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Gateway:</label>
                <input
                  type="text"
                  value={formData.gateway || ''}
                  onChange={(e) => setFormData({ ...formData, gateway: e.target.value })}
                  placeholder="192.168.1.1"
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
                    borderRadius: '5px',
                    backgroundColor: theme === 'dark' ? '#333' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Interface:</label>
                <select
                  value={formData.interface}
                  onChange={(e) => setFormData({ ...formData, interface: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
                    borderRadius: '5px',
                    backgroundColor: theme === 'dark' ? '#333' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                >
                  <option value="">Select Interface</option>
                  {interfaces.map((iface, index) => (
                    <option key={index} value={iface.name}>{iface.name}</option>
                  ))}
                </select>
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Distance:</label>
                <input
                  type="number"
                  value={formData.distance}
                  onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
                  placeholder="1"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
                    borderRadius: '5px',
                    backgroundColor: theme === 'dark' ? '#333' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Mark Route:</label>
                <input
                  type="text"
                  value={formData.markRoute}
                  onChange={(e) => setFormData({ ...formData, markRoute: e.target.value })}
                  placeholder="test-route"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
                    borderRadius: '5px',
                    backgroundColor: theme === 'dark' ? '#333' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAddRouteModal(false)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: theme === 'dark' ? '#333' : '#e0e0e0',
                    color: theme === 'dark' ? '#fff' : '#000',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    backgroundColor: theme === 'dark' ? '#007acc' : '#0066cc',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Add Route
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Add Firewall Rule Modal */}
      {showAddFirewallModal && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff',
            padding: '30px',
            borderRadius: '10px',
            width: '600px',
            maxWidth: '90vw'
          }}>
            <h3 style={{ marginTop: 0 }}>Add Firewall Rule</h3>
            <form onSubmit={handleAddFirewallRule}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Source Address:</label>
                <input
                  type="text"
                  value={formData.sourceAddress}
                  onChange={(e) => setFormData({ ...formData, sourceAddress: e.target.value })}
                  placeholder="192.168.1.0/24"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
                    borderRadius: '5px',
                    backgroundColor: theme === 'dark' ? '#333' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                />
          </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Source Address List:</label>
                <input
                  type="text"
                  value={formData.sourceAddressList}
                  onChange={(e) => setFormData({ ...formData, sourceAddressList: e.target.value })}
                  placeholder="trusted-hosts"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
                    borderRadius: '5px',
                    backgroundColor: theme === 'dark' ? '#333' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                />
        </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Destination Address:</label>
                <input
                  type="text"
                  value={formData.destinationAddress}
                  onChange={(e) => setFormData({ ...formData, destinationAddress: e.target.value })}
                  placeholder="192.168.1.1"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
                    borderRadius: '5px',
                    backgroundColor: theme === 'dark' ? '#333' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                />
      </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Destination Address List:</label>
                <input
                  type="text"
                  value={formData.destinationAddressList}
                  onChange={(e) => setFormData({ ...formData, destinationAddressList: e.target.value })}
                  placeholder="blocked-hosts"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
                    borderRadius: '5px',
                    backgroundColor: theme === 'dark' ? '#333' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                />
          </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Protocol:</label>
                <select
                  value={formData.protocol}
                  onChange={(e) => setFormData({ ...formData, protocol: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
                    borderRadius: '5px',
                    backgroundColor: theme === 'dark' ? '#333' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                >
                  <option value="">Any</option>
                  <option value="tcp">TCP</option>
                  <option value="udp">UDP</option>
                  <option value="icmp">ICMP</option>
                </select>
            </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Port:</label>
                <input
                  type="text"
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                  placeholder="22,80,443"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
                    borderRadius: '5px',
                    backgroundColor: theme === 'dark' ? '#333' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                />
          </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Action:</label>
                <select
                  value={formData.action}
                  onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
                    borderRadius: '5px',
                    backgroundColor: theme === 'dark' ? '#333' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                >
                  <option value="accept">Accept</option>
                  <option value="drop">Drop</option>
                  <option value="reject">Reject</option>
                </select>
        </div>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAddFirewallModal(false)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: theme === 'dark' ? '#333' : '#e0e0e0',
                    color: theme === 'dark' ? '#fff' : '#000',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    backgroundColor: theme === 'dark' ? '#007acc' : '#0066cc',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Add Firewall Rule
                </button>
      </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Firewall Rule Modal */}
      {showEditFirewallModal && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff',
            padding: '30px',
            borderRadius: '10px',
            width: '600px',
            maxWidth: '90vw'
          }}>
            <h3 style={{ marginTop: 0 }}>Edit Firewall Rule</h3>
            <form onSubmit={handleEditFirewallRule}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Source Address:</label>
                <input
                  type="text"
                  value={formData.sourceAddress}
                  onChange={(e) => setFormData({ ...formData, sourceAddress: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: `1px solid ${theme === 'dark' ? '#555' : '#ddd'}`,
                    borderRadius: '4px',
                    backgroundColor: theme === 'dark' ? '#333' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                />
          </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Source Address List:</label>
                <input
                  type="text"
                  value={formData.sourceAddressList}
                  onChange={(e) => setFormData({ ...formData, sourceAddressList: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: `1px solid ${theme === 'dark' ? '#555' : '#ddd'}`,
                    borderRadius: '4px',
                    backgroundColor: theme === 'dark' ? '#333' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                />
            </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Destination Address:</label>
                <input
                  type="text"
                  value={formData.destinationAddress}
                  onChange={(e) => setFormData({ ...formData, destinationAddress: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: `1px solid ${theme === 'dark' ? '#555' : '#ddd'}`,
                    borderRadius: '4px',
                    backgroundColor: theme === 'dark' ? '#333' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                />
          </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Destination Address List:</label>
                <input
                  type="text"
                  value={formData.destinationAddressList}
                  onChange={(e) => setFormData({ ...formData, destinationAddressList: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: `1px solid ${theme === 'dark' ? '#555' : '#ddd'}`,
                    borderRadius: '4px',
                    backgroundColor: theme === 'dark' ? '#333' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                />
        </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Protocol:</label>
                <select
                  value={formData.protocol}
                  onChange={(e) => setFormData({ ...formData, protocol: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: `1px solid ${theme === 'dark' ? '#555' : '#ddd'}`,
                    borderRadius: '4px',
                    backgroundColor: theme === 'dark' ? '#333' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                >
                  <option value="">Select Protocol</option>
                  <option value="tcp">TCP</option>
                  <option value="udp">UDP</option>
                  <option value="icmp">ICMP</option>
                  <option value="all">All</option>
                </select>
      </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Port:</label>
                <input
                  type="text"
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: `1px solid ${theme === 'dark' ? '#555' : '#ddd'}`,
                    borderRadius: '4px',
                    backgroundColor: theme === 'dark' ? '#333' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Action:</label>
                <select
                  value={formData.action}
                  onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: `1px solid ${theme === 'dark' ? '#555' : '#ddd'}`,
                    borderRadius: '4px',
                    backgroundColor: theme === 'dark' ? '#333' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                >
                  <option value="accept">Accept</option>
                  <option value="drop">Drop</option>
                  <option value="reject">Reject</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowEditFirewallModal(false)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: theme === 'dark' ? '#666' : '#ccc',
                    color: theme === 'dark' ? '#fff' : '#000',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    backgroundColor: theme === 'dark' ? '#007acc' : '#0066cc',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Update Rule
                </button>
              </div>
            </form>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowEditFirewallModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: theme === 'dark' ? '#333' : '#e0e0e0',
                  color: theme === 'dark' ? '#fff' : '#000',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
          </div>
            </div>
        </div>,
        document.body
      )}

      {/* Edit Mangle Rule Modal */}
      {showEditMangleModal && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff',
            padding: '30px',
            borderRadius: '10px',
            width: '600px',
            maxWidth: '90vw'
          }}>
            <h3 style={{ marginTop: 0 }}>Edit Mangle Rule</h3>
            <form onSubmit={handleEditMangleRule}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Source Address:</label>
                <input
                  type="text"
                  value={formData.sourceAddress}
                  onChange={(e) => setFormData({ ...formData, sourceAddress: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: `1px solid ${theme === 'dark' ? '#555' : '#ddd'}`,
                    borderRadius: '4px',
                    backgroundColor: theme === 'dark' ? '#333' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                />
          </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Source Address List:</label>
                <input
                  type="text"
                  value={formData.sourceAddressList}
                  onChange={(e) => setFormData({ ...formData, sourceAddressList: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: `1px solid ${theme === 'dark' ? '#555' : '#ddd'}`,
                    borderRadius: '4px',
                    backgroundColor: theme === 'dark' ? '#333' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                />
            </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Destination Address:</label>
                <input
                  type="text"
                  value={formData.destinationAddress}
                  onChange={(e) => setFormData({ ...formData, destinationAddress: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: `1px solid ${theme === 'dark' ? '#555' : '#ddd'}`,
                    borderRadius: '4px',
                    backgroundColor: theme === 'dark' ? '#333' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                />
          </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Destination Address List:</label>
                <input
                  type="text"
                  value={formData.destinationAddressList}
                  onChange={(e) => setFormData({ ...formData, destinationAddressList: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: `1px solid ${theme === 'dark' ? '#555' : '#ddd'}`,
                    borderRadius: '4px',
                    backgroundColor: theme === 'dark' ? '#333' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                />
        </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Protocol:</label>
                <select
                  value={formData.protocol}
                  onChange={(e) => setFormData({ ...formData, protocol: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: `1px solid ${theme === 'dark' ? '#555' : '#ddd'}`,
                    borderRadius: '4px',
                    backgroundColor: theme === 'dark' ? '#333' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                >
                  <option value="">Select Protocol</option>
                  <option value="tcp">TCP</option>
                  <option value="udp">UDP</option>
                  <option value="icmp">ICMP</option>
                  <option value="all">All</option>
                </select>
      </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Port:</label>
                <input
                  type="text"
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: `1px solid ${theme === 'dark' ? '#555' : '#ddd'}`,
                    borderRadius: '4px',
                    backgroundColor: theme === 'dark' ? '#333' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Action:</label>
                <select
                  value={formData.action}
                  onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: `1px solid ${theme === 'dark' ? '#555' : '#ddd'}`,
                    borderRadius: '4px',
                    backgroundColor: theme === 'dark' ? '#333' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                >
                  <option value="accept">Accept</option>
                  <option value="drop">Drop</option>
                  <option value="reject">Reject</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowEditMangleModal(false)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: theme === 'dark' ? '#666' : '#ccc',
                    color: theme === 'dark' ? '#fff' : '#000',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    backgroundColor: theme === 'dark' ? '#007acc' : '#0066cc',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Update Rule
                </button>
              </div>
            </form>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowEditMangleModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: theme === 'dark' ? '#333' : '#e0e0e0',
                  color: theme === 'dark' ? '#fff' : '#000',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
          </div>
            </div>
        </div>,
        document.body
      )}

      {/* Add Interface Modal */}
      {showAddInterfaceModal && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff',
            padding: '30px',
            borderRadius: '10px',
            width: '500px',
            maxWidth: '90vw'
          }}>
            <h3 style={{ marginTop: 0 }}>Add Interface</h3>
            <form onSubmit={handleAddInterface}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Interface Name:</label>
                <input
                  type="text"
                  value={formData.interfaceName || ''}
                  onChange={(e) => setFormData({ ...formData, interfaceName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: `1px solid ${theme === 'dark' ? '#555' : '#ddd'}`,
                    borderRadius: '4px',
                    backgroundColor: theme === 'dark' ? '#333' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                  required
                />
          </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Interface Type:</label>
                <select
                  value={formData.interfaceType || ''}
                  onChange={(e) => setFormData({ ...formData, interfaceType: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: `1px solid ${theme === 'dark' ? '#555' : '#ddd'}`,
                    borderRadius: '4px',
                    backgroundColor: theme === 'dark' ? '#333' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                  required
                >
                  <option value="">Select Type</option>
                  <option value="ethernet">Ethernet</option>
                  <option value="wireless">Wireless</option>
                  <option value="bridge">Bridge</option>
                  <option value="vlan">VLAN</option>
                  <option value="gre">GRE</option>
                  <option value="grev6">GREv6</option>
                  <option value="pppoe">PPPoE</option>
                </select>
        </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Comment:</label>
                <input
                  type="text"
                  value={formData.comment || ''}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: `1px solid ${theme === 'dark' ? '#555' : '#ddd'}`,
                    borderRadius: '4px',
                    backgroundColor: theme === 'dark' ? '#333' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                />
      </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAddInterfaceModal(false)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: theme === 'dark' ? '#666' : '#ccc',
                    color: theme === 'dark' ? '#fff' : '#000',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    backgroundColor: theme === 'dark' ? '#007acc' : '#0066cc',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Add Interface
                </button>
              </div>
            </form>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAddInterfaceModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: theme === 'dark' ? '#333' : '#e0e0e0',
                  color: theme === 'dark' ? '#fff' : '#000',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
      </div>
          </div>
        </div>,
        document.body
    )}
    </div>
  );
};

export default DeviceDetails;