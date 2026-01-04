// Design System Colors - Harmonized with Logo

/**
 * Logo Colors (Amber & Cyan)
 * These are the core brand colors from the AstroMedia logo
 */
export const LOGO_COLORS = {
  amber: {
    light: '#FDE68A',
    base: '#FBBF24',
    dark: '#F59E0B',
  },
  cyan: {
    light: '#67E8F9',
    base: '#38BDF8',
    dark: '#0EA5E9',
  },
} as const;

/**
 * Primary Brand Colors
 * Warm harmonization derived from logo amber
 */
export const BRAND_COLORS = {
  primary: {
    50: '#FFF7ED',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F97316',  // Orange-500
    600: '#EA580C',
    700: '#C2410C',
    800: '#9A3412',
    900: '#7C2D12',
  },
  secondary: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',  // Amber-400 (logo)
    500: '#F59E0B',  // Amber-500 (logo)
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },
  accent: {
    50: '#ECFEFF',
    100: '#CFFAFE',
    200: '#A5F3FC',
    300: '#67E8F9',
    400: '#38BDF8',  // Cyan-400 (logo)
    500: '#0EA5E9',
    600: '#0284C7',
    700: '#0369A1',
    800: '#075985',
    900: '#0C4A6E',
  },
} as const;

/**
 * Dark Theme Background Colors
 * Deep purples that complement warm brand colors
 */
export const DARK_THEME = {
  background: {
    primary: '#10051a',    // Deep purple-black
    secondary: '#1a0b2e',  // Dark purple
    tertiary: '#2d1b4e',   // Medium purple
    hover: '#3d2b5e',      // Lighter purple
  },
  surface: {
    elevated: 'rgba(45, 27, 78, 0.6)',  // Semi-transparent purple
    glass: 'rgba(255, 255, 255, 0.05)', // Glassmorphism
    border: 'rgba(251, 191, 36, 0.2)',  // Amber border
  },
} as const;

/**
 * Text Colors
 * High contrast for accessibility (WCAG AAA)
 */
export const TEXT_COLORS = {
  primary: '#FFFFFF',
  secondary: '#E5E7EB',  // Gray-200
  tertiary: '#D1D5DB',   // Gray-300
  muted: '#9CA3AF',      // Gray-400
  disabled: '#6B7280',   // Gray-500
  inverse: '#111827',    // Gray-900
} as const;

/**
 * Semantic Colors
 * Status and feedback colors
 */
export const SEMANTIC_COLORS = {
  success: {
    light: '#86EFAC',
    base: '#22C55E',
    dark: '#16A34A',
  },
  warning: {
    light: '#FDE68A',
    base: '#FBBF24',
    dark: '#F59E0B',
  },
  error: {
    light: '#FCA5A5',
    base: '#EF4444',
    dark: '#DC2626',
  },
  info: {
    light: '#A5F3FC',
    base: '#38BDF8',
    dark: '#0EA5E9',
  },
} as const;

/**
 * Gradient Definitions
 * Pre-defined gradients for consistency
 */
export const GRADIENTS = {
  primary: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
  secondary: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
  accent: 'linear-gradient(135deg, #38BDF8 0%, #0EA5E9 100%)',
  hero: 'linear-gradient(180deg, #10051a 0%, #1a0b2e 50%, #10051a 100%)',
  card: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(56, 189, 248, 0.1) 100%)',
  button: 'linear-gradient(135deg, #F97316 0%, #FBBF24 50%, #F59E0B 100%)',
  glow: 'radial-gradient(circle, rgba(251, 191, 36, 0.3) 0%, transparent 70%)',
} as const;

/**
 * Shadow Definitions
 * Consistent shadows with brand colors
 */
export const SHADOWS = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  glow: {
    amber: '0 0 20px rgba(251, 191, 36, 0.5)',
    cyan: '0 0 20px rgba(56, 189, 248, 0.5)',
    orange: '0 0 20px rgba(249, 115, 22, 0.5)',
  },
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
} as const;

/**
 * Border Radius
 * Consistent border radius values
 */
export const BORDER_RADIUS = {
  none: '0',
  sm: '0.125rem',   // 2px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  '3xl': '1.5rem',  // 24px
  full: '9999px',
} as const;

/**
 * Spacing
 * Consistent spacing scale (4px base)
 */
export const SPACING = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
  32: '8rem',     // 128px
  40: '10rem',    // 160px
  48: '12rem',    // 192px
  56: '14rem',    // 224px
  64: '16rem',    // 256px
} as const;

/**
 * Z-Index Scale
 * Layering hierarchy
 */
export const Z_INDEX = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const;

/**
 * Opacity Scale
 * Consistent opacity values
 */
export const OPACITY = {
  0: '0',
  5: '0.05',
  10: '0.1',
  20: '0.2',
  25: '0.25',
  30: '0.3',
  40: '0.4',
  50: '0.5',
  60: '0.6',
  70: '0.7',
  75: '0.75',
  80: '0.8',
  90: '0.9',
  95: '0.95',
  100: '1',
} as const;

/**
 * Animation Durations
 * Consistent timing for animations
 */
export const ANIMATION = {
  duration: {
    fast: '150ms',
    base: '300ms',
    slow: '500ms',
  },
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

/**
 * Typography
 * Font sizes and weights
 */
export const TYPOGRAPHY = {
  fontSize: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem',     // 48px
    '6xl': '3.75rem',  // 60px
    '7xl': '4.5rem',   // 72px
    '8xl': '6rem',     // 96px
  },
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },
} as const;

/**
 * Helper function to get CSS custom properties
 */
export const getCSSVariables = () => {
  return {
    '--color-primary': BRAND_COLORS.primary[500],
    '--color-secondary': BRAND_COLORS.secondary[500],
    '--color-accent': BRAND_COLORS.accent[400],
    '--color-bg-primary': DARK_THEME.background.primary,
    '--color-bg-secondary': DARK_THEME.background.secondary,
    '--color-text-primary': TEXT_COLORS.primary,
    '--color-text-secondary': TEXT_COLORS.secondary,
  };
};
