import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useUpdate } from '../context/UpdateContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import UpdateStatusIcon from '../components/UpdateStatusIcon';
import './Settings.css';

// Modern Icons
const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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

const UpdateIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 3v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 21v-5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const NetworkIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Settings = () => {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get active tab from URL
  const urlParams = new URLSearchParams(location.search);
  const activeTab = urlParams.get('tab') || 'services';

  // Update context
  const {
    updateChannel,
    setUpdateChannel,
    updateInfo,
    setUpdateInfo,
    autoCheckEnabled,
    setAutoCheckEnabled,
    checkInterval,
    setCheckInterval,
    lastCheckTime,
    updateNotification,
    setUpdateNotification,
    autoCheckForUpdates
  } = useUpdate();

  // Services status state
  const [servicesStatus, setServicesStatus] = useState({
    nginx: { status: 'unknown', uptime: null, lastCheck: null },
    frontend: { status: 'unknown', uptime: null, lastCheck: null },
    backend: { status: 'unknown', uptime: null, lastCheck: null },
    api: { status: 'unknown', uptime: null, lastCheck: null },
    database: { status: 'unknown', uptime: null, lastCheck: null }
  });
  const [servicesLoading, setServicesLoading] = useState(false);

  // Local update state
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateStatus, setUpdateStatus] = useState({ type: '', message: '' });

  // System information state
  const [configInfo, setConfigInfo] = useState(null);
  const [configLoading, setConfigLoading] = useState(false);

  // Check services status
  const checkServicesStatus = async () => {
    setServicesLoading(true);
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      
      if (response.ok) {
        setServicesStatus({
          nginx: { status: 'running', uptime: null, lastCheck: new Date().toISOString() },
          frontend: { status: 'running', uptime: null, lastCheck: new Date().toISOString() },
          backend: { status: 'running', uptime: null, lastCheck: new Date().toISOString() },
          api: { status: 'running', uptime: data.uptime, lastCheck: new Date().toISOString() },
          database: { status: 'running', uptime: null, lastCheck: new Date().toISOString() }
        });
      } else {
        setServicesStatus({
          nginx: { status: 'unknown', uptime: null, lastCheck: new Date().toISOString() },
          frontend: { status: 'unknown', uptime: null, lastCheck: new Date().toISOString() },
          backend: { status: 'failed', uptime: null, lastCheck: new Date().toISOString() },
          api: { status: 'failed', uptime: null, lastCheck: new Date().toISOString() },
          database: { status: 'unknown', uptime: null, lastCheck: new Date().toISOString() }
        });
      }
    } catch (error) {
      console.error('Failed to check services status:', error);
      setServicesStatus({
        nginx: { status: 'unknown', uptime: null, lastCheck: new Date().toISOString() },
        frontend: { status: 'unknown', uptime: null, lastCheck: new Date().toISOString() },
        backend: { status: 'failed', uptime: null, lastCheck: new Date().toISOString() },
        api: { status: 'failed', uptime: null, lastCheck: new Date().toISOString() },
        database: { status: 'unknown', uptime: null, lastCheck: new Date().toISOString() }
      });
    } finally {
      setServicesLoading(false);
    }
  };

  // Load system configuration
  const loadConfigInfo = useCallback(async () => {
    setConfigLoading(true);
    try {
      const response = await fetch('/api/config-info');
      if (response.ok) {
        const data = await response.json();
        setConfigInfo(data);
      }
    } catch (error) {
      console.error('Failed to load config info:', error);
    } finally {
      setConfigLoading(false);
    }
  }, []);

  // Load update info on component mount
  useEffect(() => {
    const loadUpdateInfo = async () => {
      try {
        setUpdateLoading(true);
        console.log(`=== Auto Update Check ===`);
        console.log(`Channel: ${updateChannel}`);
        
        const response = await fetch('/api/check-updates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ channel: updateChannel }),
        });

        const data = await response.json();
        console.log('Auto check response:', data);
        
        if (response.ok) {
          setUpdateInfo(data);
          setLastCheckTime(new Date().toISOString());
        } else {
          console.error('Failed to load update info:', data.message);
        }
      } catch (error) {
        console.error('Error loading update info:', error);
      } finally {
        setUpdateLoading(false);
      }
    };

    loadUpdateInfo();
  }, [updateChannel]);

  // Update functions
  const checkForUpdates = async () => {
    try {
      setUpdateLoading(true);
      console.log(`=== Manual Update Check ===`);
      console.log(`Channel: ${updateChannel}`);
      
      const response = await fetch('/api/check-updates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channel: updateChannel }),
      });

      const data = await response.json();
      console.log('Manual check response:', data);
      
      if (response.ok) {
        setUpdateInfo(data);
        if (data.updateAvailable) {
          setUpdateStatus({
            type: 'success',
            message: `Update available: ${data.latestVersion}`
          });
        } else {
          setUpdateStatus({
            type: 'info',
            message: 'You are up to date!'
          });
        }
      } else {
        throw new Error(data.message || 'Failed to check for updates');
      }
    } catch (error) {
      setUpdateStatus({
        type: 'error',
        message: error.message || 'Failed to check for updates'
      });
    } finally {
      setUpdateLoading(false);
    }
  };

  const performUpdate = async () => {
    if (!updateInfo?.updateAvailable) return;

    try {
      setUpdateLoading(true);
      const response = await fetch('/api/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channel: updateChannel }),
      });

      const data = await response.json();
      if (response.ok) {
        setUpdateStatus({
          type: 'success',
          message: 'Update completed! System will restart shortly.'
        });
        // Redirect to login after update
        setTimeout(() => {
          window.location.href = '/login';
        }, 3000);
      } else {
        throw new Error(data.message || 'Update failed');
      }
    } catch (error) {
      setUpdateStatus({
        type: 'error',
        message: error.message || 'Update failed'
      });
    } finally {
      setUpdateLoading(false);
    }
  };


  // Status variant helper
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

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Never';
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  // Format uptime
  const formatUptime = (uptime) => {
    if (!uptime) return 'Unknown';
    try {
      const seconds = parseInt(uptime);
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      
      if (days > 0) return `${days}d ${hours}h ${minutes}m`;
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;
    } catch {
      return 'Unknown';
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    loadConfigInfo();
    checkServicesStatus();
  }, [navigate, user, loadConfigInfo]);


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Settings</h1>
          <p className="text-tertiary mt-2">Configure system settings and monitor services.</p>
        </div>
      </div>

      {/* Tab Navigation - Like Users & Roles */}
      <div className="settings-tabs">
        <button
          type="button"
          className={`tab-button ${activeTab === 'services' ? 'tab-button--active' : ''}`}
          onClick={() => navigate('/settings?tab=services')}
        >
          <ServerIcon />
          Services Status
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'updates' ? 'tab-button--active' : ''}`}
          onClick={() => navigate('/settings?tab=updates')}
        >
          <UpdateIcon />
          Updates
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'system' ? 'tab-button--active' : ''}`}
          onClick={() => navigate('/settings?tab=system')}
        >
          <DatabaseIcon />
          System Info
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'services' && (
        <div className="space-y-6">
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
            <div className="services-grid">
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
      </div>
      )}

      {/* Updates Tab */}
      {activeTab === 'updates' && (
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
            }}>Manage system updates and version channels</p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {/* Update Channel Selection */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: theme === 'dark' ? '#fff' : '#000',
                    marginBottom: '4px',
                    fontFamily: 'inherit'
                  }}>Update Channel</label>
                  <p style={{
                    fontSize: '14px',
                    color: theme === 'dark' ? '#ccc' : '#666',
                    margin: 0,
                    fontFamily: 'inherit'
                  }}>Choose your preferred update channel</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    padding: '16px',
                    border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff'
                  }}>
                    <input
                      type="radio"
                      name="updateChannel"
                      value="stable"
                      checked={updateChannel === 'stable'}
                      onChange={(e) => setUpdateChannel(e.target.value)}
                      style={{
                        marginTop: '4px',
                        marginRight: '12px',
                        accentColor: '#3b82f6'
                      }}
                    />
                    <div>
                      <div style={{
                        fontWeight: '500',
                        color: theme === 'dark' ? '#fff' : '#000',
                        fontSize: '14px',
                        fontFamily: 'inherit'
                      }}>Stable</div>
                      <div style={{
                        fontSize: '12px',
                        color: theme === 'dark' ? '#ccc' : '#666',
                        marginTop: '4px',
                        fontFamily: 'inherit'
                      }}>Recommended for production environments</div>
                    </div>
                  </label>
                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    padding: '16px',
                    border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff'
                  }}>
                    <input
                      type="radio"
                      name="updateChannel"
                      value="beta"
                      checked={updateChannel === 'beta'}
                      onChange={(e) => setUpdateChannel(e.target.value)}
                      style={{
                        marginTop: '4px',
                        marginRight: '12px',
                        accentColor: '#3b82f6'
                      }}
                    />
                    <div>
                      <div style={{
                        fontWeight: '500',
                        color: theme === 'dark' ? '#fff' : '#000',
                        fontSize: '14px',
                        fontFamily: 'inherit'
                      }}>Beta</div>
                      <div style={{
                        fontSize: '12px',
                        color: theme === 'dark' ? '#ccc' : '#666',
                        marginTop: '4px',
                        fontFamily: 'inherit'
                      }}>Latest features, may be unstable</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Auto-Check Settings */}
              <div className="space-y-4">
                <div>
                  <label className="form-label text-base font-semibold">Automatic Update Checking</label>
                  <p className="text-sm text-gray-600 mt-1">Configure automatic background update checks</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <label className="auto-check-checkbox">
                    <input
                      type="checkbox"
                      checked={autoCheckEnabled}
                      onChange={(e) => setAutoCheckEnabled(e.target.checked)}
                      className="auto-check-input"
                    />
                    <span className="auto-check-label">Enable automatic update checking</span>
                  </label>
                  
                  {autoCheckEnabled && (
                    <div className="ml-6 space-y-3">
                      <div>
                        <label className="form-label text-sm font-medium">Check Interval</label>
                        <select
                          value={checkInterval}
                          onChange={(e) => setCheckInterval(Number(e.target.value))}
                          className="form-input mt-1"
                        >
                          <option value={60}>Every 1 minute</option>
                          <option value={300}>Every 5 minutes</option>
                          <option value={900}>Every 15 minutes</option>
                          <option value={1800}>Every 30 minutes</option>
                          <option value={3600}>Every 1 hour</option>
                        </select>
                      </div>
                      <p className="text-sm text-gray-500">
                        System will automatically check for updates in the background
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Current Version */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: theme === 'dark' ? '#fff' : '#000',
                    marginBottom: '4px',
                    fontFamily: 'inherit'
                  }}>Current Version</label>
                  <p style={{
                    fontSize: '14px',
                    color: theme === 'dark' ? '#ccc' : '#666',
                    margin: 0,
                    fontFamily: 'inherit'
                  }}>Your current system version</p>
                </div>
                <div style={{
                  backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff',
                  border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
                  borderRadius: '8px',
                  padding: '16px'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0'
                  }}>
                    <span style={{
                      color: theme === 'dark' ? '#ccc' : '#666',
                      fontSize: '14px',
                      fontFamily: 'inherit'
                    }}>Current Version:</span>
                    <span style={{
                      fontWeight: '500',
                      color: theme === 'dark' ? '#fff' : '#000',
                      fontSize: '14px',
                      fontFamily: 'inherit'
                    }}>{updateInfo?.currentVersion || 'Loading...'}</span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                  {/* Stable Version */}
                  <div style={{
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                    border: '1px solid #bbf7d0',
                    borderRadius: '8px',
                    padding: '16px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div>
                        <span style={{
                          fontFamily: 'monospace',
                          fontSize: '18px',
                          fontWeight: 'bold',
                          color: '#166534',
                          display: 'block'
                        }}>
                          {updateInfo?.updateInfo?.stableVersion || updateInfo?.stableVersion || updateInfo?.currentVersion?.replace('-beta', '') || 'Loading...'}
                        </span>
                        <div style={{
                          fontSize: '12px',
                          color: '#16a34a',
                          marginTop: '4px',
                          fontFamily: 'inherit'
                        }}>Stable Version</div>
                      </div>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        backgroundColor: '#22c55e',
                        borderRadius: '50%'
                      }}></div>
                    </div>
                  </div>
                  
                  {/* Beta Version */}
                  <div style={{
                    background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)',
                    border: '1px solid #fed7aa',
                    borderRadius: '8px',
                    padding: '16px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div>
                        <span style={{
                          fontFamily: 'monospace',
                          fontSize: '18px',
                          fontWeight: 'bold',
                          color: '#c2410c',
                          display: 'block'
                        }}>
                          {updateInfo?.updateInfo?.betaVersion || updateInfo?.betaVersion || updateInfo?.currentVersion || 'Loading...'}
                        </span>
                        <div style={{
                          fontSize: '12px',
                          color: '#ea580c',
                          marginTop: '4px',
                          fontFamily: 'inherit'
                        }}>Beta Version</div>
                      </div>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        backgroundColor: '#f97316',
                        borderRadius: '50%'
                      }}></div>
                    </div>
                  </div>
                </div>
                {lastCheckTime && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: '12px',
                      color: '#3b82f6',
                      fontFamily: 'inherit'
                    }}>
                      Last checked: {new Date(lastCheckTime).toLocaleTimeString()}
                    </div>
                  </div>
                )}
              </div>

              {/* Update Status */}
              {(updateStatus.message || updateNotification) && (
                <div className={`p-4 rounded-lg ${
                  (updateStatus.type === 'success' || updateNotification?.type === 'success') ? 'bg-green-50 text-green-700 border border-green-200' :
                  (updateStatus.type === 'error' || updateNotification?.type === 'error') ? 'bg-red-50 text-red-700 border border-red-200' :
                  'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  {updateStatus.message || updateNotification?.message}
                  {updateNotification && (
                    <button
                      onClick={() => setUpdateNotification(null)}
                      className="ml-2 text-xs underline hover:no-underline"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              )}

              {/* Update Info */}
              {updateInfo && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: theme === 'dark' ? '#fff' : '#000',
                      marginBottom: '4px',
                      fontFamily: 'inherit'
                    }}>Update Information</label>
                    <p style={{
                      fontSize: '14px',
                      color: theme === 'dark' ? '#ccc' : '#666',
                      margin: 0,
                      fontFamily: 'inherit'
                    }}>Current update status and available versions</p>
                  </div>
                  <div style={{
                    backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff',
                    border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 0',
                      borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#eee'}`
                    }}>
                      <span style={{
                        color: theme === 'dark' ? '#ccc' : '#666',
                        fontSize: '14px',
                        fontFamily: 'inherit'
                      }}>Channel:</span>
                      <span style={{
                        fontWeight: '500',
                        color: theme === 'dark' ? '#fff' : '#000',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        textTransform: 'capitalize'
                      }}>{updateInfo.channel}</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 0',
                      borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#eee'}`
                    }}>
                      <span style={{
                        color: theme === 'dark' ? '#ccc' : '#666',
                        fontSize: '14px',
                        fontFamily: 'inherit'
                      }}>Latest Stable:</span>
                      <span style={{
                        fontWeight: '500',
                        color: theme === 'dark' ? '#fff' : '#000',
                        fontSize: '14px',
                        fontFamily: 'inherit'
                      }}>{updateInfo?.updateInfo?.stableVersion || updateInfo?.stableVersion || 'N/A'}</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 0',
                      borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#eee'}`
                    }}>
                      <span style={{
                        color: theme === 'dark' ? '#ccc' : '#666',
                        fontSize: '14px',
                        fontFamily: 'inherit'
                      }}>Latest Beta:</span>
                      <span style={{
                        fontWeight: '500',
                        color: theme === 'dark' ? '#fff' : '#000',
                        fontSize: '14px',
                        fontFamily: 'inherit'
                      }}>{updateInfo?.updateInfo?.betaVersion || updateInfo?.betaVersion || 'N/A'}</span>
                    </div>
                    {updateInfo.updateAvailable ? (
                      <>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 0',
                          borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#eee'}`
                        }}>
                          <span style={{
                            color: theme === 'dark' ? '#ccc' : '#666',
                            fontSize: '14px',
                            fontFamily: 'inherit'
                          }}>Update Available:</span>
                          <span style={{
                            fontWeight: '500',
                            color: '#16a34a',
                            fontSize: '14px',
                            fontFamily: 'inherit'
                          }}>Yes</span>
                        </div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 0'
                        }}>
                          <span style={{
                            color: theme === 'dark' ? '#ccc' : '#666',
                            fontSize: '14px',
                            fontFamily: 'inherit'
                          }}>Target Version:</span>
                          <span style={{
                            fontWeight: '500',
                            color: '#16a34a',
                            fontSize: '14px',
                            fontFamily: 'inherit'
                          }}>{updateInfo.latestVersion}</span>
                        </div>
                        {updateInfo.updateInfo?.updateSize && (
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 0'
                          }}>
                            <span style={{
                              color: theme === 'dark' ? '#ccc' : '#666',
                              fontSize: '14px',
                              fontFamily: 'inherit'
                            }}>Commits Behind:</span>
                            <span style={{
                              fontWeight: '500',
                              color: '#ea580c',
                              fontSize: '14px',
                              fontFamily: 'inherit'
                            }}>{updateInfo.updateInfo.updateSize}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 0'
                      }}>
                        <span style={{
                          color: theme === 'dark' ? '#ccc' : '#666',
                          fontSize: '14px',
                          fontFamily: 'inherit'
                        }}>Update Available:</span>
                        <span style={{
                          fontWeight: '500',
                          color: '#16a34a',
                          fontSize: '14px',
                          fontFamily: 'inherit'
                        }}>No</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                paddingTop: '16px',
                borderTop: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`
              }}>
                <button
                  type="button"
                  onClick={checkForUpdates}
                  disabled={updateLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '12px 24px',
                    backgroundColor: updateLoading ? (theme === 'dark' ? '#6c757d' : '#6c757d') : (theme === 'dark' ? '#374151' : '#f3f4f6'),
                    color: updateLoading ? '#fff' : (theme === 'dark' ? '#fff' : '#374151'),
                    border: `1px solid ${theme === 'dark' ? '#4b5563' : '#d1d5db'}`,
                    borderRadius: '8px',
                    cursor: updateLoading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    opacity: updateLoading ? 0.7 : 1,
                    transition: 'all 0.2s ease',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    margin: 0,
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    outline: 'none'
                  }}
                >
                  <RefreshIcon />
                  <span style={{ marginLeft: '8px' }}>{updateLoading ? 'Checking...' : 'Check for Updates'}</span>
                </button>
                {updateInfo?.updateAvailable && (
                  <button
                    type="button"
                    onClick={performUpdate}
                    disabled={updateLoading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '12px 24px',
                      backgroundColor: updateLoading ? (theme === 'dark' ? '#6c757d' : '#6c757d') : '#3b82f6',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: updateLoading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      opacity: updateLoading ? 0.7 : 1,
                      transition: 'all 0.2s ease',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      margin: 0,
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      MozAppearance: 'none',
                      outline: 'none'
                    }}
                  >
                    <UpdateIcon />
                    <span style={{ marginLeft: '8px' }}>{updateLoading ? 'Updating...' : 'Update Now'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Info Tab */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          <div className="card">
            <div className="card__header">
              <h2 className="card__title">System Information</h2>
              <p className="card__subtitle">View system configuration and details</p>
            </div>
            <div className="card__content">
              {configLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-tertiary">Loading system information...</p>
                </div>
              ) : configInfo ? (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary-50 rounded-lg">
                        <DatabaseIcon />
                      </div>
                      <div>
                        <h3 className="font-semibold text-primary">Database</h3>
                        <p className="text-sm text-tertiary">System database</p>
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
                        <DatabaseIcon />
                      </div>
                      <div>
                        <h3 className="font-semibold text-primary">Configuration</h3>
                        <p className="text-sm text-tertiary">System configuration</p>
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
              ) : (
                <div className="text-center py-8">
                  <p className="text-tertiary">Failed to load system information</p>
                    </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;