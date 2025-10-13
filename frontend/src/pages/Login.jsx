import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Login = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const registrationContext = location.state?.registered ? 'Your account has been created. Please sign in.' : '';
  const initialEmail = location.state?.email ?? '';
  const cameFromRegistration = Boolean(location.state?.registered);

  const [form, setForm] = useState({ email: initialEmail, password: '' });
  const [status, setStatus] = useState(
    registrationContext ? { type: 'success', message: registrationContext } : { type: '', message: '' }
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (cameFromRegistration) {
      navigate('.', { replace: true, state: initialEmail ? { email: initialEmail } : null });
    }
  }, [cameFromRegistration, initialEmail, navigate]);

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
        const error = await response.json().catch(() => ({ message: 'Login failed.' }));
        throw new Error(error.message || 'Login failed.');
      }

      setStatus({ type: 'success', message: 'Login successful.' });
      setForm({ email: form.email, password: '' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="card">
      <h1>Sign In</h1>
      <form onSubmit={handleSubmit} className="form-grid">
        <label className="wide">
          <span>Email</span>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
            required
          />
        </label>
        <label className="wide">
          <span>Password</span>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            autoComplete="current-password"
            required
          />
        </label>
        <button type="submit" disabled={isSubmitting} className="primary-button">
          {isSubmitting ? 'Signing in…' : 'Login'}
        </button>
      </form>
      {status.message && (
        <p className={status.type === 'error' ? 'feedback error' : 'feedback success'}>{status.message}</p>
      )}
    </section>
  );
};

export default Login;
