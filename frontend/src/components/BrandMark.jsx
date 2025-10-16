const BrandMark = () => {
  return (
    <span className="brand-mark" aria-label="MikroTik Management">
      <span className="brand-icon" aria-hidden="true">
        <svg width="120" height="32" viewBox="0 0 120 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="mikrotikGradient" x1="0" y1="0" x2="120" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="gearGradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
          </defs>
          
          {/* MikroTik Text */}
          <text x="0" y="22" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="url(#mikrotikGradient)">
            Mikr
            <tspan fill="url(#gearGradient)">O</tspan>
            Tik
          </text>
          
          {/* Wi-Fi signal lines above 'i' */}
          <path d="M45 8 Q47 6 49 8" stroke="url(#mikrotikGradient)" stroke-width="2" fill="none" />
          <path d="M45 6 Q47 4 49 6" stroke="url(#mikrotikGradient)" stroke-width="2" fill="none" />
          
          {/* Gear replacing the 'O' */}
          <g transform="translate(60, 16)">
            {/* Outer gear ring */}
            <circle cx="0" cy="0" r="8" fill="url(#gearGradient)" />
            <circle cx="0" cy="0" r="6" fill="white" />
            
            {/* Gear teeth - 8 teeth around the circle */}
            <rect x="-1" y="-12" width="2" height="4" fill="url(#gearGradient)" />
            <rect x="-1" y="8" width="2" height="4" fill="url(#gearGradient)" />
            <rect x="-12" y="-1" width="4" height="2" fill="url(#gearGradient)" />
            <rect x="8" y="-1" width="4" height="2" fill="url(#gearGradient)" />
            
            {/* Diagonal teeth */}
            <rect x="-8.5" y="-8.5" width="2" height="2" fill="url(#gearGradient)" transform="rotate(45 0 0)" />
            <rect x="6.5" y="-8.5" width="2" height="2" fill="url(#gearGradient)" transform="rotate(45 0 0)" />
            <rect x="-8.5" y="6.5" width="2" height="2" fill="url(#gearGradient)" transform="rotate(45 0 0)" />
            <rect x="6.5" y="6.5" width="2" height="2" fill="url(#gearGradient)" transform="rotate(45 0 0)" />
            
            {/* Center dot */}
            <circle cx="0" cy="0" r="2" fill="url(#mikrotikGradient)" />
          </g>
        </svg>
      </span>
    </span>
  );
};

export default BrandMark;