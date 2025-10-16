import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const Login = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, login } = useAuth();
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
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-gray-50)' }}>
      <div className="max-w-md w-full space-y-8">
        <div className="card" style={{ padding: '2.5rem 2rem' }}>
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 rounded-xl flex items-center justify-center mb-6" style={{ backgroundColor: 'var(--color-primary-500)' }}>
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--color-gray-900)' }}>Welcome Back</h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--color-gray-600)' }}>Sign in to your MikroManage account</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="loginEmail" className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-gray-700)' }}>
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
                className="w-full px-4 py-3 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2"
                style={{
                  borderColor: 'var(--color-gray-300)',
                  backgroundColor: 'var(--color-gray-50)',
                  color: 'var(--color-gray-900)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--color-primary-500)';
                  e.target.style.backgroundColor = 'white';
                  e.target.style.boxShadow = '0 0 0 3px var(--color-primary-100)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--color-gray-300)';
                  e.target.style.backgroundColor = 'var(--color-gray-50)';
                  e.target.style.boxShadow = 'none';
                }}
                placeholder="Enter your email"
              />
            </div>
            
            <div>
              <label htmlFor="loginPassword" className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-gray-700)' }}>
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
                className="w-full px-4 py-3 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2"
                style={{
                  borderColor: 'var(--color-gray-300)',
                  backgroundColor: 'var(--color-gray-50)',
                  color: 'var(--color-gray-900)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--color-primary-500)';
                  e.target.style.backgroundColor = 'white';
                  e.target.style.boxShadow = '0 0 0 3px var(--color-primary-100)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--color-gray-300)';
                  e.target.style.backgroundColor = 'var(--color-gray-50)';
                  e.target.style.boxShadow = 'none';
                }}
                placeholder="Enter your password"
              />
            </div>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-3 px-4 rounded-lg text-sm font-semibold text-white transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--color-primary-500)' }}
              onMouseEnter={(e) => {
                if (!e.target.disabled) {
                  e.target.style.backgroundColor = 'var(--color-primary-600)';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'var(--color-primary-500)';
              }}
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
          
          {status.message && (
            <div className={`mt-6 p-4 rounded-lg text-sm font-medium ${
              status.type === 'error' 
                ? 'border' 
                : 'border'
            }`} style={{
              backgroundColor: status.type === 'error' ? 'var(--color-error-50)' : 'var(--color-success-50)',
              color: status.type === 'error' ? 'var(--color-error-700)' : 'var(--color-success-700)',
              borderColor: status.type === 'error' ? 'var(--color-error-200)' : 'var(--color-success-200)'
            }}>
              <div className="flex items-center">
                {status.type === 'error' ? (
                  <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                {status.message}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
