import React from 'react';

interface LogoProps {
  size?: 'sm' | 'lg';
}

const Logo: React.FC<LogoProps> = ({ size = 'lg' }) => {
  const containerClasses = size === 'lg' 
    ? "relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center"
    : "relative w-10 h-10 flex items-center justify-center";

  const glowDeviation = size === 'lg' ? "3" : "1.5";

  return (
    <div className={containerClasses}>
      {/* Outer Orbit */}
      <svg className="absolute w-full h-full animate-spin" style={{ animationDuration: '20s', animationDirection: 'reverse' }} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" stroke="url(#orbit-gradient-1)" strokeWidth="0.5" strokeDasharray="4 8"/>
        <defs>
          <linearGradient id="orbit-gradient-1" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FBBF24" stopOpacity="0" />
            <stop offset="0.5" stopColor="#FBBF24" />
            <stop offset="1" stopColor="#FBBF24" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      {/* Inner Orbit */}
      <svg className="absolute w-2/3 h-2/3 animate-spin" style={{ animationDuration: '15s' }} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" stroke="url(#orbit-gradient-2)" strokeWidth="0.75" />
        <defs>
          <linearGradient id="orbit-gradient-2" x1="0" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38BDF8" stopOpacity="0" />
            <stop offset="0.5" stopColor="#38BDF8" />
            <stop offset="1" stopColor="#38BDF8" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* Central 'A' Logo */}
      <svg className="relative w-1/2 h-1/2" viewBox="0 0 65 56" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
              <linearGradient id="a-gradient" x1="32.5" y1="0" x2="32.5" y2="56" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FDE68A"/>
                  <stop offset="1" stopColor="#F59E0B"/>
              </linearGradient>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation={glowDeviation} result="coloredBlur"/>
                  <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                  </feMerge>
              </filter>
          </defs>
          <g className="animate-pulse" style={{ animationDuration: '3s' }}>
            <path d="M32.5 0L65 56H52L45.5 39.2H19.5L13 56H0L32.5 0ZM22.25 30.8H42.75L32.5 9.52L22.25 30.8Z" fill="url(#a-gradient)" filter="url(#glow)"/>
          </g>
      </svg>
    </div>
  );
};

export default Logo;