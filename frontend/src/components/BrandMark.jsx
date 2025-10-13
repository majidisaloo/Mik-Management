const BrandMark = () => {
  return (
    <span className="brand-mark" aria-label="MikroManage admin portal">
      <span className="brand-icon" aria-hidden="true">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="brandGradient" x1="4" y1="6" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#1d4ed8" />
              <stop offset="1" stopColor="#38bdf8" />
            </linearGradient>
          </defs>
          <rect x="3.5" y="5.5" width="29" height="25" rx="6" stroke="url(#brandGradient)" strokeWidth="3" fill="white" />
          <path
            d="M10.5 23.25L14.75 13.5L18 18.75L21.25 13.5L25.5 23.25"
            stroke="url(#brandGradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9.25 26.5H26.75"
            stroke="#1e3a8a"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="18" cy="9.75" r="2.25" fill="#1e3a8a" />
        </svg>
      </span>
      <span className="brand-copy">
        <span className="brand-title">MikroManage</span>
        <span className="brand-subtitle">MikroTik management</span>
      </span>
    </span>
  );
};

export default BrandMark;
