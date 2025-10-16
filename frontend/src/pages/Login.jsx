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

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
      return;
    }

    if (cameFromRegistration) {
      navigate('.', { replace: true, state: initialEmail ? { email: initialEmail } : null });
    }
  }, [cameFromRegistration, initialEmail, navigate, user]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: '', message: '' });
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });

      if (!response.ok) {
        const statusCode = response.status;
        const contentType = response.headers.get('content-type') ?? '';
        let message = 'Login failed.';

        if (statusCode === 502) {
          message =
            'Login failed because the API is unavailable (502 Bad Gateway). Please verify the backend process is running.';
        } else if (statusCode >= 500) {
          message = `Login failed due to a server error (${statusCode}). Please retry after confirming the API is online.`;
        }

        if (contentType.includes('application/json')) {
          const errorPayload = await response.json().catch(() => ({}));
          if (errorPayload?.message) {
            message = errorPayload.message;
          }
        } else {
          const fallbackText = await response.text().catch(() => '');
          if (fallbackText && message === 'Login failed.') {
            message = fallbackText;
          }
        }

        throw new Error(message);
      }

      const payload = await response.json();
      if (payload?.user) {
        login(payload.user);
      }

      navigate('/dashboard', { replace: true });
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Login failed.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      {/* Login Page Navbar */}
      <header className="login-navbar">
        <div className="login-navbar-content">
          <div className="login-logo">
            <BrandMark />
          </div>
          <div className="login-navbar-actions">
            <button
              type="button"
              onClick={() => {
                const newTheme = theme === 'light' ? 'dark' : 'light';
                toggleTheme();
              }}
              className="login-theme-toggle"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" fill="currentColor" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="5" fill="currentColor" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
            </button>
            <Link to="/" className="login-login-btn">
              Login
            </Link>
          </div>
        </div>
      </header>

      {/* Login Content */}
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1 className="login-title">Sign In</h1>
            <p className="login-subtitle">Enter your credentials to access your account</p>
          </div>
          
          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="loginEmail" className="login-label">
                Email Address
              </label>
              <input
                id="loginEmail"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={handleChange}
                className="login-input"
                placeholder="Enter your email"
              />
            </div>
            
            <div className="login-field">
              <label htmlFor="loginPassword" className="login-label">
                Password
              </label>
              <input
                id="loginPassword"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={form.password}
                onChange={handleChange}
                className="login-input"
                placeholder="Enter your password"
              />
            </div>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="login-button"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          
          {status.message && (
            <div className={`login-message ${
              status.type === 'error' 
                ? 'login-message--error' 
                : 'login-message--success'
            }`}>
              {status.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
