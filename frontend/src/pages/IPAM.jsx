import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import './IPAM.css';

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
    <path d="M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ViewIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const IPAM = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // IPAM state
  const [ipams, setIpams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showIpamModal, setShowIpamModal] = useState(false);
  const [isEditingIpam, setIsEditingIpam] = useState(false);
  const [selectedIpamId, setSelectedIpamId] = useState(null);
  const [testingIpam, setTestingIpam] = useState(null);
  const [syncingIpam, setSyncingIpam] = useState(null);

  // IPAM form state
  const emptyIpamForm = {
    name: '',
    baseUrl: '',
    appId: '',
    appCode: '',
    appPermissions: 'Read',
    appSecurity: 'SSL with App code token'
  };
  const [ipamForm, setIpamForm] = useState(emptyIpamForm);

  // Load IPAM configurations with quick status check
  const loadIpams = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ipams');
      if (response.ok) {
        const data = await response.json();
        const ipamsData = data.ipams || [];
        
        // Use the status from the API response directly
        const ipamsWithStatus = ipamsData.map(ipam => ({
          ...ipam,
          status: ipam.status || 'connected',
          lastCheckedAt: new Date().toISOString()
        }));
        
        setIpams(ipamsWithStatus);
      }
    } catch (error) {
      console.error('Failed to load IPAM configurations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle new IPAM
  const handleNewIpam = () => {
    setIpamForm(emptyIpamForm);
    setIsEditingIpam(false);
    setSelectedIpamId(null);
    setShowIpamModal(true);
  };

  // Handle edit IPAM
  const handleEditIpam = (ipam) => {
    setIpamForm({
      name: ipam.name || '',
      baseUrl: ipam.baseUrl || '',
      appId: ipam.appId || '',
      appCode: ipam.appCode || '',
      appPermissions: ipam.appPermissions || 'Read',
      appSecurity: ipam.appSecurity || 'SSL with App code token'
    });
    setIsEditingIpam(true);
    setSelectedIpamId(ipam.id);
    setShowIpamModal(true);
  };

  // Handle IPAM submit
  const handleIpamSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = isEditingIpam ? `/api/ipams/${selectedIpamId}` : '/api/ipams';
      const method = isEditingIpam ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ipamForm),
      });

      if (response.ok) {
        setShowIpamModal(false);
        setIpamForm(emptyIpamForm);
        setIsEditingIpam(false);
        setSelectedIpamId(null);
        loadIpams();
      } else {
        console.error('Failed to save IPAM configuration');
      }
    } catch (error) {
      console.error('Error saving IPAM configuration:', error);
    }
  };

  // Handle test IPAM
  const handleTestIpam = async (ipam) => {
    setTestingIpam(ipam.id);
    try {
      const response = await fetch(`/api/ipams/${ipam.id}/test`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Handle success
        console.log('IPAM test successful', data);
        alert(`✅ Test successful: ${data.message || 'Connection successful'}`);
        loadIpams(); // Refresh to update status
      } else {
        // Handle error
        console.error('IPAM test failed:', data);
        alert(`❌ Test failed: ${data.message || 'Connection failed'}`);
      }
    } catch (error) {
      console.error('Error testing IPAM:', error);
      alert(`❌ Test error: ${error.message || 'Network error'}`);
    } finally {
      setTestingIpam(null);
    }
  };

  // Handle sync IPAM
  const handleSyncIpam = async (ipam) => {
    setSyncingIpam(ipam.id);
    try {
      const response = await fetch(`/api/ipams/${ipam.id}/sync`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Handle success
        console.log('IPAM sync successful', data);
        alert(`✅ Sync successful: ${data.sections || 0} sections, ${data.datacenters || 0} datacenters, ${data.ranges || 0} ranges`);
        loadIpams();
      } else {
        // Handle error
        console.error('IPAM sync failed:', data);
        alert(`❌ Sync failed: ${data.message || 'Sync failed'}`);
      }
    } catch (error) {
      console.error('Error syncing IPAM:', error);
      alert(`❌ Sync error: ${error.message || 'Network error'}`);
    } finally {
      setSyncingIpam(null);
    }
  };

  // Handle view IPAM
  const handleViewIpam = (ipam) => {
    // Navigate to IPAM details page
    navigate(`/ipam/${ipam.id}`);
  };

  // Handle delete IPAM
  const handleDeleteIpamClick = async (ipam) => {
    if (window.confirm(`Are you sure you want to delete "${ipam.name}"?`)) {
      try {
        const response = await fetch(`/api/ipams/${ipam.id}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          loadIpams();
        } else {
          console.error('Failed to delete IPAM configuration');
        }
      } catch (error) {
        console.error('Error deleting IPAM configuration:', error);
      }
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

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    loadIpams();
  }, [navigate, user, loadIpams]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">IPAM Integrations</h1>
          <p className="text-tertiary mt-2">Manage phpIPAM connections and configurations.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={loadIpams}
            title="Refresh IPAM list"
          >
            <RefreshIcon />
            Refresh
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleNewIpam}
            title="Add new IPAM integration"
          >
            <PlusIcon />
            Add IPAM
          </button>
        </div>
      </div>

      {/* IPAM Configurations */}
      <div className="card mt-8">
        <div className="card__body">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-tertiary mt-4">Loading IPAM configurations...</p>
            </div>
          ) : ipams.length > 0 ? (
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
                        {ipam.collections && (
                          <div className="flex gap-4 mt-2 text-xs text-tertiary">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                              {Array.isArray(ipam.collections.sections) ? ipam.collections.sections.length : ipam.collections.sections || 0} Sections
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                              {Array.isArray(ipam.collections.datacenters) ? ipam.collections.datacenters.length : ipam.collections.datacenters || 0} Datacenters
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                              {Array.isArray(ipam.collections.ranges) ? ipam.collections.ranges.length : ipam.collections.ranges || 0} IP Ranges
                            </span>
                          </div>
                        )}
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
                          title={testingIpam === ipam.id ? "Testing connection..." : "Test connection"}
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
                          onClick={() => handleViewIpam(ipam)}
                          title="View IPAM details"
                        >
                          <ViewIcon />
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => handleSyncIpam(ipam)}
                          disabled={syncingIpam === ipam.id}
                          title={syncingIpam === ipam.id ? "Syncing data..." : "Sync IPAM data"}
                        >
                          <SyncIcon />
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => handleEditIpam(ipam)}
                          title="Edit IPAM configuration"
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm text-error"
                          onClick={() => handleDeleteIpamClick(ipam)}
                          title="Delete IPAM configuration"
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
  );
};

export default IPAM;
