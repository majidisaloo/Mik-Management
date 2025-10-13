import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import BrandMark from './BrandMark.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M21 14.15A8.5 8.5 0 0 1 11.85 5 6.5 6.5 0 1 0 21 14.15Z" fill="#0f172a" opacity="0.75" />
  </svg>
);

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="5.5" fill="#facc15" stroke="#f59e0b" strokeWidth="1.25" />
    <g stroke="#f59e0b" strokeWidth="1.4" strokeLinecap="round">
      <line x1="12" y1="2.75" x2="12" y2="5.25" />
      <line x1="12" y1="18.75" x2="12" y2="21.25" />
      <line x1="4.22" y1="4.22" x2="6" y2="6" />
      <line x1="18" y1="18" x2="19.78" y2="19.78" />
      <line x1="2.75" y1="12" x2="5.25" y2="12" />
      <line x1="18.75" y1="12" x2="21.25" y2="12" />
      <line x1="4.22" y1="19.78" x2="6" y2="18" />
      <line x1="18" y1="6" x2="19.78" y2="4.22" />
    </g>
  </svg>
);

const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M14.5 5.25a.75.75 0 0 0-1.5 0v2.25h-4a1.75 1.75 0 0 0-1.75 1.75v5.5A1.75 1.75 0 0 0 9 16.5h4v2.25a.75.75 0 1 0 1.5 0V5.25Z"
      fill="currentColor"
      opacity="0.65"
    />
    <path
      d="M18.53 12.53a.75.75 0 0 0 0-1.06l-2-2a.75.75 0 1 0-1.06 1.06l.72.72H11a.75.75 0 0 0 0 1.5h5.19l-.72.72a.75.75 0 1 0 1.06 1.06l2-2Z"
      fill="currentColor"
    />
  </svg>
);

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [version, setVersion] = useState('0.0');

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    const loadMeta = async () => {
      try {
        const response = await fetch('/api/meta', { signal: controller.signal });

        if (!response.ok) {
          throw new Error('Meta request failed');
        }

        const payload = await response.json();

        if (mounted && payload?.version) {
          setVersion(payload.version);
        }
      } catch (error) {
        if (mounted) {
          setVersion((current) => current || '0.0');
        }
      }
    };

    loadMeta();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  const handleSignOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const renderThemeToggle = (placement) => {
    const variant = placement === 'sidebar' ? 'sidebar' : 'header';
    const modeLabel = theme === 'dark' ? 'Dark mode' : 'Light mode';

    return (
      <button
        type="button"
        className={`theme-toggle theme-toggle--${variant} theme-toggle--${theme}`}
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        role="switch"
        aria-checked={theme === 'dark'}
      >
        <span className="theme-toggle__track" aria-hidden="true">
          <span className="theme-toggle__thumb">{theme === 'dark' ? <SunIcon /> : <MoonIcon />}</span>
        </span>
        <span className="theme-toggle__caption">{modeLabel}</span>
      </button>
    );
  };

  return (
    <div className={`app-shell${user ? ' app-shell--authed' : ''}`}>
      <header className="app-header">
        <Link to="/" className="logo" aria-label="MikroManage home">
          <BrandMark />
        </Link>
        <div className={`header-actions${user ? ' header-actions--authed' : ''}`}>
          {!user && renderThemeToggle('header')}
          {user ? (
            <button type="button" onClick={handleSignOut} className="logout-button">
              <span className="logout-button__icon" aria-hidden="true">
                <LogoutIcon />
              </span>
              <span className="logout-button__label">Logout</span>
            </button>
          ) : (
            <nav>
              <NavLink to="/register">Register</NavLink>
              <NavLink to="/" end>
                Login
              </NavLink>
            </nav>
          )}
        </div>
      </header>
      {user ? (
        <div className="app-content">
          <aside className="app-sidebar" aria-label="Primary navigation">
            <nav className="sidebar-nav">
              <div className="sidebar-group">
                <NavLink to="/dashboard">Dashboard</NavLink>
              </div>
              <div className="sidebar-group">
                <p className="sidebar-group__label">Management</p>
                {user.permissions?.users ? <NavLink to="/users">Users</NavLink> : null}
                {user.permissions?.roles ? <NavLink to="/roles">Roles</NavLink> : null}
                {user.permissions?.groups ? <NavLink to="/groups">Mik-Groups</NavLink> : null}
                {user.permissions?.mikrotiks ? <NavLink to="/mikrotiks">Mikrotik's</NavLink> : null}
                {user.permissions?.settings ? <NavLink to="/settings">Settings</NavLink> : null}
              </div>
            </nav>
            <div className="sidebar-footer">{renderThemeToggle('sidebar')}</div>
          </aside>
          <main className="app-main">
            <Outlet />
          </main>
        </div>
      ) : (
        <main className="app-main">
          <Outlet />
        </main>
      )}
      <footer className="app-footer">
        <p>© {new Date().getFullYear()} MikroManage. All rights reserved.</p>
        <p className="app-footer__version" aria-live="polite">
          Version {version}
        </p>
      </footer>
    </div>
  );
};

export default Layout;
