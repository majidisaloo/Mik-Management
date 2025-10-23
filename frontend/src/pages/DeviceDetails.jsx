import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { createPortal } from 'react-dom';

const DeviceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  
  // Debug logging
  console.log('DeviceDetails component loaded with ID:', id);
  console.log('Current location:', location.pathname);
  
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [activeIpTab, setActiveIpTab] = useState('ipv4');
  const [activeRouteTab, setActiveRouteTab] = useState('v4');
  const [ipSearchTerm, setIpSearchTerm] = useState('');
  const [interfaces, setInterfaces] = useState([]);
  const [ipAddresses, setIpAddresses] = useState([]);
  const [ipv6Addresses, setIpv6Addresses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [ipv6Routes, setIpv6Routes] = useState([]);
  const [routeMarks, setRouteMarks] = useState([]);
  const [firewallRules, setFirewallRules] = useState([]);
  const [natRules, setNatRules] = useState([]);
  const [mangleRules, setMangleRules] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
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
  
  // Loading states
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Modal states
  const [showAddIpModal, setShowAddIpModal] = useState(false);
  const [showEditIpModal, setShowEditIpModal] = useState(false);
  const [editingIp, setEditingIp] = useState(null);
  const [showAddInterfaceModal, setShowAddInterfaceModal] = useState(false);
  const [showEditInterfaceModal, setShowEditInterfaceModal] = useState(false);
  const [editingInterface, setEditingInterface] = useState(null);
  const [showAddRouteModal, setShowAddRouteModal] = useState(false);
  const [showEditRouteModal, setShowEditRouteModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [showAddFirewallModal, setShowAddFirewallModal] = useState(false);
  const [showEditFirewallModal, setShowEditFirewallModal] = useState(false);
  const [editingFirewall, setEditingFirewall] = useState(null);
  const [showEditMangleModal, setShowEditMangleModal] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    address: '',
    network: '',
    networkEnabled: false,
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
    action: 'accept',
    // Interface fields
    interfaceName: '',
    interfaceType: '',
    // Tunnel specific fields
    tunnelLocalIp: '',
    tunnelRemoteIp: '',
    tunnelKeepAliveEnabled: false,
    tunnelKeepAlive: '',
    tunnelAllowFastPath: false,
    tunnelSecretKey: '',
    tunnelId: ''
  });

  useEffect(() => {
    loadDevice();
    
    // Cleanup function to stop safe mode status check when component unmounts
    return () => {
      stopSafeModeStatusCheck();
    };
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
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/mikrotiks/${id}/interfaces`);
      if (response.ok) {
        const data = await response.json();
        let interfaces = data.interfaces || [];
        
        // Fetch detailed information for tunnel interfaces
        const tunnelTypes = ['eoip', 'eoipv6-', 'gre', 'gre6-tunnel', 'ipip', 'ipipv6-tunnel', 'l2tp', 'pptp', 'sstp'];
        const tunnelInterfaces = interfaces.filter(iface => 
          tunnelTypes.includes(iface.type) || iface.type.includes('tunnel')
        );
        
        // Fetch details for each tunnel interface
        const enhancedInterfaces = await Promise.all(
          interfaces.map(async (iface) => {
            if (tunnelTypes.includes(iface.type) || iface.type.includes('tunnel')) {
              try {
                const detailResponse = await fetch(`/api/mikrotiks/${id}/interface-details?name=${encodeURIComponent(iface.name)}`);
                if (detailResponse.ok) {
                  const detailData = await detailResponse.json();
                  console.log(`Details for ${iface.name}:`, detailData);
                  if (detailData.details) {
                    return {
                      ...iface,
                      tunnelLocalIp: detailData.details.tunnelLocalIp,
                      tunnelRemoteIp: detailData.details.tunnelRemoteIp,
                      tunnelKeepAlive: detailData.details.tunnelKeepAlive,
                      tunnelKeepAliveEnabled: detailData.details.tunnelKeepAliveEnabled,
                      tunnelSecretKey: detailData.details.tunnelSecretKey,
                      tunnelId: detailData.details.tunnelId
                    };
                  }
                }
              } catch (error) {
                console.error(`Error fetching details for interface ${iface.name}:`, error);
              }
            }
            return iface;
          })
        );
        
        console.log('Enhanced interfaces:', enhancedInterfaces);
        setInterfaces(enhancedInterfaces);
      }
    } catch (err) {
      console.error('Error loading interfaces:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadIpAddresses = async () => {
    setIsRefreshing(true);
    try {
      console.log('Loading IP addresses...');
      const response = await fetch(`/api/mikrotiks/${id}/ip-addresses?t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        const addresses = data.ipAddresses || [];
        console.log('Loaded IP addresses:', addresses);
        
        // Separate IPv4 and IPv6 addresses
        const ipv4Addresses = addresses.filter(addr => 
          addr.address && !addr.address.includes(':') && !addr.address.includes('::')
        );
        const ipv6Addresses = addresses.filter(addr => 
          addr.address && (addr.address.includes(':') || addr.address.includes('::'))
        );
        
        console.log('IPv4 addresses:', ipv4Addresses);
        console.log('IPv6 addresses:', ipv6Addresses);
        
        setIpAddresses(ipv4Addresses);
        setIpv6Addresses(ipv6Addresses);
      }
    } catch (err) {
      console.error('Error loading IP addresses:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadRoutes = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/mikrotiks/${id}/routes`);
      if (response.ok) {
        const data = await response.json();
        const routes = data.routes || [];
        
        // Separate IPv4 and IPv6 routes
        const ipv4Routes = routes.filter(route => 
          route.dstAddress && !route.dstAddress.includes(':') && !route.dstAddress.includes('::')
        );
        const ipv6Routes = routes.filter(route => 
          route.dstAddress && (route.dstAddress.includes(':') || route.dstAddress.includes('::'))
        );
        
        setRoutes(ipv4Routes);
        setIpv6Routes(ipv6Routes);
        
        // Extract unique route marks from all routes
        const marks = [...new Set(routes.map(route => route.mark).filter(mark => mark && mark !== ''))];
        setRouteMarks(marks);
      }
    } catch (err) {
      console.error('Error loading routes:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadFirewallRules = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/mikrotiks/${id}/firewall`);
      if (response.ok) {
        const data = await response.json();
        setFirewallRules(data.rules || []);
      }
    } catch (err) {
      console.error('Error loading firewall rules:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadNatRules = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/mikrotiks/${id}/nat`);
      if (response.ok) {
        const data = await response.json();
        setNatRules(data.rules || []);
      }
    } catch (err) {
      console.error('Error loading NAT rules:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadMangleRules = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/mikrotiks/${id}/mangle`);
      if (response.ok) {
        const data = await response.json();
        setMangleRules(data.rules || []);
      }
    } catch (err) {
      console.error('Error loading mangle rules:', err);
    } finally {
      setIsRefreshing(false);
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
      console.log('Loading update info for device ID:', id);
      const response = await fetch(`/api/mikrotiks/${id}/update-info`);
      console.log('Update info response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Update info data:', data);
        setUpdateInfo(data);
      } else {
        console.error('Update info response not ok:', response.status);
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
        setFormData({ address: '', network: '', networkEnabled: false, interface: '', comment: '' });
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

  const handleEditIpAddress = async (e) => {
    e.preventDefault();
    console.log('Editing IP address with formData:', formData);
    try {
      const response = await fetch(`/api/mikrotiks/${id}/ip-addresses`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: formData.address,
          network: formData.network || '',
          interface: formData.interface || '',
          comment: formData.comment || '',
          disabled: formData.disabled || false,
          routerosId: formData.routerosId
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('IP address updated successfully:', result);
        console.log('Reloading IP addresses...');
        await loadIpAddresses();
        await loadSystemLogs();
        setShowEditIpModal(false);
        setEditingIp(null);
        setFormData({ address: '', network: '', networkEnabled: false, interface: '', comment: '' });
        alert('IP address updated successfully!');
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
          comment: formData.comment || ''
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

  const handleEditRoute = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/mikrotiks/${id}/routes/${editingRoute.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          destination: formData.destination,
          gateway: formData.gateway,
          interface: formData.interface,
          distance: formData.distance,
          markRoute: formData.markRoute,
          comment: formData.comment || '',
          disabled: formData.disabled || false
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Route updated successfully:', result);
        await loadRoutes();
        await loadSystemLogs();
        setShowEditRouteModal(false);
        setEditingRoute(null);
        setFormData({ ...formData, destination: '', gateway: '', distance: '', markRoute: '', comment: '' });
        alert('Route updated successfully!');
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

  const handleEditInterface = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/mikrotiks/${id}/interfaces/${editingInterface.name}`, {
        method: 'PUT',
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
        console.log('Interface updated successfully:', result);
        await loadInterfaces();
        await loadSystemLogs();
        setShowEditInterfaceModal(false);
        setEditingInterface(null);
        setFormData({ ...formData, interfaceName: '', interfaceType: '', comment: '' });
        alert('Interface updated successfully!');
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

  const handleDownloadUpdate = async (channel = 'stable') => {
    setIsDownloading(true);
    
    // Simulate progress steps on frontend
    const progressSteps = [
      { step: 'Starting download...', progress: 5 },
      { step: 'Connecting to Mikrotik servers...', progress: 15 },
      { step: 'Checking available versions...', progress: 30 },
      { step: 'Downloading firmware package...', progress: 60 },
      { step: 'Verifying package integrity...', progress: 80 },
      { step: 'Saving to local storage...', progress: 95 }
    ];
    
    try {
      console.log(`Starting download for channel: ${channel}, device ID: ${id}`);
      
      // Validate device ID
      if (!id || isNaN(parseInt(id))) {
        throw new Error('Invalid device ID');
      }
      
      // Show progress steps
      for (const progressStep of progressSteps) {
        setDownloadProgress(progressStep);
        await new Promise(resolve => setTimeout(resolve, 800)); // Show each step for 800ms
      }
      
      const response = await fetch(`/api/mikrotiks/${id}/update/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channel }),
        // Increase timeout for download operation
        signal: AbortSignal.timeout(30000) // 30 seconds timeout
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('Download response:', data);
        
        setDownloadProgress({ 
          step: 'Download completed!', 
          progress: 100,
          fileSize: data.fileSize,
          downloadPath: data.downloadPath
        });
        
        // Show success message with beautiful modal
        setTimeout(() => {
          // Create a beautiful modal instead of simple alert
          const modal = document.createElement('div');
          modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            backdrop-filter: blur(4px);
          `;
          
          const modalContent = document.createElement('div');
          modalContent.style.cssText = `
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            border-radius: 20px;
            padding: 0;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            animation: modalSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            overflow: hidden;
            position: relative;
          `;
          
          // Add CSS animation
          const style = document.createElement('style');
          style.textContent = `
            @keyframes modalSlideIn {
              from { 
                opacity: 0; 
                transform: translateY(-30px) scale(0.9) rotateX(10deg); 
              }
              to { 
                opacity: 1; 
                transform: translateY(0) scale(1) rotateX(0deg); 
              }
            }
            @keyframes pulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.05); }
            }
            @keyframes float {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-10px); }
            }
          `;
          document.head.appendChild(style);
          
          modalContent.innerHTML = `
            <div style="
              background: rgba(255, 255, 255, 0.1);
              backdrop-filter: blur(10px);
              padding: 30px;
              text-align: center;
              position: relative;
            ">
              <!-- Download Icon with Animation -->
              <div style="
                width: 80px;
                height: 80px;
                background: linear-gradient(135deg, #3B82F6, #1D4ED8);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 20px;
                box-shadow: 0 10px 25px rgba(59, 130, 246, 0.3);
                animation: float 3s ease-in-out infinite;
                position: relative;
              ">
                <div style="
                  width: 60px;
                  height: 60px;
                  background: rgba(255, 255, 255, 0.2);
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  animation: pulse 2s ease-in-out infinite;
                ">
                  <span style="color: white; font-size: 32px; font-weight: bold;">📥</span>
                </div>
              </div>
              
              <!-- Title -->
              <h2 style="
                margin: 0 0 10px 0; 
                color: white; 
                font-size: 24px; 
                font-weight: 700;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
              ">Download Complete!</h2>
              
              <p style="
                margin: 0 0 25px 0; 
                color: rgba(255, 255, 255, 0.9); 
                font-size: 16px;
                line-height: 1.5;
              ">Update is ready for installation</p>
            </div>
            
            <!-- Content Section -->
            <div style="
              background: white;
              padding: 25px;
              border-radius: 0 0 20px 20px;
            ">
              <div style="
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-bottom: 25px;
              ">
                <div style="
                  background: linear-gradient(135deg, #f8fafc, #e2e8f0);
                  border-radius: 12px;
                  padding: 15px;
                  text-align: center;
                  border: 2px solid #e2e8f0;
                  transition: all 0.3s ease;
                " onmouseover="this.style.borderColor='#3B82F6'; this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='#e2e8f0'; this.style.transform='translateY(0)'">
                  <div style="color: #64748B; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Channel</div>
                  <div style="color: #1E293B; font-size: 16px; font-weight: 700;">${data.channel}</div>
                </div>
                
                <div style="
                  background: linear-gradient(135deg, #f8fafc, #e2e8f0);
                  border-radius: 12px;
                  padding: 15px;
                  text-align: center;
                  border: 2px solid #e2e8f0;
                  transition: all 0.3s ease;
                " onmouseover="this.style.borderColor='#3B82F6'; this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='#e2e8f0'; this.style.transform='translateY(0)'">
                  <div style="color: #64748B; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Device</div>
                  <div style="color: #1E293B; font-size: 16px; font-weight: 700;">${data.deviceName}</div>
                </div>
                
                <div style="
                  background: linear-gradient(135deg, #f8fafc, #e2e8f0);
                  border-radius: 12px;
                  padding: 15px;
                  text-align: center;
                  border: 2px solid #e2e8f0;
                  transition: all 0.3s ease;
                " onmouseover="this.style.borderColor='#3B82F6'; this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='#e2e8f0'; this.style.transform='translateY(0)'">
                  <div style="color: #64748B; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">IP Address</div>
                  <div style="color: #1E293B; font-size: 16px; font-weight: 700;">${data.deviceIP}</div>
                </div>
                
                <div style="
                  background: linear-gradient(135deg, #fef3c7, #fde68a);
                  border-radius: 12px;
                  padding: 15px;
                  text-align: center;
                  border: 2px solid #f59e0b;
                  transition: all 0.3s ease;
                " onmouseover="this.style.borderColor='#D97706'; this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='#f59e0b'; this.style.transform='translateY(0)'">
                  <div style="color: #92400E; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Status</div>
                  <div style="color: #B45309; font-size: 16px; font-weight: 700;">📥 Ready</div>
                </div>
              </div>
              
              <!-- Action Button -->
              <div style="text-align: center;">
                <button id="closeModal" style="
                  background: linear-gradient(135deg, #3B82F6, #1D4ED8);
                  color: white;
                  border: none;
                  border-radius: 12px;
                  padding: 12px 30px;
                  font-size: 16px;
                  font-weight: 600;
                  cursor: pointer;
                  transition: all 0.3s ease;
                  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                " onmouseover="this.style.background='linear-gradient(135deg, #1D4ED8, #1E40AF)'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(59, 130, 246, 0.4)'" onmouseout="this.style.background='linear-gradient(135deg, #3B82F6, #1D4ED8)'; this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(59, 130, 246, 0.3)'">
                  ✨ Close
                </button>
              </div>
            </div>
          `;
          
          modal.appendChild(modalContent);
          document.body.appendChild(modal);
          
          // Close modal functionality
          const closeModal = () => {
            modal.style.animation = 'modalSlideIn 0.3s ease-out reverse';
            setTimeout(() => {
              document.body.removeChild(modal);
              document.head.removeChild(style);
            }, 300);
          };
          
          modalContent.querySelector('#closeModal').onclick = closeModal;
          modal.onclick = (e) => {
            if (e.target === modal) closeModal();
          };
          
          setDownloadProgress(null);
        }, 1000);
      } else {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        let errorMessage = 'Unknown error';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = errorText || `HTTP ${response.status}`;
        }
        alert(`❌ Download failed: ${errorMessage}`);
        setDownloadProgress(null);
      }
    } catch (err) {
        console.error('Network error:', err);
        if (err.name === 'TimeoutError') {
          alert(`❌ Download timeout: The operation took too long.\n\nThis might be normal for large files. Please try again.`);
        } else if (err.name === 'AbortError') {
          alert(`❌ Download cancelled: The operation was cancelled.`);
        } else {
          alert(`❌ Network error: ${err.message}\n\nPlease check if the backend server is running on port 5001.`);
        }
        setDownloadProgress(null);
      } finally {
        setIsDownloading(false);
      }
  };

  const handleDownloadAndInstallUpdate = async (channel = 'stable') => {
    setIsInstalling(true);
    
    // Simulate progress steps for download + install + reboot
    const progressSteps = [
      { step: 'Starting download + install + reboot...', progress: 5 },
      { step: 'Connecting to Mikrotik servers...', progress: 10 },
      { step: 'Checking available versions...', progress: 20 },
      { step: 'Downloading firmware package...', progress: 35 },
      { step: 'Verifying package integrity...', progress: 45 },
      { step: 'Preparing installation...', progress: 55 },
      { step: 'Backing up current configuration...', progress: 65 },
      { step: 'Installing new firmware...', progress: 75 },
      { step: 'Verifying installation...', progress: 85 },
      { step: 'Saving configuration...', progress: 90 },
      { step: 'Initiating reboot sequence...', progress: 95 }
    ];
    
    try {
      console.log(`Starting download + install for channel: ${channel}, device ID: ${id}`);
      
      // Validate device ID
      if (!id || isNaN(parseInt(id))) {
        throw new Error('Invalid device ID');
      }
      
      // Show progress steps
      for (const progressStep of progressSteps) {
        setDownloadProgress(progressStep);
        await new Promise(resolve => setTimeout(resolve, 600)); // Show each step for 600ms
      }
      
      const response = await fetch(`/api/mikrotiks/${id}/update/install`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channel }),
        // Increase timeout for install operation
        signal: AbortSignal.timeout(60000) // 60 seconds timeout
      });

      console.log('Install response status:', response.status);
      console.log('Install response ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('Install response:', data);
        
        setDownloadProgress({ 
          step: 'Installation and reboot completed!', 
          progress: 100,
          fileSize: data.fileSize,
          downloadPath: data.downloadPath
        });
        
        // Show success message with beautiful modal
        setTimeout(() => {
          // Create a beautiful modal instead of simple alert
          const modal = document.createElement('div');
          modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            backdrop-filter: blur(4px);
          `;
          
          const modalContent = document.createElement('div');
          modalContent.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 20px;
            padding: 0;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            animation: modalSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            overflow: hidden;
            position: relative;
          `;
          
          // Add CSS animation
          const style = document.createElement('style');
          style.textContent = `
            @keyframes modalSlideIn {
              from { 
                opacity: 0; 
                transform: translateY(-30px) scale(0.9) rotateX(10deg); 
              }
              to { 
                opacity: 1; 
                transform: translateY(0) scale(1) rotateX(0deg); 
              }
            }
            @keyframes pulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.05); }
            }
            @keyframes float {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-10px); }
            }
          `;
          document.head.appendChild(style);
          
          modalContent.innerHTML = `
            <div style="
              background: rgba(255, 255, 255, 0.1);
              backdrop-filter: blur(10px);
              padding: 30px;
              text-align: center;
              position: relative;
            ">
              <!-- Success Icon with Animation -->
              <div style="
                width: 80px;
                height: 80px;
                background: linear-gradient(135deg, #10B981, #059669);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 20px;
                box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
                animation: float 3s ease-in-out infinite;
                position: relative;
              ">
                <div style="
                  width: 60px;
                  height: 60px;
                  background: rgba(255, 255, 255, 0.2);
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  animation: pulse 2s ease-in-out infinite;
                ">
                  <span style="color: white; font-size: 32px; font-weight: bold;">✓</span>
                </div>
              </div>
              
              <!-- Title -->
              <h2 style="
                margin: 0 0 10px 0; 
                color: white; 
                font-size: 24px; 
                font-weight: 700;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
              ">Installation Complete!</h2>
              
              <p style="
                margin: 0 0 25px 0; 
                color: rgba(255, 255, 255, 0.9); 
                font-size: 16px;
                line-height: 1.5;
              ">Device has been rebooted and is ready to use</p>
            </div>
            
            <!-- Content Section -->
            <div style="
              background: white;
              padding: 25px;
              border-radius: 0 0 20px 20px;
            ">
              <div style="
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-bottom: 25px;
              ">
                <div style="
                  background: linear-gradient(135deg, #f8fafc, #e2e8f0);
                  border-radius: 12px;
                  padding: 15px;
                  text-align: center;
                  border: 2px solid #e2e8f0;
                  transition: all 0.3s ease;
                " onmouseover="this.style.borderColor='#3B82F6'; this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='#e2e8f0'; this.style.transform='translateY(0)'">
                  <div style="color: #64748B; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Channel</div>
                  <div style="color: #1E293B; font-size: 16px; font-weight: 700;">${data.channel}</div>
                </div>
                
                <div style="
                  background: linear-gradient(135deg, #f8fafc, #e2e8f0);
                  border-radius: 12px;
                  padding: 15px;
                  text-align: center;
                  border: 2px solid #e2e8f0;
                  transition: all 0.3s ease;
                " onmouseover="this.style.borderColor='#3B82F6'; this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='#e2e8f0'; this.style.transform='translateY(0)'">
                  <div style="color: #64748B; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Device</div>
                  <div style="color: #1E293B; font-size: 16px; font-weight: 700;">${data.deviceName}</div>
                </div>
                
                <div style="
                  background: linear-gradient(135deg, #f8fafc, #e2e8f0);
                  border-radius: 12px;
                  padding: 15px;
                  text-align: center;
                  border: 2px solid #e2e8f0;
                  transition: all 0.3s ease;
                " onmouseover="this.style.borderColor='#3B82F6'; this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='#e2e8f0'; this.style.transform='translateY(0)'">
                  <div style="color: #64748B; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">IP Address</div>
                  <div style="color: #1E293B; font-size: 16px; font-weight: 700;">${data.deviceIP}</div>
                </div>
                
                <div style="
                  background: linear-gradient(135deg, #f0fdf4, #dcfce7);
                  border-radius: 12px;
                  padding: 15px;
                  text-align: center;
                  border: 2px solid #bbf7d0;
                  transition: all 0.3s ease;
                " onmouseover="this.style.borderColor='#10B981'; this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='#bbf7d0'; this.style.transform='translateY(0)'">
                  <div style="color: #166534; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Status</div>
                  <div style="color: #15803d; font-size: 16px; font-weight: 700;">✅ Ready</div>
                </div>
              </div>
              
              <!-- Action Button -->
              <div style="text-align: center;">
                <button id="closeModal" style="
                  background: linear-gradient(135deg, #3B82F6, #1D4ED8);
                  color: white;
                  border: none;
                  border-radius: 12px;
                  padding: 12px 30px;
                  font-size: 16px;
                  font-weight: 600;
                  cursor: pointer;
                  transition: all 0.3s ease;
                  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                " onmouseover="this.style.background='linear-gradient(135deg, #1D4ED8, #1E40AF)'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(59, 130, 246, 0.4)'" onmouseout="this.style.background='linear-gradient(135deg, #3B82F6, #1D4ED8)'; this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(59, 130, 246, 0.3)'">
                  ✨ Close
                </button>
              </div>
            </div>
          `;
          
          modal.appendChild(modalContent);
          document.body.appendChild(modal);
          
          // Close modal functionality
          const closeModal = () => {
            modal.style.animation = 'modalSlideIn 0.3s ease-out reverse';
            setTimeout(() => {
              document.body.removeChild(modal);
              document.head.removeChild(style);
            }, 300);
          };
          
          modalContent.querySelector('#closeModal').onclick = closeModal;
          modal.onclick = (e) => {
            if (e.target === modal) closeModal();
          };
          
          setDownloadProgress(null);
        }, 1000);
      } else {
        const errorText = await response.text();
        console.error('Install error response:', errorText);
        let errorMessage = 'Unknown error';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = errorText || `HTTP ${response.status}`;
        }
        alert(`❌ Installation failed: ${errorMessage}`);
        setDownloadProgress(null);
      }
    } catch (err) {
        console.error('Install network error:', err);
        if (err.name === 'TimeoutError') {
          alert(`❌ Installation timeout: The operation took too long.\n\nThis might be normal for large updates. Please check the device status manually.`);
        } else if (err.name === 'AbortError') {
          alert(`❌ Installation cancelled: The operation was cancelled.`);
        } else {
          alert(`❌ Network error: ${err.message}\n\nPlease check if the backend server is running on port 5001.`);
        }
        setDownloadProgress(null);
      } finally {
        setIsInstalling(false);
    }
  };

  const handleEditFirewallRule = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/mikrotiks/${id}/firewall`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          routerosId: formData.routerosId,
          disabled: formData.disabled,
          comment: formData.comment || ''
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
        const result = await response.json();
        
        // Create beautiful safe mode result modal
        const modal = document.createElement('div');
        modal.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        const isSuccess = result.toggleSuccessful;
        const isNotSupported = result.status === 'not_supported';
        const statusColor = isNotSupported ? '#6b7280' : (isSuccess ? '#10b981' : '#f59e0b');
        const statusIcon = isNotSupported ? 'ℹ️' : (isSuccess ? '✅' : '⚠️');
        let statusText;
        if (isNotSupported) {
          statusText = 'Safe Mode Not Supported';
        } else if (isSuccess) {
          statusText = 'Safe Mode Toggle Successful';
        } else {
          statusText = 'Safe Mode Toggle Partially Successful';
        }

        modal.innerHTML = `
          <div style="
            background: white;
            border-radius: 12px;
            padding: 32px;
            max-width: 600px;
            width: 90%;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
            text-align: center;
          ">
            <div style="
              width: 64px;
              height: 64px;
              background: ${statusColor};
              border-radius: 50%;
              margin: 0 auto 24px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 32px;
            ">
              ${statusIcon}
            </div>
            <h2 style="
              margin: 0 0 16px 0;
              color: #1a1a1a;
              font-size: 24px;
              font-weight: 600;
            ">${statusText}</h2>
            <p style="
              margin: 0 0 24px 0;
              color: #666;
              font-size: 16px;
              line-height: 1.5;
            ">${result.message}</p>

            <div style="
              background: #f5f5f5;
              border-radius: 8px;
              padding: 16px;
              margin: 16px 0;
              font-size: 14px;
              color: #666;
              text-align: left;
            ">
              <div><strong>Device:</strong> ${result.deviceName} (${result.deviceIP})</div>
              <div><strong>Device Type:</strong> ${result.deviceType || 'Unknown'}</div>
              <div><strong>Safe Mode Supported:</strong> ${result.safeModeSupported ? '✅ Yes' : '❌ No'}</div>
              <div><strong>Initial Ping:</strong> ${result.initialPing ? '✅ Online' : '❌ Offline'}</div>
              ${result.safeModeSupported ? `
                <div><strong>Previous Safe Mode:</strong> ${result.currentSafeMode ? '✅ Enabled' : '❌ Disabled'}</div>
                <div><strong>New Safe Mode:</strong> ${result.newSafeMode ? '✅ Enabled' : '❌ Disabled'}</div>
                <div><strong>Change Verified:</strong> ${result.safeModeChanged ? '✅ Yes' : '❌ No'}</div>
              ` : `
                <div><strong>Note:</strong> Safe Mode is only available on RouterBoard hardware</div>
              `}
              <div><strong>Toggle Time:</strong> ${new Date(result.restartedAt).toLocaleString()}</div>
            </div>

            <button onclick="this.closest('.safe-mode-result-modal').remove()" style="
              background: ${statusColor};
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 500;
              cursor: pointer;
              transition: transform 0.2s;
            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
              Close
            </button>
          </div>
        `;

        modal.className = 'safe-mode-result-modal';
        document.body.appendChild(modal);

        // Auto-remove modal after 10 seconds
        setTimeout(() => {
          if (modal.parentNode) {
            modal.remove();
          }
        }, 10000);

        setSafeMode(result.newSafeMode);
        await loadSystemLogs();
        startSafeModeStatusCheck();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const checkSafeModeStatus = async () => {
      try {
      const response = await fetch(`/api/mikrotiks/${id}/safe-mode`);
        if (response.ok) {
        const data = await response.json();
        console.log(`🔍 Safe mode status check: ${data.enabled ? 'Enabled' : 'Disabled'} (Boot device: ${data.bootDevice})`);
        setSafeMode(data.enabled);
        }
      } catch (err) {
      console.error('Error checking safe mode status:', err);
    }
  };

  const startSafeModeStatusCheck = () => {
    // Clear any existing interval
    if (window.safeModeCheckInterval) {
      clearInterval(window.safeModeCheckInterval);
    }
    
    // Start checking every 10 seconds
    window.safeModeCheckInterval = setInterval(checkSafeModeStatus, 10000);
    console.log('🔄 Started safe mode status check every 10 seconds');
  };

  const stopSafeModeStatusCheck = () => {
    if (window.safeModeCheckInterval) {
      clearInterval(window.safeModeCheckInterval);
      window.safeModeCheckInterval = null;
      console.log('⏹️ Stopped safe mode status check');
    }
  };

  const handleRestartDevice = async () => {
    if (window.confirm('Are you sure you want to restart this device? This will disconnect the device temporarily.')) {
      try {
        const response = await fetch(`/api/mikrotiks/${id}/restart-with-ping`, {
        method: 'POST',
      });

      if (response.ok) {
          const result = await response.json();
          
          // Create beautiful restart result modal
          const modal = document.createElement('div');
          modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            backdrop-filter: blur(4px);
          `;
          
          const isSuccess = result.restartSuccessful;
          const statusColor = isSuccess ? '#10b981' : '#ef4444';
          const statusIcon = isSuccess ? '✅' : '❌';
          const statusText = isSuccess ? 'Restart Successful' : 'Restart Failed';
          
          const modalContent = document.createElement('div');
          modalContent.style.cssText = `
            background: linear-gradient(135deg, ${statusColor} 0%, ${isSuccess ? '#059669' : '#dc2626'} 100%);
            border-radius: 20px;
            padding: 0;
            max-width: 600px;
            width: 90%;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            animation: modalSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            overflow: hidden;
            position: relative;
          `;
          
          // Add CSS animation
          const style = document.createElement('style');
          style.textContent = `
            @keyframes modalSlideIn {
              from { 
                opacity: 0; 
                transform: translateY(-30px) scale(0.9) rotateX(10deg); 
              }
              to { 
                opacity: 1; 
                transform: translateY(0) scale(1) rotateX(0deg); 
              }
            }
            @keyframes pulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.05); }
            }
            @keyframes float {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-10px); }
            }
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `;
          document.head.appendChild(style);
          
          modalContent.innerHTML = `
            <div style="
              background: rgba(255, 255, 255, 0.1);
              backdrop-filter: blur(10px);
              padding: 30px;
              text-align: center;
              position: relative;
            ">
              <!-- Close Button (X) -->
              <button id="closeModalX" style="
                position: absolute;
                top: 15px;
                right: 15px;
                background: rgba(255, 255, 255, 0.2);
                border: none;
                border-radius: 50%;
                width: 35px;
                height: 35px;
                color: white;
                font-size: 18px;
                font-weight: bold;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                z-index: 10001;
              " onmouseover="this.style.background='rgba(255, 255, 255, 0.3)'; this.style.transform='scale(1.1)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'; this.style.transform='scale(1)'">
                ×
              </button>
              
              <!-- Status Icon -->
              <div style="
                width: 80px;
                height: 80px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 20px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
                animation: float 3s ease-in-out infinite;
                position: relative;
              ">
                <span style="color: white; font-size: 40px; font-weight: bold;">${statusIcon}</span>
              </div>
              
              <!-- Title -->
              <h2 style="
                margin: 0 0 10px 0; 
                color: white; 
                font-size: 24px; 
                font-weight: 700;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
              ">${statusText}</h2>
              
              <p style="
                margin: 0 0 25px 0; 
                color: rgba(255, 255, 255, 0.9); 
                font-size: 16px;
                line-height: 1.5;
              ">${result.message}</p>
            </div>
            
            <!-- Content Section -->
            <div style="
              background: white;
              padding: 25px;
              border-radius: 0 0 20px 20px;
            ">
              <div style="
                background: #f5f5f5;
                border-radius: 8px;
                padding: 16px;
                margin: 16px 0;
                font-size: 14px;
                color: #666;
                text-align: left;
              ">
                <div><strong>Device:</strong> ${result.deviceName} (${result.deviceIP})</div>
                <div><strong>Initial Ping:</strong> ${result.initialPing ? '✅ Online' : '❌ Offline'}</div>
                <div><strong>Offline Confirmed:</strong> ${result.offlineConfirmed ? '✅ Yes' : '❌ No'}</div>
                <div><strong>Online Confirmed:</strong> ${result.onlineConfirmed ? '✅ Yes' : '❌ No'}</div>
                <div><strong>Restart Time:</strong> ${new Date(result.restartedAt).toLocaleString()}</div>
              </div>
              
              <!-- Action Button -->
              <div style="text-align: center;">
                <button id="closeModal" style="
                  background: linear-gradient(135deg, ${statusColor}, ${isSuccess ? '#059669' : '#dc2626'});
                  color: white;
                  border: none;
                  border-radius: 12px;
                  padding: 12px 30px;
                  font-size: 16px;
                  font-weight: 600;
                  cursor: pointer;
                  transition: all 0.3s ease;
                  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(0, 0, 0, 0.3)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0, 0, 0, 0.2)'">
                  ✨ Close
                </button>
              </div>
            </div>
          `;
          
          modal.appendChild(modalContent);
          document.body.appendChild(modal);
          
          // Close modal functionality
          const closeModal = () => {
            modal.style.animation = 'modalSlideIn 0.3s ease-out reverse';
            setTimeout(() => {
              document.body.removeChild(modal);
              document.head.removeChild(style);
            }, 300);
          };
          
          modalContent.querySelector('#closeModal').onclick = closeModal;
          modalContent.querySelector('#closeModalX').onclick = closeModal;
          modal.onclick = (e) => {
            if (e.target === modal) closeModal();
          };
          
          // Auto-remove modal after 10 seconds
          setTimeout(() => {
            if (modal.parentNode) {
              closeModal();
            }
          }, 10000);
          
        await loadSystemLogs();
      } else {
        const error = await response.json();
          alert(`❌ Error: ${error.message}`);
      }
    } catch (err) {
        console.error('Error:', err);
        alert(`❌ Network Error: ${err.message}`);
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
        
        // Create a beautiful modal instead of simple alert
        const modal = document.createElement('div');
        modal.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
          background: white;
          border-radius: 12px;
          padding: 24px;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          animation: modalSlideIn 0.3s ease-out;
        `;
        
        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
          @keyframes modalSlideIn {
            from { opacity: 0; transform: translateY(-20px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `;
        document.head.appendChild(style);
        
        modalContent.innerHTML = `
          <div style="display: flex; align-items: center; margin-bottom: 20px;">
            <div style="
              width: 40px;
              height: 40px;
              background: #10B981;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-right: 12px;
            ">
              <span style="color: white; font-size: 20px;">✓</span>
            </div>
            <div>
              <h2 style="margin: 0; color: #1F2937; font-size: 18px; font-weight: 600;">Device Diagnosis Complete</h2>
              <p style="margin: 4px 0 0 0; color: #6B7280; font-size: 14px;">Current version: ${data.currentVersion}</p>
            </div>
          </div>
          
          <div style="background: #F9FAFB; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div>
                <div style="color: #6B7280; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Device Name</div>
                <div style="color: #1F2937; font-size: 14px; font-weight: 500;">${data.deviceName}</div>
              </div>
              <div>
                <div style="color: #6B7280; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">IP Address</div>
                <div style="color: #1F2937; font-size: 14px; font-weight: 500;">${data.deviceIP}</div>
              </div>
              <div>
                <div style="color: #6B7280; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Firmware Version</div>
                <div style="color: #1F2937; font-size: 14px; font-weight: 500;">${data.currentVersion}</div>
              </div>
              <div>
                <div style="color: #6B7280; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">System Name</div>
                <div style="color: #1F2937; font-size: 14px; font-weight: 500;">${data.systemInfo?.name || 'Unknown'}</div>
              </div>
            </div>
          </div>
          
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="color: #6B7280; font-size: 12px;">
              Diagnosed at: ${new Date(data.diagnosedAt).toLocaleString()}
            </div>
            <button id="closeModal" style="
              background: #3B82F6;
              color: white;
              border: none;
              border-radius: 6px;
              padding: 8px 16px;
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              transition: background-color 0.2s;
            " onmouseover="this.style.background='#2563EB'" onmouseout="this.style.background='#3B82F6'">
              Close
            </button>
          </div>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Close modal functionality
        const closeModal = () => {
          document.body.removeChild(modal);
          document.head.removeChild(style);
        };
        
        modalContent.querySelector('#closeModal').onclick = closeModal;
        modal.onclick = (e) => {
          if (e.target === modal) closeModal();
        };
        
        await loadSystemLogs();
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.message}`);
      }
    } catch (err) {
      console.error('Diagnose error:', err);
      alert(`❌ Network Error: ${err.message}`);
    }
  };

  const handleEnable = async () => {
    try {
      const response = await fetch(`/api/mikrotiks/${id}/enable`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        
        // Create beautiful enable result modal
        const modal = document.createElement('div');
        modal.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        const isSuccess = result.enableSuccessful;
        const statusColor = isSuccess ? '#10b981' : '#f59e0b';
        const statusIcon = isSuccess ? '✅' : '⚠️';
        const statusText = isSuccess ? 'Device Enabled' : 'Enable Partially Successful';

        modal.innerHTML = `
          <div style="
            background: white;
            border-radius: 12px;
            padding: 32px;
            max-width: 600px;
            width: 90%;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
            text-align: center;
          ">
            <div style="
              width: 64px;
              height: 64px;
              background: ${statusColor};
              border-radius: 50%;
              margin: 0 auto 24px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 32px;
            ">
              ${statusIcon}
            </div>
            <h2 style="
              margin: 0 0 16px 0;
              color: #1a1a1a;
              font-size: 24px;
              font-weight: 600;
            ">${statusText}</h2>
            <p style="
              margin: 0 0 24px 0;
              color: #666;
              font-size: 16px;
              line-height: 1.5;
            ">${result.message}</p>

            <div style="
              background: #f5f5f5;
              border-radius: 8px;
              padding: 16px;
              margin: 16px 0;
              font-size: 14px;
              color: #666;
              text-align: left;
            ">
              <div><strong>Device:</strong> ${result.deviceName} (${result.deviceIP})</div>
              <div><strong>Initial Ping:</strong> ${result.initialPing ? '✅ Online' : '❌ Offline'}</div>
              <div><strong>API Enabled:</strong> ${result.apiEnabled ? '✅ Yes' : '❌ No'}</div>
              <div><strong>Enable Time:</strong> ${new Date(result.restartedAt).toLocaleString()}</div>
            </div>

            <button onclick="this.closest('.enable-result-modal').remove()" style="
              background: ${statusColor};
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 500;
              cursor: pointer;
              transition: transform 0.2s;
            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
              Close
            </button>
          </div>
        `;

        modal.className = 'enable-result-modal';
        document.body.appendChild(modal);

        // Auto-remove modal after 10 seconds
        setTimeout(() => {
          if (modal.parentNode) {
            modal.remove();
          }
        }, 10000);

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
                disabled={isRefreshing}
                style={{
                  padding: '10px 20px',
                  backgroundColor: isRefreshing ? '#666' : (theme === 'dark' ? '#333' : '#e0e0e0'),
                  color: theme === 'dark' ? '#fff' : '#000',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: isRefreshing ? 'not-allowed' : 'pointer',
                  opacity: isRefreshing ? 0.6 : 1
                }}
              >
                {isRefreshing ? '⏳ Loading...' : '🔄 Refresh'}
              </button>
                      </div>
                    </div>
          
          {/* Physical Interfaces Section */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ marginBottom: '15px', color: theme === 'dark' ? '#fff' : '#333' }}>Physical Interfaces</h3>
          <div style={{
            backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff',
            borderRadius: '10px',
            border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}` }}>
                    <th style={{ padding: '15px', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Name</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Type</th>
                    <th style={{ padding: '15px', textAlign: 'left' }}>RX Bytes</th>
                    <th style={{ padding: '15px', textAlign: 'left' }}>TX Bytes</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                  {interfaces.filter(iface => iface.type === 'ether' || iface.type === 'loopback').map((iface, index) => (
                  <tr key={index} style={{ 
                    borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
                    opacity: iface.disabled ? 0.5 : 1
                  }}>
                    <td style={{ padding: '15px' }}>
                      {iface.running && (
                        <span style={{
                          backgroundColor: '#28a745',
                          color: '#fff',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontSize: '0.7rem',
                          fontWeight: 'bold'
                        }}>
                          R
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '15px' }}>{iface.name}</td>
                    <td style={{ padding: '15px' }}>{iface.type}</td>
                    <td style={{ padding: '15px' }}>
                      {iface.rxBytes ? 
                        iface.rxBytes >= 1024 * 1024 ? 
                          (iface.rxBytes / 1024 / 1024).toFixed(2) + ' MB' : 
                          (iface.rxBytes / 1024).toFixed(2) + ' KB' 
                        : '0 B'}
                    </td>
                    <td style={{ padding: '15px' }}>
                      {iface.txBytes ? 
                        iface.txBytes >= 1024 * 1024 ? 
                          (iface.txBytes / 1024 / 1024).toFixed(2) + ' MB' : 
                          (iface.txBytes / 1024).toFixed(2) + ' KB' 
                        : '0 B'}
                    </td>
                    <td style={{ padding: '15px' }}>
                      <button
                        onClick={async () => {
                          setEditingInterface(iface);
                          
                          // Initialize form data with basic interface info
                          let formData = {
                            interfaceName: iface.name || '',
                            interfaceType: iface.type || '',
                            comment: iface.comment || '',
                            disabled: iface.disabled || false,
                            // Tunnel specific fields
                            tunnelLocalIp: iface.tunnelLocalIp || '',
                            tunnelRemoteIp: iface.tunnelRemoteIp || '',
                            tunnelKeepAliveEnabled: iface.tunnelKeepAliveEnabled || false,
                            tunnelKeepAlive: iface.tunnelKeepAlive || '',
                            tunnelAllowFastPath: iface.tunnelAllowFastPath || false,
                            tunnelSecretKey: iface.tunnelSecretKey || '',
                            tunnelId: iface.tunnelId || ''
                          };

                          // If it's a tunnel interface, fetch detailed configuration
                          if (iface.type === 'eoip' || iface.type === 'eoipv6-' || 
                              iface.type === 'gre' || iface.type === 'gre6-tunnel' ||
                              iface.type === 'ipip' || iface.type === 'ipipv6-tunnel' ||
                              iface.type === 'l2tp' || iface.type === 'pptp' ||
                              iface.type === 'sstp' || iface.type.includes('tunnel')) {
                            
                            try {
                              const response = await fetch(`/api/mikrotiks/${id}/interface-details?name=${encodeURIComponent(iface.name)}`);
                              const result = await response.json();
                              
                              if (result.success && result.details) {
                                const details = result.details;
                                formData = {
                                  ...formData,
                                  comment: details.comment || iface.comment || '',
                                  disabled: details.disabled !== undefined ? details.disabled : iface.disabled || false,
                                  tunnelLocalIp: details.tunnelLocalIp || '',
                                  tunnelRemoteIp: details.tunnelRemoteIp || '',
                                  tunnelKeepAliveEnabled: details.tunnelKeepAliveEnabled || false,
                                  tunnelKeepAlive: details.tunnelKeepAlive || '',
                                  tunnelAllowFastPath: details.tunnelAllowFastPath || false,
                                  tunnelSecretKey: details.tunnelSecretKey || '',
                                  tunnelId: details.tunnelId || ''
                                };
                              }
                            } catch (error) {
                              console.error('Error fetching interface details:', error);
                              // Continue with basic form data if fetch fails
                            }
                          }
                          
                          setFormData(formData);
                          setShowEditInterfaceModal(true);
                        }}
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
          
          {/* Tunnels Section */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ marginBottom: '15px', color: theme === 'dark' ? '#fff' : '#333' }}>Tunnels</h3>
            <div style={{
              backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff',
              borderRadius: '10px',
              border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}` }}>
                    <th style={{ padding: '15px', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: '15px', textAlign: 'left' }}>Name</th>
                    <th style={{ padding: '15px', textAlign: 'left' }}>Type</th>
                    <th style={{ padding: '15px', textAlign: 'left' }}>Local IP</th>
                    <th style={{ padding: '15px', textAlign: 'left' }}>Remote IP</th>
                    <th style={{ padding: '15px', textAlign: 'left' }}>RX Bytes</th>
                    <th style={{ padding: '15px', textAlign: 'left' }}>TX Bytes</th>
                    <th style={{ padding: '15px', textAlign: 'left' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {interfaces.filter(iface => iface.type !== 'ether' && iface.type !== 'loopback').map((iface, index) => (
                    <tr key={index} style={{ 
                      borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
                      opacity: iface.disabled ? 0.5 : 1
                    }}>
                      <td style={{ padding: '15px' }}>
                        {iface.running && (
                          <span style={{
                            backgroundColor: '#28a745',
                            color: '#fff',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            fontSize: '0.7rem',
                            fontWeight: 'bold'
                          }}>
                            R
                      </span>
                        )}
                    </td>
                      <td style={{ padding: '15px' }}>{iface.name}</td>
                      <td style={{ padding: '15px' }}>{iface.type}</td>
                      <td style={{ padding: '15px' }}>
                        {iface.tunnelLocalIp || iface.localAddress || '-'}
                      </td>
                      <td style={{ padding: '15px' }}>
                        {iface.tunnelRemoteIp || iface.remoteAddress || '-'}
                      </td>
                      <td style={{ padding: '15px' }}>
                        {iface.rxBytes ? 
                        iface.rxBytes >= 1024 * 1024 ? 
                          (iface.rxBytes / 1024 / 1024).toFixed(2) + ' MB' : 
                          (iface.rxBytes / 1024).toFixed(2) + ' KB' 
                        : '0 B'}
                      </td>
                      <td style={{ padding: '15px' }}>
                        {iface.txBytes ? 
                        iface.txBytes >= 1024 * 1024 ? 
                          (iface.txBytes / 1024 / 1024).toFixed(2) + ' MB' : 
                          (iface.txBytes / 1024).toFixed(2) + ' KB' 
                        : '0 B'}
                      </td>
                    <td style={{ padding: '15px' }}>
                      <button
                        onClick={async () => {
                          setEditingInterface(iface);
                          
                          // Initialize form data with basic interface info
                          let formData = {
                            interfaceName: iface.name || '',
                            interfaceType: iface.type || '',
                            comment: iface.comment || '',
                            disabled: iface.disabled || false,
                            // Tunnel specific fields
                            tunnelLocalIp: iface.tunnelLocalIp || '',
                            tunnelRemoteIp: iface.tunnelRemoteIp || '',
                            tunnelKeepAliveEnabled: iface.tunnelKeepAliveEnabled || false,
                            tunnelKeepAlive: iface.tunnelKeepAlive || '',
                            tunnelAllowFastPath: iface.tunnelAllowFastPath || false,
                            tunnelSecretKey: iface.tunnelSecretKey || '',
                            tunnelId: iface.tunnelId || ''
                          };

                          // If it's a tunnel interface, fetch detailed configuration
                          if (iface.type === 'eoip' || iface.type === 'eoipv6-' || 
                              iface.type === 'gre' || iface.type === 'gre6-tunnel' ||
                              iface.type === 'ipip' || iface.type === 'ipipv6-tunnel' ||
                              iface.type === 'l2tp' || iface.type === 'pptp' ||
                              iface.type === 'sstp' || iface.type.includes('tunnel')) {
                            
                            try {
                              const response = await fetch(`/api/mikrotiks/${id}/interface-details?name=${encodeURIComponent(iface.name)}`);
                              const result = await response.json();
                              
                              if (result.success && result.details) {
                                const details = result.details;
                                formData = {
                                  ...formData,
                                  comment: details.comment || iface.comment || '',
                                  disabled: details.disabled !== undefined ? details.disabled : iface.disabled || false,
                                  tunnelLocalIp: details.tunnelLocalIp || '',
                                  tunnelRemoteIp: details.tunnelRemoteIp || '',
                                  tunnelKeepAliveEnabled: details.tunnelKeepAliveEnabled || false,
                                  tunnelKeepAlive: details.tunnelKeepAlive || '',
                                  tunnelAllowFastPath: details.tunnelAllowFastPath || false,
                                  tunnelSecretKey: details.tunnelSecretKey || '',
                                  tunnelId: details.tunnelId || ''
                                };
                              }
                            } catch (error) {
                              console.error('Error fetching interface details:', error);
                              // Continue with basic form data if fetch fails
                            }
                          }
                          
                          setFormData(formData);
                          setShowEditInterfaceModal(true);
                        }}
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
                disabled={isRefreshing}
                style={{
                  padding: '10px 20px',
                  backgroundColor: isRefreshing ? '#666' : (theme === 'dark' ? '#333' : '#e0e0e0'),
                  color: theme === 'dark' ? '#fff' : '#000',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: isRefreshing ? 'not-allowed' : 'pointer',
                  opacity: isRefreshing ? 0.6 : 1
                }}
              >
                {isRefreshing ? '⏳ Loading...' : '🔄 Refresh'}
              </button>
            </div>
          </div>

          {/* Search */}
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Search IP addresses..."
              value={ipSearchTerm}
              onChange={(e) => setIpSearchTerm(e.target.value)}
              style={{
                width: '100%',
                maxWidth: '400px',
                padding: '10px',
                border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
                borderRadius: '5px',
                backgroundColor: theme === 'dark' ? '#333' : '#fff',
                color: theme === 'dark' ? '#fff' : '#000'
              }}
            />
          </div>

          {/* IP Address Tabs */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}` }}>
              <button
                onClick={() => setActiveIpTab('ipv4')}
                style={{
                  padding: '10px 20px',
                  backgroundColor: activeIpTab === 'ipv4' ? (theme === 'dark' ? '#007acc' : '#0066cc') : 'transparent',
                  color: activeIpTab === 'ipv4' ? '#fff' : (theme === 'dark' ? '#fff' : '#000'),
                  border: 'none',
                  borderBottom: activeIpTab === 'ipv4' ? `2px solid ${theme === 'dark' ? '#007acc' : '#0066cc'}` : 'none',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                IPv4 ({ipAddresses.length})
              </button>
              <button
                onClick={() => setActiveIpTab('ipv6')}
                style={{
                  padding: '10px 20px',
                  backgroundColor: activeIpTab === 'ipv6' ? (theme === 'dark' ? '#007acc' : '#0066cc') : 'transparent',
                  color: activeIpTab === 'ipv6' ? '#fff' : (theme === 'dark' ? '#fff' : '#000'),
                  border: 'none',
                  borderBottom: activeIpTab === 'ipv6' ? `2px solid ${theme === 'dark' ? '#007acc' : '#0066cc'}` : 'none',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                IPv6 ({ipv6Addresses.length})
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
                {(activeIpTab === 'ipv4' ? ipAddresses : ipv6Addresses)
                  .filter(ip => 
                    !ipSearchTerm || 
                    ip.address.toLowerCase().includes(ipSearchTerm.toLowerCase()) ||
                    ip.network.toLowerCase().includes(ipSearchTerm.toLowerCase()) ||
                    ip.interface.toLowerCase().includes(ipSearchTerm.toLowerCase()) ||
                    (ip.comment && ip.comment.toLowerCase().includes(ipSearchTerm.toLowerCase()))
                  )
                  .map((ip, index) => (
                  <tr key={index} style={{ 
                    borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
                    opacity: ip.disabled ? 0.5 : 1
                  }}>
                    <td style={{ padding: '15px' }}>{ip.address}</td>
                    <td style={{ padding: '15px' }}>{ip.network}</td>
                    <td style={{ padding: '15px' }}>{ip.interface}</td>
                    <td style={{ padding: '15px' }}>{ip.comment}</td>
                    <td style={{ padding: '15px' }}>
                      <button
                        onClick={() => {
                          setEditingIp(ip);
                          setFormData({
                            ...formData,
                            address: ip.address || '',
                            network: ip.network || '',
                            interface: ip.interface || '',
                            comment: ip.comment || '',
                            disabled: ip.disabled || false,
                            routerosId: ip.routerosId
                          });
                          setShowEditIpModal(true);
                        }}
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
                disabled={isRefreshing}
                style={{
                  padding: '10px 20px',
                  backgroundColor: isRefreshing ? '#666' : (theme === 'dark' ? '#333' : '#e0e0e0'),
                  color: theme === 'dark' ? '#fff' : '#000',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: isRefreshing ? 'not-allowed' : 'pointer',
                  opacity: isRefreshing ? 0.6 : 1
                }}
              >
                {isRefreshing ? '⏳ Loading...' : '🔄 Refresh'}
              </button>
            </div>
          </div>

          {/* Routes Tabs */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}` }}>
              <button
                onClick={() => setActiveRouteTab('v4')}
                style={{
                  padding: '10px 20px',
                  backgroundColor: activeRouteTab === 'v4' ? (theme === 'dark' ? '#007acc' : '#0066cc') : 'transparent',
                  color: activeRouteTab === 'v4' ? '#fff' : (theme === 'dark' ? '#fff' : '#000'),
                  border: 'none',
                  borderBottom: activeRouteTab === 'v4' ? `2px solid ${theme === 'dark' ? '#007acc' : '#0066cc'}` : 'none',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                IPv4 ({routes.length})
              </button>
              <button
                onClick={() => setActiveRouteTab('v6')}
                style={{
                  padding: '10px 20px',
                  backgroundColor: activeRouteTab === 'v6' ? (theme === 'dark' ? '#007acc' : '#0066cc') : 'transparent',
                  color: activeRouteTab === 'v6' ? '#fff' : (theme === 'dark' ? '#fff' : '#000'),
                  border: 'none',
                  borderBottom: activeRouteTab === 'v6' ? `2px solid ${theme === 'dark' ? '#007acc' : '#0066cc'}` : 'none',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                IPv6 ({ipv6Routes.length})
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
                  <th style={{ padding: '8px', textAlign: 'left', maxWidth: '120px' }}>Destination</th>
                  <th style={{ padding: '8px', textAlign: 'left', maxWidth: '120px' }}>Gateway</th>
                  <th style={{ padding: '8px', textAlign: 'left', maxWidth: '150px' }}>Interface</th>
                  <th style={{ padding: '8px', textAlign: 'left', maxWidth: '60px' }}>Dst</th>
                  <th style={{ padding: '8px', textAlign: 'left', maxWidth: '80px' }}>Route Mark</th>
                  <th style={{ padding: '8px', textAlign: 'left', maxWidth: '60px' }}>Flags</th>
                  <th style={{ padding: '8px', textAlign: 'left', maxWidth: '70px' }}>Active</th>
                  <th style={{ padding: '8px', textAlign: 'left', maxWidth: '120px' }}>Comment</th>
                  <th style={{ padding: '8px', textAlign: 'left', maxWidth: '80px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(activeRouteTab === 'v4' ? routes : ipv6Routes).map((route, index) => (
                  <tr key={index} style={{ 
                    borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
                    opacity: route.disabled ? 0.5 : 1
                  }}>
                    <td style={{ padding: '8px', maxWidth: '120px', wordBreak: 'break-word' }}>{route.dstAddress || route.destination}</td>
                    <td style={{ padding: '8px', maxWidth: '120px', wordBreak: 'break-word' }}>{route.gateway}</td>
                    <td style={{ padding: '5px', maxWidth: '150px', wordBreak: 'break-word' }}>
                      {route.outInterface || route.interface || 
                       (route.gateway && !route.gateway.match(/^\d+\.\d+\.\d+\.\d+/) ? route.gateway : '-')}
                    </td>
                    <td style={{ padding: '8px', maxWidth: '60px' }}>{route.distance}</td>
                    <td style={{ padding: '8px', maxWidth: '80px', wordBreak: 'break-word' }}>{route.mark || '-'}</td>
                    <td style={{ padding: '8px', maxWidth: '60px' }}>
                      <span style={{
                        backgroundColor: theme === 'dark' ? '#444' : '#f0f0f0',
                        color: theme === 'dark' ? '#fff' : '#000',
                        padding: '2px 4px',
                        borderRadius: '3px',
                        fontSize: '0.7rem',
                        fontWeight: 'bold'
                      }}>
                        {route.flags || '-'}
                      </span>
                    </td>
                    <td style={{ padding: '8px', maxWidth: '70px' }}>
                      {route.active ? (
                        <span style={{
                          backgroundColor: '#28a745',
                          color: '#fff',
                          padding: '2px 4px',
                          borderRadius: '3px',
                          fontSize: '0.7rem',
                          fontWeight: 'bold'
                        }}>
                          Active
                        </span>
                      ) : (
                        <span style={{
                          backgroundColor: '#dc3545',
                          color: '#fff',
                          padding: '2px 4px',
                          borderRadius: '3px',
                          fontSize: '0.7rem',
                          fontWeight: 'bold'
                        }}>
                          Inactive
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '8px', maxWidth: '120px', wordBreak: 'break-word' }}>{route.comment || ''}</td>
                    <td style={{ padding: '8px', maxWidth: '80px' }}>
                      <button
                        onClick={() => {
                          setEditingRoute(route);
                          setFormData({
                            ...formData,
                            destination: route.dstAddress || route.destination || '',
                            gateway: route.gateway || '',
                            interface: route.outInterface || route.interface || '',
                            distance: route.distance || '',
                            markRoute: route.mark || '',
                            comment: route.comment || '',
                            disabled: route.disabled || false
                          });
                          setShowEditRouteModal(true);
                        }}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: theme === 'dark' ? '#333' : '#e0e0e0',
                          color: theme === 'dark' ? '#fff' : '#000',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '0.7rem'
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
                disabled={isRefreshing}
                style={{
                  padding: '10px 20px',
                  backgroundColor: isRefreshing ? '#666' : (theme === 'dark' ? '#333' : '#e0e0e0'),
                  color: theme === 'dark' ? '#fff' : '#000',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: isRefreshing ? 'not-allowed' : 'pointer',
                  opacity: isRefreshing ? 0.6 : 1
                }}
              >
                {isRefreshing ? '⏳ Loading...' : '🔄 Refresh'}
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
                  <th style={{ padding: '15px', textAlign: 'left' }}>Comment</th>
                  <th style={{ padding: '15px', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {firewallRules.map((rule, index) => (
                  <tr key={index} style={{ 
                    borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
                    opacity: rule.disabled ? 0.5 : 1
                  }}>
                    <td style={{ padding: '15px' }}>{rule.chain}</td>
                    <td style={{ padding: '15px' }}>{rule.srcAddress || '-'}</td>
                    <td style={{ padding: '15px' }}>{rule.srcAddressList || '-'}</td>
                    <td style={{ padding: '15px' }}>{rule.dstAddress || '-'}</td>
                    <td style={{ padding: '15px' }}>{rule.dstAddressList || '-'}</td>
                    <td style={{ padding: '15px' }}>{rule.protocol}</td>
                    <td style={{ padding: '15px' }}>{rule.dstPort || rule.port || '-'}</td>
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
                    <td style={{ padding: '15px' }}>{rule.comment || '-'}</td>
                    <td style={{ padding: '15px' }}>
                      <button
                        onClick={() => {
                          setEditingFirewall(rule);
                          setFormData({
                            ...formData,
                            sourceAddress: rule.srcAddress || '',
                            sourceAddressList: rule.srcAddressList || '',
                            destinationAddress: rule.dstAddress || '',
                            destinationAddressList: rule.dstAddressList || '',
                            protocol: rule.protocol || '',
                            port: rule.dstPort || rule.port || '',
                            action: rule.action || '',
                            comment: rule.comment || '',
                            routerosId: rule.routerosId,
                            disabled: rule.disabled || false
                          });
                          setShowEditFirewallModal(true);
                        }}
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
                disabled={isRefreshing}
                style={{
                  padding: '10px 20px',
                  backgroundColor: isRefreshing ? '#666' : (theme === 'dark' ? '#333' : '#e0e0e0'),
                  color: theme === 'dark' ? '#fff' : '#000',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: isRefreshing ? 'not-allowed' : 'pointer',
                  opacity: isRefreshing ? 0.6 : 1
                }}
              >
                {isRefreshing ? '⏳ Loading...' : '🔄 Refresh'}
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
                disabled={isRefreshing}
                style={{
                  padding: '10px 20px',
                  backgroundColor: isRefreshing ? '#666' : (theme === 'dark' ? '#333' : '#e0e0e0'),
                  color: theme === 'dark' ? '#fff' : '#000',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: isRefreshing ? 'not-allowed' : 'pointer',
                  opacity: isRefreshing ? 0.6 : 1
                }}
              >
                {isRefreshing ? '⏳ Loading...' : '🔄 Refresh'}
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
          <div style={{
            marginBottom: '24px',
            paddingBottom: '16px',
            borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`
          }}>
            <h2 style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: '600',
              color: theme === 'dark' ? '#fff' : '#000',
              fontFamily: 'inherit'
            }}>System Update</h2>
            <p style={{
              margin: '8px 0 0 0',
              fontSize: '14px',
              color: theme === 'dark' ? '#ccc' : '#666',
              fontFamily: 'inherit'
            }}>Manage Mikrotik device firmware updates</p>
          </div>
          
        {/* Check Update Button */}
        <div style={{
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <button
            onClick={loadUpdateInfo}
            style={{
              padding: '12px 24px',
              backgroundColor: theme === 'dark' ? '#17a2b8' : '#17a2b8',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              fontFamily: 'inherit',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box',
              margin: 0,
              appearance: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              outline: 'none'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#138496';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = theme === 'dark' ? '#17a2b8' : '#17a2b8';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            🔄 Check for Updates
          </button>
        </div>

        {/* Download Progress Bar */}
        {downloadProgress && (
          <div style={{
            backgroundColor: theme === 'dark' ? '#2d3748' : '#f7fafc',
            border: `1px solid ${theme === 'dark' ? '#4a5568' : '#e2e8f0'}`,
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px',
            boxSizing: 'border-box'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}>
              <span style={{
                fontSize: '14px',
                fontWeight: '500',
                color: theme === 'dark' ? '#fff' : '#2d3748'
              }}>
                {downloadProgress.step}
              </span>
              <span style={{
                fontSize: '12px',
                color: theme === 'dark' ? '#a0aec0' : '#718096'
              }}>
                {downloadProgress.progress}%
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: theme === 'dark' ? '#4a5568' : '#e2e8f0',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${downloadProgress.progress}%`,
                height: '100%',
                backgroundColor: downloadProgress.progress === 100 ? '#48bb78' : '#4299e1',
                transition: 'width 0.3s ease',
                borderRadius: '4px'
              }} />
            </div>
            {downloadProgress.fileSize && (
              <div style={{
                fontSize: '12px',
                color: theme === 'dark' ? '#a0aec0' : '#718096',
                marginTop: '8px'
              }}>
                File Size: {Math.round(downloadProgress.fileSize / 1024 / 1024)} MB
              </div>
            )}
          </div>
        )}

          {updateInfo && (
            <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px',
            width: '100%'
          }}>
            {/* Stable Channel Table */}
            <div style={{
              backgroundColor: theme === 'dark' ? '#1e3a5f' : '#e3f2fd',
              padding: '20px',
              borderRadius: '10px',
              border: `1px solid ${theme === 'dark' ? '#2d5a87' : '#bbdefb'}`,
              position: 'relative',
              zIndex: 2,
              boxSizing: 'border-box',
              width: '100%',
              margin: 0
            }}>
              <h3 style={{
                margin: '0 0 16px 0',
                fontSize: '18px',
                fontWeight: '600',
                color: theme === 'dark' ? '#64b5f6' : '#1976d2',
                fontFamily: 'inherit',
                textAlign: 'center'
              }}>📦 Stable Channel</h3>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
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
                <tbody>
                  <tr style={{ borderBottom: `1px solid ${theme === 'dark' ? '#2d5a87' : '#bbdefb'}` }}>
                    <td style={{
                      padding: '12px',
                      fontWeight: '600',
                      color: theme === 'dark' ? '#ccc' : '#666',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      width: '50%'
                    }}>Current:</td>
                    <td style={{
                      padding: '12px',
                      color: theme === 'dark' ? '#fff' : '#000',
                      fontSize: '14px',
                      fontFamily: 'inherit'
                    }}>{updateInfo.currentVersion || 'Unknown'}</td>
                    </tr>
                  <tr style={{ borderBottom: `1px solid ${theme === 'dark' ? '#2d5a87' : '#bbdefb'}` }}>
                    <td style={{
                      padding: '12px',
                      fontWeight: '600',
                      color: theme === 'dark' ? '#ccc' : '#666',
                      fontSize: '14px',
                      fontFamily: 'inherit'
                    }}>Latest:</td>
                    <td style={{
                      padding: '12px',
                      color: theme === 'dark' ? '#fff' : '#000',
                      fontSize: '14px',
                      fontFamily: 'inherit'
                    }}>{updateInfo.latestStable || '7.20.1'}</td>
                  </tr>
                  <tr>
                    <td style={{
                      padding: '12px',
                      fontWeight: '600',
                      color: theme === 'dark' ? '#ccc' : '#666',
                      fontSize: '14px',
                      fontFamily: 'inherit'
                    }}>Status:</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        backgroundColor: updateInfo.stableUpdateAvailable ? '#28a745' : '#6c757d',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: '500',
                        fontFamily: 'inherit',
                        display: 'inline-block'
                      }}>
                        {updateInfo.stableUpdateAvailable ? 'Available' : 'Up to date'}
                          </span>
                        </td>
                      </tr>
                  </tbody>
                </table>
              <div style={{ 
                marginTop: '16px',
                display: 'flex',
                gap: '8px',
                justifyContent: 'center'
              }}>
                <button
                  onClick={() => {
                    if (!isDownloading && !isInstalling && updateInfo?.stableUpdateAvailable) {
                      handleDownloadUpdate('stable');
                    }
                  }}
                  disabled={isDownloading || isInstalling || !updateInfo?.stableUpdateAvailable}
                    style={{
                    padding: '8px 16px',
                      backgroundColor: (isDownloading || isInstalling || !updateInfo?.stableUpdateAvailable) ? '#6c757d' : (theme === 'dark' ? '#007acc' : '#0066cc'),
                      color: '#fff',
                      border: 'none',
                    borderRadius: '6px',
                    cursor: (isDownloading || isInstalling || !updateInfo?.stableUpdateAvailable) ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box',
                    margin: 0,
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    outline: 'none'
                  }}
                  onMouseOver={(e) => {
                    if (!isDownloading && !isInstalling && updateInfo?.stableUpdateAvailable) {
                      e.target.style.backgroundColor = theme === 'dark' ? '#0056b3' : '#0056b3';
                      e.target.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isDownloading && !isInstalling && updateInfo?.stableUpdateAvailable) {
                      e.target.style.backgroundColor = theme === 'dark' ? '#007acc' : '#0066cc';
                      e.target.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  📥 Download
                  </button>
                  <button
                  onClick={() => {
                    if (!isDownloading && !isInstalling && updateInfo?.stableUpdateAvailable) {
                      handleDownloadAndInstallUpdate('stable');
                    }
                  }}
                  disabled={isDownloading || isInstalling || !updateInfo?.stableUpdateAvailable}
                    style={{
                    padding: '8px 16px',
                      backgroundColor: (isDownloading || isInstalling || !updateInfo?.stableUpdateAvailable) ? '#6c757d' : (theme === 'dark' ? '#28a745' : '#28a745'),
                      color: '#fff',
                      border: 'none',
                    borderRadius: '6px',
                    cursor: (isDownloading || isInstalling || !updateInfo?.stableUpdateAvailable) ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box',
                    margin: 0,
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    outline: 'none'
                  }}
                  onMouseOver={(e) => {
                    if (!isDownloading && !isInstalling && updateInfo?.stableUpdateAvailable) {
                      e.target.style.backgroundColor = '#218838';
                      e.target.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isDownloading && !isInstalling && updateInfo?.stableUpdateAvailable) {
                      e.target.style.backgroundColor = theme === 'dark' ? '#28a745' : '#28a745';
                      e.target.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  🚀 Install
                </button>
              </div>
            </div>

            {/* Testing Channel Table */}
            <div style={{
              backgroundColor: theme === 'dark' ? '#4a1a4a' : '#fce4ec',
              padding: '20px',
              borderRadius: '10px',
              border: `1px solid ${theme === 'dark' ? '#7b1f7b' : '#f8bbd9'}`,
              position: 'relative',
              zIndex: 2,
              boxSizing: 'border-box',
              width: '100%',
              margin: 0
            }}>
              <h3 style={{
                margin: '0 0 16px 0',
                fontSize: '18px',
                fontWeight: '600',
                color: theme === 'dark' ? '#ce93d8' : '#c2185b',
                fontFamily: 'inherit',
                textAlign: 'center'
              }}>🧪 Testing Channel</h3>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
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
                <tbody>
                  <tr style={{ borderBottom: `1px solid ${theme === 'dark' ? '#7b1f7b' : '#f8bbd9'}` }}>
                    <td style={{
                      padding: '12px',
                      fontWeight: '600',
                      color: theme === 'dark' ? '#ccc' : '#666',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      width: '50%'
                    }}>Current:</td>
                    <td style={{
                      padding: '12px',
                      color: theme === 'dark' ? '#fff' : '#000',
                      fontSize: '14px',
                      fontFamily: 'inherit'
                    }}>{updateInfo.currentVersion || 'Unknown'}</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${theme === 'dark' ? '#7b1f7b' : '#f8bbd9'}` }}>
                    <td style={{
                      padding: '12px',
                      fontWeight: '600',
                      color: theme === 'dark' ? '#ccc' : '#666',
                      fontSize: '14px',
                      fontFamily: 'inherit'
                    }}>Latest:</td>
                    <td style={{
                      padding: '12px',
                      color: theme === 'dark' ? '#fff' : '#000',
                      fontSize: '14px',
                      fontFamily: 'inherit'
                    }}>{updateInfo.latestTesting || '7.21beta3'}</td>
                  </tr>
                  <tr>
                    <td style={{
                      padding: '12px',
                      fontWeight: '600',
                      color: theme === 'dark' ? '#ccc' : '#666',
                      fontSize: '14px',
                      fontFamily: 'inherit'
                    }}>Status:</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        backgroundColor: updateInfo.testingUpdateAvailable ? '#28a745' : '#6c757d',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: '500',
                        fontFamily: 'inherit',
                        display: 'inline-block'
                      }}>
                        {updateInfo.testingUpdateAvailable ? 'Available' : 'Up to date'}
                          </span>
                        </td>
                      </tr>
                  </tbody>
                </table>
              <div style={{ 
                marginTop: '16px',
                display: 'flex',
                gap: '8px',
                justifyContent: 'center'
              }}>
                <button
                  onClick={() => {
                    if (!isDownloading && !isInstalling && updateInfo?.testingUpdateAvailable) {
                      handleDownloadUpdate('testing');
                    }
                  }}
                  disabled={isDownloading || isInstalling || !updateInfo?.testingUpdateAvailable}
                    style={{
                    padding: '8px 16px',
                    backgroundColor: (isDownloading || isInstalling || !updateInfo?.testingUpdateAvailable) ? '#6c757d' : (theme === 'dark' ? '#6f42c1' : '#6f42c1'),
                      color: '#fff',
                      border: 'none',
                    borderRadius: '6px',
                    cursor: (isDownloading || isInstalling || !updateInfo?.testingUpdateAvailable) ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box',
                    margin: 0,
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    outline: 'none'
                  }}
                  onMouseOver={(e) => {
                    if (!isDownloading && !isInstalling && updateInfo?.testingUpdateAvailable) {
                      e.target.style.backgroundColor = '#5a32a3';
                      e.target.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isDownloading && !isInstalling && updateInfo?.testingUpdateAvailable) {
                      e.target.style.backgroundColor = theme === 'dark' ? '#6f42c1' : '#6f42c1';
                      e.target.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  📥 Download
                  </button>
                  <button
                  onClick={() => {
                    if (!isDownloading && !isInstalling && updateInfo?.testingUpdateAvailable) {
                      handleDownloadAndInstallUpdate('testing');
                    }
                  }}
                  disabled={isDownloading || isInstalling || !updateInfo?.testingUpdateAvailable}
                    style={{
                    padding: '8px 16px',
                    backgroundColor: (isDownloading || isInstalling || !updateInfo?.testingUpdateAvailable) ? '#6c757d' : (theme === 'dark' ? '#fd7e14' : '#fd7e14'),
                      color: '#fff',
                      border: 'none',
                    borderRadius: '6px',
                    cursor: (isDownloading || isInstalling || !updateInfo?.testingUpdateAvailable) ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box',
                    margin: 0,
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    outline: 'none'
                  }}
                  onMouseOver={(e) => {
                    if (!isDownloading && !isInstalling && updateInfo?.testingUpdateAvailable) {
                      e.target.style.backgroundColor = '#e8650e';
                      e.target.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isDownloading && !isInstalling && updateInfo?.testingUpdateAvailable) {
                      e.target.style.backgroundColor = theme === 'dark' ? '#fd7e14' : '#fd7e14';
                      e.target.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  ⚡ Install
                </button>
              </div>
            </div>
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
                    checked={formData.networkEnabled || false}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      networkEnabled: e.target.checked,
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
                  disabled={!formData.networkEnabled}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
                    borderRadius: '5px',
                    backgroundColor: theme === 'dark' ? '#333' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000',
                    marginTop: '5px',
                    opacity: formData.networkEnabled ? 1 : 0.5
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

      {/* Edit IP Address Modal */}
      {showEditIpModal && editingIp && createPortal(
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
            <h3 style={{ marginTop: 0 }}>Edit IP Address</h3>
            <form onSubmit={handleEditIpAddress}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    checked={!formData.disabled}
                    onChange={(e) => setFormData({ ...formData, disabled: !e.target.checked })}
                  />
                  Enabled
                </label>
              </div>
              
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
                    checked={formData.networkEnabled || false}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      networkEnabled: e.target.checked,
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
                  disabled={!formData.networkEnabled}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
                    borderRadius: '5px',
                    backgroundColor: theme === 'dark' ? '#333' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000',
                    marginTop: '5px',
                    opacity: formData.networkEnabled ? 1 : 0.5
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
                  placeholder="IP address comment"
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
                  onClick={() => {
                    setShowEditIpModal(false);
                    setEditingIp(null);
                  }}
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
                  Update IP Address
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
                <select
                  value={formData.markRoute}
                  onChange={(e) => setFormData({ ...formData, markRoute: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
                    borderRadius: '5px',
                    backgroundColor: theme === 'dark' ? '#333' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                >
                  <option value="">Select Route Mark</option>
                  {routeMarks.map((mark, index) => (
                    <option key={index} value={mark}>{mark}</option>
                  ))}
                </select>
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

      {/* Edit Route Modal */}
      {showEditRouteModal && editingRoute && createPortal(
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
            <h3 style={{ marginTop: 0 }}>Edit Route</h3>
            <form onSubmit={handleEditRoute}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    checked={!formData.disabled}
                    onChange={(e) => setFormData({ ...formData, disabled: !e.target.checked })}
                  />
                  Enabled
                </label>
              </div>
              
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
                <select
                  value={formData.markRoute}
                  onChange={(e) => setFormData({ ...formData, markRoute: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
                    borderRadius: '5px',
                    backgroundColor: theme === 'dark' ? '#333' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                >
                  <option value="">Select Route Mark</option>
                  {routeMarks.map((mark, index) => (
                    <option key={index} value={mark}>{mark}</option>
                  ))}
                </select>
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Comment:</label>
                <input
                  type="text"
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  placeholder="Route comment"
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
                  onClick={() => {
                    setShowEditRouteModal(false);
                    setEditingRoute(null);
                  }}
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
                  Update Route
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
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Comment:</label>
                <input
                  type="text"
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  placeholder="Enter comment for this rule"
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
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={formData.disabled}
                    onChange={(e) => setFormData({ ...formData, disabled: e.target.checked })}
                    style={{ margin: 0 }}
                  />
                  Disabled
                </label>
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

      {/* Edit Interface Modal */}
      {showEditInterfaceModal && editingInterface && createPortal(
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
            <h3 style={{ marginTop: 0 }}>Edit Interface: {editingInterface.name}</h3>
            <form onSubmit={handleEditInterface}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Interface Name:</label>
                <input
                  type="text"
                  value={formData.interfaceName || editingInterface.name}
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
                  value={formData.interfaceType || editingInterface.type}
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
                  <option value="ether">Ethernet</option>
                  <option value="eoip">EoIP</option>
                  <option value="eoipv6-">EoIP IPv6</option>
                  <option value="gre">GRE</option>
                  <option value="gre6-tunnel">GRE IPv6 Tunnel</option>
                  <option value="ipip">IPIP</option>
                  <option value="ipipv6-tunnel">IPIP IPv6 Tunnel</option>
                  <option value="l2tp">L2TP</option>
                  <option value="pptp">PPTP</option>
                  <option value="sstp">SSTP</option>
                  <option value="vlan">VLAN</option>
                  <option value="bridge">Bridge</option>
                  <option value="bonding">Bonding</option>
                </select>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Comment:</label>
                <input
                  type="text"
                  value={formData.comment || editingInterface.comment || ''}
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

              {/* Tunnel specific fields - only show for tunnel types */}
              {(editingInterface.type === 'eoip' || editingInterface.type === 'eoipv6-' || 
                editingInterface.type === 'gre' || editingInterface.type === 'gre6-tunnel' ||
                editingInterface.type === 'ipip' || editingInterface.type === 'ipipv6-tunnel' ||
                editingInterface.type === 'l2tp' || editingInterface.type === 'pptp' || 
                editingInterface.type === 'sstp' || editingInterface.type.includes('tunnel')) && (
                <>
                  <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: theme === 'dark' ? '#333' : '#f5f5f5', borderRadius: '5px' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: theme === 'dark' ? '#fff' : '#333' }}>Tunnel Configuration</h4>
                    
                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '5px' }}>Local IP:</label>
                      <input
                        type="text"
                        value={formData.tunnelLocalIp || ''}
                        onChange={(e) => setFormData({ ...formData, tunnelLocalIp: e.target.value })}
                        placeholder="e.g., 192.168.1.1"
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
                      <label style={{ display: 'block', marginBottom: '5px' }}>Remote IP:</label>
                      <input
                        type="text"
                        value={formData.tunnelRemoteIp || ''}
                        onChange={(e) => setFormData({ ...formData, tunnelRemoteIp: e.target.value })}
                        placeholder="e.g., 10.0.0.1"
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
                      <label style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                        <input
                          type="checkbox"
                          checked={formData.tunnelKeepAliveEnabled}
                          onChange={(e) => setFormData({ ...formData, tunnelKeepAliveEnabled: e.target.checked })}
                          style={{ marginRight: '8px' }}
                        />
                        Enable Keep Alive
                      </label>
                      {formData.tunnelKeepAliveEnabled && (
                        <input
                          type="text"
                          value={formData.tunnelKeepAlive || ''}
                          onChange={(e) => setFormData({ ...formData, tunnelKeepAlive: e.target.value })}
                          placeholder="e.g., 10s,30s,10"
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: `1px solid ${theme === 'dark' ? '#555' : '#ddd'}`,
                            borderRadius: '4px',
                            backgroundColor: theme === 'dark' ? '#333' : '#fff',
                            color: theme === 'dark' ? '#fff' : '#000',
                            marginTop: '5px'
                          }}
                        />
                      )}
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                        <input
                          type="checkbox"
                          checked={formData.tunnelAllowFastPath}
                          onChange={(e) => setFormData({ ...formData, tunnelAllowFastPath: e.target.checked })}
                          style={{ marginRight: '8px' }}
                        />
                        Allow Fast Path
                      </label>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '5px' }}>Secret Key:</label>
                      <input
                        type="password"
                        value={formData.tunnelSecretKey || ''}
                        onChange={(e) => setFormData({ ...formData, tunnelSecretKey: e.target.value })}
                        placeholder="Tunnel secret key"
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

                    {(editingInterface.type === 'eoip' || editingInterface.type === 'eoipv6-') && (
                      <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Tunnel ID:</label>
                        <input
                          type="text"
                          value={formData.tunnelId || ''}
                          onChange={(e) => setFormData({ ...formData, tunnelId: e.target.value })}
                          placeholder="e.g., 1, 100"
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
                    )}
                  </div>
                </>
              )}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
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
                  Update Interface
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditInterfaceModal(false);
                    setEditingInterface(null);
                    setFormData({ ...formData, interfaceName: '', interfaceType: '', comment: '' });
                  }}
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
              </div>
            </form>
          </div>
        </div>,
        document.body
    )}
    </div>
  );
};

export default DeviceDetails;