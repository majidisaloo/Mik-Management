import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { createPortal } from 'react-dom';

const DeviceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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
    try {
      const response = await fetch(`/api/mikrotiks/${id}/test-connectivity`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setConnectivity(data);
        await loadSystemLogs();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
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
            onClick={() => setActiveTab(tab.id)}
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
                  style={{
                    padding: '10px',
                    backgroundColor: theme === 'dark' ? '#333' : '#e0e0e0',
                    color: theme === 'dark' ? '#fff' : '#000',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                  title="Test connectivity to device"
                >
                  Test
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
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>System Logs</h2>
              <button
              onClick={loadSystemLogs}
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
          
          <div style={{
            backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff',
            borderRadius: '10px',
            border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}` }}>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Time</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Topics</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Message</th>
                </tr>
              </thead>
              <tbody>
                {systemLogs.map((log, index) => (
                  <tr key={index} style={{ borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}` }}>
                    <td style={{ padding: '15px' }}>{log.time}</td>
                    <td style={{ padding: '15px' }}>{log.topics}</td>
                    <td style={{ padding: '15px' }}>{log.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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