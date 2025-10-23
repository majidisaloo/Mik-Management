import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import './IPAMDetails.css';

// Icons
const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const NetworkIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const BuildingIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DatabaseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="12" cy="5" rx="9" ry="3" stroke="currentColor" strokeWidth="2" />
    <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" stroke="currentColor" strokeWidth="2" />
    <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const MinusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const FolderIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IPAMDetails = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [ipam, setIpam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState(new Set());
  const [expandedDatacenters, setExpandedDatacenters] = useState(new Set());
  const [expandedRanges, setExpandedRanges] = useState(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const toggleSection = (sectionId) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const toggleDatacenter = (datacenterId) => {
    const newExpanded = new Set(expandedDatacenters);
    if (newExpanded.has(datacenterId)) {
      newExpanded.delete(datacenterId);
    } else {
      newExpanded.add(datacenterId);
    }
    setExpandedDatacenters(newExpanded);
  };

  const toggleRange = (rangeId) => {
    const newExpanded = new Set(expandedRanges);
    if (newExpanded.has(rangeId)) {
      newExpanded.delete(rangeId);
    } else {
      newExpanded.add(rangeId);
    }
    setExpandedRanges(newExpanded);
  };

  const loadIpamDetails = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/ipams/${id}`);
      if (response.ok) {
        const data = await response.json();
        setIpam(data);
      } else {
        setError('Failed to load IPAM details');
      }
    } catch (err) {
      setError('Error loading IPAM details');
      console.error('Error loading IPAM details:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadIpamDetails();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadIpamDetails();
  }, [user, navigate, loadIpamDetails]);

  if (loading) {
    return (
      <div className="container">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-tertiary">Loading IPAM details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <button 
              onClick={loadIpamDetails}
              className="btn btn--primary"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!ipam) {
    return (
      <div className="container">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-tertiary">IPAM not found</p>
            <button 
              onClick={() => navigate('/ipam')}
              className="btn btn--primary mt-4"
            >
              Back to IPAM
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Helper function to build hierarchical structure
  const buildHierarchy = () => {
    const sections = ipam.collections?.sections || [];
    const ranges = ipam.collections?.ranges || [];
    
    // Group ranges by section
    const sectionRanges = {};
    ranges.forEach(range => {
      const sectionId = range.metadata?.sectionId;
      if (sectionId) {
        if (!sectionRanges[sectionId]) {
          sectionRanges[sectionId] = [];
        }
        sectionRanges[sectionId].push(range);
      }
    });

    return { sections, sectionRanges };
  };

  const { sections, sectionRanges } = buildHierarchy();

  return (
    <div className="container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/ipam')}
            className="btn btn--ghost btn--sm"
            title="Back to IPAM list"
          >
            <BackIcon />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-primary">{ipam.name}</h1>
            <p className="text-tertiary">{ipam.baseUrl}</p>
          </div>
        </div>
        <button 
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn btn--ghost btn--sm"
          title="Refresh IPAM data"
        >
          {refreshing ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          ) : (
            <RefreshIcon />
          )}
        </button>
      </div>

      {/* Status */}
      <div className="card mb-6">
        <div className="card__content">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              ipam.lastStatus === 'connected' ? 'bg-green-500' : 
              ipam.lastStatus === 'failed' ? 'bg-red-500' : 
              'bg-yellow-500'
            }`}></div>
            <span className="font-medium">
              Status: {ipam.lastStatus || 'unknown'}
            </span>
            {ipam.lastCheckedAt && (
              <span className="text-sm text-tertiary ml-auto">
                Last checked: {new Date(ipam.lastCheckedAt).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Sections with hierarchical structure */}
      <div className="card">
        <div className="card__header">
          <h2 className="card__title flex items-center gap-2">
            <NetworkIcon />
            Sections ({sections.length})
          </h2>
        </div>
        <div className="card__content">
          {sections.length > 0 ? (
            <div className="space-y-2">
              {sections.map((section) => {
                const isExpanded = expandedSections.has(section.id);
                const sectionRangesList = sectionRanges[section.id] || [];
                
                return (
                  <div key={section.id} className="border border-border rounded-lg">
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-secondary"
                      onClick={() => toggleSection(section.id)}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? <MinusIcon /> : <PlusIcon />}
                        <div>
                          <h3 className="font-semibold text-primary">{section.name}</h3>
                          <p className="text-sm text-tertiary">{section.description || 'No description'}</p>
                        </div>
                      </div>
                      <div className="text-sm text-tertiary">
                        {sectionRangesList.length} ranges
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-border p-4 bg-surface-secondary">
                        {sectionRangesList.length > 0 ? (
                          <div className="space-y-2">
                            {sectionRangesList.map((range) => {
                              const isRangeExpanded = expandedRanges.has(range.id);
                              
                              return (
                                <div key={range.id} className="border border-border rounded p-3 bg-surface">
                                  <div 
                                    className="flex items-center justify-between cursor-pointer hover:bg-surface-secondary rounded p-2"
                                    onClick={() => toggleRange(range.id)}
                                  >
                                    <div className="flex items-center gap-3">
                                      {isRangeExpanded ? <MinusIcon /> : <PlusIcon />}
                                      <div>
                                        <h4 className="font-medium text-primary">
                                          {range.name || 'Unnamed Range'}
                                        </h4>
                                        <p className="text-sm text-tertiary">
                                          {range.description || 'No description'}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-sm text-tertiary">
                                      ID: {range.id}
                                    </div>
                                  </div>
                                  
                                    {isRangeExpanded && (
                                      <div className="mt-3 p-3 bg-surface-secondary rounded">
                                        <div className="text-sm text-tertiary space-y-1">
                                          <p><strong>ID:</strong> {range.id}</p>
                                          <p><strong>Name:</strong> {range.name || 'Unnamed'}</p>
                                          <p><strong>Description:</strong> {range.description || 'No description'}</p>
                                          {range.metadata?.cidr && (
                                            <p><strong>CIDR:</strong> {range.metadata.cidr}</p>
                                          )}
                                          {range.metadata?.vlanId && (
                                            <p><strong>VLAN ID:</strong> {range.metadata.vlanId}</p>
                                          )}
                                        </div>
                                        
                                        {/* IP Addresses within this range */}
                                        {range.ips && range.ips.length > 0 && (
                                          <div className="mt-4">
                                            <h5 className="font-medium text-primary mb-2">IP Addresses ({range.ips.length})</h5>
                                            <div className="space-y-2">
                                              {range.ips.slice(0, 10).map((ip) => (
                                                <div key={ip.id} className="flex items-center justify-between p-2 bg-surface rounded border">
                                                  <div>
                                                    <p className="font-medium text-primary">{ip.ip}</p>
                                                    <p className="text-sm text-tertiary">{ip.hostname || 'No hostname'}</p>
                                                    {ip.description && (
                                                      <p className="text-xs text-tertiary">{ip.description}</p>
                                                    )}
                                                  </div>
                                                  <div className="text-xs text-tertiary">
                                                    <p>State: {ip.state}</p>
                                                    {ip.owner && <p>Owner: {ip.owner}</p>}
                                                    {ip.mac && <p>MAC: {ip.mac}</p>}
                                                  </div>
                                                </div>
                                              ))}
                                              {range.ips.length > 10 && (
                                                <p className="text-center text-tertiary py-2">
                                                  Showing first 10 of {range.ips.length} IPs
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-tertiary text-center py-4">No ranges in this section</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-tertiary">No sections found</p>
          )}
        </div>
      </div>

      {/* Datacenters */}
      <div className="card">
        <div className="card__header">
          <h2 className="card__title flex items-center gap-2">
            <BuildingIcon />
            Datacenters ({ipam.collections?.datacenters?.length || 0})
          </h2>
        </div>
        <div className="card__content">
          {ipam.collections?.datacenters && ipam.collections.datacenters.length > 0 ? (
            <div className="space-y-2">
              {ipam.collections.datacenters.map((datacenter) => {
                const isExpanded = expandedDatacenters.has(datacenter.id);
                
                return (
                  <div key={datacenter.id} className="border border-border rounded-lg">
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-secondary"
                      onClick={() => toggleDatacenter(datacenter.id)}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? <MinusIcon /> : <PlusIcon />}
                        <div>
                          <h3 className="font-semibold text-primary">{datacenter.name}</h3>
                          <p className="text-sm text-tertiary">{datacenter.description || 'No description'}</p>
                        </div>
                      </div>
                      <div className="text-sm text-tertiary">
                        ID: {datacenter.id}
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="border-t border-border p-4 bg-surface-secondary">
                        <div className="text-sm text-tertiary">
                          <p><strong>ID:</strong> {datacenter.id}</p>
                          <p><strong>Description:</strong> {datacenter.description || 'No description'}</p>
                          <p><strong>Address:</strong> {datacenter.address || 'Not specified'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-tertiary">No datacenters found</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default IPAMDetails;