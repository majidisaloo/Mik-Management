import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DeviceIcon, NetworkIcon, CloseIcon, ArrowLeftIcon } from '../components/Icons.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import './DeviceDetails.css';

const DeviceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groupLookup, setGroupLookup] = useState(new Map());

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
      setDevice(payload);
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
    const connected = device.status && typeof device.status === 'string' && 
      ['up', 'online', 'connected'].includes(device.status.toLowerCase());
    return { active, connected };
  };

  const handleBack = () => {
    navigate('/mikrotiks');
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
    <div className="device-details-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeftIcon />
          </button>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-50 rounded-lg">
              <DeviceIcon />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-primary">{safeRender(device.name, 'Unknown Device')}</h1>
              <p className="text-tertiary mt-1">{safeRender(device.host, 'No Host')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Device Status & Connection */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-primary">Connection Status</h3>
          <div className="space-y-3">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Device Status</span>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getConnectionStatus(device).active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className={`text-sm font-medium ${getConnectionStatus(device).active ? 'text-green-700' : 'text-red-700'}`}>
                    {getConnectionStatus(device).active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-tertiary">Connection</span>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getConnectionStatus(device).connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className={`text-sm font-medium ${getConnectionStatus(device).connected ? 'text-green-700' : 'text-red-700'}`}>
                    {getConnectionStatus(device).connected ? 'CONNECTED' : 'DISCONNECTED'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium">Access Methods</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={device.routeros?.apiEnabled === true} 
                      readOnly 
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm">API Access</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${device.routeros?.apiEnabled === true ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {device.routeros?.apiEnabled === true ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={device.routeros?.sshEnabled === true} 
                      readOnly 
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm">SSH Access</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${device.routeros?.sshEnabled === true ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {device.routeros?.sshEnabled === true ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Device Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-primary">Device Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-tertiary">Group:</span>
              <span className="text-secondary">
                {device.groupId ? groupLookup.get(device.groupId)?.name || 'Unknown' : 'None'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-tertiary">Created:</span>
              <span className="text-secondary">{formatDateTime(device.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-tertiary">Last Updated:</span>
              <span className="text-secondary">{formatDateTime(device.updatedAt)}</span>
            </div>
          </div>
        </div>

        {/* MikroTik Version & Output */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-primary">MikroTik Information</h3>
          <div className="space-y-3">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Firmware Version</span>
                <div className="flex items-center gap-1">
                  {device.routeros?.apiEnabled === true && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">API</span>
                  )}
                  {device.routeros?.sshEnabled === true && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">SSH</span>
                  )}
                </div>
              </div>
              <div className="text-sm text-secondary">
                {device.routeros?.firmwareVersion && typeof device.routeros.firmwareVersion === 'string' 
                  ? device.routeros.firmwareVersion 
                  : 'Unknown'}
              </div>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">API Output</span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">API</span>
              </div>
              <div className="text-xs text-tertiary bg-gray-50 p-2 rounded font-mono">
                {device.routeros?.apiOutput || 'No API data available'}
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">SSH Output</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">SSH</span>
              </div>
              <div className="text-xs text-tertiary bg-gray-50 p-2 rounded font-mono">
                {device.routeros?.sshOutput || 'No SSH data available'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Network Interfaces */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-primary mb-4">Network Interfaces</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <NetworkIcon />
              <span className="font-medium">Ethernet (eth0)</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">UP</span>
            </div>
            <div className="text-sm text-tertiary space-y-1">
              <div>IP: 192.168.1.1/24</div>
              <div>MAC: 00:11:22:33:44:55</div>
              <div>Speed: 1 Gbps</div>
            </div>
          </div>
          
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <NetworkIcon />
              <span className="font-medium">WiFi (wlan1)</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">UP</span>
            </div>
            <div className="text-sm text-tertiary space-y-1">
              <div>IP: 192.168.2.1/24</div>
              <div>MAC: 00:11:22:33:44:66</div>
              <div>SSID: MikroTik-WiFi</div>
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <NetworkIcon />
              <span className="font-medium">WAN (ether1)</span>
              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">DOWN</span>
            </div>
            <div className="text-sm text-tertiary space-y-1">
              <div>IP: 45.90.72.45/32</div>
              <div>MAC: 00:11:22:33:44:77</div>
              <div>Provider: ISP</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceDetails;
