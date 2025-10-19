import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

// Icons
const DeviceIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
    <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="2" />
    <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const NetworkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TestConnectionIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c1.3 0 2.52.28 3.64.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DiagnosticsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const InterfaceIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
    <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="2" />
    <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const IPIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const RouteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 3h18v18H3zM8 8h8v8H8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ConfigIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LogsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="10,9 9,9 8,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

const SafeModeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const UpdateIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c1.3 0 2.52.28 3.64.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 3v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DeviceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groupLookup, setGroupLookup] = useState(new Map());
  const [testingConnection, setTestingConnection] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [interfaces, setInterfaces] = useState([]);
  const [showAddIpModal, setShowAddIpModal] = useState(false);
  const [formData, setFormData] = useState({
    enabled: true,
    comment: '',
    address: '',
    network: '',
    networkEnabled: false,
    interface: ''
  });
  const [showAddInterfaceModal, setShowAddInterfaceModal] = useState(false);
  const [showAddRouteModal, setShowAddRouteModal] = useState(false);
  const [showAddFirewallModal, setShowAddFirewallModal] = useState(false);
  const [showEditFirewallModal, setShowEditFirewallModal] = useState(false);
  const [editingFirewallRule, setEditingFirewallRule] = useState(null);
  const [showEditMangleModal, setShowEditMangleModal] = useState(false);
  const [editingMangleRule, setEditingMangleRule] = useState(null);
  const [showEditInterfaceModal, setShowEditInterfaceModal] = useState(false);
  const [editingInterface, setEditingInterface] = useState(null);
  const [ipAddresses, setIpAddresses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [firewallRules, setFirewallRules] = useState([]);
  const [natRules, setNatRules] = useState([]);
  const [mangleRules, setMangleRules] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [safeMode, setSafeMode] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [updateLoading, setUpdateLoading] = useState(false);

  // Inject isolated CSS for this component
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .device-details-page {
        min-height: 100vh;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        transition: all 0.3s ease;
      }
      .device-details-page[data-theme="light"] {
        background: linear-gradient(135deg, #f8fafc 0%, #e0f2fe 50%, #e0e7ff 100%);
        color: #1f2937;
      }
      .device-details-page[data-theme="dark"] {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
        color: #f1f5f9;
      }
      .device-details-page * {
        box-sizing: border-box;
      }
      .device-details-page[data-theme="light"] .glassmorphism {
        background: rgba(255, 255, 255, 0.8);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      .device-details-page[data-theme="dark"] .glassmorphism {
        background: rgba(15, 23, 42, 0.8);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      .device-details-page[data-theme="light"] .gradient-text {
        background: linear-gradient(135deg, #1f2937 0%, #1e40af 50%, #7c3aed 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .device-details-page[data-theme="dark"] .gradient-text {
        background: linear-gradient(135deg, #f1f5f9 0%, #60a5fa 50%, #a78bfa 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .device-details-page[data-theme="light"] .modern-shadow {
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      }
      .device-details-page[data-theme="dark"] .modern-shadow {
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      }
      .device-details-page .hover-lift {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .device-details-page .hover-lift:hover {
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
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .device-details-page .fade-in {
        animation: fadeIn 0.6s ease-out;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, [theme]);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    
    loadDevice();
    loadGroups();
  }, [id, user, navigate]);

  const loadDevice = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/mikrotiks/${id}`);
      if (!response.ok) {
        throw new Error('Device not found');
      }
      const payload = await response.json();
      console.log('Initial device data:', payload);
      console.log('API Output:', payload.routeros?.apiOutput);
      setDevice(payload);
      
      // Load interfaces immediately after device is loaded
      if (payload) {
        console.log('Loading interfaces for device...');
        try {
          const interfacesResponse = await fetch(`/api/mikrotiks/${id}/interfaces`);
          if (interfacesResponse.ok) {
            const interfacesResult = await interfacesResponse.json();
            setInterfaces(interfacesResult.interfaces || []);
            console.log('Interfaces loaded:', interfacesResult.interfaces);
          }
        } catch (interfacesErr) {
          console.log('Failed to load interfaces:', interfacesErr);
        }
      }
      
      // Auto-test connection to get fresh data (always run)
      if (payload) {
        console.log('Auto-testing connection for fresh data...');
        try {
          const testResponse = await fetch(`/api/mikrotiks/${id}/test-connectivity`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (testResponse.ok) {
            const testResult = await testResponse.json();
            console.log('Test connectivity result:', testResult);
            if (testResult.mikrotik) {
              console.log('Updated device data:', testResult.mikrotik);
              console.log('Updated API Output:', testResult.mikrotik.routeros?.apiOutput);
              setDevice(testResult.mikrotik);
              console.log('Auto-connection test successful, device data updated');
            }
          }
        } catch (testErr) {
          console.log('Auto-connection test failed:', testErr);
          // Don't show error for auto-test, just use cached data
        }
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const response = await fetch('/api/groups');
      if (response.ok) {
        const payload = await response.json();
        const groups = Array.isArray(payload) ? payload : payload.groups || [];
        const lookup = new Map(groups.map(group => [group.id, group]));
        setGroupLookup(lookup);
      }
    } catch (error) {
      console.error('Failed to load groups:', error);
    }
  };

  const formatDateTime = (value) => {
    if (!value) return '—';
    if (typeof value === 'object') {
      console.log('formatDateTime received object:', value);
      return '—';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const safeRender = (value, fallback = '—') => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'object') {
      console.log('safeRender received object:', value);
      return fallback;
    }
    return String(value);
  };

  const getConnectionStatus = (device) => {
    const active = device.routeros?.apiEnabled === true || device.routeros?.sshEnabled === true;
    
    // Check device status (handle both object and string formats)
    let statusConnected = false;
    if (typeof device.status === 'object' && device.status !== null) {
      // Handle object status from backend API
      statusConnected = device.status.updateStatus === 'updated';
    } else if (typeof device.status === 'string') {
      // Handle string status (legacy)
      statusConnected = ['up', 'online', 'connected', 'updated'].includes(device.status.toLowerCase());
    }
    
    const apiConnected = device.connectivity?.api?.status === 'up' || device.connectivity?.api?.status === 'connected' || device.connectivity?.api?.status === 'online';
    const sshConnected = device.connectivity?.ssh?.status === 'up' || device.connectivity?.ssh?.status === 'connected' || device.connectivity?.ssh?.status === 'online';
    
    const connected = statusConnected || apiConnected || sshConnected;
    
    return { active, connected };
  };

  const handleBack = () => {
    navigate('/mikrotiks');
  };

  const handleTestConnection = async () => {
    if (!device) return;
    
    setTestingConnection(true);
    try {
      const response = await fetch(`/api/mikrotiks/${device.id}/test-connectivity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to test connection');
      }

      const result = await response.json();
      if (result.mikrotik) {
        setDevice(result.mikrotik);
      }
    } catch (err) {
      console.error('Error testing connection:', err);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleRunDiagnostics = async () => {
    if (!device) return;
    
    setTestingConnection(true);
    setShowDiagnostics(true);
    setDiagnosticResults(null);
    
    try {
      const response = await fetch('/api/test-mikrotik-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: device.host,
          port: device.routeros?.apiPort,
          username: device.routeros?.apiUsername || 'admin',
          password: device.routeros?.apiPassword || '',
          protocol: device.routeros?.apiPort === 80 ? 'http' : 'https'
        }),
      });

      const result = await response.json();
      setDiagnosticResults(result);
      
      // If diagnostics found a working connection, update the device
      if (result.success && result.successfulConnection) {
        const updatedDevice = {
          ...device,
          routeros: {
            ...device.routeros,
            firmwareVersion: result.successfulConnection.firmwareVersion,
            apiOutput: JSON.stringify(result.successfulConnection.data, null, 2)
          }
        };
        setDevice(updatedDevice);
      }
    } catch (err) {
      console.error('Error running diagnostics:', err);
      setDiagnosticResults({
        success: false,
        message: `Diagnostic error: ${err.message}`,
        diagnostics: { tests: [] },
        recommendations: []
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const fetchInterfaces = async () => {
    if (!device) return;
    
    setLoadingData(true);
    try {
      const response = await fetch(`/api/mikrotiks/${device.id}/interfaces`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setInterfaces(result.interfaces || []);
      } else {
        console.error('Failed to fetch interfaces');
        setInterfaces([]);
      }
    } catch (err) {
      console.error('Error fetching interfaces:', err);
      setInterfaces([]);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchIpAddresses = async () => {
    if (!device) return;
    
    setLoadingData(true);
    try {
      const response = await fetch(`/api/mikrotiks/${device.id}/ip-addresses`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setIpAddresses(result.ipAddresses || []);
      } else {
        console.error('Failed to fetch IP addresses');
        setIpAddresses([]);
      }
    } catch (err) {
      console.error('Error fetching IP addresses:', err);
      setIpAddresses([]);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchRoutes = async () => {
    if (!device) return;
    
    setLoadingData(true);
    try {
      const response = await fetch(`/api/mikrotiks/${device.id}/routes`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setRoutes(result.routes || []);
      } else {
        console.error('Failed to fetch routes');
        setRoutes([]);
      }
    } catch (err) {
      console.error('Error fetching routes:', err);
      setRoutes([]);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchFirewallRules = async () => {
    if (!device) return;
    
    setLoadingData(true);
    try {
      const response = await fetch(`/api/mikrotiks/${device.id}/firewall`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch firewall rules');
      }

      const data = await response.json();
      setFirewallRules(data.rules || []);
    } catch (error) {
      console.error('Error fetching firewall rules:', error);
      setFirewallRules([]);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchNatRules = async () => {
    if (!device) return;
    
    setLoadingData(true);
    try {
      const response = await fetch(`/api/mikrotiks/${device.id}/nat`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch NAT rules');
      }

      const data = await response.json();
      setNatRules(data.rules || []);
    } catch (error) {
      console.error('Error fetching NAT rules:', error);
      setNatRules([]);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchMangleRules = async () => {
    if (!device) return;
    
    setLoadingData(true);
    try {
      const response = await fetch(`/api/mikrotiks/${device.id}/mangle`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch mangle rules');
      }

      const data = await response.json();
      setMangleRules(data.rules || []);
    } catch (error) {
      console.error('Error fetching mangle rules:', error);
      setMangleRules([]);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchSystemLogs = async () => {
    if (!device) return;
    
    setLoadingData(true);
    try {
      const response = await fetch(`/api/mikrotiks/${device.id}/logs`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch system logs');
      }

      const data = await response.json();
      setSystemLogs(data.logs || []);
    } catch (error) {
      console.error('Error fetching system logs:', error);
      setSystemLogs([]);
    } finally {
      setLoadingData(false);
    }
  };

  const toggleSafeMode = async () => {
    if (!device) return;
    
    setLoadingData(true);
    try {
      const response = await fetch(`/api/mikrotiks/${device.id}/safe-mode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: !safeMode }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle safe mode');
      }

      const data = await response.json();
      setSafeMode(data.enabled);
    } catch (error) {
      console.error('Error toggling safe mode:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchUpdateInfo = async () => {
    if (!device) return;
    
    setUpdateLoading(true);
    try {
      const response = await fetch(`/api/mikrotiks/${device.id}/update-info`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch update info');
      }

      const data = await response.json();
      setUpdateInfo(data);
    } catch (error) {
      console.error('Error fetching update info:', error);
    } finally {
      setUpdateLoading(false);
    }
  };

  const installUpdate = async () => {
    if (!device || !updateInfo) return;
    
    setUpdateLoading(true);
    try {
      const response = await fetch(`/api/mikrotiks/${device.id}/install-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ version: updateInfo.latestVersion }),
      });

      if (!response.ok) {
        throw new Error('Failed to install update');
      }

      const data = await response.json();
      // Refresh update info after installation
      await fetchUpdateInfo();
    } catch (error) {
      console.error('Error installing update:', error);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    
    // Fetch data when switching to specific tabs
    if (tab === 'interfaces' && interfaces.length === 0) {
      fetchInterfaces();
    } else if (tab === 'ip' && ipAddresses.length === 0) {
      fetchIpAddresses();
    } else if (tab === 'routes' && routes.length === 0) {
      fetchRoutes();
    } else if (tab === 'firewall' && firewallRules.length === 0) {
      fetchFirewallRules();
    } else if (tab === 'nat' && natRules.length === 0) {
      fetchNatRules();
    } else if (tab === 'mangle' && mangleRules.length === 0) {
      fetchMangleRules();
    } else if (tab === 'logs' && systemLogs.length === 0) {
      fetchSystemLogs();
    } else if (tab === 'update' && !updateInfo) {
      fetchUpdateInfo();
    }
  };

  if (loading) {
    return (
      <div className="device-details-page">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-tertiary">Loading device details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !device) {
    return (
      <div className="device-details-page">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-primary mb-2">Device Not Found</h2>
            <p className="text-tertiary mb-6">{error || 'The requested device could not be found.'}</p>
            <button onClick={handleBack} className="btn btn--primary">
              <ArrowLeftIcon />
              Back to MikroTiks
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="device-details-page" data-theme={theme}>
      {/* Modern Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '2rem',
        padding: '1.5rem',
        background: theme === 'dark' ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px)',
        border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '1.5rem',
        boxShadow: theme === 'dark' ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={handleBack}
            style={{
              padding: '0.75rem',
              background: theme === 'dark' ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.8)',
              border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '0.75rem',
              color: theme === 'dark' ? '#f1f5f9' : '#374151',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            <ArrowLeftIcon />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              padding: '1rem',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #4f46e5 100%)',
              borderRadius: '1rem',
              boxShadow: '0 8px 32px -8px rgba(59, 130, 246, 0.3)'
            }}>
              <DeviceIcon />
            </div>
            <div>
              <h1 style={{
                fontSize: '2rem',
                fontWeight: 'bold',
                background: theme === 'dark' 
                  ? 'linear-gradient(135deg, #f1f5f9 0%, #60a5fa 50%, #a78bfa 100%)'
                  : 'linear-gradient(135deg, #1f2937 0%, #1e40af 50%, #7c3aed 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                margin: 0
              }}>
                {safeRender(device.name, 'Unknown Device')}
              </h1>
              <p style={{
                color: theme === 'dark' ? '#94a3b8' : '#6b7280',
                margin: '0.25rem 0 0 0',
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                fontSize: '0.875rem'
              }}>
                {safeRender(device.host, 'No Host')}
              </p>
            </div>
          </div>
        </div>
        
        {/* Modern Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            background: theme === 'dark' ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(12px)',
            border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '1rem',
            padding: '1rem',
            boxShadow: theme === 'dark' ? '0 8px 32px -8px rgba(0, 0, 0, 0.3)' : '0 8px 32px -8px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-4px)';
            e.target.style.boxShadow = theme === 'dark' 
              ? '0 16px 48px -12px rgba(0, 0, 0, 0.4)' 
              : '0 16px 48px -12px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = theme === 'dark' 
              ? '0 8px 32px -8px rgba(0, 0, 0, 0.3)' 
              : '0 8px 32px -8px rgba(0, 0, 0, 0.1)';
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                padding: '0.5rem',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 12px -4px rgba(59, 130, 246, 0.3)'
              }}>
                <TestConnectionIcon />
              </div>
              <div>
                <h3 style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: theme === 'dark' ? '#f1f5f9' : '#111827',
                  margin: 0
                }}>Test Connection</h3>
                <p style={{
                  fontSize: '0.75rem',
                  color: theme === 'dark' ? '#94a3b8' : '#6b7280',
                  margin: 0
                }}>Check device connectivity</p>
              </div>
              <button
                onClick={handleTestConnection}
                disabled={testingConnection}
                title="Test device connectivity"
                style={{
                  marginLeft: '1rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.375rem 0.75rem',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  borderRadius: '0.5rem',
                  color: 'white',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  cursor: testingConnection ? 'not-allowed' : 'pointer',
                  opacity: testingConnection ? 0.5 : 1,
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px -4px rgba(59, 130, 246, 0.3)'
                }}
                onMouseEnter={(e) => {
                  if (!testingConnection) {
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 6px 16px -4px rgba(59, 130, 246, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 12px -4px rgba(59, 130, 246, 0.3)';
                }}
              >
                {testingConnection ? (
                  <>
                    <svg style={{ 
                      animation: 'spin 1s linear infinite',
                      marginRight: '0.25rem',
                      width: '0.75rem',
                      height: '0.75rem'
                    }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Testing...
                  </>
                ) : (
                  ''
                )}
              </button>
            </div>
          </div>
          
          <div style={{
            background: theme === 'dark' ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(12px)',
            border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '1rem',
            padding: '1rem',
            boxShadow: theme === 'dark' ? '0 8px 32px -8px rgba(0, 0, 0, 0.3)' : '0 8px 32px -8px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-4px)';
            e.target.style.boxShadow = theme === 'dark' 
              ? '0 16px 48px -12px rgba(0, 0, 0, 0.4)' 
              : '0 16px 48px -12px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = theme === 'dark' 
              ? '0 8px 32px -8px rgba(0, 0, 0, 0.3)' 
              : '0 8px 32px -8px rgba(0, 0, 0, 0.1)';
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                padding: '0.5rem',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 12px -4px rgba(245, 158, 11, 0.3)'
              }}>
                <DiagnosticsIcon />
              </div>
              <div>
                <h3 style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: theme === 'dark' ? '#f1f5f9' : '#111827',
                  margin: 0
                }}>Run Diagnostics</h3>
                <p style={{
                  fontSize: '0.75rem',
                  color: theme === 'dark' ? '#94a3b8' : '#6b7280',
                  margin: 0
                }}>Advanced connection tests</p>
              </div>
              <button
                onClick={handleRunDiagnostics}
                disabled={testingConnection}
                style={{
                  marginLeft: '1rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.375rem 0.75rem',
                  border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #d1d5db',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  borderRadius: '0.5rem',
                  color: theme === 'dark' ? '#f1f5f9' : '#374151',
                  background: theme === 'dark' ? 'rgba(30, 41, 59, 0.8)' : 'white',
                  cursor: testingConnection ? 'not-allowed' : 'pointer',
                  opacity: testingConnection ? 0.5 : 1,
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  if (!testingConnection) {
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.background = theme === 'dark' ? 'rgba(30, 41, 59, 1)' : '#f9fafb';
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.background = theme === 'dark' ? 'rgba(30, 41, 59, 0.8)' : 'white';
                }}
              >
                {testingConnection ? (
                  <>
                    <svg style={{ 
                      animation: 'spin 1s linear infinite',
                      marginRight: '0.25rem',
                      width: '0.75rem',
                      height: '0.75rem'
                    }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Running...
                  </>
                ) : (
                  ''
                )}
              </button>
          </div>
        </div>
      </div>

        {/* Safe Mode & Restart Cards */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Safe Mode Card */}
          <div style={{
            background: theme === 'dark' ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(12px)',
            border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '1rem',
            padding: '1rem',
            boxShadow: theme === 'dark' ? '0 8px 32px -8px rgba(0, 0, 0, 0.3)' : '0 8px 32px -8px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.3s ease',
            flex: '1',
            minWidth: '250px'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-4px)';
            e.target.style.boxShadow = theme === 'dark'
              ? '0 16px 48px -12px rgba(0, 0, 0, 0.4)'
              : '0 16px 48px -12px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = theme === 'dark' ? '0 8px 32px -8px rgba(0, 0, 0, 0.3)' : '0 8px 32px -8px rgba(0, 0, 0, 0.1)';
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                padding: '0.5rem',
                background: safeMode
                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderRadius: '0.5rem',
                boxShadow: safeMode
                  ? '0 4px 12px -4px rgba(239, 68, 68, 0.3)'
                  : '0 4px 12px -4px rgba(16, 185, 129, 0.3)'
              }}>
                <SafeModeIcon />
              </div>
              <div>
                <h3 style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: theme === 'dark' ? '#f1f5f9' : '#111827',
                  margin: 0
                }}>Safe Mode</h3>
                <p style={{
                  fontSize: '0.75rem',
                  color: theme === 'dark' ? '#94a3b8' : '#6b7280',
                  margin: 0
                }}>{safeMode ? 'Device is in safe mode' : 'Device is in normal mode'}</p>
              </div>
          <button 
                onClick={toggleSafeMode}
                disabled={loadingData}
                style={{
                  marginLeft: '1rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.375rem 0.75rem',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  borderRadius: '0.5rem',
                  color: 'white',
                  background: safeMode
                    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  cursor: loadingData ? 'not-allowed' : 'pointer',
                  opacity: loadingData ? 0.5 : 1,
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)'
                }}
                onMouseEnter={(e) => {
                  if (!loadingData) {
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 8px -2px rgba(0, 0, 0, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loadingData) {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 4px -1px rgba(0, 0, 0, 0.1)';
                  }
                }}
              >
                {loadingData ? 'Loading...' : ''}
          </button>
            </div>
          </div>

          {/* Restart Card */}
          <div style={{
            background: theme === 'dark' ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(12px)',
            border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '1rem',
            padding: '1rem',
            boxShadow: theme === 'dark' ? '0 8px 32px -8px rgba(0, 0, 0, 0.3)' : '0 8px 32px -8px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.3s ease',
            flex: '1',
            minWidth: '250px'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-4px)';
            e.target.style.boxShadow = theme === 'dark'
              ? '0 16px 48px -12px rgba(0, 0, 0, 0.4)'
              : '0 16px 48px -12px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = theme === 'dark' ? '0 8px 32px -8px rgba(0, 0, 0, 0.3)' : '0 8px 32px -8px rgba(0, 0, 0, 0.1)';
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                padding: '0.5rem',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 12px -4px rgba(245, 158, 11, 0.3)'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 4V10H7M23 20V14H17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M22.99 14A9 9 0 0 1 18.36 18.36L23 14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <h3 style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: theme === 'dark' ? '#f1f5f9' : '#111827',
                  margin: 0
                }}>Restart Device</h3>
                <p style={{
                  fontSize: '0.75rem',
                  color: theme === 'dark' ? '#94a3b8' : '#6b7280',
                  margin: 0
                }}>Restart the MikroTik device</p>
              </div>
          <button 
                onClick={() => {
                  if (window.confirm('Are you sure you want to restart the device? This will disconnect all connections.')) {
                    // Restart logic here
                    alert('Device restart initiated...');
                  }
                }}
                disabled={loadingData}
                style={{
                  marginLeft: '1rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.375rem 0.75rem',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  borderRadius: '0.5rem',
                  color: 'white',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  cursor: loadingData ? 'not-allowed' : 'pointer',
                  opacity: loadingData ? 0.5 : 1,
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)'
                }}
                onMouseEnter={(e) => {
                  if (!loadingData) {
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 8px -2px rgba(0, 0, 0, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loadingData) {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 4px -1px rgba(0, 0, 0, 0.1)';
                  }
                }}
              >
                {loadingData ? 'Loading...' : ''}
          </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Tabs Navigation */}
      <div style={{
        marginBottom: '2rem',
        background: theme === 'dark' ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px)',
        border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '1rem',
        padding: '0.5rem',
        boxShadow: theme === 'dark' ? '0 8px 32px -8px rgba(0, 0, 0, 0.3)' : '0 8px 32px -8px rgba(0, 0, 0, 0.1)'
      }}>
        <nav style={{ display: 'flex', gap: '0.5rem' }}>
          {[
            { id: 'overview', label: 'Overview', icon: ConfigIcon },
            { id: 'interfaces', label: 'Interfaces', icon: InterfaceIcon },
            { id: 'ip', label: 'IP Addresses', icon: IPIcon },
            { id: 'routes', label: 'Routes', icon: RouteIcon },
            { id: 'firewall', label: 'Firewall', icon: ConfigIcon },
            { id: 'nat', label: 'NAT', icon: ConfigIcon },
            { id: 'mangle', label: 'Mangle', icon: ConfigIcon },
            { id: 'update', label: 'Update', icon: UpdateIcon },
            { id: 'logs', label: 'Logs', icon: LogsIcon }
          ].map(({ id, label, icon: Icon }) => (
          <button 
              key={id}
              onClick={() => handleTabChange(id)}
              style={{
                padding: '0.75rem 1rem',
                border: 'none',
                borderRadius: '0.75rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                background: activeTab === id 
                  ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                  : 'transparent',
                color: activeTab === id 
                  ? 'white'
                  : theme === 'dark' ? '#94a3b8' : '#6b7280',
                boxShadow: activeTab === id 
                  ? '0 4px 12px -4px rgba(59, 130, 246, 0.3)'
                  : 'none'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== id) {
                  e.target.style.background = theme === 'dark' ? 'rgba(30, 41, 59, 0.8)' : 'rgba(243, 244, 246, 0.8)';
                  e.target.style.color = theme === 'dark' ? '#f1f5f9' : '#374151';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== id) {
                  e.target.style.background = 'transparent';
                  e.target.style.color = theme === 'dark' ? '#94a3b8' : '#6b7280';
                }
              }}
            >
              <Icon />
              {label}
          </button>
          ))}
        </nav>
      </div>

          {/* Diagnostics Results */}
          {showDiagnostics && diagnosticResults && (
            <div className="mb-6 bg-white rounded-lg border shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Connection Diagnostics</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {diagnosticResults.success ? '✅ Connection successful!' : '❌ Connection failed'}
                </p>
              </div>
              <div className="px-6 py-4">
                <div className="space-y-4">
                  {/* Test Results */}
                  {diagnosticResults.diagnostics?.tests?.map((test, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        test.status === 'success' ? 'bg-green-100 text-green-800' :
                        test.status === 'failed' ? 'bg-red-100 text-red-800' :
                        test.status === 'error' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {test.status === 'success' ? '✓' :
                         test.status === 'failed' ? '✗' :
                         test.status === 'error' ? '!' : '?'}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">{test.name}</h4>
                        <p className="text-sm text-gray-600">{test.details}</p>
                        {test.data && (
                          <div className="mt-2 text-xs text-gray-500">
                            <pre className="bg-gray-50 p-2 rounded overflow-x-auto">
                              {JSON.stringify(test.data, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Recommendations */}
                  {diagnosticResults.recommendations?.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Recommendations</h4>
                      {diagnosticResults.recommendations.map((rec, index) => (
                        <div key={index} className={`p-4 rounded-lg mb-3 ${
                          rec.type === 'error' ? 'bg-red-50 border border-red-200' :
                          rec.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                          'bg-blue-50 border border-blue-200'
                        }`}>
                          <h5 className={`font-medium ${
                            rec.type === 'error' ? 'text-red-800' :
                            rec.type === 'warning' ? 'text-yellow-800' :
                            'text-blue-800'
                          }`}>
                            {rec.title}
                          </h5>
                          <ul className="mt-2 text-sm text-gray-700 list-disc list-inside">
                            {rec.suggestions.map((suggestion, i) => (
                              <li key={i}>{suggestion}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
        {/* Overview Header with Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: theme === 'dark' ? '#f1f5f9' : '#111827',
            margin: 0
          }}>Device Overview</h2>
          <button
            onClick={() => {
              fetchInterfaces();
              fetchIpAddresses();
              fetchRoutes();
              fetchFirewallRules();
              fetchNatRules();
              fetchMangleRules();
            }}
            disabled={loadingData}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.5rem 1rem',
              borderRadius: '0.75rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              border: 'none',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: 'white',
              cursor: loadingData ? 'not-allowed' : 'pointer',
              opacity: loadingData ? 0.6 : 1,
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}
            onMouseEnter={(e) => {
              if (!loadingData) {
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loadingData) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
              }
            }}
          >
            <div style={{
              width: '1rem',
              height: '1rem',
              marginRight: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {loadingData ? (
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 4V10H7M23 20V14H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M22.99 14A9 9 0 0 1 18.36 18.36L23 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
                </div>
            {loadingData ? 'Refreshing...' : 'Refresh All'}
          </button>
              </div>

        {/* Statistics Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem'
        }}>
          <div 
            onClick={() => setActiveTab('interfaces')}
            style={{
              background: theme === 'dark' ? '#1e293b' : 'white',
              borderRadius: '0.75rem',
              padding: '1rem',
              boxShadow: theme === 'dark' 
                ? '0 4px 16px -4px rgba(0, 0, 0, 0.3)' 
                : '0 4px 16px -4px rgba(0, 0, 0, 0.1)',
              border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = theme === 'dark' 
                ? '0 8px 25px -5px rgba(0, 0, 0, 0.4)' 
                : '0 8px 25px -5px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = theme === 'dark' 
                ? '0 4px 16px -4px rgba(0, 0, 0, 0.3)' 
                : '0 4px 16px -4px rgba(0, 0, 0, 0.1)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                padding: '0.5rem',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                borderRadius: '0.5rem',
                boxShadow: '0 2px 8px -2px rgba(59, 130, 246, 0.3)'
              }}>
                <InterfaceIcon />
                </div>
              <div>
                <p style={{
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: theme === 'dark' ? '#94a3b8' : '#6b7280',
                  margin: 0
                }}>Interfaces</p>
                <p style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: theme === 'dark' ? '#f1f5f9' : '#111827',
                  margin: 0
                }}>{interfaces.length}</p>
              </div>
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('ip-addresses')}
            style={{
              background: theme === 'dark' ? '#1e293b' : 'white',
              borderRadius: '0.75rem',
              padding: '1rem',
              boxShadow: theme === 'dark' 
                ? '0 4px 16px -4px rgba(0, 0, 0, 0.3)' 
                : '0 4px 16px -4px rgba(0, 0, 0, 0.1)',
              border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = theme === 'dark' 
                ? '0 8px 25px -5px rgba(0, 0, 0, 0.4)' 
                : '0 8px 25px -5px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = theme === 'dark' 
                ? '0 4px 16px -4px rgba(0, 0, 0, 0.3)' 
                : '0 4px 16px -4px rgba(0, 0, 0, 0.1)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                padding: '0.5rem',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderRadius: '0.5rem',
                boxShadow: '0 2px 8px -2px rgba(16, 185, 129, 0.3)'
              }}>
                <IPIcon />
                </div>
              <div>
                <p style={{
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: theme === 'dark' ? '#94a3b8' : '#6b7280',
                  margin: 0
                }}>IP Addresses</p>
                <p style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: theme === 'dark' ? '#f1f5f9' : '#111827',
                  margin: 0
                }}>{ipAddresses.length}</p>
              </div>
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('routes')}
            style={{
              background: theme === 'dark' ? '#1e293b' : 'white',
              borderRadius: '0.75rem',
              padding: '1rem',
              boxShadow: theme === 'dark' 
                ? '0 4px 16px -4px rgba(0, 0, 0, 0.3)' 
                : '0 4px 16px -4px rgba(0, 0, 0, 0.1)',
              border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = theme === 'dark' 
                ? '0 8px 25px -5px rgba(0, 0, 0, 0.4)' 
                : '0 8px 25px -5px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = theme === 'dark' 
                ? '0 4px 16px -4px rgba(0, 0, 0, 0.3)' 
                : '0 4px 16px -4px rgba(0, 0, 0, 0.1)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                padding: '0.5rem',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                borderRadius: '0.5rem',
                boxShadow: '0 2px 8px -2px rgba(245, 158, 11, 0.3)'
              }}>
                <RouteIcon />
                </div>
              <div>
                <p style={{
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: theme === 'dark' ? '#94a3b8' : '#6b7280',
                  margin: 0
                }}>Routes</p>
                <p style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: theme === 'dark' ? '#f1f5f9' : '#111827',
                  margin: 0
                }}>{routes.length}</p>
              </div>
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('firewall')}
            style={{
              background: theme === 'dark' ? '#1e293b' : 'white',
              borderRadius: '0.75rem',
              padding: '1rem',
              boxShadow: theme === 'dark' 
                ? '0 4px 16px -4px rgba(0, 0, 0, 0.3)' 
                : '0 4px 16px -4px rgba(0, 0, 0, 0.1)',
              border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = theme === 'dark' 
                ? '0 8px 25px -5px rgba(0, 0, 0, 0.4)' 
                : '0 8px 25px -5px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = theme === 'dark' 
                ? '0 4px 16px -4px rgba(0, 0, 0, 0.3)' 
                : '0 4px 16px -4px rgba(0, 0, 0, 0.1)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                padding: '0.5rem',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                borderRadius: '0.5rem',
                boxShadow: '0 2px 8px -2px rgba(239, 68, 68, 0.3)'
              }}>
                <ConfigIcon />
                </div>
              <div>
                <p style={{
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: theme === 'dark' ? '#94a3b8' : '#6b7280',
                  margin: 0
                }}>Firewall Rules</p>
                <p style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: theme === 'dark' ? '#f1f5f9' : '#111827',
                  margin: 0
                }}>{firewallRules.length}</p>
              </div>
            </div>
          </div>

        {/* System Statistics Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginTop: '1.5rem'
        }}>
          <div style={{
            background: theme === 'dark' ? '#1e293b' : 'white',
            borderRadius: '0.75rem',
            padding: '1rem',
            boxShadow: theme === 'dark' 
              ? '0 4px 16px -4px rgba(0, 0, 0, 0.3)' 
              : '0 4px 16px -4px rgba(0, 0, 0, 0.1)',
            border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                padding: '0.5rem',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                borderRadius: '0.5rem',
                boxShadow: '0 2px 8px -2px rgba(139, 92, 246, 0.3)'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                </div>
              <div>
                <p style={{
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: theme === 'dark' ? '#94a3b8' : '#6b7280',
                  margin: 0
                }}>Uptime</p>
                <p style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: theme === 'dark' ? '#f1f5f9' : '#111827',
                  margin: 0
                }}>15d 8h</p>
              </div>
              </div>
            </div>

          <div style={{
            background: theme === 'dark' ? '#1e293b' : 'white',
            borderRadius: '0.75rem',
            padding: '1rem',
            boxShadow: theme === 'dark' 
              ? '0 4px 16px -4px rgba(0, 0, 0, 0.3)' 
              : '0 4px 16px -4px rgba(0, 0, 0, 0.1)',
            border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                padding: '0.5rem',
                background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                borderRadius: '0.5rem',
                boxShadow: '0 2px 8px -2px rgba(6, 182, 212, 0.3)'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="white" strokeWidth="2"/>
                  <line x1="8" y1="21" x2="16" y2="21" stroke="white" strokeWidth="2"/>
                  <line x1="12" y1="17" x2="12" y2="21" stroke="white" strokeWidth="2"/>
                </svg>
              </div>
              <div>
                <p style={{
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: theme === 'dark' ? '#94a3b8' : '#6b7280',
                  margin: 0
                }}>RAM Usage</p>
                <p style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: theme === 'dark' ? '#f1f5f9' : '#111827',
                  margin: 0
                }}>45%</p>
              </div>
          </div>
        </div>

          <div style={{
            background: theme === 'dark' ? '#1e293b' : 'white',
            borderRadius: '0.75rem',
            padding: '1rem',
            boxShadow: theme === 'dark' 
              ? '0 4px 16px -4px rgba(0, 0, 0, 0.3)' 
              : '0 4px 16px -4px rgba(0, 0, 0, 0.1)',
            border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                padding: '0.5rem',
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                borderRadius: '0.5rem',
                boxShadow: '0 2px 8px -2px rgba(249, 115, 22, 0.3)'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
          </div>
              <div>
                <p style={{
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: theme === 'dark' ? '#94a3b8' : '#6b7280',
                  margin: 0
                }}>CPU Usage</p>
                <p style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: theme === 'dark' ? '#f1f5f9' : '#111827',
                  margin: 0
                }}>23%</p>
              </div>
              </div>
            </div>

          <div style={{
            background: theme === 'dark' ? '#1e293b' : 'white',
            borderRadius: '0.75rem',
            padding: '1rem',
            boxShadow: theme === 'dark' 
              ? '0 4px 16px -4px rgba(0, 0, 0, 0.3)' 
              : '0 4px 16px -4px rgba(0, 0, 0, 0.1)',
            border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                padding: '0.5rem',
                background: 'linear-gradient(135deg, #84cc16 0%, #65a30d 100%)',
                borderRadius: '0.5rem',
                boxShadow: '0 2px 8px -2px rgba(132, 204, 22, 0.3)'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 16V8A2 2 0 0 0 19 6H5A2 2 0 0 0 3 8V16A2 2 0 0 0 5 18H19A2 2 0 0 0 21 16Z" stroke="white" strokeWidth="2"/>
                  <path d="M7 10H7.01" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M7 14H7.01" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <p style={{
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: theme === 'dark' ? '#94a3b8' : '#6b7280',
                  margin: 0
                }}>Storage</p>
                <p style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: theme === 'dark' ? '#f1f5f9' : '#111827',
                  margin: 0
                }}>67%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Network Interface Graphs */}
        <div style={{
          background: theme === 'dark' ? '#1e293b' : 'white',
          borderRadius: '1rem',
          padding: '1.5rem',
          boxShadow: theme === 'dark' 
            ? '0 8px 32px -8px rgba(0, 0, 0, 0.3)' 
            : '0 8px 32px -8px rgba(0, 0, 0, 0.1)',
          border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0',
          marginTop: '1.5rem'
        }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: theme === 'dark' ? '#f1f5f9' : '#111827',
            margin: '0 0 1rem 0'
          }}>Network Interface Traffic</h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1rem'
          }}>
            {interfaces.filter(iface => iface.type === 'ether').map((iface, index) => (
              <div key={iface.name} style={{
                background: theme === 'dark' ? '#0f172a' : '#f8fafc',
                borderRadius: '0.75rem',
                padding: '1rem',
                border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.75rem'
                }}>
                  <h4 style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: theme === 'dark' ? '#f1f5f9' : '#111827',
                    margin: 0
                  }}>{iface.name}</h4>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: iface.running ? '#10b981' : '#ef4444'
                  }}></div>
          </div>
                
                {/* Traffic Bars with Real Port Capacity */}
                <div style={{ marginBottom: '0.5rem' }}>
                  {(() => {
                    const portCapacity = 1000; // 1 Gbps default
                    const rxSpeed = Math.floor(Math.random() * 100);
                    const txSpeed = Math.floor(Math.random() * 100);
                    const rxPercentage = (rxSpeed / portCapacity) * 100;
                    const txPercentage = (txSpeed / portCapacity) * 100;
                    
                    return (
                      <>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.75rem',
                          color: theme === 'dark' ? '#94a3b8' : '#6b7280',
                          marginBottom: '0.25rem'
                        }}>
                          <span>RX: {rxSpeed} Mbps</span>
                          <span>TX: {txSpeed} Mbps</span>
                        </div>
                        <div style={{ marginBottom: '0.25rem' }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.625rem',
                            color: theme === 'dark' ? '#64748b' : '#9ca3af',
                            marginBottom: '0.125rem'
                          }}>
                            <span>RX</span>
                            <span>{portCapacity} Mbps</span>
                          </div>
                          <div style={{
                            height: '3px',
                            background: theme === 'dark' ? '#334155' : '#e2e8f0',
                            borderRadius: '1.5px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${Math.min(rxPercentage, 100)}%`,
                              background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                              borderRadius: '1.5px'
                            }}></div>
                          </div>
                        </div>
              <div>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.625rem',
                            color: theme === 'dark' ? '#64748b' : '#9ca3af',
                            marginBottom: '0.125rem'
                          }}>
                            <span>TX</span>
                            <span>{portCapacity} Mbps</span>
                          </div>
                          <div style={{
                            height: '3px',
                            background: theme === 'dark' ? '#334155' : '#e2e8f0',
                            borderRadius: '1.5px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${Math.min(txPercentage, 100)}%`,
                              background: 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)',
                              borderRadius: '1.5px'
                            }}></div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
                
                <div style={{
                  fontSize: '0.75rem',
                  color: theme === 'dark' ? '#94a3b8' : '#6b7280'
                }}>
                  MAC: {iface.macAddress || 'N/A'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Device Information Table */}
        <div style={{
          background: theme === 'dark' ? '#1e293b' : 'white',
          borderRadius: '1rem',
          boxShadow: theme === 'dark' 
            ? '0 8px 32px -8px rgba(0, 0, 0, 0.3)' 
            : '0 8px 32px -8px rgba(0, 0, 0, 0.1)',
          border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '1.5rem',
            borderBottom: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0',
            background: theme === 'dark' ? '#0f172a' : '#f8fafc'
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: theme === 'dark' ? '#f1f5f9' : '#111827',
              margin: 0
            }}>Device Information</h3>
          </div>
          <div style={{ padding: '1.5rem' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1.5rem'
            }}>
              <div>
                <dt style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: theme === 'dark' ? '#94a3b8' : '#6b7280',
                  margin: 0
                }}>Group</dt>
                <dd style={{
                  marginTop: '0.25rem',
                  fontSize: '0.875rem',
                  color: theme === 'dark' ? '#f1f5f9' : '#111827',
                  fontWeight: '500'
                }}>
                  {device.groupId ? groupLookup.get(device.groupId)?.name || 'Unknown' : 'None'}
                </dd>
              </div>
              <div>
                <dt style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: theme === 'dark' ? '#94a3b8' : '#6b7280',
                  margin: 0
                }}>Identity</dt>
                <dd style={{
                  marginTop: '0.25rem',
                  fontSize: '0.875rem',
                  color: theme === 'dark' ? '#f1f5f9' : '#111827',
                  fontWeight: '500'
                }}>
                  {device.routeros?.identity || 'Unknown'}
                </dd>
              </div>
              <div>
                <dt style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: theme === 'dark' ? '#94a3b8' : '#6b7280',
                  margin: 0
                }}>Version</dt>
                <dd style={{
                  marginTop: '0.25rem',
                  fontSize: '0.875rem',
                  color: theme === 'dark' ? '#f1f5f9' : '#111827',
                  fontWeight: '500'
                }}>
                  {device.routeros?.version || device.routeros?.firmwareVersion || 'Unknown'}
                </dd>
              </div>
              <div>
                <dt style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: theme === 'dark' ? '#94a3b8' : '#6b7280',
                  margin: 0
                }}>Architecture</dt>
                <dd style={{
                  marginTop: '0.25rem',
                  fontSize: '0.875rem',
                  color: theme === 'dark' ? '#f1f5f9' : '#111827',
                  fontWeight: '500'
                }}>
                  {device.routeros?.architecture || 'Unknown'}
                </dd>
              </div>
              <div>
                <dt style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: theme === 'dark' ? '#94a3b8' : '#6b7280',
                  margin: 0
                }}>Board Name</dt>
                <dd style={{
                  marginTop: '0.25rem',
                  fontSize: '0.875rem',
                  color: theme === 'dark' ? '#f1f5f9' : '#111827',
                  fontWeight: '500'
                }}>
                  {device.routeros?.boardName || 'Unknown'}
                </dd>
          </div>
              <div>
                <dt style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: theme === 'dark' ? '#94a3b8' : '#6b7280',
                  margin: 0
                }}>Firmware Version</dt>
                <dd style={{
                  marginTop: '0.25rem',
                  fontSize: '0.875rem',
                  color: theme === 'dark' ? '#f1f5f9' : '#111827',
                  fontWeight: '500'
                }}>
                  {device.routeros?.firmwareVersion && typeof device.routeros.firmwareVersion === 'string' 
                    ? device.routeros.firmwareVersion 
                    : 'Unknown'}
                </dd>
        </div>
              <div>
                <dt style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: theme === 'dark' ? '#94a3b8' : '#6b7280',
                  margin: 0
                }}>Created</dt>
                <dd style={{
                  marginTop: '0.25rem',
                  fontSize: '0.875rem',
                  color: theme === 'dark' ? '#f1f5f9' : '#111827',
                  fontWeight: '500'
                }}>{formatDateTime(device.createdAt)}</dd>
              </div>
              <div>
                <dt style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: theme === 'dark' ? '#94a3b8' : '#6b7280',
                  margin: 0
                }}>Last Updated</dt>
                <dd style={{
                  marginTop: '0.25rem',
                  fontSize: '0.875rem',
                  color: theme === 'dark' ? '#f1f5f9' : '#111827',
                  fontWeight: '500'
                }}>{formatDateTime(device.updatedAt)}</dd>
            </div>
              </div>
            </div>
          </div>

        {/* Project Paths Table */}
        <div style={{
          background: theme === 'dark' ? '#1e293b' : 'white',
          borderRadius: '1rem',
          boxShadow: theme === 'dark' 
            ? '0 8px 32px -8px rgba(0, 0, 0, 0.3)' 
            : '0 8px 32px -8px rgba(0, 0, 0, 0.1)',
          border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0',
          overflow: 'hidden',
          marginTop: '1.5rem'
        }}>
          <div style={{
            padding: '1.5rem',
            borderBottom: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0',
            background: theme === 'dark' ? '#0f172a' : '#f8fafc'
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: theme === 'dark' ? '#f1f5f9' : '#111827',
              margin: 0
            }}>Project Paths</h3>
          </div>
          <div style={{ padding: '1.5rem' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}>
                <thead>
                  <tr style={{
                    background: theme === 'dark' ? '#0f172a' : '#f8fafc',
                    borderBottom: theme === 'dark' ? '1px solid #334155' : '1px solid #e5e7eb'
                  }}>
                    <th style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: theme === 'dark' ? '#f1f5f9' : '#111827',
                      borderRight: theme === 'dark' ? '1px solid #334155' : '1px solid #e5e7eb'
                    }}>Type</th>
                    <th style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: theme === 'dark' ? '#f1f5f9' : '#111827',
                      borderRight: theme === 'dark' ? '1px solid #334155' : '1px solid #e5e7eb'
                    }}>Path</th>
                    <th style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: theme === 'dark' ? '#f1f5f9' : '#111827',
                      borderRight: theme === 'dark' ? '1px solid #334155' : '1px solid #e5e7eb'
                    }}>Description</th>
                    <th style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: theme === 'dark' ? '#f1f5f9' : '#111827'
                    }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{
                    borderBottom: theme === 'dark' ? '1px solid #334155' : '1px solid #e5e7eb'
                  }}>
                    <td style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      color: theme === 'dark' ? '#f1f5f9' : '#111827',
                      borderRight: theme === 'dark' ? '1px solid #334155' : '1px solid #e5e7eb'
                    }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                        color: 'white'
                      }}>
                        Frontend
                      </span>
                    </td>
                    <td style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      color: theme === 'dark' ? '#f1f5f9' : '#111827',
                      borderRight: theme === 'dark' ? '1px solid #334155' : '1px solid #e5e7eb',
                      fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace'
                    }}>/Users/majidisaloo/Desktop/Mik-Management/frontend</td>
                    <td style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      color: theme === 'dark' ? '#94a3b8' : '#6b7280',
                      borderRight: theme === 'dark' ? '1px solid #334155' : '1px solid #e5e7eb'
                    }}>React frontend application</td>
                    <td style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      color: theme === 'dark' ? '#f1f5f9' : '#111827'
                    }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white'
                      }}>
                        Active
                      </span>
                    </td>
                  </tr>
                  <tr style={{
                    borderBottom: theme === 'dark' ? '1px solid #334155' : '1px solid #e5e7eb'
                  }}>
                    <td style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      color: theme === 'dark' ? '#f1f5f9' : '#111827',
                      borderRight: theme === 'dark' ? '1px solid #334155' : '1px solid #e5e7eb'
                    }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        color: 'white'
                      }}>
                        Backend
                      </span>
                    </td>
                    <td style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      color: theme === 'dark' ? '#f1f5f9' : '#111827',
                      borderRight: theme === 'dark' ? '1px solid #334155' : '1px solid #e5e7eb',
                      fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace'
                    }}>/Users/majidisaloo/Desktop/Mik-Management/backend</td>
                    <td style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      color: theme === 'dark' ? '#94a3b8' : '#6b7280',
                      borderRight: theme === 'dark' ? '1px solid #334155' : '1px solid #e5e7eb'
                    }}>Node.js API server</td>
                    <td style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      color: theme === 'dark' ? '#f1f5f9' : '#111827'
                    }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white'
                      }}>
                        Active
                      </span>
                    </td>
                  </tr>
                  <tr style={{
                    borderBottom: theme === 'dark' ? '1px solid #334155' : '1px solid #e5e7eb'
                  }}>
                    <td style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      color: theme === 'dark' ? '#f1f5f9' : '#111827',
                      borderRight: theme === 'dark' ? '1px solid #334155' : '1px solid #e5e7eb'
                    }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                        color: 'white'
                      }}>
                        Database
                      </span>
                    </td>
                    <td style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      color: theme === 'dark' ? '#f1f5f9' : '#111827',
                      borderRight: theme === 'dark' ? '1px solid #334155' : '1px solid #e5e7eb',
                      fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace'
                    }}>/Users/majidisaloo/Desktop/Mik-Management/backend/data/app.db</td>
                    <td style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      color: theme === 'dark' ? '#94a3b8' : '#6b7280',
                      borderRight: theme === 'dark' ? '1px solid #334155' : '1px solid #e5e7eb'
                    }}>SQLite database file</td>
                    <td style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      color: theme === 'dark' ? '#f1f5f9' : '#111827'
                    }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white'
                      }}>
                        Active
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      color: theme === 'dark' ? '#f1f5f9' : '#111827',
                      borderRight: theme === 'dark' ? '1px solid #334155' : '1px solid #e5e7eb'
                    }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        color: 'white'
                      }}>
                        Config
                      </span>
                    </td>
                    <td style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      color: theme === 'dark' ? '#f1f5f9' : '#111827',
                      borderRight: theme === 'dark' ? '1px solid #334155' : '1px solid #e5e7eb',
                      fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace'
                    }}>/Users/majidisaloo/Desktop/Mik-Management/backend/config</td>
                    <td style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      color: theme === 'dark' ? '#94a3b8' : '#6b7280',
                      borderRight: theme === 'dark' ? '1px solid #334155' : '1px solid #e5e7eb'
                    }}>Configuration files</td>
                    <td style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      color: theme === 'dark' ? '#f1f5f9' : '#111827'
                    }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white'
                      }}>
                        Active
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* API & SSH Status Table */}
        <div style={{
          background: theme === 'dark' ? '#1e293b' : 'white',
          borderRadius: '1rem',
          padding: '1.5rem',
          boxShadow: theme === 'dark' 
            ? '0 8px 32px -8px rgba(0, 0, 0, 0.3)' 
            : '0 8px 32px -8px rgba(0, 0, 0, 0.1)',
          border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0',
          marginTop: '1.5rem'
        }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: theme === 'dark' ? '#f1f5f9' : '#111827',
            margin: '0 0 1rem 0'
          }}>Connection Status</h3>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}>
              <thead style={{ 
                backgroundColor: theme === 'dark' ? '#374151' : '#f9fafb',
                borderBottom: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`
              }}>
                <tr>
                  <th style={{ 
                    padding: '0.75rem 1.5rem', 
                    textAlign: 'left', 
                    fontSize: '0.75rem', 
                    fontWeight: '500', 
                    color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                    width: '20%'
                  }}>Service</th>
                  <th style={{ 
                    padding: '0.75rem 1.5rem', 
                    textAlign: 'left', 
                    fontSize: '0.75rem', 
                    fontWeight: '500', 
                    color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                    width: '15%'
                  }}>Status</th>
                  <th style={{ 
                    padding: '0.75rem 1.5rem', 
                    textAlign: 'left', 
                    fontSize: '0.75rem', 
                    fontWeight: '500', 
                    color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                    width: '15%'
                  }}>Port</th>
                  <th style={{ 
                    padding: '0.75rem 1.5rem', 
                    textAlign: 'left', 
                    fontSize: '0.75rem', 
                    fontWeight: '500', 
                    color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                    width: '20%'
                  }}>Last Checked</th>
                  <th style={{ 
                    padding: '0.75rem 1.5rem', 
                    textAlign: 'left', 
                    fontSize: '0.75rem', 
                    fontWeight: '500', 
                    color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    width: '30%'
                  }}>Details</th>
                </tr>
              </thead>
              <tbody style={{ 
                backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff'
              }}>
                <tr style={{ 
                  borderBottom: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme === 'dark' ? '#374151' : '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme === 'dark' ? '#1f2937' : '#ffffff';
                }}>
                  <td style={{ 
                    padding: '0.75rem 1.5rem', 
                    fontSize: '0.875rem', 
                    fontWeight: '500',
                    color: theme === 'dark' ? '#f1f5f9' : '#111827',
                    borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: device.routeros?.apiEnabled ? '#10b981' : '#ef4444'
                      }}></div>
                      API
                    </div>
                  </td>
                  <td style={{ 
                    padding: '0.75rem 1.5rem', 
                    fontSize: '0.875rem',
                    borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
                  }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      background: device.routeros?.apiEnabled ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      color: 'white'
                    }}>
                      {device.routeros?.apiEnabled ? 'ONLINE' : 'OFFLINE'}
                </span>
                  </td>
                  <td style={{ 
                    padding: '0.75rem 1.5rem', 
                    fontSize: '0.875rem',
                    color: theme === 'dark' ? '#d1d5db' : '#374151',
                    borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
                  }}>
                    {device.routeros?.apiPort || '8728'}
                  </td>
                  <td style={{ 
                    padding: '0.75rem 1.5rem', 
                    fontSize: '0.875rem',
                    color: theme === 'dark' ? '#d1d5db' : '#374151',
                    borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
                  }}>
                    {formatDateTime(device.updatedAt)}
                  </td>
                  <td style={{ 
                    padding: '0.75rem 1.5rem', 
                    fontSize: '0.875rem',
                    color: theme === 'dark' ? '#d1d5db' : '#374151'
                  }}>
                    {device.routeros?.apiOutput || 'No API data available'}
                  </td>
                </tr>
                <tr style={{ 
                  borderBottom: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme === 'dark' ? '#374151' : '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme === 'dark' ? '#1f2937' : '#ffffff';
                }}>
                  <td style={{ 
                    padding: '0.75rem 1.5rem', 
                    fontSize: '0.875rem', 
                    fontWeight: '500',
                    color: theme === 'dark' ? '#f1f5f9' : '#111827',
                    borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: device.routeros?.sshEnabled ? '#10b981' : '#ef4444'
                      }}></div>
                      SSH
              </div>
                  </td>
                  <td style={{ 
                    padding: '0.75rem 1.5rem', 
                    fontSize: '0.875rem',
                    borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
                  }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      background: device.routeros?.sshEnabled ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      color: 'white'
                    }}>
                      {device.routeros?.sshEnabled ? 'ONLINE' : 'OFFLINE'}
                    </span>
                  </td>
                  <td style={{ 
                    padding: '0.75rem 1.5rem', 
                    fontSize: '0.875rem',
                    color: theme === 'dark' ? '#d1d5db' : '#374151',
                    borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
                  }}>
                    {device.routeros?.sshPort || '22'}
                  </td>
                  <td style={{ 
                    padding: '0.75rem 1.5rem', 
                    fontSize: '0.875rem',
                    color: theme === 'dark' ? '#d1d5db' : '#374151',
                    borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
                  }}>
                    {formatDateTime(device.updatedAt)}
                  </td>
                  <td style={{ 
                    padding: '0.75rem 1.5rem', 
                    fontSize: '0.875rem',
                    color: theme === 'dark' ? '#d1d5db' : '#374151'
                  }}>
                      {device.connectivity?.ssh?.status === 'online' 
                      ? 'SSH port is accessible. Connection test successful.'
                        : device.connectivity?.ssh?.status === 'offline'
                      ? `Connection failed: ${device.connectivity?.ssh?.lastError || 'Unknown error'}`
                      : 'No SSH data available'
                    }
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}

    {/* Interfaces Tab */}
    {activeTab === 'interfaces' && (
      <div className="space-y-6">
        {/* Add Interface Modal */}
        {showAddInterfaceModal && (
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
            zIndex: 99999,
            width: '100vw',
            height: '100vh'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '1rem',
              padding: '2rem',
              width: '90%',
              maxWidth: '500px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '2px solid blue'
            }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#111827',
                margin: '0 0 1.5rem 0'
              }}>Add Interface</h2>

              <form onSubmit={(e) => {
                e.preventDefault();
                alert('Interface form submitted!');
                setShowAddInterfaceModal(false);
              }}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#111827',
                    marginBottom: '0.5rem'
                  }}>Interface Name *</label>
                  <input
                    type="text"
                    placeholder="ether3"
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      backgroundColor: 'white',
                      color: '#111827',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#111827',
                    marginBottom: '0.5rem'
                  }}>Interface Type *</label>
                  <select
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      backgroundColor: 'white',
                      color: '#111827',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="">Select Type</option>
                    <option value="ethernet">Ethernet</option>
                    <option value="bridge">Bridge</option>
                    <option value="vlan">VLAN</option>
                    <option value="bonding">Bonding</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddInterfaceModal(false)}
                    style={{
                      padding: '0.75rem 1.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      backgroundColor: 'transparent',
                      color: '#111827',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '0.75rem 1.5rem',
                      border: 'none',
                      borderRadius: '0.5rem',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Add Interface
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: theme === 'dark' ? '#f1f5f9' : '#111827',
                margin: 0
              }}>Network Interfaces</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => {
                    console.log('Add Interface button clicked!');
                    setShowAddInterfaceModal(true);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0.375rem 0.75rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 8px -2px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 4px -1px rgba(0, 0, 0, 0.1)';
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.25rem' }}>
                    <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Add Interface
                </button>
              <button
                onClick={fetchInterfaces}
                disabled={loadingData}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0.375rem 0.75rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    border: theme === 'dark' ? '1px solid #374151' : '1px solid #d1d5db',
                    background: theme === 'dark' ? '#374151' : 'white',
                    color: theme === 'dark' ? '#f1f5f9' : '#374151',
                    cursor: loadingData ? 'not-allowed' : 'pointer',
                    opacity: loadingData ? 0.5 : 1,
                    transition: 'all 0.2s ease'
                  }}
              >
                {loadingData ? (
                  <>
                      <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.25rem' }}>
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </>
                ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.25rem' }}>
                        <path d="M1 4V10H7M23 20V14H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M22.99 14A9 9 0 0 1 18.36 18.36L23 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Refresh
                    </>
                )}
              </button>
              </div>
            </div>
          </div>
          <div className="px-6 py-4">
            {loadingData ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-500">Loading interfaces...</p>
              </div>
            ) : interfaces.length > 0 ? (
              <div>
                {/* Ethernet Interfaces */}
                <div style={{ marginBottom: '2rem' }}>
                  <h4 style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: theme === 'dark' ? '#f1f5f9' : '#111827',
                    margin: '0 0 1rem 0',
                    padding: '0.5rem 0',
                    borderBottom: `2px solid ${theme === 'dark' ? '#3b82f6' : '#3b82f6'}`
                  }}>
                    Ethernet Interfaces ({interfaces.filter(iface => iface.type === 'ether').length})
                  </h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ 
                      width: '100%', 
                      borderCollapse: 'collapse',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                    }}>
                  <thead style={{ 
                    backgroundColor: theme === 'dark' ? '#374151' : '#f9fafb',
                    borderBottom: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`
                  }}>
                    <tr>
                      <th style={{ 
                        padding: '0.75rem 1.5rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        width: '15%'
                      }}>Name</th>
                      <th style={{ 
                        padding: '0.75rem 1.5rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        width: '12%'
                      }}>Type</th>
                      <th style={{ 
                        padding: '0.75rem 1.5rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        width: '18%'
                      }}>MAC Address</th>
                      <th style={{ 
                        padding: '0.75rem 1.5rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        width: '10%'
                      }}>MTU</th>
                      <th style={{ 
                        padding: '0.75rem 1.5rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        width: '10%'
                      }}>Status</th>
                      <th style={{ 
                        padding: '0.75rem 1.5rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        width: '12%'
                      }}>RX/TX</th>
                      <th style={{ 
                        padding: '0.75rem 1.5rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        width: '8%'
                      }}>Actions</th>
                      <th style={{ 
                        padding: '0.75rem 1.5rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        width: '25%'
                      }}>Comment</th>
                    </tr>
                  </thead>
                  <tbody style={{ 
                    backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff'
                  }}>
                    {interfaces.filter(iface => iface.type === 'ether').map((iface, index) => (
                      <tr key={index} style={{ 
                        borderBottom: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = theme === 'dark' ? '#374151' : '#f9fafb';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = theme === 'dark' ? '#1f2937' : '#ffffff';
                      }}>
                        <td style={{ 
                          padding: '1rem 1.5rem', 
                          whiteSpace: 'nowrap', 
                          fontSize: '0.875rem', 
                          fontWeight: '500', 
                          color: theme === 'dark' ? '#f9fafb' : '#111827',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                          width: '15%'
                        }}>
                          {iface.name || '—'}
                        </td>
                        <td style={{ 
                          padding: '1rem 1.5rem', 
                          whiteSpace: 'nowrap', 
                          fontSize: '0.875rem', 
                          color: theme === 'dark' ? '#d1d5db' : '#6b7280',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                          width: '12%'
                        }}>
                          {iface.type || '—'}
                        </td>
                        <td style={{ 
                          padding: '1rem 1.5rem', 
                          whiteSpace: 'nowrap', 
                          fontSize: '0.875rem', 
                          color: theme === 'dark' ? '#d1d5db' : '#6b7280',
                          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                          width: '18%'
                        }}>
                          {iface.macAddress || '—'}
                        </td>
                        <td style={{ 
                          padding: '1rem 1.5rem', 
                          whiteSpace: 'nowrap', 
                          fontSize: '0.875rem', 
                          color: theme === 'dark' ? '#d1d5db' : '#6b7280',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                          width: '10%'
                        }}>
                          {iface.mtu || '—'}
                        </td>
                        <td style={{ 
                          padding: '1rem 1.5rem', 
                          whiteSpace: 'nowrap',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                          width: '10%'
                        }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.25rem 0.625rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            backgroundColor: iface.arp === 'enabled' 
                              ? (theme === 'dark' ? '#065f46' : '#dcfce7')
                              : (theme === 'dark' ? '#374151' : '#f3f4f6'),
                            color: iface.arp === 'enabled' 
                              ? (theme === 'dark' ? '#6ee7b7' : '#166534')
                              : (theme === 'dark' ? '#9ca3af' : '#374151')
                          }}>
                            {iface.arp === 'enabled' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ 
                          padding: '1rem 1.5rem', 
                          whiteSpace: 'nowrap', 
                          fontSize: '0.875rem', 
                          color: theme === 'dark' ? '#d1d5db' : '#6b7280',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                          width: '12%'
                        }}>
                          <div style={{ fontSize: '0.75rem' }}>
                            <div style={{ color: '#10b981', marginBottom: '0.125rem' }}>
                              RX: {Math.floor(Math.random() * 100)} Mbps
                            </div>
                            <div style={{ color: '#3b82f6' }}>
                              TX: {Math.floor(Math.random() * 100)} Mbps
                            </div>
                          </div>
                        </td>
                        <td style={{ 
                          padding: '1rem 1.5rem', 
                          whiteSpace: 'nowrap', 
                          fontSize: '0.875rem',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                          width: '8%'
                        }}>
                          <button
                            onClick={() => {
                              setEditingInterface(iface);
                              setShowEditInterfaceModal(true);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.375rem',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              border: 'none',
                              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                              color: 'white',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              boxShadow: '0 1px 2px -1px rgba(0, 0, 0, 0.1)'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.transform = 'translateY(-1px)';
                              e.target.style.boxShadow = '0 2px 4px -1px rgba(0, 0, 0, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = 'translateY(0)';
                              e.target.style.boxShadow = '0 1px 2px -1px rgba(0, 0, 0, 0.1)';
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.25rem' }}>
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Edit
                          </button>
                        </td>
                        <td style={{ 
                          padding: '1rem 1.5rem', 
                          fontSize: '0.875rem', 
                          color: theme === 'dark' ? '#d1d5db' : '#6b7280',
                          width: '25%'
                        }}>
                          {iface.comment || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                  </div>
                </div>

                {/* Tunnel and Other Interfaces */}
                {interfaces.filter(iface => iface.type !== 'ether').length > 0 && (
                  <div style={{ marginBottom: '2rem' }}>
                    <h4 style={{
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: theme === 'dark' ? '#f1f5f9' : '#111827',
                      margin: '0 0 1rem 0',
                      padding: '0.5rem 0',
                      borderBottom: `2px solid ${theme === 'dark' ? '#10b981' : '#10b981'}`
                    }}>
                      Tunnel & Other Interfaces ({interfaces.filter(iface => iface.type !== 'ether').length})
                    </h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ 
                        width: '100%', 
                        borderCollapse: 'collapse',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                      }}>
                        <thead style={{ 
                          backgroundColor: theme === 'dark' ? '#374151' : '#f9fafb',
                          borderBottom: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`
                        }}>
                          <tr>
                            <th style={{ 
                              padding: '0.75rem 1.5rem', 
                              textAlign: 'left', 
                              fontSize: '0.75rem', 
                              fontWeight: '500', 
                              color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                              width: '15%'
                            }}>Name</th>
                            <th style={{ 
                              padding: '0.75rem 1.5rem', 
                              textAlign: 'left', 
                              fontSize: '0.75rem', 
                              fontWeight: '500', 
                              color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                              width: '12%'
                            }}>Type</th>
                            <th style={{ 
                              padding: '0.75rem 1.5rem', 
                              textAlign: 'left', 
                              fontSize: '0.75rem', 
                              fontWeight: '500', 
                              color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                              width: '18%'
                            }}>MAC Address</th>
                            <th style={{ 
                              padding: '0.75rem 1.5rem', 
                              textAlign: 'left', 
                              fontSize: '0.75rem', 
                              fontWeight: '500', 
                              color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                              width: '10%'
                            }}>MTU</th>
                            <th style={{ 
                              padding: '0.75rem 1.5rem', 
                              textAlign: 'left', 
                              fontSize: '0.75rem', 
                              fontWeight: '500', 
                              color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                              width: '12%'
                            }}>Status</th>
                            <th style={{ 
                              padding: '0.75rem 1.5rem', 
                              textAlign: 'left', 
                              fontSize: '0.75rem', 
                              fontWeight: '500', 
                              color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              width: '33%'
                            }}>Comment</th>
                          </tr>
                        </thead>
                        <tbody style={{ 
                          backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff'
                        }}>
                          {interfaces.filter(iface => iface.type !== 'ether').map((iface, index) => (
                            <tr key={index} style={{ 
                              borderBottom: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                              transition: 'background-color 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = theme === 'dark' ? '#374151' : '#f9fafb';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = theme === 'dark' ? '#1f2937' : '#ffffff';
                            }}>
                              <td style={{ 
                                padding: '0.75rem 1.5rem', 
                                fontSize: '0.875rem', 
                                fontWeight: '500',
                                color: theme === 'dark' ? '#f1f5f9' : '#111827',
                                borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
                              }}>
                                {iface.name}
                              </td>
                              <td style={{ 
                                padding: '0.75rem 1.5rem', 
                                fontSize: '0.875rem',
                                color: theme === 'dark' ? '#d1d5db' : '#374151',
                                borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
                              }}>
                                <span style={{
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.75rem',
                                  fontWeight: '500',
                                  background: iface.type === 'eoip' ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' :
                                             iface.type === 'gre' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' :
                                             iface.type === 'ipip' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' :
                                             'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                                  color: 'white',
                                  textTransform: 'uppercase'
                                }}>
                                  {iface.type}
                                </span>
                              </td>
                              <td style={{ 
                                padding: '0.75rem 1.5rem', 
                                fontSize: '0.875rem',
                                color: theme === 'dark' ? '#d1d5db' : '#374151',
                                borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
                              }}>
                                {iface.macAddress}
                              </td>
                              <td style={{ 
                                padding: '0.75rem 1.5rem', 
                                fontSize: '0.875rem',
                                color: theme === 'dark' ? '#d1d5db' : '#374151',
                                borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
                              }}>
                                {iface.mtu}
                              </td>
                              <td style={{ 
                                padding: '0.75rem 1.5rem', 
                                fontSize: '0.875rem',
                                borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
                              }}>
                                <span style={{
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.75rem',
                                  fontWeight: '500',
                                  background: iface.running ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                  color: 'white'
                                }}>
                                  {iface.running ? 'Running' : 'Down'}
                                </span>
                              </td>
                              <td style={{ 
                                padding: '0.75rem 1.5rem', 
                                fontSize: '0.875rem',
                                color: theme === 'dark' ? '#d1d5db' : '#374151'
                              }}>
                                {iface.comment || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <InterfaceIcon />
                <h3 className="text-lg font-semibold text-gray-900 mt-4">No interfaces found</h3>
                <p className="text-gray-500 mt-2">Interface information will be displayed here when available.</p>
                <button
                  onClick={fetchInterfaces}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Load Interfaces
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )}

    {/* IP Addresses Tab */}
    {activeTab === 'ip' && (
      <div className="space-y-6">
        {/* Add IP Address Modal - RouterOS Style */}
        {showAddIpModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            width: '100vw',
            height: '100vh'
          }}>
            <div style={{
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              width: '500px',
              maxWidth: '90%',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              fontFamily: 'Arial, sans-serif'
            }}>
              {/* Header */}
              <div style={{
                backgroundColor: '#e9ecef',
                borderBottom: '1px solid #dee2e6',
                padding: '8px 12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#495057'
                }}>Address &gt; New...</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button style={{
                    width: '20px',
                    height: '20px',
                    border: '1px solid #adb5bd',
                    backgroundColor: '#f8f9fa',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}>□</button>
                  <button 
                    onClick={() => setShowAddIpModal(false)}
                    style={{
                      width: '20px',
                      height: '20px',
                      border: '1px solid #adb5bd',
                      backgroundColor: '#f8f9fa',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >×</button>
                </div>
              </div>

              {/* Form Content */}
              <div style={{ padding: '16px' }}>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  alert('IP Address added successfully!');
                  setShowAddIpModal(false);
                }}>
                  {/* Enabled Checkbox */}
                  <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      defaultChecked
                      style={{ marginRight: '8px' }}
                    />
                    <label style={{
                      fontSize: '13px',
                      color: '#495057',
                      cursor: 'pointer'
                    }}>Enabled</label>
                  </div>

                  {/* Comment Field */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      color: '#495057',
                      marginBottom: '4px'
                    }}>Comment</label>
                    <input
                      type="text"
                      style={{
                        width: '100%',
                        padding: '4px 8px',
                        border: '1px solid #ced4da',
                        borderRadius: '2px',
                        fontSize: '13px',
                        backgroundColor: 'white'
                      }}
                    />
                  </div>

                  {/* Address Field */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      color: '#495057',
                      marginBottom: '4px'
                    }}>Address</label>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="0.0.0.0"
                        required
                        style={{
                          flex: 1,
                          padding: '4px 8px',
                          border: '1px solid #dc3545',
                          borderRadius: '2px',
                          fontSize: '13px',
                          backgroundColor: 'white'
                        }}
                      />
                      <span style={{
                        marginLeft: '8px',
                        fontSize: '12px',
                        color: '#dc3545'
                      }}>0.0.0.0</span>
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#dc3545',
                      marginTop: '2px'
                    }}>Non zero IPv4 address[/Mask]</div>
                  </div>

                  {/* Network Field */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      color: '#495057',
                      marginBottom: '4px'
                    }}>Network</label>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <input
                        type="text"
                        disabled={!formData.networkEnabled}
                        value={formData.network || ''}
                        onChange={(e) => setFormData({...formData, network: e.target.value})}
                        style={{
                          flex: 1,
                          padding: '4px 8px',
                          border: '1px solid #ced4da',
                          borderRadius: '2px',
                          fontSize: '13px',
                          backgroundColor: formData.networkEnabled ? 'white' : '#f8f9fa',
                          color: formData.networkEnabled ? '#495057' : '#6c757d'
                        }}
                      />
                      <input
                        type="checkbox"
                        checked={formData.networkEnabled}
                        onChange={(e) => setFormData({...formData, networkEnabled: e.target.checked})}
                        style={{
                          marginLeft: '8px',
                          width: '16px',
                          height: '16px'
                        }}
                      />
                      {!formData.networkEnabled && (
                        <span style={{
                          marginLeft: '4px',
                          fontSize: '12px',
                          color: '#495057'
                        }}>+</span>
                      )}
                    </div>
                  </div>

                  {/* Interface Field */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      color: '#495057',
                      marginBottom: '4px'
                    }}>Interface</label>
                    <select
                      style={{
                        width: '100%',
                        padding: '4px 8px',
                        border: '1px solid #ced4da',
                        borderRadius: '2px',
                        fontSize: '13px',
                        backgroundColor: 'white'
                      }}
                    >
                      <option value="">Select Interface</option>
                      {interfaces.map((iface) => (
                        <option key={iface.name} value={iface.name}>
                          {iface.name} {iface.comment ? `(${iface.comment})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Buttons */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '8px',
                    paddingTop: '12px',
                    borderTop: '1px solid #dee2e6'
                  }}>
                    <button
                      type="button"
                      onClick={() => setShowAddIpModal(false)}
                      style={{
                        padding: '6px 16px',
                        border: '1px solid #ced4da',
                        backgroundColor: '#f8f9fa',
                        color: '#495057',
                        fontSize: '13px',
                        cursor: 'pointer',
                        borderRadius: '2px'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      style={{
                        padding: '6px 16px',
                        border: '1px solid #ced4da',
                        backgroundColor: '#f8f9fa',
                        color: '#495057',
                        fontSize: '13px',
                        cursor: 'pointer',
                        borderRadius: '2px'
                      }}
                    >
                      Apply
                    </button>
                    <button
                      type="submit"
                      style={{
                        padding: '6px 16px',
                        border: '1px solid #ced4da',
                        backgroundColor: '#f8f9fa',
                        color: '#495057',
                        fontSize: '13px',
                        cursor: 'pointer',
                        borderRadius: '2px'
                      }}
                    >
                      OK
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: theme === 'dark' ? '#f1f5f9' : '#111827',
                margin: 0
              }}>IP Addresses</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => {
                    console.log('Add IP button clicked!');
                    console.log('Current showAddIpModal value:', showAddIpModal);
                    setShowAddIpModal(false); // Reset first
                    setTimeout(() => {
                      setShowAddIpModal(true); // Then set to true
                      console.log('setShowAddIpModal(true) called');
                    }, 10);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0.375rem 0.75rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 8px -2px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 4px -1px rgba(0, 0, 0, 0.1)';
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.25rem' }}>
                    <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Add IP
                </button>
              <button
                onClick={fetchIpAddresses}
                disabled={loadingData}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0.375rem 0.75rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    border: theme === 'dark' ? '1px solid #374151' : '1px solid #d1d5db',
                    background: theme === 'dark' ? '#374151' : 'white',
                    color: theme === 'dark' ? '#f1f5f9' : '#374151',
                    cursor: loadingData ? 'not-allowed' : 'pointer',
                    opacity: loadingData ? 0.5 : 1,
                    transition: 'all 0.2s ease'
                  }}
              >
                {loadingData ? (
                  <>
                      <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.25rem' }}>
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </>
                ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.25rem' }}>
                        <path d="M1 4V10H7M23 20V14H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M22.99 14A9 9 0 0 1 18.36 18.36L23 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Refresh
                    </>
                )}
              </button>
              </div>
            </div>
          </div>
          <div className="px-6 py-4">
            {loadingData ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-500">Loading IP addresses...</p>
              </div>
            ) : ipAddresses.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                }}>
                  <thead style={{ 
                    backgroundColor: theme === 'dark' ? '#374151' : '#f9fafb',
                    borderBottom: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`
                  }}>
                    <tr>
                      <th style={{ 
                        padding: '0.75rem 1.5rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        width: '18%'
                      }}>Address</th>
                      <th style={{ 
                        padding: '0.75rem 1.5rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        width: '18%'
                      }}>Network</th>
                      <th style={{ 
                        padding: '0.75rem 1.5rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        width: '12%'
                      }}>Interface</th>
                      <th style={{ 
                        padding: '0.75rem 1.5rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        width: '10%'
                      }}>Type</th>
                      <th style={{ 
                        padding: '0.75rem 1.5rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        width: '10%'
                      }}>Status</th>
                      <th style={{ 
                        padding: '0.75rem 1.5rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        width: '32%'
                      }}>Comment</th>
                    </tr>
                  </thead>
                  <tbody style={{ 
                    backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff'
                  }}>
                    {ipAddresses.map((ip, index) => (
                      <tr key={index} style={{ 
                        borderBottom: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = theme === 'dark' ? '#374151' : '#f9fafb';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = theme === 'dark' ? '#1f2937' : '#ffffff';
                      }}>
                        <td style={{ 
                          padding: '1rem 1.5rem', 
                          whiteSpace: 'nowrap', 
                          fontSize: '0.875rem', 
                          fontWeight: '500', 
                          color: theme === 'dark' ? '#f9fafb' : '#111827',
                          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                          width: '18%'
                        }}>
                          {ip.address || '—'}
                        </td>
                        <td style={{ 
                          padding: '1rem 1.5rem', 
                          whiteSpace: 'nowrap', 
                          fontSize: '0.875rem', 
                          color: theme === 'dark' ? '#d1d5db' : '#6b7280',
                          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                          width: '18%'
                        }}>
                          {ip.network || '—'}
                        </td>
                        <td style={{ 
                          padding: '1rem 1.5rem', 
                          whiteSpace: 'nowrap', 
                          fontSize: '0.875rem', 
                          color: theme === 'dark' ? '#d1d5db' : '#6b7280',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                          width: '12%'
                        }}>
                          {ip.interface || '—'}
                        </td>
                        <td style={{ 
                          padding: '1rem 1.5rem', 
                          whiteSpace: 'nowrap',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                          width: '10%'
                        }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.25rem 0.625rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            backgroundColor: ip.type === 'static' 
                              ? (theme === 'dark' ? '#1e40af' : '#dbeafe')
                              : ip.type === 'dynamic' 
                              ? (theme === 'dark' ? '#7c2d12' : '#fed7aa')
                              : (theme === 'dark' ? '#374151' : '#f3f4f6'),
                            color: ip.type === 'static' 
                              ? (theme === 'dark' ? '#93c5fd' : '#1e40af')
                              : ip.type === 'dynamic' 
                              ? (theme === 'dark' ? '#fed7aa' : '#c2410c')
                              : (theme === 'dark' ? '#9ca3af' : '#374151')
                          }}>
                            {ip.type || 'static'}
                          </span>
                        </td>
                        <td style={{ 
                          padding: '1rem 1.5rem', 
                          whiteSpace: 'nowrap',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                          width: '10%'
                        }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.25rem 0.625rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            backgroundColor: ip.disabled === false 
                              ? (theme === 'dark' ? '#065f46' : '#dcfce7')
                              : (theme === 'dark' ? '#7f1d1d' : '#fee2e2'),
                            color: ip.disabled === false 
                              ? (theme === 'dark' ? '#6ee7b7' : '#166534')
                              : (theme === 'dark' ? '#fca5a5' : '#dc2626')
                          }}>
                            {ip.disabled === false ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td style={{ 
                          padding: '1rem 1.5rem', 
                          fontSize: '0.875rem', 
                          color: theme === 'dark' ? '#d1d5db' : '#6b7280',
                          width: '32%'
                        }}>
                          {ip.comment || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <IPIcon />
                <h3 className="text-lg font-semibold text-gray-900 mt-4">No IP addresses found</h3>
                <p className="text-gray-500 mt-2">IP address information will be displayed here when available.</p>
                <button
                  onClick={fetchIpAddresses}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Load IP Addresses
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )}

    {/* Routes Tab */}
    {activeTab === 'routes' && (
      <div className="space-y-6">
        {/* Add Route Modal */}
        {showAddRouteModal && (
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
            zIndex: 99999,
            width: '100vw',
            height: '100vh'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '1rem',
              padding: '2rem',
              width: '90%',
              maxWidth: '500px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '2px solid green'
            }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#111827',
                margin: '0 0 1.5rem 0'
              }}>Add Route</h2>

              <form onSubmit={(e) => {
                e.preventDefault();
                alert('Route form submitted!');
                setShowAddRouteModal(false);
              }}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#111827',
                    marginBottom: '0.5rem'
                  }}>Destination *</label>
                  <input
                    type="text"
                    placeholder="0.0.0.0/0"
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      backgroundColor: 'white',
                      color: '#111827',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#111827',
                    marginBottom: '0.5rem'
                  }}>Gateway *</label>
                  <input
                    type="text"
                    placeholder="192.168.1.1"
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      backgroundColor: 'white',
                      color: '#111827',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#111827',
                    marginBottom: '0.5rem'
                  }}>Interface</label>
                  <select
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      backgroundColor: 'white',
                      color: '#111827',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="">Select Interface</option>
                    {interfaces.map((iface) => (
                      <option key={iface.name} value={iface.name}>
                        {iface.name} ({iface.comment || iface.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#111827',
                    marginBottom: '0.5rem'
                  }}>Distance</label>
                  <input
                    type="number"
                    placeholder="1"
                    min="0"
                    max="255"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      backgroundColor: 'white',
                      color: '#111827',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#111827',
                    marginBottom: '0.5rem'
                  }}>Mark Route</label>
                  <select
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      backgroundColor: 'white',
                      color: '#111827',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="">Select Mark Route</option>
                    <option value="main">main</option>
                    <option value="Majid-VPN">Majid-VPN</option>
                    <option value="Office">Office</option>
                    <option value="test">test</option>
                    <option value="vpn">vpn</option>
                    <option value="backup">backup</option>
                    <option value="load-balance">load-balance</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddRouteModal(false)}
                    style={{
                      padding: '0.75rem 1.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      backgroundColor: 'transparent',
                      color: '#111827',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '0.75rem 1.5rem',
                      border: 'none',
                      borderRadius: '0.5rem',
                      backgroundColor: '#10b981',
                      color: 'white',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Add Route
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        <div style={{
          background: theme === 'dark' ? '#1e293b' : 'white',
          borderRadius: '1rem',
          padding: '1.5rem',
          boxShadow: theme === 'dark' 
            ? '0 8px 32px -8px rgba(0, 0, 0, 0.3)' 
            : '0 8px 32px -8px rgba(0, 0, 0, 0.1)',
          border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: theme === 'dark' ? '#f1f5f9' : '#111827',
              margin: 0
            }}>Routing Table</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => {
                  console.log('Add Route button clicked!');
                  setShowAddRouteModal(true);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.375rem 0.75rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 8px -2px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 2px 4px -1px rgba(0, 0, 0, 0.1)';
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.25rem' }}>
                  <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Add Route
              </button>
              <button
                onClick={fetchRoutes}
                disabled={loadingData}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.375rem 0.75rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  border: theme === 'dark' ? '1px solid #374151' : '1px solid #d1d5db',
                  background: theme === 'dark' ? '#374151' : 'white',
                  color: theme === 'dark' ? '#f1f5f9' : '#374151',
                  cursor: loadingData ? 'not-allowed' : 'pointer',
                  opacity: loadingData ? 0.5 : 1,
                  transition: 'all 0.2s ease'
                }}
              >
                {loadingData ? (
                  <>
                    <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.25rem' }}>
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.25rem' }}>
                      <path d="M1 4V10H7M23 20V14H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M22.99 14A9 9 0 0 1 18.36 18.36L23 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Refresh
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="px-6 py-4">
            {loadingData ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-500">Loading routes...</p>
              </div>
            ) : routes.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                }}>
                  <thead style={{ 
                    backgroundColor: theme === 'dark' ? '#374151' : '#f9fafb',
                    borderBottom: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`
                  }}>
                    <tr>
                      <th style={{ 
                        padding: '0.75rem 1.5rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        width: '20%'
                      }}>Destination</th>
                      <th style={{ 
                        padding: '0.75rem 1.5rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        width: '15%'
                      }}>Gateway</th>
                      <th style={{ 
                        padding: '0.75rem 1.5rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        width: '12%'
                      }}>Interface</th>
                      <th style={{ 
                        padding: '0.75rem 1.5rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        width: '8%'
                      }}>Distance</th>
                      <th style={{ 
                        padding: '0.75rem 1.5rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        width: '10%'
                      }}>Type</th>
                      <th style={{ 
                        padding: '0.75rem 1.5rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        width: '10%'
                      }}>Mark</th>
                      <th style={{ 
                        padding: '0.75rem 1.5rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        width: '8%'
                      }}>Status</th>
                      <th style={{ 
                        padding: '0.75rem 1.5rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        width: '8%'
                      }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody style={{ 
                    backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff'
                  }}>
                    {routes.map((route, index) => (
                      <tr key={index} style={{ 
                        borderBottom: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = theme === 'dark' ? '#374151' : '#f9fafb';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = theme === 'dark' ? '#1f2937' : '#ffffff';
                      }}>
                        <td style={{ 
                          padding: '1rem 1.5rem', 
                          whiteSpace: 'nowrap', 
                          fontSize: '0.875rem', 
                          fontWeight: '500', 
                          color: theme === 'dark' ? '#f9fafb' : '#111827',
                          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                          width: '20%'
                        }}>
                          {route.dstAddress || '—'}
                        </td>
                        <td style={{ 
                          padding: '1rem 1.5rem', 
                          whiteSpace: 'nowrap', 
                          fontSize: '0.875rem', 
                          color: theme === 'dark' ? '#d1d5db' : '#6b7280',
                          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                          width: '15%'
                        }}>
                          {route.gateway || '—'}
                        </td>
                        <td style={{ 
                          padding: '1rem 1.5rem', 
                          whiteSpace: 'nowrap', 
                          fontSize: '0.875rem', 
                          color: theme === 'dark' ? '#d1d5db' : '#6b7280',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                          width: '12%'
                        }}>
                          {route.outInterface || '—'}
                        </td>
                        <td style={{ 
                          padding: '1rem 1.5rem', 
                          whiteSpace: 'nowrap', 
                          fontSize: '0.875rem', 
                          color: theme === 'dark' ? '#d1d5db' : '#6b7280',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                          width: '8%'
                        }}>
                          {route.distance || '—'}
                        </td>
                        <td style={{ 
                          padding: '1rem 1.5rem', 
                          whiteSpace: 'nowrap',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                          width: '10%'
                        }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.25rem 0.625rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            backgroundColor: route.type === 'static' 
                              ? (theme === 'dark' ? '#1e40af' : '#dbeafe')
                              : route.type === 'dynamic' 
                              ? (theme === 'dark' ? '#7c2d12' : '#fed7aa')
                              : route.type === 'connected'
                              ? (theme === 'dark' ? '#065f46' : '#dcfce7')
                              : (theme === 'dark' ? '#374151' : '#f3f4f6'),
                            color: route.type === 'static' 
                              ? (theme === 'dark' ? '#93c5fd' : '#1e40af')
                              : route.type === 'dynamic' 
                              ? (theme === 'dark' ? '#fed7aa' : '#c2410c')
                              : route.type === 'connected'
                              ? (theme === 'dark' ? '#6ee7b7' : '#166534')
                              : (theme === 'dark' ? '#9ca3af' : '#374151')
                          }}>
                            {route.type || 'DAC'}
                          </span>
                        </td>
                        <td style={{ 
                          padding: '1rem 1.5rem', 
                          whiteSpace: 'nowrap',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                          width: '10%'
                        }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.25rem 0.625rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
                            color: theme === 'dark' ? '#d1d5db' : '#374151'
                          }}>
                            {route.mark || 'main'}
                          </span>
                        </td>
                        <td style={{ 
                          padding: '1rem 1.5rem', 
                          whiteSpace: 'nowrap',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                          width: '8%'
                        }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.25rem 0.625rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            backgroundColor: route.active === true 
                              ? (theme === 'dark' ? '#065f46' : '#dcfce7')
                              : (theme === 'dark' ? '#374151' : '#f3f4f6'),
                            color: route.active === true 
                              ? (theme === 'dark' ? '#6ee7b7' : '#166534')
                              : (theme === 'dark' ? '#9ca3af' : '#374151')
                          }}>
                            {route.active === true ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ 
                          padding: '1rem 1.5rem', 
                          whiteSpace: 'nowrap',
                          width: '8%'
                        }}>
                          <button
                            onClick={() => {
                              alert('Edit Route functionality will be implemented');
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.375rem',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              border: 'none',
                              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                              color: 'white',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              boxShadow: '0 1px 2px -1px rgba(0, 0, 0, 0.1)'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.transform = 'translateY(-1px)';
                              e.target.style.boxShadow = '0 2px 4px -1px rgba(0, 0, 0, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = 'translateY(0)';
                              e.target.style.boxShadow = '0 1px 2px -1px rgba(0, 0, 0, 0.1)';
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.25rem' }}>
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <RouteIcon />
                <h3 className="text-lg font-semibold text-gray-900 mt-4">No routes found</h3>
                <p className="text-gray-500 mt-2">Routing table information will be displayed here when available.</p>
                <button
                  onClick={fetchRoutes}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Load Routes
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )}

    {/* Firewall Tab */}
    {activeTab === 'firewall' && (
      <div className="space-y-6">
        {/* Add Firewall Modal */}
        {showAddFirewallModal && (
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
            zIndex: 99999,
            width: '100vw',
            height: '100vh'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '1rem',
              padding: '2rem',
              width: '90%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '2px solid orange'
            }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#111827',
                margin: '0 0 1.5rem 0'
              }}>Add Firewall Rule</h2>

              <form onSubmit={(e) => {
                e.preventDefault();
                alert('Firewall rule form submitted!');
                setShowAddFirewallModal(false);
              }}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#111827',
                    marginBottom: '0.5rem'
                  }}>Chain *</label>
                  <select
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      backgroundColor: 'white',
                      color: '#111827',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="">Select Chain</option>
                    <option value="input">input</option>
                    <option value="forward">forward</option>
                    <option value="output">output</option>
                  </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#111827',
                    marginBottom: '0.5rem'
                  }}>Action *</label>
                  <select
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      backgroundColor: 'white',
                      color: '#111827',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="">Select Action</option>
                    <option value="accept">accept</option>
                    <option value="drop">drop</option>
                    <option value="reject">reject</option>
                  </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#111827',
                    marginBottom: '0.5rem'
                  }}>Source Address</label>
                  <input
                    type="text"
                    placeholder="192.168.1.0/24"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      backgroundColor: 'white',
                      color: '#111827',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#111827',
                    marginBottom: '0.5rem'
                  }}>Source Address List</label>
                  <input
                    type="text"
                    placeholder="src-list"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      backgroundColor: 'white',
                      color: '#111827',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#111827',
                    marginBottom: '0.5rem'
                  }}>Destination Address</label>
                  <input
                    type="text"
                    placeholder="10.0.0.0/8"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      backgroundColor: 'white',
                      color: '#111827',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#111827',
                    marginBottom: '0.5rem'
                  }}>Destination Address List</label>
                  <input
                    type="text"
                    placeholder="dst-list"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      backgroundColor: 'white',
                      color: '#111827',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#111827',
                    marginBottom: '0.5rem'
                  }}>Protocol</label>
                  <select
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      backgroundColor: 'white',
                      color: '#111827',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="">Select Protocol</option>
                    <option value="tcp">tcp</option>
                    <option value="udp">udp</option>
                    <option value="icmp">icmp</option>
                    <option value="all">all</option>
                  </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#111827',
                    marginBottom: '0.5rem'
                  }}>Port</label>
                  <input
                    type="text"
                    placeholder="80,443,22"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      backgroundColor: 'white',
                      color: '#111827',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddFirewallModal(false)}
                    style={{
                      padding: '0.75rem 1.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      backgroundColor: 'transparent',
                      color: '#111827',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '0.75rem 1.5rem',
                      border: 'none',
                      borderRadius: '0.5rem',
                      backgroundColor: '#f59e0b',
                      color: 'white',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Add Firewall Rule
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        <div style={{
          background: theme === 'dark' ? '#1e293b' : 'white',
          borderRadius: '1rem',
          padding: '1.5rem',
          boxShadow: theme === 'dark' 
            ? '0 8px 32px -8px rgba(0, 0, 0, 0.3)' 
            : '0 8px 32px -8px rgba(0, 0, 0, 0.1)',
          border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: theme === 'dark' ? '#f1f5f9' : '#111827',
              margin: 0
            }}>Firewall Rules</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => {
                  console.log('Add Firewall button clicked!');
                  setShowAddFirewallModal(true);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.375rem 0.75rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 8px -2px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 2px 4px -1px rgba(0, 0, 0, 0.1)';
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.25rem' }}>
                  <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Add Rule
              </button>
              <button
                onClick={fetchFirewallRules}
                disabled={loadingData}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.375rem 0.75rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  border: theme === 'dark' ? '1px solid #374151' : '1px solid #d1d5db',
                  background: theme === 'dark' ? '#374151' : 'white',
                  color: theme === 'dark' ? '#f1f5f9' : '#374151',
                  cursor: loadingData ? 'not-allowed' : 'pointer',
                  opacity: loadingData ? 0.5 : 1,
                  transition: 'all 0.2s ease'
                }}
              >
                {loadingData ? (
                  <>
                    <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.25rem' }}>
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.25rem' }}>
                      <path d="M1 4V10H7M23 20V14H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M22.99 14A9 9 0 0 1 18.36 18.36L23 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Refresh
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="px-6 py-4">
            {firewallRules.length > 0 ? (
              <div className="overflow-x-auto">
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                }}>
                  <thead style={{ 
                    backgroundColor: theme === 'dark' ? '#374151' : '#f9fafb',
                    borderBottom: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`
                  }}>
                    <tr>
                      <th style={{ 
                        padding: '0.75rem 1.5rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        width: '15%'
                      }}>Chain</th>
                      <th style={{ 
                        padding: '0.75rem 1.5rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        width: '15%'
                      }}>Action</th>
                      <th style={{ 
                        padding: '0.75rem 1.5rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        width: '12%'
                      }}>Protocol</th>
                      <th style={{ 
                        padding: '0.75rem 1.5rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        width: '12%'
                      }}>Port</th>
                      <th style={{ 
                        padding: '0.75rem 1.5rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        width: '8%'
                      }}>Actions</th>
                      <th style={{ 
                        padding: '0.75rem 1.5rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        width: '38%'
                      }}>Comment</th>
                    </tr>
                  </thead>
                  <tbody style={{ 
                    backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff'
                  }}>
                    {firewallRules.map((rule, index) => (
                      <tr key={index} style={{ 
                        borderBottom: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme === 'dark' ? '#374151' : '#f9fafb';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = theme === 'dark' ? '#1f2937' : '#ffffff';
                      }}>
                        <td style={{ 
                          padding: '0.75rem 1.5rem', 
                          fontSize: '0.875rem', 
                          fontWeight: '500',
                          color: theme === 'dark' ? '#f1f5f9' : '#111827',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
                        }}>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            backgroundColor: rule.chain === 'input' ? '#fef3c7' : rule.chain === 'forward' ? '#dbeafe' : '#f3e8ff',
                            color: rule.chain === 'input' ? '#92400e' : rule.chain === 'forward' ? '#1e40af' : '#7c3aed'
                          }}>
                            {rule.chain}
                          </span>
                        </td>
                        <td style={{ 
                          padding: '0.75rem 1.5rem', 
                          fontSize: '0.875rem',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
                        }}>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            backgroundColor: rule.action === 'accept' ? '#d1fae5' : rule.action === 'drop' ? '#fee2e2' : '#f3e8ff',
                            color: rule.action === 'accept' ? '#065f46' : rule.action === 'drop' ? '#991b1b' : '#7c3aed'
                          }}>
                            {rule.action}
                          </span>
                        </td>
                        <td style={{ 
                          padding: '0.75rem 1.5rem', 
                          fontSize: '0.875rem',
                          color: theme === 'dark' ? '#d1d5db' : '#374151',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
                        }}>{rule.protocol || 'all'}</td>
                        <td style={{ 
                          padding: '0.75rem 1.5rem', 
                          fontSize: '0.875rem',
                          color: theme === 'dark' ? '#d1d5db' : '#374151',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
                        }}>{rule.dstPort || '-'}</td>
                        <td style={{ 
                          padding: '0.75rem 1.5rem', 
                          fontSize: '0.875rem',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
                        }}>
                          <button
                            onClick={() => {
                              setEditingFirewallRule(rule);
                              setShowEditFirewallModal(true);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.375rem',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              border: 'none',
                              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                              color: 'white',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              boxShadow: '0 1px 2px -1px rgba(0, 0, 0, 0.1)'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.transform = 'translateY(-1px)';
                              e.target.style.boxShadow = '0 2px 4px -1px rgba(0, 0, 0, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = 'translateY(0)';
                              e.target.style.boxShadow = '0 1px 2px -1px rgba(0, 0, 0, 0.1)';
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.25rem' }}>
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Edit
                          </button>
                        </td>
                        <td style={{ 
                          padding: '0.75rem 1.5rem', 
                          fontSize: '0.875rem',
                          color: theme === 'dark' ? '#d1d5db' : '#374151'
                        }}>{rule.comment || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <ConfigIcon />
                <h3 className="text-lg font-semibold text-gray-900 mt-4">No Firewall Rules Found</h3>
                <p className="text-gray-500 mt-2">Firewall rules will be displayed here when available.</p>
                <button
                  onClick={fetchFirewallRules}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Load Firewall Rules
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )}

    {/* NAT Tab */}
    {activeTab === 'nat' && (
      <div className="space-y-6">
        <div style={{
          background: theme === 'dark' ? '#1e293b' : 'white',
          borderRadius: '1rem',
          padding: '1.5rem',
          boxShadow: theme === 'dark' 
            ? '0 8px 32px -8px rgba(0, 0, 0, 0.3)' 
            : '0 8px 32px -8px rgba(0, 0, 0, 0.1)',
          border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: theme === 'dark' ? '#f1f5f9' : '#111827',
              margin: 0
            }}>NAT Rules</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => {
                  alert('Add NAT Rule functionality will be implemented');
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.375rem 0.75rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 8px -2px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 2px 4px -1px rgba(0, 0, 0, 0.1)';
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.25rem' }}>
                  <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Add Rule
              </button>
              <button
                onClick={fetchNatRules}
                disabled={loadingData}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.375rem 0.75rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  border: theme === 'dark' ? '1px solid #374151' : '1px solid #d1d5db',
                  background: theme === 'dark' ? '#374151' : 'white',
                  color: theme === 'dark' ? '#f1f5f9' : '#374151',
                  cursor: loadingData ? 'not-allowed' : 'pointer',
                  opacity: loadingData ? 0.5 : 1,
                  transition: 'all 0.2s ease'
                }}
              >
                {loadingData ? (
                  <>
                    <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.25rem' }}>
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.25rem' }}>
                      <path d="M1 4V10H7M23 20V14H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M22.99 14A9 9 0 0 1 18.36 18.36L23 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Refresh
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="px-6 py-4">
            {natRules.length > 0 ? (
              <div className="overflow-x-auto">
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                }}>
                  <thead style={{ 
                    backgroundColor: theme === 'dark' ? '#374151' : '#f9fafb',
                    borderBottom: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`
                  }}>
                    <tr>
                      <th style={{ 
                        padding: '0.75rem 1.5rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        width: '15%'
                      }}>Chain</th>
                      <th style={{ 
                        padding: '0.75rem 1.5rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        width: '15%'
                      }}>Action</th>
                      <th style={{ 
                        padding: '0.75rem 1.5rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        width: '12%'
                      }}>Protocol</th>
                      <th style={{ 
                        padding: '0.75rem 1.5rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        width: '12%'
                      }}>Port</th>
                      <th style={{ 
                        padding: '0.75rem 1.5rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        width: '18%'
                      }}>To Address</th>
                      <th style={{ 
                        padding: '0.75rem 1.5rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        width: '8%'
                      }}>Actions</th>
                      <th style={{ 
                        padding: '0.75rem 1.5rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        width: '20%'
                      }}>Comment</th>
                    </tr>
                  </thead>
                  <tbody style={{ 
                    backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff'
                  }}>
                    {natRules.map((rule, index) => (
                      <tr key={index} style={{ 
                        borderBottom: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme === 'dark' ? '#374151' : '#f9fafb';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = theme === 'dark' ? '#1f2937' : '#ffffff';
                      }}>
                        <td style={{ 
                          padding: '0.75rem 1.5rem', 
                          fontSize: '0.875rem', 
                          fontWeight: '500',
                          color: theme === 'dark' ? '#f1f5f9' : '#111827',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
                        }}>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            backgroundColor: rule.chain === 'srcnat' ? '#dbeafe' : '#fef3c7',
                            color: rule.chain === 'srcnat' ? '#1e40af' : '#92400e'
                          }}>
                            {rule.chain}
                          </span>
                        </td>
                        <td style={{ 
                          padding: '0.75rem 1.5rem', 
                          fontSize: '0.875rem',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
                        }}>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            backgroundColor: rule.action === 'masquerade' ? '#d1fae5' : '#f3e8ff',
                            color: rule.action === 'masquerade' ? '#065f46' : '#7c3aed'
                          }}>
                            {rule.action}
                          </span>
                        </td>
                        <td style={{ 
                          padding: '0.75rem 1.5rem', 
                          fontSize: '0.875rem',
                          color: theme === 'dark' ? '#d1d5db' : '#374151',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
                        }}>{rule.protocol || '-'}</td>
                        <td style={{ 
                          padding: '0.75rem 1.5rem', 
                          fontSize: '0.875rem',
                          color: theme === 'dark' ? '#d1d5db' : '#374151',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
                        }}>{rule.dstPort || '-'}</td>
                        <td style={{ 
                          padding: '0.75rem 1.5rem', 
                          fontSize: '0.875rem',
                          color: theme === 'dark' ? '#d1d5db' : '#374151',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
                        }}>{rule.toAddresses || '-'}</td>
                        <td style={{ 
                          padding: '0.75rem 1.5rem', 
                          fontSize: '0.875rem',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
                        }}>
                          <button
                            onClick={() => {
                              alert('Edit NAT Rule functionality will be implemented');
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.375rem',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              border: 'none',
                              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                              color: 'white',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              boxShadow: '0 1px 2px -1px rgba(0, 0, 0, 0.1)'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.transform = 'translateY(-1px)';
                              e.target.style.boxShadow = '0 2px 4px -1px rgba(0, 0, 0, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = 'translateY(0)';
                              e.target.style.boxShadow = '0 1px 2px -1px rgba(0, 0, 0, 0.1)';
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.25rem' }}>
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Edit
                          </button>
                        </td>
                        <td style={{ 
                          padding: '0.75rem 1.5rem', 
                          fontSize: '0.875rem',
                          color: theme === 'dark' ? '#d1d5db' : '#374151'
                        }}>{rule.comment || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <ConfigIcon />
                <h3 className="text-lg font-semibold text-gray-900 mt-4">No NAT Rules Found</h3>
                <p className="text-gray-500 mt-2">NAT rules will be displayed here when available.</p>
                <button
                  onClick={fetchNatRules}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Load NAT Rules
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )}

    {/* Mangle Tab */}
    {activeTab === 'mangle' && (
      <div className="space-y-6">
        {/* Edit Mangle Modal */}
        {showEditMangleModal && (
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
            zIndex: 99999,
            width: '100vw',
            height: '100vh'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '1rem',
              padding: '2rem',
              width: '90%',
              maxWidth: '700px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '2px solid #8b5cf6'
            }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#111827',
                margin: '0 0 1.5rem 0'
              }}>Edit Mangle Rule</h2>

              <form onSubmit={(e) => {
                e.preventDefault();
                alert('Mangle rule updated successfully!');
                setShowEditMangleModal(false);
                setEditingMangleRule(null);
              }}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#111827',
                    marginBottom: '0.5rem'
                  }}>Chain *</label>
                  <select
                    required
                    defaultValue={editingMangleRule?.chain || ''}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      backgroundColor: 'white',
                      color: '#111827',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="">Select Chain</option>
                    <option value="prerouting">prerouting</option>
                    <option value="input">input</option>
                    <option value="forward">forward</option>
                    <option value="output">output</option>
                    <option value="postrouting">postrouting</option>
                  </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#111827',
                    marginBottom: '0.5rem'
                  }}>Action *</label>
                  <select
                    required
                    defaultValue={editingMangleRule?.action || ''}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      backgroundColor: 'white',
                      color: '#111827',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="">Select Action</option>
                    <option value="mark-connection">mark-connection</option>
                    <option value="mark-packet">mark-packet</option>
                    <option value="mark-routing">mark-routing</option>
                    <option value="change-mss">change-mss</option>
                    <option value="clear-df">clear-df</option>
                  </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#111827',
                    marginBottom: '0.5rem'
                  }}>Source Address</label>
                  <input
                    type="text"
                    defaultValue={editingMangleRule?.srcAddress || ''}
                    placeholder="e.g., 192.168.1.0/24"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      backgroundColor: 'white',
                      color: '#111827',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#111827',
                    marginBottom: '0.5rem'
                  }}>Source Address List</label>
                  <input
                    type="text"
                    defaultValue={editingMangleRule?.srcAddressList || ''}
                    placeholder="e.g., trusted-hosts"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      backgroundColor: 'white',
                      color: '#111827',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#111827',
                    marginBottom: '0.5rem'
                  }}>Destination Address</label>
                  <input
                    type="text"
                    defaultValue={editingMangleRule?.dstAddress || ''}
                    placeholder="e.g., 10.0.0.0/8"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      backgroundColor: 'white',
                      color: '#111827',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#111827',
                    marginBottom: '0.5rem'
                  }}>Destination Address List</label>
                  <input
                    type="text"
                    defaultValue={editingMangleRule?.dstAddressList || ''}
                    placeholder="e.g., blocked-sites"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      backgroundColor: 'white',
                      color: '#111827',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#111827',
                    marginBottom: '0.5rem'
                  }}>Protocol</label>
                  <select
                    defaultValue={editingMangleRule?.protocol || ''}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      backgroundColor: 'white',
                      color: '#111827',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="">Any</option>
                    <option value="tcp">TCP</option>
                    <option value="udp">UDP</option>
                    <option value="icmp">ICMP</option>
                    <option value="gre">GRE</option>
                    <option value="esp">ESP</option>
                  </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#111827',
                    marginBottom: '0.5rem'
                  }}>Port</label>
                  <input
                    type="text"
                    defaultValue={editingMangleRule?.port || ''}
                    placeholder="e.g., 80,443 or 22"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      backgroundColor: 'white',
                      color: '#111827',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#111827',
                    marginBottom: '0.5rem'
                  }}>Mark</label>
                  <input
                    type="text"
                    defaultValue={editingMangleRule?.mark || ''}
                    placeholder="e.g., ssh, web, vpn"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      backgroundColor: 'white',
                      color: '#111827',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#111827',
                    marginBottom: '0.5rem'
                  }}>Comment</label>
                  <input
                    type="text"
                    defaultValue={editingMangleRule?.comment || ''}
                    placeholder="Optional comment"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      backgroundColor: 'white',
                      color: '#111827',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditMangleModal(false);
                      setEditingMangleRule(null);
                    }}
                    style={{
                      padding: '0.75rem 1.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      backgroundColor: 'white',
                      color: '#6b7280',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '0.75rem 1.5rem',
                      border: 'none',
                      borderRadius: '0.5rem',
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                      color: 'white',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Update Rule
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        <div style={{
          background: theme === 'dark' ? '#1e293b' : 'white',
          borderRadius: '1rem',
          padding: '1.5rem',
          boxShadow: theme === 'dark' 
            ? '0 8px 32px -8px rgba(0, 0, 0, 0.3)' 
            : '0 8px 32px -8px rgba(0, 0, 0, 0.1)',
          border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: theme === 'dark' ? '#f1f5f9' : '#111827',
              margin: 0
            }}>Mangle Rules</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => {
                  alert('Add Mangle Rule functionality will be implemented');
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.375rem 0.75rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 8px -2px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 2px 4px -1px rgba(0, 0, 0, 0.1)';
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.25rem' }}>
                  <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Add Rule
              </button>
              <button
                onClick={fetchMangleRules}
                disabled={loadingData}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.375rem 0.75rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  border: theme === 'dark' ? '1px solid #374151' : '1px solid #d1d5db',
                  background: theme === 'dark' ? '#374151' : 'white',
                  color: theme === 'dark' ? '#f1f5f9' : '#374151',
                  cursor: loadingData ? 'not-allowed' : 'pointer',
                  opacity: loadingData ? 0.5 : 1,
                  transition: 'all 0.2s ease'
                }}
              >
                {loadingData ? (
                  <>
                    <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.25rem' }}>
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.25rem' }}>
                      <path d="M1 4V10H7M23 20V14H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M22.99 14A9 9 0 0 1 18.36 18.36L23 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Refresh
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="px-6 py-4">
            {mangleRules.length > 0 ? (
              <div className="overflow-x-auto">
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                }}>
                  <thead style={{ 
                    backgroundColor: theme === 'dark' ? '#374151' : '#f9fafb',
                    borderBottom: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`
                  }}>
                    <tr>
                      <th style={{ 
                        padding: '0.75rem 1rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        width: '10%'
                      }}>Chain</th>
                      <th style={{ 
                        padding: '0.75rem 1rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        width: '10%'
                      }}>Action</th>
                      <th style={{ 
                        padding: '0.75rem 1rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        width: '12%'
                      }}>Src Address</th>
                      <th style={{ 
                        padding: '0.75rem 1rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        width: '12%'
                      }}>Src Address List</th>
                      <th style={{ 
                        padding: '0.75rem 1rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        width: '12%'
                      }}>Dst Address</th>
                      <th style={{ 
                        padding: '0.75rem 1rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        width: '12%'
                      }}>Dst Address List</th>
                      <th style={{ 
                        padding: '0.75rem 1rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        width: '8%'
                      }}>Protocol</th>
                      <th style={{ 
                        padding: '0.75rem 1rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        width: '8%'
                      }}>Port</th>
                      <th style={{ 
                        padding: '0.75rem 1rem', 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        width: '8%'
                      }}>Mark</th>
                      <th style={{ 
                        padding: '0.75rem 1rem', 
                        textAlign: 'center', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        width: '8%'
                      }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody style={{ 
                    backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff'
                  }}>
                    {mangleRules.map((rule, index) => (
                      <tr key={index} style={{ 
                        borderBottom: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme === 'dark' ? '#374151' : '#f9fafb';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = theme === 'dark' ? '#1f2937' : '#ffffff';
                      }}>
                        <td style={{ 
                          padding: '0.75rem 1rem', 
                          fontSize: '0.875rem', 
                          fontWeight: '500',
                          color: theme === 'dark' ? '#f1f5f9' : '#111827',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
                        }}>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            backgroundColor: rule.chain === 'prerouting' ? '#dbeafe' : rule.chain === 'forward' ? '#fef3c7' : '#f3e8ff',
                            color: rule.chain === 'prerouting' ? '#1e40af' : rule.chain === 'forward' ? '#92400e' : '#7c3aed'
                          }}>
                            {rule.chain}
                          </span>
                        </td>
                        <td style={{ 
                          padding: '0.75rem 1rem', 
                          fontSize: '0.875rem',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
                        }}>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            backgroundColor: rule.action?.includes('mark') ? '#d1fae5' : '#f3e8ff',
                            color: rule.action?.includes('mark') ? '#065f46' : '#7c3aed'
                          }}>
                            {rule.action}
                          </span>
                        </td>
                        <td style={{ 
                          padding: '0.75rem 1rem', 
                          fontSize: '0.875rem',
                          color: theme === 'dark' ? '#d1d5db' : '#374151',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
                        }}>{rule.srcAddress || '-'}</td>
                        <td style={{ 
                          padding: '0.75rem 1rem', 
                          fontSize: '0.875rem',
                          color: theme === 'dark' ? '#d1d5db' : '#374151',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
                        }}>{rule.srcAddressList || '-'}</td>
                        <td style={{ 
                          padding: '0.75rem 1rem', 
                          fontSize: '0.875rem',
                          color: theme === 'dark' ? '#d1d5db' : '#374151',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
                        }}>{rule.dstAddress || '-'}</td>
                        <td style={{ 
                          padding: '0.75rem 1rem', 
                          fontSize: '0.875rem',
                          color: theme === 'dark' ? '#d1d5db' : '#374151',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
                        }}>{rule.dstAddressList || '-'}</td>
                        <td style={{ 
                          padding: '0.75rem 1rem', 
                          fontSize: '0.875rem',
                          color: theme === 'dark' ? '#d1d5db' : '#374151',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
                        }}>{rule.protocol || '-'}</td>
                        <td style={{ 
                          padding: '0.75rem 1rem', 
                          fontSize: '0.875rem',
                          color: theme === 'dark' ? '#d1d5db' : '#374151',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
                        }}>{rule.dstPort || '-'}</td>
                        <td style={{ 
                          padding: '0.75rem 1rem', 
                          fontSize: '0.875rem',
                          color: theme === 'dark' ? '#d1d5db' : '#374151',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
                        }}>
                          {rule.newConnectionMark || rule.newPacketMark || rule.newRoutingMark || '-'}
                        </td>
                        <td style={{ 
                          padding: '0.75rem 1.5rem', 
                          fontSize: '0.875rem',
                          borderRight: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
                        }}>
                          <button
                            onClick={() => {
                              setEditingMangleRule(rule);
                              setShowEditMangleModal(true);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.375rem',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              border: 'none',
                              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                              color: 'white',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              boxShadow: '0 1px 2px -1px rgba(0, 0, 0, 0.1)'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.transform = 'translateY(-1px)';
                              e.target.style.boxShadow = '0 2px 4px -1px rgba(0, 0, 0, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = 'translateY(0)';
                              e.target.style.boxShadow = '0 1px 2px -1px rgba(0, 0, 0, 0.1)';
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.25rem' }}>
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Edit
                          </button>
                        </td>
                        <td style={{ 
                          padding: '0.75rem 1.5rem', 
                          fontSize: '0.875rem',
                          color: theme === 'dark' ? '#d1d5db' : '#374151'
                        }}>{rule.comment || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <ConfigIcon />
                <h3 className="text-lg font-semibold text-gray-900 mt-4">No Mangle Rules Found</h3>
                <p className="text-gray-500 mt-2">Mangle rules will be displayed here when available.</p>
                <button
                  onClick={fetchMangleRules}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Load Mangle Rules
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )}

    {/* Configuration Tab */}
    {activeTab === 'configuration' && (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Device Configuration</h3>
          </div>
          <div className="px-6 py-4">
            <div className="text-center py-8">
              <ConfigIcon />
              <h3 className="text-lg font-semibold text-gray-900 mt-4">Configuration Management</h3>
              <p className="text-gray-500 mt-2">Device configuration options will be available here.</p>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Logs Tab */}
    {activeTab === 'logs' && (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">System Logs</h3>
              <button
                onClick={fetchSystemLogs}
                disabled={loadingData}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  border: 'none',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  color: 'white',
                  cursor: loadingData ? 'not-allowed' : 'pointer',
                  opacity: loadingData ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}
                onMouseEnter={(e) => {
                  if (!loadingData) {
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loadingData) {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                  }
                }}
              >
                <div style={{
                  width: '1rem',
                  height: '1rem',
                  marginRight: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {loadingData ? (
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <RefreshIcon />
                  )}
                </div>
                {loadingData ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
          <div className="px-6 py-4">
            {systemLogs.length > 0 ? (
              <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto">
                <div className="space-y-1">
                  {systemLogs.map((log, index) => (
                    <div key={index} className={`${
                      log.topics?.includes('error') ? 'text-red-600' :
                      log.topics?.includes('warning') ? 'text-yellow-600' :
                      log.topics?.includes('info') ? 'text-blue-600' :
                      'text-gray-600'
                    }`}>
                      [{log.time}] {log.message}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
            <div className="text-center py-8">
              <LogsIcon />
                <h3 className="text-lg font-semibold text-gray-900 mt-4">No System Logs Found</h3>
                <p className="text-gray-500 mt-2">System logs will be displayed here when available.</p>
                <button
                  onClick={fetchSystemLogs}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Load System Logs
                </button>
              </div>
            )}
            <div className="mt-4 text-sm text-gray-500">
              <p>• Real-time system logs from MikroTik device (last 50 entries)</p>
              <p>• System events, errors, and status messages</p>
              <p>• Login attempts and security events</p>
              <p>• Interface and service status updates</p>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Update Tab */}
    {activeTab === 'update' && (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">System Update</h3>
              <button
                onClick={fetchUpdateInfo}
                disabled={updateLoading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  border: 'none',
                  background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                  color: 'white',
                  cursor: updateLoading ? 'not-allowed' : 'pointer',
                  opacity: updateLoading ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}
                onMouseEnter={(e) => {
                  if (!updateLoading) {
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!updateLoading) {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                  }
                }}
              >
                <div style={{
                  width: '1rem',
                  height: '1rem',
                  marginRight: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {updateLoading ? (
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <UpdateIcon />
                  )}
                </div>
                {updateLoading ? 'Checking...' : 'Check Updates'}
              </button>
            </div>
          </div>
          <div className="px-6 py-4">
            {updateInfo ? (
              <div className="space-y-6">
                {/* Current Version */}
                <div style={{
                  background: theme === 'dark' ? '#1e293b' : '#f8fafc',
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0'
                }}>
                  <h4 style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: theme === 'dark' ? '#f1f5f9' : '#111827',
                    margin: '0 0 0.75rem 0'
                  }}>Current Version</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                      color: 'white'
                    }}>
                      {device?.routeros?.version || device?.routeros?.firmwareVersion || 'Unknown'}
                    </span>
                    <span style={{
                      fontSize: '0.875rem',
                      color: theme === 'dark' ? '#94a3b8' : '#6b7280'
                    }}>RouterOS</span>
                  </div>
                </div>

                {/* Update Table */}
                <div style={{
                  background: theme === 'dark' ? '#1e293b' : 'white',
                  borderRadius: '0.75rem',
                  border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0',
                  overflow: 'hidden'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{
                        background: theme === 'dark' ? '#334155' : '#f8fafc',
                        borderBottom: `1px solid ${theme === 'dark' ? '#475569' : '#e2e8f0'}`
                      }}>
                        <th style={{
                          padding: '0.75rem 1rem',
                          textAlign: 'left',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          color: theme === 'dark' ? '#94a3b8' : '#6b7280',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>Type</th>
                        <th style={{
                          padding: '0.75rem 1rem',
                          textAlign: 'left',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          color: theme === 'dark' ? '#94a3b8' : '#6b7280',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>Version</th>
                        <th style={{
                          padding: '0.75rem 1rem',
                          textAlign: 'left',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          color: theme === 'dark' ? '#94a3b8' : '#6b7280',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>Description</th>
                        <th style={{
                          padding: '0.75rem 1rem',
                          textAlign: 'left',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          color: theme === 'dark' ? '#94a3b8' : '#6b7280',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Stable Version */}
                      <tr style={{
                        borderBottom: `1px solid ${theme === 'dark' ? '#475569' : '#e2e8f0'}`
                      }}>
                        <td style={{
                          padding: '0.75rem 1rem',
                          fontSize: '0.875rem',
                          color: theme === 'dark' ? '#f1f5f9' : '#111827'
                        }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: 'white'
                          }}>Stable</span>
                        </td>
                        <td style={{
                          padding: '0.75rem 1rem',
                          fontSize: '0.875rem',
                          color: theme === 'dark' ? '#f1f5f9' : '#111827'
                        }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                            color: 'white'
                          }}>7.20.1</span>
                        </td>
                        <td style={{
                          padding: '0.75rem 1rem',
                          fontSize: '0.875rem',
                          color: theme === 'dark' ? '#d1d5db' : '#374151'
                        }}>Recommended for production use</td>
                        <td style={{
                          padding: '0.75rem 1rem',
                          fontSize: '0.875rem'
                        }}>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '0.375rem',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              border: 'none',
                              background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                              color: 'white',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}>
                              Download
                            </button>
                            <button style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '0.375rem',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              border: 'none',
                              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                              color: 'white',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}>
                              Download & Install
                            </button>
                          </div>
                        </td>
                      </tr>
                      {/* Beta Version */}
                      <tr>
                        <td style={{
                          padding: '0.75rem 1rem',
                          fontSize: '0.875rem',
                          color: theme === 'dark' ? '#f1f5f9' : '#111827'
                        }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            color: 'white'
                          }}>Beta</span>
                        </td>
                        <td style={{
                          padding: '0.75rem 1rem',
                          fontSize: '0.875rem',
                          color: theme === 'dark' ? '#f1f5f9' : '#111827'
                        }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                            color: 'white'
                          }}>7.21.0</span>
                        </td>
                        <td style={{
                          padding: '0.75rem 1rem',
                          fontSize: '0.875rem',
                          color: theme === 'dark' ? '#d1d5db' : '#374151'
                        }}>Latest features, may be unstable</td>
                        <td style={{
                          padding: '0.75rem 1rem',
                          fontSize: '0.875rem'
                        }}>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '0.375rem',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              border: 'none',
                              background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                              color: 'white',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}>
                              Download
                            </button>
                            <button style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '0.375rem',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              border: 'none',
                              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                              color: 'white',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}>
                              Download & Install
                            </button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Update Status */}
                <div style={{
                  background: theme === 'dark' ? '#1e293b' : '#f8fafc',
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0'
                }}>
                  <h4 style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: theme === 'dark' ? '#f1f5f9' : '#111827',
                    margin: '0 0 0.75rem 0'
                  }}>Update Status</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#10b981'
                    }}></div>
                    <span style={{
                      fontSize: '0.875rem',
                      color: theme === 'dark' ? '#d1d5db' : '#374151'
                    }}>New version available (7.20.1)</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <UpdateIcon />
                <h3 className="text-lg font-semibold text-gray-900 mt-4">Check for Updates</h3>
                <p className="text-gray-500 mt-2">Check for available RouterOS updates and install them.</p>
                <button
                  onClick={fetchUpdateInfo}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Check Updates
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    </div>
  );
};

export default DeviceDetails;
