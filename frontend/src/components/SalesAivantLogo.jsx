import React from 'react';

/**
 * Sales Aivant Logo Components
 * High-quality vector SVGs crafted to match the custom branding.
 */

// 1. Icon-Only Logo (Scalable)
export const SalesAivantIcon = ({ size = 40, style = {} }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', flexShrink: 0, ...style }}
    >
      <defs>
        {/* Vibrant Blue Gradient */}
        <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00d2ff" />
          <stop offset="100%" stopColor="#0055ff" />
        </linearGradient>
      </defs>

      {/* --- GEAR (RIGHT BACKGROUND) --- */}
      {/* 
        A clean gear wheel segment backing the brain on the right side.
        Drawn in a nice metallic/slate grey so it's visible on dark backgrounds.
      */}
      <path
        d="M 100 22 
           A 78 78 0 0 1 155 45 L 165 37 A 92 92 0 0 0 98 10 L 100 22 Z
           M 155 45
           A 78 78 0 0 1 175 100 L 188 100 A 92 92 0 0 0 165 37 L 155 45 Z
           M 175 100
           A 78 78 0 0 1 155 155 L 165 163 A 92 92 0 0 0 188 100 L 175 100 Z
           M 155 155
           A 78 78 0 0 1 100 178 L 98 190 A 92 92 0 0 0 165 163 L 155 155 Z"
        fill="#1e293b"
      />
      {/* Gear teeth blocks (inner-to-outer connector feel) */}
      <rect x="100" y="10" width="12" height="15" rx="2" transform="rotate(-75 100 100)" fill="#1e293b" />
      <rect x="100" y="10" width="12" height="15" rx="2" transform="rotate(-45 100 100)" fill="#1e293b" />
      <rect x="100" y="10" width="12" height="15" rx="2" transform="rotate(-15 100 100)" fill="#1e293b" />
      <rect x="100" y="10" width="12" height="15" rx="2" transform="rotate(15 100 100)" fill="#1e293b" />
      <rect x="100" y="10" width="12" height="15" rx="2" transform="rotate(45 100 100)" fill="#1e293b" />
      <rect x="100" y="10" width="12" height="15" rx="2" transform="rotate(75 100 100)" fill="#1e293b" />

      {/* --- SPEECH BUBBLE (LEFT HALF) --- */}
      {/* Outer rounded border path with pointer at bottom-left */}
      <path
        d="M 94 36
           C 54 36 34 68 34 100
           C 34 118 41 135 41 140
           L 32 170
           L 62 155
           C 72 163 82 164 94 164"
        stroke="url(#blueGradient)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* 3 message dots inside speech bubble */}
      <circle cx="50" cy="100" r="5" fill="url(#blueGradient)" />
      <circle cx="68" cy="100" r="5" fill="url(#blueGradient)" />
      <circle cx="86" cy="100" r="5" fill="url(#blueGradient)" />

      {/* --- BRAIN (RIGHT HALF) --- */}
      {/* Outer wavy lobes of the brain */}
      <path
        d="M 106 36
           C 128 36 138 48 138 62
           C 156 62 164 74 156 92
           C 166 92 162 114 152 124
           C 148 132 138 164 106 164"
        stroke="url(#blueGradient)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Vertical center stem divider line */}
      <path
        d="M 100 28 L 100 172"
        stroke="#1e293b"
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Circuit lines / neural pathways inside the brain */}
      {/* Top pathway */}
      <path
        d="M 106 65 H 122 V 54 H 132"
        stroke="url(#blueGradient)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="132" cy="54" r="4.5" fill="url(#blueGradient)" />

      {/* Middle pathway */}
      <path
        d="M 106 100 H 138"
        stroke="url(#blueGradient)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="138" cy="100" r="4.5" fill="url(#blueGradient)" />
      
      {/* Middle sub-pathway */}
      <path
        d="M 118 100 V 114 H 132"
        stroke="url(#blueGradient)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="132" cy="114" r="4.5" fill="url(#blueGradient)" />

      {/* Bottom pathway */}
      <path
        d="M 106 135 H 120 V 145 H 130"
        stroke="url(#blueGradient)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="130" cy="145" r="4.5" fill="url(#blueGradient)" />
    </svg>
  );
};

// 2. Full Horizontal Brand Logo (Icon + Text)
export const SalesAivantFullLogo = ({ height = 40, showSubtext = true, style = {} }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        ...style,
      }}
    >
      <SalesAivantIcon size={height} />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span
            style={{
              color: '#ffffff',
              fontFamily: '"Outfit", "Inter", sans-serif',
              fontWeight: 800,
              fontSize: `${height * 0.42}px`,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              lineHeight: '1.1',
            }}
          >
            SALES
          </span>
          <span
            style={{
              background: 'linear-gradient(135deg, #00d2ff 0%, #0055ff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontFamily: '"Outfit", "Inter", sans-serif',
              fontWeight: 800,
              fontSize: `${height * 0.42}px`,
              letterSpacing: '1.2px',
              textTransform: 'uppercase',
              lineHeight: '1.1',
            }}
          >
            AIVANT
          </span>
        </div>
        {showSubtext && (
          <span
            style={{
              color: '#8892b0',
              fontFamily: '"Inter", sans-serif',
              fontWeight: 600,
              fontSize: `${height * 0.22}px`,
              letterSpacing: '2.5px',
              textTransform: 'uppercase',
              marginTop: '1px',
              lineHeight: '1',
            }}
          >
            SALES ASSISTANT
          </span>
        )}
      </div>
    </div>
  );
};

// 3. Stacked Hero Version (Perfect for Login / Landing Screen)
export const SalesAivantHeroLogo = ({ size = 120, style = {} }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '16px',
        ...style,
      }}
    >
      <SalesAivantIcon size={size} />
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h1
          style={{
            margin: 0,
            fontSize: '32px',
            fontWeight: 800,
            letterSpacing: '1px',
            lineHeight: '1',
            fontFamily: '"Outfit", "Inter", sans-serif',
          }}
        >
          <span style={{ color: '#fff' }}>SALES</span>{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #00d2ff 0%, #0055ff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            AIVANT
          </span>
        </h1>
        
        <p
          style={{
            margin: 0,
            color: '#8892b0',
            fontSize: '12px',
            fontWeight: 600,
            letterSpacing: '4px',
            textTransform: 'uppercase',
          }}
        >
          SALES ASSISTANT
        </p>

        {/* Divider line matching logo subtext horizontal lines */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '4px 0' }}>
          <div style={{ width: '24px', height: '1px', background: 'linear-gradient(to right, transparent, #00d2ff)' }} />
          <span style={{ fontSize: '9px', fontWeight: 700, color: '#00d2ff', letterSpacing: '2px', textTransform: 'uppercase' }}>
            AUTOMATE • ENGAGE • GROW
          </span>
          <div style={{ width: '24px', height: '1px', background: 'linear-gradient(to left, transparent, #00d2ff)' }} />
        </div>
      </div>
    </div>
  );
};
