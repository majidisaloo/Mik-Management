import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import BrandMark from './BrandMark.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
