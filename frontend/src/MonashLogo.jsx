import React from 'react';

/**
 * Monash Health logo mark — a chamfered "tag" outline with a two-peak "M"
 * notch cut into the top and a small tooth notch at the bottom centre, no
 * background chip, the way the real mark is used. Defaults to brand navy;
 * pass `color` to run it in white/sky on a dark surface.
 */
export function MonashMark({ size = 36, className = '', color = '#25215D' }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <path
        fill={color}
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10,40 L24,10 L34,10 L50,30 L66,10 L76,10 L90,40 L90,78 L82,88 L18,88 L10,78 Z
           M25,46 L31,26 L38,26 L50,38 L62,26 L69,26 L75,46 L75,73 L69,80 L31,80 L25,73 Z
           M42,80 L58,80 L58,68 L42,68 Z"
      />
    </svg>
  );
}

export default function MonashLogo({ size = 36, showText = true, subtitle = '' }) {
  return (
    <div className="brand-lockup">
      <MonashMark size={size} />
      {showText && (
        <div className="brand-text">
          <span className="brand-name">Monash Health</span>
          {subtitle && <span className="brand-sub">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
