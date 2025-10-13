import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const initialState = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  passwordConfirmation: ''
};

const Register = () => {
  const [form, setForm] = useState(initialState);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
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
        const error = await response.json();
        throw new Error(error.message || 'Registration failed.');
      }

      const email = form.email;
      setForm(initialState);
      navigate('/login', { replace: true, state: { registered: true, email } });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
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
          />
        </label>
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
