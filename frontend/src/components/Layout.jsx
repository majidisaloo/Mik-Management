import { Link, NavLink, Outlet } from 'react-router-dom';
import BrandMark from './BrandMark.jsx';

const Layout = () => {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="logo" aria-label="MikroManage home">
          <BrandMark />
        </Link>
        <nav>
          <NavLink to="/register">Register</NavLink>
          <NavLink to="/" end>
            Login
          </NavLink>
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
