import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import BrandMark from './BrandMark.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

// Modern SVG Icons
const MoonIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" fill="currentColor" />
  </svg>
);

const SunIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="5" fill="currentColor" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="16,17 21,12 16,7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const navigationIcons = {
  dashboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
      <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
      <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
      <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  users: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  groups: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  mikrotiks: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
      <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="2" />
      <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  tunnels: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  settings: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
};

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [meta, setMeta] = useState({ version: '0.0', registrationOpen: true });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

        if (mounted) {
          setMeta({
            version: payload?.version ?? '0.0',
            registrationOpen: payload?.registrationOpen !== false,
            userCount: payload?.userCount ?? 0
          });
        }
      } catch (error) {
        if (mounted) {
          setMeta((current) => ({ ...current, version: current.version || '0.0' }));
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

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const renderThemeToggle = (placement) => {
    return (
      <button
        type="button"
        className={`btn btn--ghost btn--sm ${placement === 'sidebar' ? 'w-full' : ''}`}
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? <MoonIcon /> : <SunIcon />}
        {placement === 'sidebar' && !sidebarCollapsed && (
          <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
        )}
      </button>
    );
  };

  const renderLogoutButton = (placement) => {
    return (
      <button
        type="button"
        className={`btn btn--ghost btn--sm ${placement === 'sidebar' ? 'w-full text-error' : 'text-error'}`}
        onClick={handleSignOut}
        aria-label="Sign out"
      >
        <LogoutIcon />
        {placement === 'sidebar' && !sidebarCollapsed && <span>Sign out</span>}
      </button>
    );
  };

  const navigation = useMemo(() => {
    if (!user) return [];

    const baseNav = [
      {
        items: [
          {
            to: '/',
            label: 'Dashboard',
            icon: navigationIcons.dashboard
          }
        ]
      }
    ];

    if (user.permissions?.users) {
      baseNav[0].items.push({
        to: '/users',
        label: 'Users & Roles',
        icon: navigationIcons.users
      });
    }

    if (user.permissions?.groups) {
      baseNav[0].items.push({
        to: '/groups',
        label: 'Mik-Groups',
        icon: navigationIcons.groups
      });
    }

    if (user.permissions?.mikrotiks) {
      baseNav[0].items.push({
        to: '/mikrotiks',
        label: 'Mikrotiks',
        icon: navigationIcons.mikrotiks
      });
    }

    if (user.permissions?.tunnels) {
      baseNav[0].items.push({
        to: '/tunnels',
        label: 'Tunnels',
        icon: navigationIcons.tunnels
      });
    }

    baseNav[0].items.push({
      to: '/settings',
      label: 'Settings',
      icon: navigationIcons.settings
    });

    return baseNav;
  }, [user]);

  const renderNavEntry = (item) => {
    const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));

    return (
      <NavLink
        key={item.to}
        to={item.to}
        className={`sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      >
        <span className="sidebar-link__icon">{item.icon}</span>
        {!sidebarCollapsed && <span>{item.label}</span>}
      </NavLink>
    );
  };

  return (
    <div
      className={`app-shell${user ? ' app-shell--authed' : ''}${sidebarCollapsed ? ' app-shell--collapsed' : ''}`}
    >
      <header className="app-header">
        <div className="flex items-center gap-4">
          {user && (
            <button
              type="button"
              className="btn btn--ghost btn--sm md:hidden"
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          )}
          <Link to="/" className="logo" aria-label="MikroManage home">
            <BrandMark />
          </Link>
        </div>
        <div className={`header-actions${user ? ' header-actions--authed' : ''}`}>
          {!user && renderThemeToggle('header')}
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-tertiary">v{meta.version}</span>
              {renderLogoutButton('header')}
            </div>
          ) : (
            <nav className="flex items-center gap-4">
              {meta.registrationOpen && (
                <Link to="/register" className="btn btn--ghost btn--sm">
                  Register
                </Link>
              )}
              <Link to="/" className="btn btn--primary btn--sm">
                Login
              </Link>
            </nav>
          )}
        </div>
      </header>

      {user ? (
        <div className="app-content">
          <aside className={`app-sidebar ${mobileMenuOpen ? 'app-sidebar--open' : ''}`} aria-label="Primary navigation">
            <div className="sidebar-nav">
              {navigation.map((section) => (
                <div className="sidebar-group" key={section.label ?? 'primary'}>
                  {section.label && !sidebarCollapsed && (
                    <p className="sidebar-group__label">{section.label}</p>
                  )}
                  {section.items.map((item) => renderNavEntry(item))}
                </div>
              ))}
            </div>
            <div className="sidebar-footer p-4 border-t border-primary">
              {renderThemeToggle('sidebar')}
              <div className="mt-4">{renderLogoutButton('sidebar')}</div>
            </div>
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

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-overlay z-modal-backdrop md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;