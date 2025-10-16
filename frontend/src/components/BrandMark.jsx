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
          
          {/* MikroTik WinBox-inspired design */}
          {/* Outer box frame */}
          <rect x="6" y="6" width="20" height="20" rx="2" fill="none" stroke="url(#mikrotikGradient)" strokeWidth="2" opacity="0.9" />
          
          {/* Inner box frame */}
          <rect x="8" y="8" width="16" height="16" rx="1" fill="none" stroke="url(#mikrotikGradient)" strokeWidth="1.5" opacity="0.7" />
          
          {/* Central gear/settings icon */}
          <circle cx="16" cy="16" r="5" fill="white" opacity="0.95" />
          <circle cx="16" cy="16" r="3.5" fill="url(#mikrotikGradient)" opacity="0.8" />
          
          {/* Gear teeth - horizontal and vertical */}
          <rect x="15" y="9" width="2" height="2" fill="white" opacity="0.9" />
          <rect x="15" y="21" width="2" height="2" fill="white" opacity="0.9" />
          <rect x="9" y="15" width="2" height="2" fill="white" opacity="0.9" />
          <rect x="21" y="15" width="2" height="2" fill="white" opacity="0.9" />
          
          {/* Diagonal gear teeth */}
          <rect x="11.5" y="11.5" width="1.5" height="1.5" fill="white" opacity="0.9" transform="rotate(45 12.25 12.25)" />
          <rect x="19" y="11.5" width="1.5" height="1.5" fill="white" opacity="0.9" transform="rotate(45 19.75 12.25)" />
          <rect x="11.5" y="19" width="1.5" height="1.5" fill="white" opacity="0.9" transform="rotate(45 12.25 19.75)" />
          <rect x="19" y="19" width="1.5" height="1.5" fill="white" opacity="0.9" transform="rotate(45 19.75 19.75)" />
          
          {/* Central dot */}
          <circle cx="16" cy="16" r="1" fill="white" />
          
          {/* Corner decorations (WinBox style) */}
          <circle cx="7" cy="7" r="1" fill="url(#mikrotikGradient)" opacity="0.6" />
          <circle cx="25" cy="7" r="1" fill="url(#mikrotikGradient)" opacity="0.6" />
          <circle cx="7" cy="25" r="1" fill="url(#mikrotikGradient)" opacity="0.6" />
          <circle cx="25" cy="25" r="1" fill="url(#mikrotikGradient)" opacity="0.6" />
        </svg>
      </span>
      <span className="brand-copy">
        <span className="brand-title">MikroManage</span>
      </span>
    </span>
  );
};

export default BrandMark;