import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import BrandMark from './BrandMark.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useUpdate } from '../context/UpdateContext.jsx';
import { formatCommitVersion } from '../lib/version';
import './Layout.css';

// Modern SVG Icons
const MoonIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" fill="currentColor" />
  </svg>
);

const SunIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="5" fill="currentColor" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DashboardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
    <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
    <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
    <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const RolesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const GroupsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MikrotikIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
    <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="2" />
    <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const TunnelsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IPAMIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 8l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 8l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const RoutesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="6" cy="6" r="2" fill="currentColor" />
    <circle cx="6" cy="12" r="2" fill="currentColor" />
    <circle cx="6" cy="18" r="2" fill="currentColor" />
    <circle cx="18" cy="6" r="2" fill="currentColor" />
    <circle cx="18" cy="12" r="2" fill="currentColor" />
    <circle cx="18" cy="18" r="2" fill="currentColor" />
  </svg>
);

const FirewallIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7l10 5 10-5-10-5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

const Layout = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { updateNotification, setUpdateNotification } = useUpdate();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [meta, setMeta] = useState({ registrationOpen: false });

  // Get commit count and format version
  const commitCount = Number(import.meta.env.VITE_COMMIT_COUNT ?? 0);
  console.log('Layout - VITE_COMMIT_COUNT:', import.meta.env.VITE_COMMIT_COUNT);
  console.log('Layout - commitCount:', commitCount);
  const version = formatCommitVersion(commitCount, 'beta'); // Default to beta
  console.log('Layout - final version:', version);

  // Navigation items
  const navigation = useMemo(() => [
    {
      label: 'Main',
      items: [
        { to: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
        { to: '/users', label: 'Users & Roles', icon: UsersIcon },
        { to: '/groups', label: 'Mik-Groups', icon: GroupsIcon },
        { to: '/mikrotiks', label: 'Mikrotiks', icon: MikrotikIcon },
        { to: '/tunnels', label: 'Tunnels', icon: TunnelsIcon },
        { to: '/routes', label: 'Routes', icon: RoutesIcon },
        { to: '/firewall', label: 'Firewall', icon: FirewallIcon },
        { to: '/ipam', label: 'IPAM', icon: IPAMIcon },
        { to: '/settings', label: 'Settings', icon: SettingsIcon },
      ],
    },
  ], []);

  // Load meta information
  useEffect(() => {
    const loadMeta = async () => {
      try {
        const response = await fetch('/api/meta');
        if (response.ok) {
          const data = await response.json();
          setMeta(data);
        }
      } catch (error) {
        console.error('Failed to load meta:', error);
      }
    };

    loadMeta();
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const renderThemeToggle = (location) => {
    const isDark = theme === 'dark';
    const buttonClass = location === 'header' ? 'app-header-theme-toggle' : 'app-sidebar-theme-toggle';

    return (
      <button
        type="button"
        className={buttonClass}
        onClick={toggleTheme}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      >
        <span className="app-sidebar-link-icon">
          {isDark ? <SunIcon /> : <MoonIcon />}
        </span>
        {location === 'sidebar' && <span>Dark mode</span>}
      </button>
    );
  };

  const renderLogoutButton = (location) => {
    const buttonClass = location === 'header' ? 'app-header-logout-btn' : 'app-sidebar-logout-btn';

    return (
      <button
        type="button"
        className={buttonClass}
        onClick={handleLogout}
        aria-label="Sign out"
      >
        <span className="app-sidebar-link-icon">
          <LogoutIcon />
        </span>
        {location === 'sidebar' && <span>Sign out</span>}
      </button>
    );
  };

  const renderNavEntry = (item) => {
    const Icon = item.icon;

      return (
        <NavLink
          key={item.to}
          to={item.to}
        className={({ isActive }) =>
          `app-sidebar-link${isActive ? ' app-sidebar-link--active' : ''}`
        }
        onClick={() => setMobileMenuOpen(false)}
      >
        <span className="app-sidebar-link-icon">
          <Icon />
        </span>
        <span>{item.label}</span>
      </NavLink>
    );
  };

  return (
    <div className={`app-shell${user ? ' app-shell--authed' : ''}`}>
      {/* Only show main header if not on login page */}
      {location.pathname !== '/' && (
        <header className="app-header">
          <div className="app-header-content">
            <div className="app-header-left">
              {user && (
                <button
                  type="button"
                  className="app-mobile-menu-btn"
                  onClick={toggleMobileMenu}
                  aria-label="Toggle menu"
                >
                  {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
                </button>
              )}
              <Link to="/" className="app-logo" aria-label="MikroManage home">
          <BrandMark />
        </Link>
            </div>
            <div className="app-header-right">
              {renderThemeToggle('header')} {/* Always show theme toggle */}
              {user ? (
                <div className="flex items-center gap-2">
                  {renderLogoutButton('header')}
                </div>
              ) : (
                <nav className="app-auth-nav">
                  {meta.registrationOpen && location.pathname !== '/register' && (
                    <Link to="/register" className="app-register-btn">
                      Register
                    </Link>
                  )}
                  {/* Login button always visible when not authenticated */}
                  <Link to="/" className="app-login-btn">
                Login
                  </Link>
            </nav>
          )}
            </div>
        </div>
      </header>
      )}

      {user ? (
        <div className="app-main-layout">
          {/* Sidebar - Fixed width */}
          <aside className="app-sidebar">
            <div className="app-sidebar-content">
              <div className="app-sidebar-nav">
              {navigation.map((section) => (
                  <div className="app-sidebar-group" key={section.label ?? 'primary'}>
                    {section.label && !sidebarCollapsed && (
                      <p className="app-sidebar-group-label">{section.label}</p>
                    )}
                    <div className="space-y-1">
                  {section.items.map((item) => renderNavEntry(item))}
                    </div>
                  </div>
                ))}
                
                {/* Theme and Logout buttons */}
                <div className="app-sidebar-footer">
                  {renderThemeToggle('sidebar')}
                  <div className="mt-2">{renderLogoutButton('sidebar')}</div>
                  <div className="app-sidebar-version">
                    <span className="app-version-display">v{version}</span>
                    <button
                      type="button"
                      className="app-update-btn"
                      onClick={() => window.location.href = '/settings?tab=updates'}
                      aria-label="Check for updates"
                    >
                      <UpdateIcon />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </aside>
          
          {/* Main Content - Takes remaining space */}
          <main className="app-main-content">
            <Outlet />
          </main>
        </div>
      ) : (
        <main className="app-main-content">
          <Outlet />
        </main>
      )}

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="app-mobile-sidebar-overlay app-mobile-sidebar-overlay--open"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="app-mobile-sidebar app-mobile-sidebar--open">
            <div className="app-sidebar-content">
              <div className="app-sidebar-nav">
                {navigation.map((section) => (
                  <div className="app-sidebar-group" key={section.label ?? 'primary'}>
                    {section.label && !sidebarCollapsed && (
                      <p className="app-sidebar-group-label">{section.label}</p>
                    )}
                    <div className="space-y-1">
                      {section.items.map((item) => renderNavEntry(item))}
                    </div>
                  </div>
                ))}
                
                {/* Theme and Logout buttons */}
                <div className="app-sidebar-footer">
                  {renderThemeToggle('sidebar')}
                  <div className="mt-2">{renderLogoutButton('sidebar')}</div>
                  <div className="app-sidebar-version">
                    <span className="app-version-display">v{version}</span>
                    <button
                      type="button"
                      className="app-update-btn"
                      onClick={() => window.location.href = '/settings?tab=updates'}
                      aria-label="Check for updates"
                    >
                      <UpdateIcon />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Global Update Notification */}
      {updateNotification && (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
          <div className={`p-4 rounded-lg shadow-lg border ${
            updateNotification.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' :
            updateNotification.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
            'bg-blue-50 text-blue-700 border-blue-200'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-medium">{updateNotification.message}</p>
                <p className="text-xs mt-1 opacity-75">
                  {new Date(updateNotification.timestamp).toLocaleTimeString()}
                </p>
              </div>
              <button
                onClick={() => setUpdateNotification(null)}
                className="ml-2 text-current opacity-50 hover:opacity-100"
              >
                ×
              </button>
            </div>
            <div className="mt-3 flex space-x-2">
              <button
                onClick={() => {
                  navigate('/settings?tab=updates');
                  setUpdateNotification(null);
                }}
                className="text-xs bg-current text-white px-2 py-1 rounded hover:opacity-80"
              >
                View Updates
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;