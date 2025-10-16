const BrandMark = () => {
  return (
    <span className="brand-mark" aria-label="MikroTik Management">
      <span className="brand-icon" aria-hidden="true">
        <svg width="180" height="48" viewBox="0 0 180 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="mikrotikGradient" x1="0" y1="0" x2="180" y2="48" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="gearGradient" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
          </defs>
          
          {/* MikroTik Text */}
          <text x="0" y="33" font-family="Arial, sans-serif" font-size="30" font-weight="bold" fill="url(#mikrotikGradient)">
            Mikr
            <tspan fill="url(#gearGradient)">O</tspan>
            Tik
          </text>
          
          {/* Wi-Fi signal lines above 'i' */}
          <path d="M68 12 Q71 9 74 12" stroke="url(#mikrotikGradient)" stroke-width="3" fill="none" />
          <path d="M68 9 Q71 6 74 9" stroke="url(#mikrotikGradient)" stroke-width="3" fill="none" />
          
          {/* Gear replacing the 'O' */}
          <g transform="translate(90, 24)">
            {/* Outer gear ring */}
            <circle cx="0" cy="0" r="12" fill="url(#gearGradient)" />
            <circle cx="0" cy="0" r="9" fill="white" />
            
            {/* Gear teeth - 8 teeth around the circle */}
            <rect x="-1.5" y="-18" width="3" height="6" fill="url(#gearGradient)" />
            <rect x="-1.5" y="12" width="3" height="6" fill="url(#gearGradient)" />
            <rect x="-18" y="-1.5" width="6" height="3" fill="url(#gearGradient)" />
            <rect x="12" y="-1.5" width="6" height="3" fill="url(#gearGradient)" />
            
            {/* Diagonal teeth */}
            <rect x="-12.5" y="-12.5" width="3" height="3" fill="url(#gearGradient)" transform="rotate(45 0 0)" />
            <rect x="9.5" y="-12.5" width="3" height="3" fill="url(#gearGradient)" transform="rotate(45 0 0)" />
            <rect x="-12.5" y="9.5" width="3" height="3" fill="url(#gearGradient)" transform="rotate(45 0 0)" />
            <rect x="9.5" y="9.5" width="3" height="3" fill="url(#gearGradient)" transform="rotate(45 0 0)" />
            
            {/* Center dot */}
            <circle cx="0" cy="0" r="3" fill="url(#mikrotikGradient)" />
          </g>
        </svg>
      </span>
    </span>
  );
};

export default BrandMark;