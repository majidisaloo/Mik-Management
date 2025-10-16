import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import BrandMark from '../components/BrandMark.jsx';
import './Login.css';

const Login = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const registrationContext = location.state?.registered ? 'Your account has been created. Please sign in.' : '';
  const initialEmail = location.state?.email ?? '';
  const cameFromRegistration = Boolean(location.state?.registered);

  const [form, setForm] = useState({ email: initialEmail, password: '' });
  const [status, setStatus] = useState(
    registrationContext ? { type: 'success', message: registrationContext } : { type: '', message: '' }
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUsers, setHasUsers] = useState(false);
  const [checkingUsers, setCheckingUsers] = useState(true);

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
      return;
    }

    if (cameFromRegistration) {
      navigate('.', { replace: true, state: initialEmail ? { email: initialEmail } : null });
    }
  }, [user, navigate, cameFromRegistration, initialEmail]);

  // Check if users exist
  useEffect(() => {
    const checkUsers = async () => {
      try {
        const response = await fetch('/api/users');
        if (response.ok) {
          const users = await response.json();
          setHasUsers(Array.isArray(users) && users.length > 0);
        } else {
          setHasUsers(false);
        }
      } catch (error) {
        console.error('Failed to check users:', error);
        setHasUsers(false);
      } finally {
        setCheckingUsers(false);
      }
    };

    checkUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: '', message: '' });

    try {
      await login(form.email, form.password);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Unable to sign in. Please check your credentials.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    
    // Clear status when user starts typing
    if (status.message) {
      setStatus({ type: '', message: '' });
    }
  };

  return (
    <div className="login-page">
      {/* Custom Navbar for Login Page */}
      <header className="login-header">
        <div className="login-header-content">
          <div className="login-header-left">
            <Link to="/" className="login-logo" aria-label="MikroManage home">
              <BrandMark />
            </Link>
          </div>
          <div className="login-header-right">
            <button
              type="button"
              className="login-theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="5" fill="currentColor" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" fill="currentColor" />
                </svg>
              )}
            </button>
            <Link to="/" className="login-login-btn">
              Login
            </Link>
          </div>
        </div>
      </header>

      <main className="login-main">
        <div className="login-container">
          <div className="login-card">
            <div className="login-card-header">
              <div className="login-logo-section">
                <BrandMark />
              </div>
              <h1 className="login-title">Welcome Back</h1>
              <p className="login-subtitle">Sign in to your MikroManage account</p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              {status.message && (
                <div className={`login-status login-status--${status.type}`}>
                  {status.message}
                </div>
              )}

              <div className="login-form-group">
                <label htmlFor="email" className="login-label">
                  Email Address
                </label>
                <div className="login-input-wrapper">
                  <svg className="login-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleInputChange}
                    className="login-input"
                    placeholder="Enter your email"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="login-form-group">
                <label htmlFor="password" className="login-label">
                  Password
                </label>
                <div className="login-input-wrapper">
                  <svg className="login-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <circle cx="12" cy="16" r="1"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleInputChange}
                    className="login-input"
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <div className="login-form-actions">
                <button
                  type="submit"
                  className="login-submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Signing in...' : 'Sign In'}
                </button>
              </div>
            </form>

            {!checkingUsers && !hasUsers && (
              <div className="login-card-footer">
                <div className="login-divider">
                  <span>Don't have an account?</span>
                </div>
                <Link to="/register" className="login-register-link">
                  Create New Account
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;