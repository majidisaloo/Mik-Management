import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Modern Icons
const RefreshIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 3v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 21v-5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DeviceIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
    <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="2" />
    <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const TunnelIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const GroupIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const UserIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const formatNumber = (value) => {
  if (value === null || value === undefined) {
    return '0';
  }
  return new Intl.NumberFormat().format(value);
};

const formatLatency = (value) => {
  if (value === null || value === undefined) {
    return '—';
  }
  return `${value} ms`;
};

const formatPacketLoss = (value) => {
  if (value === null || value === undefined) {
    return '—';
  }
  return `${value}%`;
};

const formatDateTime = (value) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const MetricCard = ({ title, value, subtitle, icon, trend, status, className = '' }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-success';
      case 'warning': return 'text-warning';
      case 'error': return 'text-error';
      case 'info': return 'text-info';
      default: return 'text-primary';
    }
  };

  return (
    <div className={`card ${className}`}>
      <div className="card__body">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${status ? `bg-${status}-50` : 'bg-primary-50'}`}>
              <div className={getStatusColor(status)}>
                {icon}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-tertiary">{title}</h3>
              <p className="text-2xl font-bold text-primary">{value}</p>
            </div>
          </div>
          {trend && (
            <div className={`text-sm font-medium ${trend > 0 ? 'text-success' : 'text-error'}`}>
              {trend > 0 ? '+' : ''}{trend}%
            </div>
          )}
        </div>
        {subtitle && (
          <p className="text-sm text-tertiary">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/metrics');

      if (!response.ok) {
        const message =
          response.status === 502
            ? 'Metrics service is unavailable (502 Bad Gateway). Confirm the API is running behind Nginx.'
            : 'Unable to load dashboard metrics.';
        throw new Error(message);
      }

      const payload = await response.json();
      setMetrics(payload);
      if (payload?.lastUpdatedAt) {
        const parsed = new Date(payload.lastUpdatedAt);
        setLastUpdated(parsed);
      }
      setStatus({ type: '', message: '' });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Unable to load dashboard metrics.'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    loadMetrics();
  }, [navigate, user, loadMetrics]);

  const refreshMetrics = useCallback(() => {
    loadMetrics();
  }, [loadMetrics]);

  const metricCards = useMemo(() => {
    if (!metrics) return [];

    return [
      {
        title: 'Total Devices',
        value: formatNumber(metrics.deviceCount),
        subtitle: 'MikroTik routers',
        icon: <DeviceIcon />,
        status: 'info'
      },
      {
        title: 'Active Tunnels',
        value: formatNumber(metrics.tunnelCount),
        subtitle: 'Inter-site connections',
        icon: <TunnelIcon />,
        status: 'success'
      },
      {
        title: 'Groups',
        value: formatNumber(metrics.groupCount),
        subtitle: 'Organizational units',
        icon: <GroupIcon />,
        status: 'info'
      },
      {
        title: 'Users',
        value: formatNumber(metrics.userCount),
        subtitle: 'System operators',
        icon: <UserIcon />,
        status: 'info'
      }
    ];
  }, [metrics]);

  const tunnelMetrics = useMemo(() => {
    if (!metrics?.tunnels) return [];

    return metrics.tunnels.map((tunnel) => ({
      id: tunnel.id,
      name: tunnel.name,
      status: tunnel.status,
      latency: tunnel.latency,
      packetLoss: tunnel.packetLoss,
      lastChecked: tunnel.lastCheckedAt
    }));
  }, [metrics]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Network Health Overview</h1>
            <p className="text-tertiary mt-2">Keep track of MikroTik devices, inter-site tunnels, and their responsiveness in real time.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card loading">
              <div className="card__body">
                <div className="h-20 bg-tertiary bg-opacity-20 rounded-lg animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Network Health Overview</h1>
          <p className="text-tertiary mt-2">Keep track of MikroTik devices, inter-site tunnels, and their responsiveness in real time.</p>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={refreshMetrics}
          disabled={loading}
        >
          <RefreshIcon />
          Refresh metrics
        </button>
      </div>

      {/* Status Message */}
      {status.message && (
        <div className={`p-4 rounded-xl border ${
          status.type === 'error' 
            ? 'bg-error-50 border-error-200 text-error-700' 
            : 'bg-success-50 border-success-200 text-success-700'
        }`}>
          {status.message}
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((card, index) => (
          <MetricCard key={index} {...card} />
        ))}
      </div>

      {/* Tunnel Status */}
      {tunnelMetrics.length > 0 && (
        <div className="card">
          <div className="card__header">
            <h2 className="card__title">Tunnel Status</h2>
            <p className="card__subtitle">Real-time connectivity monitoring</p>
          </div>
          <div className="card__body">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tunnel</th>
                    <th>Status</th>
                    <th>Latency</th>
                    <th>Packet Loss</th>
                    <th>Last Checked</th>
                  </tr>
                </thead>
                <tbody>
                  {tunnelMetrics.map((tunnel) => (
                    <tr key={tunnel.id}>
                      <td className="font-medium">{tunnel.name}</td>
                      <td>
                        <span className={`status-badge status-badge--${
                          tunnel.status === 'up' ? 'success' : 
                          tunnel.status === 'down' ? 'error' : 
                          tunnel.status === 'maintenance' ? 'warning' : 'info'
                        }`}>
                          {tunnel.status || 'Unknown'}
                        </span>
                      </td>
                      <td>{formatLatency(tunnel.latency)}</td>
                      <td>{formatPacketLoss(tunnel.packetLoss)}</td>
                      <td>{formatDateTime(tunnel.lastChecked)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Last Updated */}
      {lastUpdated && (
        <div className="text-center text-sm text-tertiary">
          Last updated: {formatDateTime(lastUpdated)}
        </div>
      )}
    </div>
  );
};

export default Dashboard;