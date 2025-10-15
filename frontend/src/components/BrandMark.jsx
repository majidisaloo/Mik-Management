const BrandMark = () => {
  return (
    <span className="brand-mark" aria-label="MikroManage admin portal">
      <span className="brand-icon" aria-hidden="true">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="brandGradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="var(--color-primary-500)" />
              <stop offset="50%" stopColor="var(--color-primary-600)" />
              <stop offset="100%" stopColor="var(--color-primary-700)" />
            </linearGradient>
            <linearGradient id="brandAccent" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="var(--color-primary-300)" />
              <stop offset="100%" stopColor="var(--color-primary-400)" />
            </linearGradient>
          </defs>
          
          {/* Main container */}
          <rect x="2" y="2" width="28" height="28" rx="8" fill="url(#brandGradient)" />
          
          {/* Network nodes */}
          <circle cx="8" cy="8" r="2" fill="white" opacity="0.9" />
          <circle cx="24" cy="8" r="2" fill="white" opacity="0.9" />
          <circle cx="8" cy="24" r="2" fill="white" opacity="0.9" />
          <circle cx="24" cy="24" r="2" fill="white" opacity="0.9" />
          <circle cx="16" cy="16" r="3" fill="white" opacity="0.95" />
          
          {/* Connection lines */}
          <line x1="8" y1="8" x2="16" y2="16" stroke="white" strokeWidth="1.5" opacity="0.7" />
          <line x1="24" y1="8" x2="16" y2="16" stroke="white" strokeWidth="1.5" opacity="0.7" />
          <line x1="8" y1="24" x2="16" y2="16" stroke="white" strokeWidth="1.5" opacity="0.7" />
          <line x1="24" y1="24" x2="16" y2="16" stroke="white" strokeWidth="1.5" opacity="0.7" />
          
          {/* Central router icon */}
          <rect x="13" y="13" width="6" height="6" rx="1" fill="url(#brandAccent)" />
          <rect x="14" y="14" width="4" height="4" rx="0.5" fill="white" />
        </svg>
      </span>
      <span className="brand-copy">
        <span className="brand-title">MikroManage</span>
        <span className="brand-subtitle">MikroTik Management</span>
      </span>
    </span>
  );
};

export default BrandMark;