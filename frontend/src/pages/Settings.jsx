import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useUpdate } from '../context/UpdateContext.jsx';
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
        <div className="space-y-6">
          <div className="card">
            <div className="card__header">
              <h2 className="card__title">System Updates</h2>
              <p className="card__subtitle">Manage system updates and version channels</p>
            </div>
            <div className="card__content space-y-8">
              {/* Update Channel Selection */}
              <div className="space-y-4">
                <div>
                  <label className="form-label text-base font-semibold">Update Channel</label>
                  <p className="text-sm text-gray-600 mt-1">Choose your preferred update channel</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-start p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
                  <input
                      type="radio"
                      name="updateChannel"
                      value="stable"
                      checked={updateChannel === 'stable'}
                      onChange={(e) => setUpdateChannel(e.target.value)}
                      className="mt-1 mr-3 text-primary focus:ring-primary"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Stable</div>
                      <div className="text-sm text-gray-500 mt-1">Recommended for production environments</div>
                    </div>
                </label>
                  <label className="flex items-start p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
                  <input
                      type="radio"
                      name="updateChannel"
                      value="beta"
                      checked={updateChannel === 'beta'}
                      onChange={(e) => setUpdateChannel(e.target.value)}
                      className="mt-1 mr-3 text-primary focus:ring-primary"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Beta</div>
                      <div className="text-sm text-gray-500 mt-1">Latest features, may be unstable</div>
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
              <div className="space-y-4">
                <div>
                  <label className="form-label text-base font-semibold">Current Version</label>
                  <p className="text-sm text-gray-600 mt-1">Your current system version</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Stable Version */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-lg font-bold text-green-900">
                          {updateInfo?.currentVersion ? updateInfo.currentVersion.replace('-beta', '') : 'Loading...'}
                        </span>
                        <div className="text-sm text-green-600 mt-1">Stable Version</div>
                      </div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                  </div>
                  
                  {/* Beta Version */}
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-lg font-bold text-orange-900">
                          {updateInfo?.currentVersion || 'Loading...'}
                        </span>
                        <div className="text-sm text-orange-600 mt-1">Beta Version</div>
                      </div>
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    </div>
                  </div>
                </div>
                {lastCheckTime && (
                  <div className="text-right">
                    <div className="text-xs text-blue-500">
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
                <div className="space-y-4">
                      <div>
                    <label className="form-label text-base font-semibold">Update Information</label>
                    <p className="text-sm text-gray-600 mt-1">Current update status and available versions</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Channel:</span>
                      <span className="font-medium text-gray-900 capitalize">{updateInfo.channel}</span>
                    </div>
                    {updateInfo.updateAvailable ? (
                      <>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600">Latest Version:</span>
                          <span className="font-medium text-green-600">{updateInfo.latestVersion}</span>
                        </div>
                        {updateInfo.updateInfo?.updateSize && (
                          <div className="flex justify-between items-center py-2">
                            <span className="text-gray-600">Commits Behind:</span>
                            <span className="font-medium text-orange-600">{updateInfo.updateInfo.updateSize}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-1">
                        <div className="inline-flex items-center px-1 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">
                          <UpdateStatusIcon size={6} className="mr-0.5" />
                          You are up to date!
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  className="btn btn--secondary flex items-center justify-center"
                  onClick={checkForUpdates}
                  disabled={updateLoading}
                >
                  <RefreshIcon />
                  <span className="ml-2">{updateLoading ? 'Checking...' : 'Check for Updates'}</span>
                </button>
                {updateInfo?.updateAvailable && (
                  <button
                    type="button"
                    className="btn btn--primary flex items-center justify-center"
                    onClick={performUpdate}
                    disabled={updateLoading}
                  >
                    <UpdateIcon />
                    <span className="ml-2">{updateLoading ? 'Updating...' : 'Update Now'}</span>
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