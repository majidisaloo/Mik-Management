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
    <div className="min-h-screen relative overflow-hidden">
      {/* Beautiful Blurred Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-10 left-10 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute top-32 right-20 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 left-1/3 w-72 h-72 bg-white/8 rounded-full blur-3xl"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-sm w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-4">MEMBER LOGIN</h1>
            <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
          </div>

          {/* Login Form */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username Field */}
              <div className="flex items-center bg-white/90 rounded-xl overflow-hidden">
                <div className="w-12 h-12 bg-gray-600 flex items-center justify-center">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  id="loginEmail"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  className="flex-1 px-4 py-4 bg-transparent text-gray-700 placeholder-gray-500 focus:outline-none"
                  placeholder="Username"
                />
              </div>

              {/* Password Field */}
              <div className="flex items-center bg-white/90 rounded-xl overflow-hidden">
                <div className="w-12 h-12 bg-gray-600 flex items-center justify-center">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="loginPassword"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  className="flex-1 px-4 py-4 bg-transparent text-gray-700 placeholder-gray-500 focus:outline-none"
                  placeholder="Password"
                />
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-white/80">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm">
                    Remember me
                  </label>
                </div>
                <div className="text-sm">
                  <a href="#" className="hover:text-white transition-colors">
                    Forgot password?
                  </a>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-blue-800 hover:bg-blue-900 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Signing in...' : 'LOGIN'}
              </button>
            </form>

            {/* Status Message */}
            {status.message && (
              <div className={`mt-6 p-4 rounded-xl text-sm ${
                status.type === 'error' 
                  ? 'bg-red-500/20 text-red-200 border border-red-400/30' 
                  : 'bg-green-500/20 text-green-200 border border-green-400/30'
              }`}>
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
    </div>
  );
};

export default Login;
