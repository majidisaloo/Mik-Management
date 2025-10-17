import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import './Settings.css';

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

const TestIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c1.3 0 2.52.28 3.64.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SyncIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 3v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 21v-5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DatabaseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="12" cy="5" rx="9" ry="3" stroke="currentColor" strokeWidth="2" />
    <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" stroke="currentColor" strokeWidth="2" />
    <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const ServerIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
    <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="2" />
    <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const WebIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const ApiIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 7V4a2 2 0 0 1 2-2h8.5L20 7.5V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

const NetworkIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const emptyIpamForm = {
  name: '',
  baseUrl: '',
  appId: '',
  appCode: '',
  appPermissions: 'Read',
  appSecurity: 'SSL with App code token'
};

const statusVariant = (status) => {
  if (!status) {
    return 'status-badge--info';
  }

  const value = status.toLowerCase();

  if (value === 'connected' || value === 'running') {
    return 'status-badge--success';
  }

  if (value === 'failed' || value === 'error') {
    return 'status-badge--error';
  }

  return 'status-badge--warning';
};

const formatTimestamp = (value) => {
  if (!value) {
    return 'Never';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Never';
  }

  return parsed.toLocaleString();
};

const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ipams, setIpams] = useState([]);
  const [ipamLoading, setIpamLoading] = useState(true);
  const [ipamStatus, setIpamStatus] = useState({ type: '', message: '' });
  const [ipamForm, setIpamForm] = useState(emptyIpamForm);
  const [showIpamModal, setShowIpamModal] = useState(false);
  const [isEditingIpam, setIsEditingIpam] = useState(false);
  const [selectedIpamId, setSelectedIpamId] = useState(null);
  const [testingIpam, setTestingIpam] = useState(null);
  const [syncingIpam, setSyncingIpam] = useState(null);
  const [configInfo, setConfigInfo] = useState(null);
  const [servicesStatus, setServicesStatus] = useState({
    nginx: { status: 'unknown', uptime: null, lastCheck: null },
    frontend: { status: 'unknown', uptime: null, lastCheck: null },
    backend: { status: 'unknown', uptime: null, lastCheck: null },
    api: { status: 'unknown', uptime: null, lastCheck: null },
    database: { status: 'unknown', uptime: null, lastCheck: null }
  });
  const [servicesLoading, setServicesLoading] = useState(false);

  const loadIpams = async () => {
    try {
      setIpamLoading(true);
      const response = await fetch('/api/ipams');

      if (!response.ok) {
        throw new Error('Unable to load IPAM configurations.');
      }

      const payload = await response.json();
      setIpams(payload);
      setIpamStatus({ type: '', message: '' });
    } catch (error) {
      setIpamStatus({
        type: 'error',
        message: error.message || 'Unable to load IPAM configurations.'
      });
    } finally {
      setIpamLoading(false);
    }
  };

  const loadConfigInfo = async () => {
    try {
      const response = await fetch('/api/config-info');

      if (!response.ok) {
        throw new Error('Unable to load configuration information.');
      }

      const payload = await response.json();
      setConfigInfo(payload);
    } catch (error) {
      console.error('Failed to load config info:', error);
    }
  };

  const checkServicesStatus = async () => {
    setServicesLoading(true);
    const now = new Date();
    
    try {
      // Check API status
      const apiResponse = await fetch('/api/health');
      const apiStatus = apiResponse.ok ? 'running' : 'failed';
      
      // Check Frontend status (if we can reach it, it's running)
      const frontendStatus = 'running';
      
      // Check Backend status (same as API for now)
      const backendStatus = apiResponse.ok ? 'running' : 'failed';
      
      // Check Nginx status (if we can reach the app, nginx is likely running)
      const nginxStatus = 'running';
      
      // Check Database status (if API works, database is likely working)
      const databaseStatus = apiResponse.ok ? 'running' : 'failed';
      
      setServicesStatus({
        nginx: { status: nginxStatus, uptime: 'N/A', lastCheck: now },
        frontend: { status: frontendStatus, uptime: 'N/A', lastCheck: now },
        backend: { status: backendStatus, uptime: 'N/A', lastCheck: now },
        api: { status: apiStatus, uptime: 'N/A', lastCheck: now },
        database: { status: databaseStatus, uptime: 'N/A', lastCheck: now }
      });
    } catch (error) {
      console.error('Failed to check services status:', error);
      setServicesStatus({
        nginx: { status: 'failed', uptime: null, lastCheck: now },
        frontend: { status: 'failed', uptime: null, lastCheck: now },
        backend: { status: 'failed', uptime: null, lastCheck: now },
        api: { status: 'failed', uptime: null, lastCheck: now },
        database: { status: 'failed', uptime: null, lastCheck: now }
      });
    } finally {
      setServicesLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    loadIpams();
    loadConfigInfo();
    checkServicesStatus();
  }, [navigate, user]);

  const handleCreateIpam = async () => {
    try {
      const response = await fetch('/api/ipams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ipamForm)
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.message || 'Unable to create IPAM configuration.');
      }

      setIpamForm(emptyIpamForm);
      setShowIpamModal(false);
      setIpamStatus({
        type: 'success',
        message: 'IPAM configuration created successfully.'
      });
      // Reload data in background
      loadIpams();
    } catch (error) {
      setIpamStatus({
        type: 'error',
        message: error.message || 'Unable to create IPAM configuration.'
      });
    }
  };

  const handleUpdateIpam = async () => {
    try {
      const response = await fetch(`/api/ipams/${selectedIpamId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ipamForm)
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.message || 'Unable to update IPAM configuration.');
      }

      setIpamForm(emptyIpamForm);
      setShowIpamModal(false);
      setIsEditingIpam(false);
      setSelectedIpamId(null);
      setIpamStatus({
        type: 'success',
        message: 'IPAM configuration updated successfully.'
      });
      // Reload data in background
      loadIpams();
    } catch (error) {
      setIpamStatus({
        type: 'error',
        message: error.message || 'Unable to update IPAM configuration.'
      });
    }
  };

  const handleDeleteIpam = async () => {
    try {
      const response = await fetch(`/api/ipams/${selectedIpamId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.message || 'Unable to delete IPAM configuration.');
      }

      setSelectedIpamId(null);
      setIpamStatus({
        type: 'success',
        message: 'IPAM configuration deleted successfully.'
      });
      // Reload data in background
      loadIpams();
    } catch (error) {
      setIpamStatus({
        type: 'error',
        message: error.message || 'Unable to delete IPAM configuration.'
      });
    }
  };

  const handleTestIpam = async (ipam) => {
    try {
      setTestingIpam(ipam.id);
      const response = await fetch(`/api/ipams/${ipam.id}/test`, {
        method: 'POST'
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.message || 'IPAM test failed.');
      }

      const result = await response.json();
      setIpamStatus({
        type: result.success ? 'success' : 'error',
        message: result.message || (result.success ? 'IPAM connection successful!' : 'IPAM connection failed.')
      });
    } catch (error) {
      setIpamStatus({
        type: 'error',
        message: error.message || 'IPAM test failed.'
      });
    } finally {
      setTestingIpam(null);
    }
  };

  const handleSyncIpam = async (ipam) => {
    try {
      setSyncingIpam(ipam.id);
      const response = await fetch(`/api/ipams/${ipam.id}/sync`, {
        method: 'POST'
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.message || 'IPAM sync failed.');
      }

      const result = await response.json();
      setIpamStatus({
        type: result.success ? 'success' : 'error',
        message: result.message || (result.success ? 'IPAM sync completed!' : 'IPAM sync failed.')
      });
    } catch (error) {
      setIpamStatus({
        type: 'error',
        message: error.message || 'IPAM sync failed.'
      });
    } finally {
      setSyncingIpam(null);
    }
  };

  const handleIpamSubmit = (event) => {
    event.preventDefault();
    if (isEditingIpam) {
      handleUpdateIpam();
    } else {
      handleCreateIpam();
    }
  };

  const handleEditIpam = (ipam) => {
    setIpamForm({
      name: ipam.name || '',
      baseUrl: ipam.baseUrl || '',
      appId: ipam.appId || '',
      appCode: ipam.appCode || '',
      appPermissions: ipam.appPermissions || 'Read',
      appSecurity: ipam.appSecurity || 'SSL with App code token'
    });
    setSelectedIpamId(ipam.id);
    setIsEditingIpam(true);
    setShowIpamModal(true);
  };

  const handleDeleteIpamClick = (ipam) => {
    setSelectedIpamId(ipam.id);
    handleDeleteIpam();
  };

  const handleNewIpam = () => {
    setIpamForm(emptyIpamForm);
    setSelectedIpamId(null);
    setIsEditingIpam(false);
    setShowIpamModal(true);
  };

  if (ipamLoading && !showIpamModal) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Settings</h1>
            <p className="text-tertiary mt-2">Configure system settings and integrations.</p>
          </div>
        </div>
        <div className="card">
          <div className="card__body">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
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
          <h1 className="text-3xl font-bold text-primary">Settings</h1>
          <p className="text-tertiary mt-2">Configure system settings and integrations.</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

      {/* Status Message */}
      {ipamStatus.message && (
        <div className={`p-4 rounded-xl border ${
          ipamStatus.type === 'error' 
            ? 'bg-error-50 border-error-200 text-error-700' 
            : 'bg-success-50 border-success-200 text-success-700'
        }`}>
          {ipamStatus.message}
        </div>
      )}

        {/* Services Status */}
        <div className="card">
        <div className="card__header">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="card__title">Services Status</h2>
              <p className="card__subtitle">Monitor system services health</p>
            </div>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={checkServicesStatus}
              disabled={servicesLoading}
            >
              <RefreshIcon />
              {servicesLoading ? 'Checking...' : 'Refresh'}
            </button>
          </div>
        </div>
        <div className="card__body">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {/* Nginx */}
            <div className="service-card">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="service-icon">
                  <WebIcon />
                </div>
                <div className="flex-1">
                  <h3 className="service-name">Nginx</h3>
                  <p className="service-description">Web Server</p>
                </div>
                <div className={`status-badge ${statusVariant(servicesStatus.nginx.status)}`}>
                  {servicesStatus.nginx.status}
                </div>
              </div>
            </div>

            {/* Frontend */}
            <div className="service-card">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="service-icon">
                  <WebIcon />
                </div>
                <div className="flex-1">
                  <h3 className="service-name">Frontend</h3>
                  <p className="service-description">React Application</p>
                </div>
                <div className={`status-badge ${statusVariant(servicesStatus.frontend.status)}`}>
                  {servicesStatus.frontend.status}
                </div>
              </div>
            </div>

            {/* Backend */}
            <div className="service-card">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="service-icon">
                  <ServerIcon />
                </div>
                <div className="flex-1">
                  <h3 className="service-name">Backend</h3>
                  <p className="service-description">Node.js Server</p>
                </div>
                <div className={`status-badge ${statusVariant(servicesStatus.backend.status)}`}>
                  {servicesStatus.backend.status}
                </div>
              </div>
            </div>

            {/* API */}
            <div className="service-card">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="service-icon">
                  <ApiIcon />
                </div>
                <div className="flex-1">
                  <h3 className="service-name">API</h3>
                  <p className="service-description">REST API</p>
                </div>
                <div className={`status-badge ${statusVariant(servicesStatus.api.status)}`}>
                  {servicesStatus.api.status}
                </div>
              </div>
            </div>

            {/* Database */}
            <div className="service-card">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="service-icon">
                  <DatabaseIcon />
                </div>
                <div className="flex-1">
                  <h3 className="service-name">Database</h3>
                  <p className="service-description">SQLite Database</p>
                </div>
                <div className={`status-badge ${statusVariant(servicesStatus.database.status)}`}>
                  {servicesStatus.database.status}
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm text-tertiary">
              Last checked: {servicesStatus.api.lastCheck ? formatTimestamp(servicesStatus.api.lastCheck) : 'Never'}
            </div>
          </div>
        </div>
      </div>

        {/* System Information */}
        {configInfo && (
          <div className="card">
          <div className="card__header">
            <h2 className="card__title">System Information</h2>
            <p className="card__subtitle">Current system configuration</p>
          </div>
          <div className="card__body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-50 rounded-lg">
                    <DatabaseIcon />
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary">Database</h3>
                    <p className="text-sm text-tertiary">Storage configuration</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-tertiary">Driver:</span>
                    <span className="text-secondary">{configInfo.database?.driver || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-tertiary">File:</span>
                    <span className="text-secondary font-mono text-xs">
                      {configInfo.database?.file || 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-50 rounded-lg">
                    <NetworkIcon />
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary">Configuration</h3>
                    <p className="text-sm text-tertiary">System settings</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-tertiary">Config File:</span>
                    <span className="text-secondary font-mono text-xs">
                      {configInfo.database?.configFile || 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* IPAM Configurations */}
        <div className="card xl:col-span-2">
        <div className="card__header">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="card__title">IPAM Integrations</h2>
              <p className="card__subtitle">Manage phpIPAM connections</p>
            </div>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleNewIpam}
            >
              <PlusIcon />
              Add IPAM
            </button>
          </div>
        </div>
        <div className="card__body">
          {ipams.length > 0 ? (
            <div className="space-y-4">
              {ipams.map((ipam) => (
                <div key={ipam.id} className="p-4 border border-primary rounded-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary-50 rounded-lg">
                        <NetworkIcon />
                      </div>
                      <div>
                        <h3 className="font-semibold text-primary">{ipam.name}</h3>
                        <p className="text-sm text-tertiary">{ipam.baseUrl}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`status-badge ${statusVariant(ipam.status)}`}>
                        {ipam.status || 'Unknown'}
                      </span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => handleTestIpam(ipam)}
                          disabled={testingIpam === ipam.id}
                        >
                          {testingIpam === ipam.id ? (
                            <SyncIcon />
                          ) : (
                            <TestIcon />
                          )}
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => handleSyncIpam(ipam)}
                          disabled={syncingIpam === ipam.id}
                        >
                          <SyncIcon />
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => handleEditIpam(ipam)}
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm text-error"
                          onClick={() => handleDeleteIpamClick(ipam)}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-tertiary">App ID:</span>
                      <span className="text-secondary ml-2">{ipam.appId || '—'}</span>
                    </div>
                    <div>
                      <span className="text-tertiary">Permissions:</span>
                      <span className="text-secondary ml-2">{ipam.appPermissions || '—'}</span>
                    </div>
                    <div>
                      <span className="text-tertiary">Last Sync:</span>
                      <span className="text-secondary ml-2">{formatTimestamp(ipam.lastSyncAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <NetworkIcon />
              <h3 className="text-lg font-semibold text-primary mt-4">No IPAM configurations</h3>
              <p className="text-tertiary mt-2">Get started by adding your first phpIPAM integration.</p>
              <button
                type="button"
                className="btn btn--primary mt-4"
                onClick={handleNewIpam}
              >
                <PlusIcon />
                Add Your First IPAM
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit IPAM Modal */}
      <div 
        className={`modal ${showIpamModal ? 'modal--open' : ''}`}
        onClick={(e) => {
          // Close modal when clicking on backdrop
          if (e.target === e.currentTarget) {
            setShowIpamModal(false);
            setIpamForm(emptyIpamForm);
            setIsEditingIpam(false);
            setSelectedIpamId(null);
          }
        }}
      >
        <div className="modal__dialog">
          <div className="modal__header">
            <div>
              <h2 className="modal__title">
                {isEditingIpam ? 'Edit IPAM Configuration' : 'Add New IPAM Configuration'}
              </h2>
              <p className="modal__description text-tertiary text-sm mt-1">
                {isEditingIpam ? 'Update the IPAM configuration below.' : 'Configure a new phpIPAM integration.'}
              </p>
            </div>
            <button
              type="button"
              className="modal__close"
              onClick={() => {
                setShowIpamModal(false);
                setIpamForm(emptyIpamForm);
                setIsEditingIpam(false);
                setSelectedIpamId(null);
              }}
            >
              ×
            </button>
          </div>
          <div className="modal__body">
            <form id="ipam-form" onSubmit={handleIpamSubmit} className="space-y-4">
              <div className="form-group">
                <label htmlFor="ipam-name" className="form-label">
                  Configuration Name *
                </label>
                  <input
                  id="ipam-name"
                    type="text"
                  className="form-input"
                    value={ipamForm.name}
                  onChange={(e) => setIpamForm({ ...ipamForm, name: e.target.value })}
                  placeholder="e.g., Production IPAM"
                    required
                  />
              </div>

              <div className="form-group">
                <label htmlFor="ipam-base-url" className="form-label">
                  Base URL *
                </label>
                  <input
                  id="ipam-base-url"
                    type="url"
                  className="form-input"
                    value={ipamForm.baseUrl}
                  onChange={(e) => setIpamForm({ ...ipamForm, baseUrl: e.target.value })}
                  placeholder="https://ipam.example.com"
                    required
                  />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label htmlFor="ipam-app-id" className="form-label">
                    App ID *
                </label>
                  <input
                    id="ipam-app-id"
                    type="text"
                    className="form-input"
                    value={ipamForm.appId}
                    onChange={(e) => setIpamForm({ ...ipamForm, appId: e.target.value })}
                    placeholder="Enter App ID"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="ipam-app-code" className="form-label">
                    App Code *
                </label>
                  <input
                    id="ipam-app-code"
                    type="password"
                    className="form-input"
                    value={ipamForm.appCode}
                    onChange={(e) => setIpamForm({ ...ipamForm, appCode: e.target.value })}
                    placeholder="Enter App Code"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label htmlFor="ipam-permissions" className="form-label">
                    Permissions
                </label>
                  <select
                    id="ipam-permissions"
                    className="form-input form-select"
                    value={ipamForm.appPermissions}
                    onChange={(e) => setIpamForm({ ...ipamForm, appPermissions: e.target.value })}
                  >
                    <option value="Read">Read Only</option>
                    <option value="Read/Write">Read/Write</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="ipam-security" className="form-label">
                    Security
                </label>
                  <select
                    id="ipam-security"
                    className="form-input form-select"
                    value={ipamForm.appSecurity}
                    onChange={(e) => setIpamForm({ ...ipamForm, appSecurity: e.target.value })}
                  >
                    <option value="SSL with App code token">SSL with App code token</option>
                    <option value="SSL with User token">SSL with User token</option>
                    <option value="SSL with User credentials">SSL with User credentials</option>
                  </select>
                </div>
              </div>
            </form>
                      </div>
          <div className="modal__footer">
                      <button
                        type="button"
              className="btn btn--ghost"
              onClick={() => {
                setShowIpamModal(false);
                setIpamForm(emptyIpamForm);
                setIsEditingIpam(false);
                setSelectedIpamId(null);
              }}
            >
              Cancel
                      </button>
                      <button
              type="submit"
              form="ipam-form"
              className="btn btn--primary"
              disabled={!ipamForm.name.trim() || !ipamForm.baseUrl.trim() || !ipamForm.appId.trim() || !ipamForm.appCode.trim()}
            >
              {isEditingIpam ? 'Update Configuration' : 'Add Configuration'}
                      </button>
          </div>
          </div>
      </div>
      </div>
    </div>
  );
};

export default Settings;