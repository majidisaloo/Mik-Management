import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

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
        setLastUpdated(Number.isNaN(parsed.getTime()) ? null : parsed);
      } else {
        setLastUpdated(null);
      }
      setStatus({ type: '', message: '' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Unable to load dashboard metrics.' });
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
  }, [loadMetrics, navigate, user]);

  const outdatedMikrotiks = useMemo(() => {
    if (!metrics?.mikrotik) {
      return 0;
    }
    return (metrics.mikrotik.pending ?? 0) + (metrics.mikrotik.unknown ?? 0);
  }, [metrics]);

  const inactiveTunnels = useMemo(() => {
    if (!metrics?.tunnels) {
      return 0;
    }
    return (metrics.tunnels.down ?? 0) + (metrics.tunnels.maintenance ?? 0);
  }, [metrics]);

  const handleRefresh = () => {
    loadMetrics();
  };

  if (!user) {
    return null;
  }

  const roles = Array.isArray(user.roles) ? user.roles.map((role) => role.name).join(', ') : '—';

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Network health overview</h1>
          <p className="dashboard-subtitle">
            Keep track of MikroTik devices, inter-site tunnels, and their responsiveness in real time.
          </p>
        </div>
        <div className="dashboard-actions">
          <button type="button" className="secondary-button" onClick={handleRefresh} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh metrics'}
          </button>
          {lastUpdated ? (
            <span className="dashboard-updated" aria-live="polite">
              Last synchronised {lastUpdated.toLocaleString()}
            </span>
          ) : null}
        </div>
      </header>

      {status.message ? (
        <p className={`page-status page-status--${status.type}`}>{status.message}</p>
      ) : null}

      <section className="metric-section">
        <h2>Mikrotik fleet</h2>
        <div className="metric-grid">
          <article className="metric-card metric-card--info">
            <h3>Total Mikrotiks</h3>
            <p className="metric-value">{formatNumber(metrics?.mikrotik?.total ?? 0)}</p>
            <p className="metric-hint">Devices synced with MikroManage</p>
          </article>
          <article className="metric-card metric-card--success">
            <h3>Updated Mikrotiks</h3>
            <p className="metric-value">{formatNumber(metrics?.mikrotik?.updated ?? 0)}</p>
            <p className="metric-hint">Running the target RouterOS release</p>
          </article>
          <article className="metric-card metric-card--warning">
            <h3>Out-of-date Mikrotiks</h3>
            <p className="metric-value">{formatNumber(outdatedMikrotiks)}</p>
            <p className="metric-hint">
              {formatNumber(metrics?.mikrotik?.pending ?? 0)} pending ·{' '}
              {formatNumber(metrics?.mikrotik?.unknown ?? 0)} unknown
            </p>
          </article>
          <article className="metric-card metric-card--success">
            <h3>API online</h3>
            <p className="metric-value">{formatNumber(metrics?.mikrotik?.apiOnline ?? 0)}</p>
            <p className="metric-hint">{formatNumber(metrics?.mikrotik?.apiOffline ?? 0)} offline</p>
          </article>
          <article className="metric-card metric-card--success">
            <h3>SSH reachable</h3>
            <p className="metric-value">{formatNumber(metrics?.mikrotik?.sshOnline ?? 0)}</p>
            <p className="metric-hint">{formatNumber(metrics?.mikrotik?.sshOffline ?? 0)} offline</p>
          </article>
        </div>
      </section>

      <section className="metric-section">
        <h2>Tunnel summary</h2>
        <div className="metric-grid">
          <article className="metric-card metric-card--info">
            <h3>Total tunnels</h3>
            <p className="metric-value">{formatNumber(metrics?.tunnels?.total ?? 0)}</p>
            <p className="metric-hint">Configured Mikrotik interconnects</p>
          </article>
          <article className="metric-card metric-card--success">
            <h3>Active tunnels</h3>
            <p className="metric-value">{formatNumber(metrics?.tunnels?.up ?? 0)}</p>
            <p className="metric-hint">Tunnels reporting an UP status</p>
          </article>
          <article className="metric-card metric-card--danger">
            <h3>Inactive tunnels</h3>
            <p className="metric-value">{formatNumber(inactiveTunnels)}</p>
            <p className="metric-hint">
              {formatNumber(metrics?.tunnels?.down ?? 0)} down ·{' '}
              {formatNumber(metrics?.tunnels?.maintenance ?? 0)} maintenance
            </p>
          </article>
        </div>
      </section>

      <section className="metric-section metric-section--split">
        <article className="metric-panel">
          <header>
            <h2>Highest tunnel latency</h2>
            <p className="metric-hint">Sorted from highest to lowest average ping</p>
          </header>
          {metrics?.tunnels?.latencyLeaderboard?.length ? (
            <ol className="metric-list">
              {metrics.tunnels.latencyLeaderboard.map((entry) => (
                <li key={entry.id}>
                  <div>
                    <strong>{entry.name}</strong>
                    <span className={`status-pill status-pill--${entry.status}`}>{entry.status}</span>
                  </div>
                  <span>{formatLatency(entry.latencyMs)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted">No latency samples have been recorded yet.</p>
          )}
        </article>
        <article className="metric-panel">
          <header>
            <h2>Packet loss leaderboard</h2>
            <p className="metric-hint">Watch tunnels experiencing the most packet loss</p>
          </header>
          {metrics?.tunnels?.packetLossLeaderboard?.length ? (
            <ol className="metric-list">
              {metrics.tunnels.packetLossLeaderboard.map((entry) => (
                <li key={entry.id}>
                  <div>
                    <strong>{entry.name}</strong>
                    <span className={`status-pill status-pill--${entry.status}`}>{entry.status}</span>
                  </div>
                  <span>{formatPacketLoss(entry.packetLoss)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted">No packet loss reports are available.</p>
          )}
        </article>
      </section>

      <section className="metric-section metric-section--profile">
        <article className="metric-panel">
          <header>
            <h2>Your access</h2>
            <p className="metric-hint">Signed in as {user.email}</p>
          </header>
          <dl className="profile-grid">
            <div>
              <dt>Name</dt>
              <dd>
                {user.firstName} {user.lastName}
              </dd>
            </div>
            <div>
              <dt>Roles</dt>
              <dd>{roles || '—'}</dd>
            </div>
            <div className="profile-grid__wide">
              <dt>Permissions</dt>
              <dd className="permission-pill-group">
                {Object.entries(user.permissions || {})
                  .filter(([, value]) => Boolean(value))
                  .map(([key]) => (
                    <span key={key} className="permission-pill">
                      {key.replace(/-/g, ' ')}
                    </span>
                  ))}
                {!user.permissions ||
                !Object.values(user.permissions || {}).some((value) => value) ? (
                  <span className="muted">No permissions assigned</span>
                ) : null}
              </dd>
            </div>
          </dl>
        </article>
      </section>
    </div>
  );
};

export default Dashboard;
