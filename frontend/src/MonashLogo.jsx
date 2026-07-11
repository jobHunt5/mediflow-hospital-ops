import React from 'react';

// Official Monash Health logomark (transparent PNG, cropped from the
// full colour lockup asset). Rendered on a small white chip so it stays
// legible in dark mode too, since the artwork itself is navy/blue only.
export function MonashMark({ size = 36, className = '' }) {
  return (
    <span className={`monash-mark-chip ${className}`} style={{ width: size, height: size }}>
      <img src="/monash-health-icon.png" alt="Monash Health" width={size} height={size} />
    </span>
  );
}

export default function MonashLogo({ size = 36, showText = true, subtitle = '' }) {
  return (
    <div className="brand-lockup">
      {showText ? (
        <span className="monash-lockup-chip" style={{ height: size + 16 }}>
          <img src="/monash-health-lockup.png" alt="Monash Health" style={{ height: size }} />
        </span>
      ) : (
        <MonashMark size={size} />
      )}
      {showText && subtitle && (
        <div className="brand-text">
          <span className="brand-sub">{subtitle}</span>
        </div>
      )}
    </div>
  );
}
