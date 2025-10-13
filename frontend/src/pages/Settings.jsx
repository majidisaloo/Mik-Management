import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (!user.permissions?.settings) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate, user]);

  if (!user?.permissions?.settings) {
    return null;
  }

  return (
    <section className="card">
      <header className="card-header">
        <div>
          <h1>Settings</h1>
          <p className="card-intro">
            Configure MikroManage to match your organisation. This workspace will soon provide controls for integrations,
            notifications, and deployment preferences.
          </p>
        </div>
      </header>
      <div className="empty-state">
        <p className="muted">Settings controls are coming soon. Stay tuned for additional configuration options.</p>
      </div>
    </section>
  );
};

export default Settings;
