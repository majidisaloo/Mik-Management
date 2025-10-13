import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const initialProfile = {
  firstName: '',
  lastName: '',
  email: ''
};

const Dashboard = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(initialProfile);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSaving, setIsSaving] = useState(false);

  const userRow = useMemo(() => {
    if (!user) {
      return [];
    }

    const createdAtLabel = user.createdAt
      ? new Date(`${user.createdAt}Z`).toLocaleString()
      : 'Not recorded';

    return [
      {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        createdAt: createdAtLabel
      }
    ];
  }, [user]);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    const controller = new AbortController();

    const loadProfile = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/users/${user.id}`, {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error('Unable to load your profile.');
        }

        const payload = await response.json();
        const userPayload = payload?.user;

        if (!userPayload) {
          throw new Error('User details were not returned by the server.');
        }

        setProfile({
          firstName: userPayload.firstName ?? '',
          lastName: userPayload.lastName ?? '',
          email: userPayload.email ?? ''
        });
        setStatus({ type: '', message: '' });
      } catch (error) {
        if (error.name !== 'AbortError') {
          setStatus({
            type: 'error',
            message: error.message || 'Unable to load your profile.'
          });
        }
      } finally {
        setLoading(false);
      }
    };

    loadProfile();

    return () => controller.abort();
  }, [navigate, user]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    setStatus({ type: '', message: '' });
    setIsSaving(true);

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profile)
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type') ?? '';
        let message = 'Profile update failed.';

        if (contentType.includes('application/json')) {
          const payload = await response.json().catch(() => ({}));
          if (payload?.message) {
            message = payload.message;
          }
        } else {
          const fallbackText = await response.text().catch(() => '');
          if (fallbackText) {
            message = fallbackText;
          }
        }

        throw new Error(message);
      }

      const payload = await response.json();
      const updatedUser = payload?.user;

      if (updatedUser) {
        updateUser(updatedUser);
        setProfile({
          firstName: updatedUser.firstName ?? '',
          lastName: updatedUser.lastName ?? '',
          email: updatedUser.email ?? ''
        });
      }

      setStatus({ type: 'success', message: payload?.message ?? 'Profile updated successfully.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Profile update failed.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="dashboard">
      <section className="card">
        <h1>Welcome back, {user.firstName || 'operator'}.</h1>
        <p className="card-intro">
          Manage account details and review the user list below. Changes are saved instantly once you
          submit the form.
        </p>
        <div className="user-table-wrapper">
          <h2>Users</h2>
          <table className="user-table">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Created</th>
              </tr>
            </thead>
            <tbody>
              {userRow.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.id}</td>
                  <td>{entry.name}</td>
                  <td>{entry.email}</td>
                  <td>{entry.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form className="form-grid" onSubmit={handleSubmit}>
          <h2 className="wide">Update Profile</h2>
          <label>
            <span>First Name</span>
            <input
              name="firstName"
              value={profile.firstName}
              onChange={handleChange}
              autoComplete="given-name"
              required
            />
          </label>
          <label>
            <span>Last Name</span>
            <input
              name="lastName"
              value={profile.lastName}
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
              value={profile.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </label>
          <div className="wide">
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
        {loading && <p className="feedback muted">Loading profile…</p>}
        {status.message && (
          <p className={`feedback ${status.type === 'error' ? 'error' : 'success'}`}>{status.message}</p>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
