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

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

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
            <button type="button" onClick={handleSignOut} className="link-button">
              Logout
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
      </footer>
    </div>
  );
};

export default Layout;
