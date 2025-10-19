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

  // Get version from UpdateContext to ensure consistency
  const { updateInfo } = useUpdate();
  const stableVersion = updateInfo?.stableVersion || updateInfo?.currentVersion?.replace('-beta', '') || 'Loading...';
  const betaVersion = updateInfo?.betaVersion || updateInfo?.currentVersion || 'Loading...';
  
  console.log('Layout - Stable version:', stableVersion);
  console.log('Layout - Beta version:', betaVersion);

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
        <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-white/80 backdrop-blur-sm border-b border-white/20 shadow-xl">
          <div className="h-full px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {user && (
                <button
                  type="button"
                  className="md:hidden w-10 h-10 bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl flex items-center justify-center text-gray-600 hover:bg-white/80 hover:text-blue-600 transition-all duration-300"
                  onClick={toggleMobileMenu}
                  aria-label="Toggle menu"
                >
                  {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
                </button>
              )}
              <Link to="/" className="flex items-center" aria-label="MikroManage home">
                <BrandMark />
              </Link>
            </div>
            <div className="flex items-center gap-4">
              {/* Theme Toggle */}
              <button
                type="button"
                className="w-10 h-10 bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl flex items-center justify-center text-gray-600 hover:bg-white/80 hover:text-blue-600 transition-all duration-300"
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
              </button>
              {user ? (
                <button
                  type="button"
                  className="w-10 h-10 bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-2xl flex items-center justify-center text-red-600 hover:bg-red-100/80 hover:text-red-700 transition-all duration-300"
                  onClick={handleLogout}
                  aria-label="Sign out"
                >
                  <LogoutIcon />
                </button>
              ) : (
                <nav className="flex items-center gap-3">
                  {meta.registrationOpen && location.pathname !== '/register' && (
                    <Link 
                      to="/register" 
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-semibold rounded-2xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                      Register
                    </Link>
                  )}
                  <Link 
                    to="/" 
                    className="px-4 py-2 bg-white/60 backdrop-blur-sm border border-white/30 text-gray-700 text-sm font-semibold rounded-2xl hover:bg-white/80 hover:text-blue-600 transition-all duration-300"
                  >
                    Login
                  </Link>
                </nav>
              )}
            </div>
          </div>
        </header>
      )}

      {user ? (
        <div className="flex h-screen pt-16">
          {/* Modern Sidebar with Glassmorphism */}
          <aside className="w-64 bg-white/80 backdrop-blur-sm border-r border-white/20 shadow-xl flex-shrink-0">
            <div className="flex flex-col h-full">
              {/* Modern Navigation */}
              <div className="flex-1 p-6">
                {navigation.map((section) => (
                  <div key={section.label ?? 'primary'} className="mb-8">
                    {section.label && !sidebarCollapsed && (
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 px-3">
                        {section.label}
                      </h3>
                    )}
                    <div className="space-y-2">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                              `group flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 ${
                                isActive
                                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                                  : 'text-gray-700 hover:bg-white/60 hover:text-blue-600 hover:shadow-md'
                              }`
                            }
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <div className={`w-5 h-5 flex items-center justify-center ${
                              location.pathname === item.to ? 'text-white' : 'text-gray-500 group-hover:text-blue-600'
                            }`}>
                              <Icon />
                            </div>
                            <span>{item.label}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Modern Footer */}
              <div className="p-6 border-t border-white/20 bg-white/40 backdrop-blur-sm">
                {/* Theme Toggle */}
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-gray-700 hover:bg-white/60 hover:text-blue-600 transition-all duration-300 mb-3"
                  onClick={toggleTheme}
                  aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                  <div className="w-5 h-5 flex items-center justify-center text-gray-500">
                    {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                  </div>
                  <span>Dark mode</span>
                </button>
                
                {/* Logout Button */}
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-red-600 hover:bg-red-50/80 hover:text-red-700 transition-all duration-300 mb-6"
                  onClick={handleLogout}
                  aria-label="Sign out"
                >
                  <div className="w-5 h-5 flex items-center justify-center text-red-500">
                    <LogoutIcon />
                  </div>
                  <span>Sign out</span>
                </button>
                
                {/* Version Info */}
                <div className="text-center space-y-3">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-gray-800">V {betaVersion.replace(/^v/, '').replace('-beta', '')}</span>
                      <span className="text-xs px-2 py-1 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold shadow-lg">
                        BETA
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 font-medium">
                      Stable: V {stableVersion.replace(/^v/, '').replace('-beta', '')}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300"
                    onClick={() => window.location.href = '/settings?tab=updates'}
                    aria-label="Check for updates"
                  >
                    <UpdateIcon />
                  </button>
                </div>
              </div>
            </div>
          </aside>
          
          {/* Main Content - Takes remaining space */}
          <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
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
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white/95 backdrop-blur-md border-r border-white/20 shadow-2xl">
            <div className="flex flex-col h-full">
              {/* Modern Mobile Navigation */}
              <div className="flex-1 p-6">
                {navigation.map((section) => (
                  <div key={section.label ?? 'primary'} className="mb-8">
                    {section.label && !sidebarCollapsed && (
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 px-3">
                        {section.label}
                      </h3>
                    )}
                    <div className="space-y-2">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                              `group flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 ${
                                isActive
                                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                                  : 'text-gray-700 hover:bg-white/60 hover:text-blue-600 hover:shadow-md'
                              }`
                            }
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <div className={`w-5 h-5 flex items-center justify-center ${
                              location.pathname === item.to ? 'text-white' : 'text-gray-500 group-hover:text-blue-600'
                            }`}>
                              <Icon />
                            </div>
                            <span>{item.label}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Modern Mobile Footer */}
              <div className="p-6 border-t border-white/20 bg-white/40 backdrop-blur-sm">
                {/* Theme Toggle */}
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-gray-700 hover:bg-white/60 hover:text-blue-600 transition-all duration-300 mb-3"
                  onClick={toggleTheme}
                  aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                  <div className="w-5 h-5 flex items-center justify-center text-gray-500">
                    {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                  </div>
                  <span>Dark mode</span>
                </button>
                
                {/* Logout Button */}
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-red-600 hover:bg-red-50/80 hover:text-red-700 transition-all duration-300 mb-6"
                  onClick={handleLogout}
                  aria-label="Sign out"
                >
                  <div className="w-5 h-5 flex items-center justify-center text-red-500">
                    <LogoutIcon />
                  </div>
                  <span>Sign out</span>
                </button>
                
                {/* Version Info */}
                <div className="text-center space-y-3">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-gray-800">V {betaVersion.replace(/^v/, '').replace('-beta', '')}</span>
                      <span className="text-xs px-2 py-1 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold shadow-lg">
                        BETA
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 font-medium">
                      Stable: V {stableVersion.replace(/^v/, '').replace('-beta', '')}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300"
                    onClick={() => window.location.href = '/settings?tab=updates'}
                    aria-label="Check for updates"
                  >
                    <UpdateIcon />
                  </button>
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