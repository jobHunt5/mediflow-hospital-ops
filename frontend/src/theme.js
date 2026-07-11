// ══════════════════════════════════════════════════════════════════════
// MediFlow design system — single source of truth for colour.
// White is the primary surface everywhere; every other colour here is
// used consistently across every screen (Worker / Admin / Floor Map).
// Values are colour-blind-checked (CVD-safe hue spacing) and every place
// that encodes meaning by colour also carries a text label or icon.
// ══════════════════════════════════════════════════════════════════════

// Brand (Monash Health — "Care, reimagined" identity: deep indigo navy,
// primary blue and a light sky-blue accent, sourced from monashhealth.org)
export const BRAND_BLUE = '#005CA9';
export const BRAND_NAVY = '#25215D';
export const BRAND_SKY = '#6DCFF6';

// Ink (text) — one shade per role, used everywhere
export const INK = {
  primary: '#0d1b28',
  secondary: '#516373',
  muted: '#6b7a88',
  inverse: '#ffffff',
};

// Status — fixed meaning, never reused for identity/category coding.
// Each has a saturated "mark" (dots, bars, buttons) and a darker "ink"
// variant for small text so it stays readable on white.
export const STATUS = {
  good:   { mark: '#1e9e57', ink: '#12855a', soft: '#e7f6ee', border: '#bfe6cf' },
  warn:   { mark: '#d98a00', ink: '#b7791f', soft: '#fdf1dd', border: '#f3e0b8' },
  bad:    { mark: '#d64545', ink: '#c23b3b', soft: '#fdeaea', border: '#f2c4c4' },
};

// Categorical identity — fixed order, used for lift zones / round groups.
// Distinct in both hue AND lightness so they don't collapse for
// deuteranopia/protanopia/tritanopia; every use is paired with a text label.
export const LIFT_BADGE = {
  blue:   BRAND_BLUE,   // Blue Lift Area
  orange: '#ec7a1c',    // Orange Lift Area
  yellow: '#e0a500',    // Yellow Lift Area
  green:  '#3aa655',    // Green Lift Area
  grey:   '#7d8a97',    // Grey Lift Area (neutral / general)
  purple: '#8b5cf6',    // 2nd Round
};

// Priority ladder — reuses status roles so severity reads consistently
// with the rest of the app (grey → blue → amber → red).
export const PRIORITY_COLOR = {
  low: LIFT_BADGE.grey,
  normal: BRAND_BLUE,
  high: STATUS.warn.mark,
  urgent: STATUS.bad.mark,
};

// Sequential ramp (hours-worked heatmap) — one hue, light → dark.
export const HOURS_RAMP = ['#f1f5f9', '#cde2fb', '#89bde3', '#3987e5', BRAND_BLUE];
export const hoursCellColor = (h) => {
  if (h <= 0) return HOURS_RAMP[0];
  if (h < 4) return HOURS_RAMP[1];
  if (h < 7) return HOURS_RAMP[2];
  if (h < 9) return HOURS_RAMP[3];
  return HOURS_RAMP[4];
};
export const hoursCellText = (h) => (h >= 7 ? INK.inverse : h > 0 ? BRAND_NAVY : INK.muted);
