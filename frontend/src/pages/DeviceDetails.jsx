import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import './DeviceDetails.css';

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

const DeviceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groupLookup, setGroupLookup] = useState(new Map());
  const [testingConnection, setTestingConnection] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState(null);

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
    
    // Check both device.status and connectivity status
    const statusConnected = device.status && typeof device.status === 'string' && 
      ['up', 'online', 'connected'].includes(device.status.toLowerCase());
    
    const apiConnected = device.connectivity?.api?.status === 'online';
    const sshConnected = device.connectivity?.ssh?.status === 'online';
    
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
            <div className="flex items-center gap-3">
              <button
                onClick={handleTestConnection}
                disabled={testingConnection}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testingConnection ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Testing...
                  </>
                ) : (
                  'Test Connection'
                )}
              </button>
              <button
                onClick={handleRunDiagnostics}
                disabled={testingConnection}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testingConnection ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Running Diagnostics...
                  </>
                ) : (
                  'Run Diagnostics'
                )}
              </button>
            </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button className="py-2 px-1 border-b-2 border-primary text-primary font-medium text-sm">
            Overview
          </button>
          <button className="py-2 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm">
            Interfaces
          </button>
          <button className="py-2 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm">
            Configuration
          </button>
          <button className="py-2 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm">
            Logs
          </button>
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

          {/* Overview Tab Content */}
          <div className="space-y-6">
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getConnectionStatus(device).active ? 'bg-green-100' : 'bg-red-100'}`}>
                  <div className={`w-3 h-3 rounded-full ${getConnectionStatus(device).active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Device Status</p>
                <p className={`text-lg font-semibold ${getConnectionStatus(device).active ? 'text-green-600' : 'text-red-600'}`}>
                  {getConnectionStatus(device).active ? 'ACTIVE' : 'INACTIVE'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getConnectionStatus(device).connected ? 'bg-green-100' : 'bg-red-100'}`}>
                  <div className={`w-3 h-3 rounded-full ${getConnectionStatus(device).connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Connection</p>
                <p className={`text-lg font-semibold ${getConnectionStatus(device).connected ? 'text-green-600' : 'text-red-600'}`}>
                  {getConnectionStatus(device).connected ? 'CONNECTED' : 'DISCONNECTED'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-sm">API</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">API Access</p>
                <p className={`text-lg font-semibold ${device.routeros?.apiEnabled === true ? 'text-green-600' : 'text-red-600'}`}>
                  {device.routeros?.apiEnabled === true ? 'ENABLED' : 'DISABLED'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 font-semibold text-sm">SSH</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">SSH Access</p>
                <p className={`text-lg font-semibold ${device.routeros?.sshEnabled === true ? 'text-green-600' : 'text-red-600'}`}>
                  {device.routeros?.sshEnabled === true ? 'ENABLED' : 'DISABLED'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Device Information */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Device Information</h3>
          </div>
          <div className="px-6 py-4">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Group</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {device.groupId ? groupLookup.get(device.groupId)?.name || 'Unknown' : 'None'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Firmware Version</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {device.routeros?.firmwareVersion && typeof device.routeros.firmwareVersion === 'string' 
                    ? device.routeros.firmwareVersion 
                    : 'Unknown'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDateTime(device.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDateTime(device.updatedAt)}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* API & SSH Output */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">API Output</h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  API
                </span>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="bg-gray-50 rounded-md p-4">
                <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                  {device.routeros?.apiOutput || 'No API data available\n\nClick "Test Connection" to fetch real data from the device.'}
                </pre>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">SSH Output</h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  SSH
                </span>
              </div>
            </div>
                <div className="px-6 py-4">
                  <div className="bg-gray-50 rounded-md p-4">
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                      {device.connectivity?.ssh?.status === 'online' 
                        ? `SSH Connection: ✅ ONLINE\nPort: 22\nStatus: Accessible\nLast Checked: ${device.connectivity?.ssh?.lastCheckedAt ? formatDateTime(device.connectivity.ssh.lastCheckedAt) : 'Unknown'}`
                        : device.connectivity?.ssh?.status === 'offline'
                        ? `SSH Connection: ❌ OFFLINE\nError: ${device.connectivity?.ssh?.lastError || 'Connection failed'}\nLast Checked: ${device.connectivity?.ssh?.lastCheckedAt ? formatDateTime(device.connectivity.ssh.lastCheckedAt) : 'Unknown'}`
                        : 'No SSH data available\n\nClick "Test Connection" to fetch real data from the device.'
                      }
                    </pre>
                  </div>
                </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceDetails;
