import { Link, NavLink, Outlet } from 'react-router-dom';

const Layout = () => {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="logo">
          Mik Management
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
        <p>© {new Date().getFullYear()} Mik Management. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Layout;
