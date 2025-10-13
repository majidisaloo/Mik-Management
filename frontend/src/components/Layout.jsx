import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import BrandMark from './BrandMark.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleSignOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="logo" aria-label="MikroManage home">
          <BrandMark />
        </Link>
        <div className="header-actions">
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  d="M12 18a6 6 0 0 0 6-6 6.11 6.11 0 0 0-.35-2 6 6 0 1 1-7.65 7.65 6.11 6.11 0 0 0 2 .35Z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  d="M12 18a6 6 0 1 1 0-12 6 6 0 0 1 0 12Zm0 2a1 1 0 0 1-1-1v-1.06a7 7 0 0 1-1.94-.8l-.75.75a1 1 0 0 1-1.41-1.41l.75-.75A7 7 0 0 1 7 13H5.94a1 1 0 0 1 0-2H7a7 7 0 0 1 .8-1.94l-.75-.75a1 1 0 0 1 1.41-1.41l.75.75A7 7 0 0 1 11 7V5.94a1 1 0 0 1 2 0V7a7 7 0 0 1 1.94.8l.75-.75a1 1 0 1 1 1.41 1.41l-.75.75A7 7 0 0 1 17 11h1.06a1 1 0 0 1 0 2H17a7 7 0 0 1-.8 1.94l.75.75a1 1 0 1 1-1.41 1.41l-.75-.75A7 7 0 0 1 13 17v1.06a1 1 0 0 1-1 1Z"
                  fill="currentColor"
                />
              </svg>
            )}
          </button>
          <nav>
            {user ? (
              <>
                <NavLink to="/dashboard">Dashboard</NavLink>
                <button type="button" onClick={handleSignOut} className="link-button">
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink to="/register">Register</NavLink>
                <NavLink to="/" end>
                  Login
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        <p>© {new Date().getFullYear()} MikroManage. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Layout;
