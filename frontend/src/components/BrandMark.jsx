const BrandMark = () => {
  return (
    <span className="brand-mark" aria-label="MikroManage admin portal">
      <span className="brand-icon" aria-hidden="true">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="brandGradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="50%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>
            <linearGradient id="mikrotikGradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>
          
          {/* Main container with rounded corners */}
          <rect x="2" y="2" width="28" height="28" rx="8" fill="url(#brandGradient)" />
          
          {/* MikroTik-inspired hexagon base */}
          <path d="M16 6 L22 9 L22 15 L16 18 L10 15 L10 9 Z" fill="url(#mikrotikGradient)" opacity="0.9" />
          
          {/* Management gear/settings icon */}
          <circle cx="16" cy="16" r="6" fill="white" opacity="0.95" />
          <circle cx="16" cy="16" r="4" fill="url(#mikrotikGradient)" opacity="0.8" />
          
          {/* Gear teeth */}
          <rect x="15" y="8" width="2" height="3" fill="white" opacity="0.9" />
          <rect x="15" y="21" width="2" height="3" fill="white" opacity="0.9" />
          <rect x="8" y="15" width="3" height="2" fill="white" opacity="0.9" />
          <rect x="21" y="15" width="3" height="2" fill="white" opacity="0.9" />
          
          {/* Diagonal gear teeth */}
          <rect x="11.5" y="11.5" width="2" height="2" fill="white" opacity="0.9" transform="rotate(45 12.5 12.5)" />
          <rect x="18.5" y="11.5" width="2" height="2" fill="white" opacity="0.9" transform="rotate(45 19.5 12.5)" />
          <rect x="11.5" y="18.5" width="2" height="2" fill="white" opacity="0.9" transform="rotate(45 12.5 19.5)" />
          <rect x="18.5" y="18.5" width="2" height="2" fill="white" opacity="0.9" transform="rotate(45 19.5 19.5)" />
          
          {/* Central dot */}
          <circle cx="16" cy="16" r="1.5" fill="white" />
          
          {/* Network connection lines */}
          <line x1="16" y1="6" x2="16" y2="10" stroke="white" strokeWidth="1" opacity="0.6" />
          <line x1="16" y1="18" x2="16" y2="22" stroke="white" strokeWidth="1" opacity="0.6" />
          <line x1="6" y1="16" x2="10" y2="16" stroke="white" strokeWidth="1" opacity="0.6" />
          <line x1="22" y1="16" x2="26" y2="16" stroke="white" strokeWidth="1" opacity="0.6" />
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