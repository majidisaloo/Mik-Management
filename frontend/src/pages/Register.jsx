import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

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
  const { user } = useAuth();
  const [form, setForm] = useState(initialState);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(evaluatePasswordStrength(''));
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate, user]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));

    if (name === 'password') {
      setPasswordStrength(evaluatePasswordStrength(value));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: '', message: '' });

    if (form.password !== form.passwordConfirmation) {
      setStatus({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type') ?? '';
        let message = 'Registration failed.';

        if (contentType.includes('application/json')) {
          const errorPayload = await response.json().catch(() => ({}));
          if (errorPayload?.message) {
            message = errorPayload.message;
          }
        } else {
          const fallbackText = await response.text().catch(() => '');
          if (fallbackText) {
            message = fallbackText;
          }
        }

        throw new Error(message);
      }

      const email = form.email;
      setForm(initialState);
      setPasswordStrength(evaluatePasswordStrength(''));
      navigate('/login', { replace: true, state: { registered: true, email } });
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Registration failed.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="card">
      <h1>Create an Account</h1>
      <form onSubmit={handleSubmit} className="form-grid">
        <label>
          <span>First Name</span>
          <input
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
            autoComplete="given-name"
            required
            id="firstName"
          />
        </label>
        <label>
          <span>Last Name</span>
          <input
            name="lastName"
            value={form.lastName}
            onChange={handleChange}
            autoComplete="family-name"
            required
            id="lastName"
          />
        </label>
        <label className="wide">
          <span>Email</span>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
            required
            id="email"
          />
        </label>
        <label>
          <span>Password</span>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            autoComplete="new-password"
            required
            minLength={8}
            id="password"
            aria-describedby="password-strength"
          />
        </label>
        <label>
          <span>Confirm Password</span>
          <input
            type="password"
            name="passwordConfirmation"
            value={form.passwordConfirmation}
            onChange={handleChange}
            autoComplete="new-password"
            required
            minLength={8}
            id="passwordConfirmation"
          />
        </label>
        <div
          id="password-strength"
          className="password-strength"
          aria-live="polite"
          data-score={passwordStrength.score}
        >
          <div className="password-strength-track">
            <div className="password-strength-bar" />
          </div>
          <span className="password-strength-label">{passwordStrength.label}</span>
          {passwordStrength.suggestions.length > 0 && (
            <span className="password-strength-hint">
              {passwordStrength.suggestions[0]}
            </span>
          )}
        </div>
        <button type="submit" disabled={isSubmitting} className="primary-button">
          {isSubmitting ? 'Submitting…' : 'Register'}
        </button>
      </form>
      {status.message && (
        <p className="feedback error">{status.message}</p>
      )}
    </section>
  );
};

export default Register;
