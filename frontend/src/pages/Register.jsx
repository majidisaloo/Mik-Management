import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import BrandMark from '../components/BrandMark.jsx';
import './Register.css';

const initialState = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  passwordConfirmation: ''
};

const evaluatePasswordStrength = (password) => {
  if (!password) {
    return { score: 0, label: 'Start typing a password', suggestions: ['Use at least 8 characters.'] };
  }

  const checks = {
    length: password.length >= 12,
    moderateLength: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password)
  };

  let score = 0;
  if (checks.moderateLength) score += 1;
  if (checks.length) score += 1;
  if (checks.lowercase && checks.uppercase) score += 1;
  if (checks.number && checks.symbol) score += 1;

  const suggestions = [];
  if (!checks.moderateLength) suggestions.push('Use at least 8 characters.');
  if (!checks.length) suggestions.push('Passwords above 12 characters are stronger.');
  if (!(checks.lowercase && checks.uppercase)) suggestions.push('Mix uppercase and lowercase letters.');
  if (!(checks.number && checks.symbol)) suggestions.push('Add numbers and special symbols.');

  let label = 'Weak password';
  if (score >= 4) {
    label = 'Excellent password';
  } else if (score === 3) {
    label = 'Strong password';
  } else if (score === 2) {
    label = 'Moderate password';
  }

  return { score, label, suggestions };
};

const Register = () => {
  const navigate = useNavigate();
  const { user, register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [form, setForm] = useState(initialState);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(evaluatePasswordStrength(''));

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    const strength = evaluatePasswordStrength(form.password);
    setPasswordStrength(strength);
  }, [form.password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: '', message: '' });

    if (form.password !== form.passwordConfirmation) {
      setStatus({
        type: 'error',
        message: 'Passwords do not match.'
      });
      setIsSubmitting(false);
      return;
    }

    try {
      await register(form.firstName, form.lastName, form.email, form.password);
      navigate('/login', { 
        replace: true, 
        state: { 
          registered: true, 
          email: form.email 
        } 
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Unable to create account. Please try again.'
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

  const getPasswordStrengthClass = (score) => {
    if (score >= 4) return 'register-password-fill--excellent';
    if (score === 3) return 'register-password-fill--strong';
    if (score === 2) return 'register-password-fill--moderate';
    return 'register-password-fill--weak';
  };

  return (
    <div className="register-page">
      {/* Custom Navbar for Register Page */}
      <header className="register-header">
        <div className="register-header-content">
          <div className="register-header-left">
            <a href="/" className="register-logo" aria-label="MikroManage home">
              <BrandMark />
            </a>
          </div>
          <div className="register-header-right">
            <button
              type="button"
              className="register-theme-toggle"
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
            <a href="/" className="register-login-btn">
              Login
            </a>
          </div>
        </div>
      </header>

      <main className="register-main">
        <div className="register-container">
          <div className="register-card">
            <div className="register-card-header">
              <div className="register-logo-section">
                <BrandMark />
              </div>
              <h1 className="register-title">Create Account</h1>
              <p className="register-subtitle">Join MikroManage to get started</p>
            </div>

            <div className="register-info">
              Registration is limited to the first administrator. Please sign in with an existing account.
            </div>

            <form onSubmit={handleSubmit} className="register-form">
              {status.message && (
                <div className={`register-status register-status--${status.type}`}>
                  {status.message}
                </div>
              )}

              <div className="register-form-row">
                <div className="register-form-group">
                  <label htmlFor="firstName" className="register-label">
                    First Name
                  </label>
                  <div className="register-input-wrapper">
                    <svg className="register-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      value={form.firstName}
                      onChange={handleInputChange}
                      className="register-input"
                      placeholder="Enter first name"
                      required
                      autoComplete="given-name"
                    />
                  </div>
                </div>

                <div className="register-form-group">
                  <label htmlFor="lastName" className="register-label">
                    Last Name
                  </label>
                  <div className="register-input-wrapper">
                    <svg className="register-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      value={form.lastName}
                      onChange={handleInputChange}
                      className="register-input"
                      placeholder="Enter last name"
                      required
                      autoComplete="family-name"
                    />
                  </div>
                </div>
              </div>

              <div className="register-form-group">
                <label htmlFor="email" className="register-label">
                  Email
                </label>
                <div className="register-input-wrapper">
                  <svg className="register-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleInputChange}
                    className="register-input"
                    placeholder="Enter email address"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="register-form-group">
                <label htmlFor="password" className="register-label">
                  Password
                </label>
                <div className="register-input-wrapper">
                  <svg className="register-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                    className="register-input"
                    placeholder="Enter password"
                    required
                    autoComplete="new-password"
                  />
                </div>
                <div className="register-password-strength">
                  <div className="register-password-label">{passwordStrength.label}</div>
                  <div className="register-password-bar">
                    <div className={`register-password-fill ${getPasswordStrengthClass(passwordStrength.score)}`}></div>
                  </div>
                  <div className="register-password-suggestions">
                    {passwordStrength.suggestions.join(' ')}
                  </div>
                </div>
              </div>

              <div className="register-form-group">
                <label htmlFor="passwordConfirmation" className="register-label">
                  Confirm Password
                </label>
                <div className="register-input-wrapper">
                  <svg className="register-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <circle cx="12" cy="16" r="1"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <input
                    id="passwordConfirmation"
                    name="passwordConfirmation"
                    type="password"
                    value={form.passwordConfirmation}
                    onChange={handleInputChange}
                    className="register-input"
                    placeholder="Confirm password"
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="register-form-actions">
                <button
                  type="submit"
                  className="register-submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating Account...' : 'Register'}
                </button>
              </div>
            </form>

            <div className="register-card-footer">
              <div className="register-divider">
                <span>Already have an account?</span>
              </div>
              <a href="/" className="register-login-link">
                Sign In
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Register;