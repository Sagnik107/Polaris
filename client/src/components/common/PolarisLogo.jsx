import React from 'react';

/**
 * Unified POLARIS Tactical Insignia
 * 8-Point Polar Star with Faceted Diamond Core and Sub-Zero Reticle Ring.
 * Consistent with browser favicon and official C2 branding.
 */
export const PolarisLogo = ({
  className = 'w-8 h-8',
  glow = true,
  withText = false,
  subtitle = 'ARCTIC C2 INTEL',
  animated = false,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-3 select-none ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
        {/* Ambient Tactical Polar Halo */}
        {glow && (
          <div
            className={`absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500/30 via-sky-400/20 to-teal-400/30 blur-md pointer-events-none ${
              animated ? 'animate-pulse' : ''
            }`}
          />
        )}

        <svg
          viewBox="0 0 64 64"
          className={`w-full h-full relative z-10 ${animated ? 'animate-[spin_12s_linear_infinite]' : ''}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="plGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#43b8ff" stopOpacity="0.4" />
              <stop offset="70%" stopColor="#28a9f5" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#020914" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="plNorthA" x1="32" y1="6" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#7bd0ff" />
              <stop offset="100%" stopColor="#28a9f5" />
            </linearGradient>
            <linearGradient id="plNorthB" x1="32" y1="6" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2087cc" />
              <stop offset="100%" stopColor="#0e436c" />
            </linearGradient>
            <linearGradient id="plSouthA" x1="32" y1="58" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2087cc" />
              <stop offset="100%" stopColor="#0e436c" />
            </linearGradient>
            <linearGradient id="plSouthB" x1="32" y1="58" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#7bd0ff" />
              <stop offset="100%" stopColor="#28a9f5" />
            </linearGradient>
            <linearGradient id="plEastA" x1="58" y1="32" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#7bd0ff" />
              <stop offset="100%" stopColor="#28a9f5" />
            </linearGradient>
            <linearGradient id="plEastB" x1="58" y1="32" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2087cc" />
              <stop offset="100%" stopColor="#0e436c" />
            </linearGradient>
            <linearGradient id="plWestA" x1="6" y1="32" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2087cc" />
              <stop offset="100%" stopColor="#0e436c" />
            </linearGradient>
            <linearGradient id="plWestB" x1="6" y1="32" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#7bd0ff" />
              <stop offset="100%" stopColor="#28a9f5" />
            </linearGradient>
            <linearGradient id="plAuroraCore" x1="26" y1="26" x2="38" y2="38" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="40%" stopColor="#7bd0ff" />
              <stop offset="80%" stopColor="#31d49a" />
              <stop offset="100%" stopColor="#188f63" />
            </linearGradient>
          </defs>

          {/* Dark Base Roundel */}
          <rect width="64" height="64" rx="14" fill="#020914" />
          <rect width="64" height="64" rx="14" stroke="#163857" strokeWidth="1.5" />

          {/* Radial Center Glow */}
          <circle cx="32" cy="32" r="28" fill="url(#plGlow)" />

          {/* Tactical Radar Range Ring */}
          <circle cx="32" cy="32" r="21" stroke="#28a9f5" strokeOpacity="0.28" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="32" cy="32" r="14" stroke="#43b8ff" strokeOpacity="0.22" strokeWidth="0.75" />

          {/* Precision Cardinal Crosshairs */}
          <line x1="32" y1="4" x2="32" y2="10" stroke="#7bd0ff" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="32" y1="54" x2="32" y2="60" stroke="#7bd0ff" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="4" y1="32" x2="10" y2="32" stroke="#7bd0ff" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="54" y1="32" x2="60" y2="32" stroke="#7bd0ff" strokeWidth="1.5" strokeLinecap="round" />

          {/* 4 Secondary Intercardinal Star Rays */}
          <polygon points="32,32 37,27 48,16 39,25" fill="#1b5a88" opacity="0.9" />
          <polygon points="32,32 39,25 48,16 35,29" fill="#389fd6" opacity="0.9" />
          <polygon points="32,32 27,27 16,16 25,25" fill="#389fd6" opacity="0.9" />
          <polygon points="32,32 25,25 16,16 29,29" fill="#1b5a88" opacity="0.9" />
          <polygon points="32,32 37,37 48,48 39,39" fill="#389fd6" opacity="0.9" />
          <polygon points="32,32 39,39 48,48 35,35" fill="#1b5a88" opacity="0.9" />
          <polygon points="32,32 27,37 16,48 25,39" fill="#1b5a88" opacity="0.9" />
          <polygon points="32,32 25,39 16,48 29,35" fill="#389fd6" opacity="0.9" />

          {/* 4 Primary Cardinal Star Rays (Faceted 3D) */}
          <polygon points="32,7 32,32 26.5,32" fill="url(#plNorthA)" />
          <polygon points="32,7 37.5,32 32,32" fill="url(#plNorthB)" />
          <polygon points="32,57 32,32 26.5,32" fill="url(#plSouthA)" />
          <polygon points="32,57 37.5,32 32,32" fill="url(#plSouthB)" />
          <polygon points="57,32 32,26.5 32,32" fill="url(#plEastA)" />
          <polygon points="57,32 32,32 32,37.5" fill="url(#plEastB)" />
          <polygon points="7,32 32,26.5 32,32" fill="url(#plWestA)" />
          <polygon points="7,32 32,32 32,37.5" fill="url(#plWestB)" />

          {/* Central Faceted Diamond Core */}
          <polygon points="32,24 38,32 32,40 26,32" fill="url(#plAuroraCore)" stroke="#020914" strokeWidth="0.75" />
          <circle cx="32" cy="32" r="2" fill="#ffffff" />
        </svg>
      </div>

      {withText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-widest text-[#43B8FF] font-['Space_Grotesk'] text-base">
              POLARIS
            </span>
            <span className="text-[10px] font-mono text-cyan-400 border border-cyan-500/30 px-1.5 py-0.2 rounded bg-cyan-950/60 font-semibold">
              C2
            </span>
          </div>
          {subtitle && (
            <span className="text-[9px] text-[#6E8498] tracking-wider font-mono uppercase">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default PolarisLogo;
