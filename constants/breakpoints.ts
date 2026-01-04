// Responsive Design Breakpoints and Utilities

/**
 * Breakpoint Values (Mobile-First)
 * Following Tailwind CSS convention
 */
export const BREAKPOINTS = {
  xs: 0,
  sm: 640,   // Small devices (landscape phones)
  md: 768,   // Medium devices (tablets)
  lg: 1024,  // Large devices (desktops)
  xl: 1280,  // Extra large devices (large desktops)
  '2xl': 1536, // 2X Extra large devices
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * Media Query Strings
 */
export const MEDIA_QUERIES = {
  xs: `(min-width: ${BREAKPOINTS.xs}px)`,
  sm: `(min-width: ${BREAKPOINTS.sm}px)`,
  md: `(min-width: ${BREAKPOINTS.md}px)`,
  lg: `(min-width: ${BREAKPOINTS.lg}px)`,
  xl: `(min-width: ${BREAKPOINTS.xl}px)`,
  '2xl': `(min-width: ${BREAKPOINTS['2xl']}px)`,

  // Max-width queries (for mobile-first overrides)
  maxSm: `(max-width: ${BREAKPOINTS.sm - 1}px)`,
  maxMd: `(max-width: ${BREAKPOINTS.md - 1}px)`,
  maxLg: `(max-width: ${BREAKPOINTS.lg - 1}px)`,
  maxXl: `(max-width: ${BREAKPOINTS.xl - 1}px)`,

  // Range queries
  smToMd: `(min-width: ${BREAKPOINTS.sm}px) and (max-width: ${BREAKPOINTS.md - 1}px)`,
  mdToLg: `(min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`,
  lgToXl: `(min-width: ${BREAKPOINTS.lg}px) and (max-width: ${BREAKPOINTS.xl - 1}px)`,

  // Device-specific
  mobile: `(max-width: ${BREAKPOINTS.md - 1}px)`,
  tablet: `(min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`,
  desktop: `(min-width: ${BREAKPOINTS.lg}px)`,

  // Orientation
  portrait: '(orientation: portrait)',
  landscape: '(orientation: landscape)',

  // Touch devices
  touch: '(hover: none) and (pointer: coarse)',
  mouse: '(hover: hover) and (pointer: fine)',
} as const;

/**
 * Container Max Widths
 */
export const CONTAINER_MAX_WIDTH = {
  xs: '100%',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

/**
 * Grid Columns per Breakpoint
 */
export const GRID_COLUMNS = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 12,
  '2xl': 12,
} as const;

/**
 * Spacing Scale per Breakpoint
 * Used for responsive margins, padding, gaps
 */
export const RESPONSIVE_SPACING = {
  xs: {
    container: '1rem',    // 16px
    section: '2rem',      // 32px
    element: '0.75rem',   // 12px
  },
  sm: {
    container: '1.5rem',  // 24px
    section: '3rem',      // 48px
    element: '1rem',      // 16px
  },
  md: {
    container: '2rem',    // 32px
    section: '4rem',      // 64px
    element: '1.25rem',   // 20px
  },
  lg: {
    container: '2.5rem',  // 40px
    section: '5rem',      // 80px
    element: '1.5rem',    // 24px
  },
  xl: {
    container: '3rem',    // 48px
    section: '6rem',      // 96px
    element: '2rem',      // 32px
  },
  '2xl': {
    container: '4rem',    // 64px
    section: '8rem',      // 128px
    element: '2.5rem',    // 40px
  },
} as const;

/**
 * Typography Scale per Breakpoint
 */
export const RESPONSIVE_TYPOGRAPHY = {
  h1: {
    xs: '2rem',      // 32px
    sm: '2.5rem',    // 40px
    md: '3rem',      // 48px
    lg: '3.75rem',   // 60px
    xl: '4.5rem',    // 72px
  },
  h2: {
    xs: '1.5rem',    // 24px
    sm: '1.875rem',  // 30px
    md: '2.25rem',   // 36px
    lg: '3rem',      // 48px
    xl: '3.75rem',   // 60px
  },
  h3: {
    xs: '1.25rem',   // 20px
    sm: '1.5rem',    // 24px
    md: '1.875rem',  // 30px
    lg: '2.25rem',   // 36px
    xl: '3rem',      // 48px
  },
  h4: {
    xs: '1.125rem',  // 18px
    sm: '1.25rem',   // 20px
    md: '1.5rem',    // 24px
    lg: '1.875rem',  // 30px
    xl: '2.25rem',   // 36px
  },
  body: {
    xs: '0.875rem',  // 14px
    sm: '1rem',      // 16px
    md: '1rem',      // 16px
    lg: '1.125rem',  // 18px
    xl: '1.125rem',  // 18px
  },
} as const;

/**
 * Helper: Check if window width matches breakpoint
 */
export const isBreakpoint = (breakpoint: Breakpoint): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= BREAKPOINTS[breakpoint];
};

/**
 * Helper: Get current breakpoint
 */
export const getCurrentBreakpoint = (): Breakpoint => {
  if (typeof window === 'undefined') return 'xs';

  const width = window.innerWidth;

  if (width >= BREAKPOINTS['2xl']) return '2xl';
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
};

/**
 * Helper: Check if device is mobile
 */
export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < BREAKPOINTS.md;
};

/**
 * Helper: Check if device is tablet
 */
export const isTablet = (): boolean => {
  if (typeof window === 'undefined') return false;
  const width = window.innerWidth;
  return width >= BREAKPOINTS.md && width < BREAKPOINTS.lg;
};

/**
 * Helper: Check if device is desktop
 */
export const isDesktop = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= BREAKPOINTS.lg;
};

/**
 * Helper: Check if device supports touch
 */
export const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

/**
 * Helper: Get responsive value based on current breakpoint
 */
export const getResponsiveValue = <T>(values: Partial<Record<Breakpoint, T>>): T | undefined => {
  const currentBreakpoint = getCurrentBreakpoint();

  // Try current breakpoint first
  if (values[currentBreakpoint]) {
    return values[currentBreakpoint];
  }

  // Fall back to smaller breakpoints
  const breakpointOrder: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
  const currentIndex = breakpointOrder.indexOf(currentBreakpoint);

  for (let i = currentIndex + 1; i < breakpointOrder.length; i++) {
    const breakpoint = breakpointOrder[i];
    if (values[breakpoint]) {
      return values[breakpoint];
    }
  }

  return undefined;
};

/**
 * CSS Helper: Generate responsive class name
 */
export const responsiveClass = (
  baseClass: string,
  breakpoint?: Breakpoint
): string => {
  if (!breakpoint || breakpoint === 'xs') return baseClass;
  return `${breakpoint}:${baseClass}`;
};

/**
 * CSS Helper: Generate media query
 */
export const mediaQuery = (breakpoint: Breakpoint, css: string): string => {
  if (breakpoint === 'xs') return css;
  return `@media ${MEDIA_QUERIES[breakpoint]} { ${css} }`;
};
