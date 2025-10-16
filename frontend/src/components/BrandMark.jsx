const BrandMark = () => {
  return (
    <span className="brand-mark" aria-label="MikroTik Management">
      <span className="brand-icon" aria-hidden="true">
        <svg width="720" height="192" viewBox="0 0 720 192" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="mikrotikGradient" x1="0" y1="0" x2="720" y2="192" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="gearGradient" x1="0" y1="0" x2="192" y2="192" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
          </defs>
          
          {/* MikroTik Text */}
          <text x="0" y="132" font-family="Arial, sans-serif" font-size="120" font-weight="bold" fill="url(#mikrotikGradient)">
            Mikr
            <tspan fill="url(#gearGradient)">O</tspan>
            Tik
          </text>
          
          {/* Wi-Fi signal lines above 'i' */}
          <path d="M272 48 Q284 36 296 48" stroke="url(#mikrotikGradient)" stroke-width="12" fill="none" />
          <path d="M272 36 Q284 24 296 36" stroke="url(#mikrotikGradient)" stroke-width="12" fill="none" />
          
          {/* Gear replacing the 'O' */}
          <g transform="translate(360, 96)">
            {/* Outer gear ring */}
            <circle cx="0" cy="0" r="48" fill="url(#gearGradient)" />
            <circle cx="0" cy="0" r="36" fill="white" />
            
            {/* Gear teeth - 8 teeth around the circle */}
            <rect x="-6" y="-72" width="12" height="24" fill="url(#gearGradient)" />
            <rect x="-6" y="48" width="12" height="24" fill="url(#gearGradient)" />
            <rect x="-72" y="-6" width="24" height="12" fill="url(#gearGradient)" />
            <rect x="48" y="-6" width="24" height="12" fill="url(#gearGradient)" />
            
            {/* Diagonal teeth */}
            <rect x="-50" y="-50" width="12" height="12" fill="url(#gearGradient)" transform="rotate(45 0 0)" />
            <rect x="38" y="-50" width="12" height="12" fill="url(#gearGradient)" transform="rotate(45 0 0)" />
            <rect x="-50" y="38" width="12" height="12" fill="url(#gearGradient)" transform="rotate(45 0 0)" />
            <rect x="38" y="38" width="12" height="12" fill="url(#gearGradient)" transform="rotate(45 0 0)" />
            
            {/* Center dot */}
            <circle cx="0" cy="0" r="12" fill="url(#mikrotikGradient)" />
          </g>
        </svg>
      </span>
    </span>
  );
};

export default BrandMark;