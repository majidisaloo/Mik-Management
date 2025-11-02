import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useUpdate } from '../context/UpdateContext.jsx';
import UpdateStatusIcon from '../components/UpdateStatusIcon';
import './Settings.css';
import './Updates.css';

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
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get active tab from URL
  const urlParams = new URLSearchParams(location.search);
  const activeTab = urlParams.get('tab') || 'services';

  // Update context
  const {
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

  // Update functions
  const checkForUpdates = async () => {
    try {
      setUpdateLoading(true);
      console.log(`=== Manual Update Check ===`);
      
      const response = await fetch('/api/check-updates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
        <div className="updates-page">
          {/* Auto-Check Card */}
          <div className="update-card">
            <div className="update-card__header">
              <h2 className="update-card__title">Automatic Update Checking</h2>
              <p className="update-card__subtitle">Configure automatic background update checks</p>
            </div>
            <div className="update-card__content">
              <div className="update-auto-check">
                <div className="update-auto-check__header">
                  <div className="update-auto-check__icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M21 3v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M3 21v-5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="update-auto-check__title">Automatic Checks</h3>
                    <p className="update-auto-check__description">Enable automatic background update checking</p>
                  </div>
                </div>
                
                <label className="update-checkbox-wrapper">
                  <input
                    type="checkbox"
                    checked={autoCheckEnabled}
                    onChange={(e) => setAutoCheckEnabled(e.target.checked)}
                    className="update-checkbox"
                  />
                  <span className="update-checkbox-label">Enable automatic update checking</span>
                </label>
                
                {autoCheckEnabled && (
                  <div className="update-interval-wrapper">
                    <label className="update-info-item__label" style={{display: 'block', marginBottom: '8px'}}>
                      Check Interval
                    </label>
                    <select
                      value={checkInterval}
                      onChange={(e) => setCheckInterval(Number(e.target.value))}
                      className="update-interval-select"
                    >
                      <option value={60}>Every 1 minute</option>
                      <option value={300}>Every 5 minutes</option>
                      <option value={900}>Every 15 minutes</option>
                      <option value={1800}>Every 30 minutes</option>
                      <option value={3600}>Every 1 hour</option>
                    </select>
                    <p style={{fontSize: '12px', color: '#6b7280', marginTop: '8px'}}>
                      System will automatically check for updates in the background
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Version Card */}
          <div className="update-card">
            <div className="update-card__header">
              <h2 className="update-card__title">Current Version</h2>
              <p className="update-card__subtitle">Your current system version</p>
            </div>
            <div className="update-card__content">
              <div className="update-version-card">
                <div className="update-version-card__content">
                  <div className="update-version-card__label">Latest Version</div>
                  <h3 className="update-version-card__version">
                    {updateInfo?.currentVersion || 'Loading...'}
                  </h3>
                  <div className="update-version-card__status">
                    {updateInfo?.updateAvailable ? (
                      <span className="update-status-badge update-status-badge--available">
                        Update Available
                      </span>
                    ) : (
                      <span className="update-status-badge update-status-badge--up-to-date">
                        Up to Date
                      </span>
                    )}
                  </div>
                  {lastCheckTime && (
                    <div className="update-version-card__last-check">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Last checked: {new Date(lastCheckTime).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Update Status Notification */}
          {(updateStatus.message || updateNotification) && (
            <div className={`update-notification ${
              (updateStatus.type === 'success' || updateNotification?.type === 'success') ? 'update-notification--success' :
              (updateStatus.type === 'error' || updateNotification?.type === 'error') ? 'update-notification--error' :
              'update-notification--info'
            }`}>
              <span>{updateStatus.message || updateNotification?.message}</span>
              {updateNotification && (
                <button
                  onClick={() => setUpdateNotification(null)}
                  className="update-notification__dismiss"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}

          {/* Update Info Card */}
          {updateInfo && (
            <div className="update-card">
              <div className="update-card__header">
                <h2 className="update-card__title">Update Information</h2>
                <p className="update-card__subtitle">Current update status and available versions</p>
              </div>
              <div className="update-card__content">
                <div className="update-info-grid">
                  <div className="update-info-item">
                    <div className="update-info-item__label">Current Version</div>
                    <div className="update-info-item__value">
                      {updateInfo?.currentVersion || 'N/A'}
                    </div>
                  </div>
                  
                  <div className="update-info-item">
                    <div className="update-info-item__label">Latest Version</div>
                    <div className="update-info-item__value update-info-item__value--success">
                      {updateInfo?.latestVersion || 'N/A'}
                    </div>
                  </div>
                  
                  <div className="update-info-item">
                    <div className="update-info-item__label">Update Status</div>
                    <div className="update-info-item__value">
                      {updateInfo?.updateAvailable ? (
                        <span className="update-status-badge update-status-badge--available">
                          Available
                        </span>
                      ) : (
                        <span className="update-status-badge update-status-badge--up-to-date">
                          Up to Date
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {updateInfo.updateAvailable && updateInfo.updateInfo?.updateSize && (
                    <div className="update-info-item">
                      <div className="update-info-item__label">Commits Behind</div>
                      <div className="update-info-item__value update-info-item__value--warning">
                        {updateInfo.updateInfo.updateSize}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="update-actions">
            <button
              type="button"
              className="update-btn update-btn--secondary"
              onClick={checkForUpdates}
              disabled={updateLoading}
            >
              <RefreshIcon />
              <span>{updateLoading ? 'Checking...' : 'Check for Updates'}</span>
            </button>
            
            {updateInfo?.updateAvailable && (
              <button
                type="button"
                className="update-btn update-btn--primary"
                onClick={performUpdate}
                disabled={updateLoading}
              >
                <UpdateIcon />
                <span>{updateLoading ? 'Updating...' : 'Update Now'}</span>
              </button>
            )}
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