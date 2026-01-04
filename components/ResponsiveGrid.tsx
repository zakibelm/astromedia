import React, { memo } from 'react';
import { GRID_COLUMNS, RESPONSIVE_SPACING, Breakpoint } from '../constants/breakpoints';

interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: Partial<Record<Breakpoint, number>>;
  gap?: Partial<Record<Breakpoint, string>>;
  className?: string;
  minChildWidth?: string;
  autoFit?: boolean;
}

/**
 * ResponsiveGrid - A flexible grid component that adapts to different breakpoints
 *
 * @example
 * // Basic usage with default columns (4 on xs, 6 on sm, 8 on md, 12 on lg+)
 * <ResponsiveGrid>
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 * </ResponsiveGrid>
 *
 * @example
 * // Custom columns per breakpoint
 * <ResponsiveGrid columns={{ xs: 1, sm: 2, md: 3, lg: 4 }}>
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 * </ResponsiveGrid>
 *
 * @example
 * // Auto-fit grid with minimum child width
 * <ResponsiveGrid autoFit minChildWidth="250px" gap={{ xs: '1rem', md: '2rem' }}>
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 * </ResponsiveGrid>
 */
const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  columns,
  gap,
  className = '',
  minChildWidth = '200px',
  autoFit = false,
}) => {
  // Use custom columns or fall back to default grid columns
  const gridColumns = columns || {
    xs: GRID_COLUMNS.xs,
    sm: GRID_COLUMNS.sm,
    md: GRID_COLUMNS.md,
    lg: GRID_COLUMNS.lg,
    xl: GRID_COLUMNS.xl,
    '2xl': GRID_COLUMNS['2xl'],
  };

  // Use custom gap or fall back to responsive spacing
  const gridGap = gap || {
    xs: RESPONSIVE_SPACING.xs.element,
    sm: RESPONSIVE_SPACING.sm.element,
    md: RESPONSIVE_SPACING.md.element,
    lg: RESPONSIVE_SPACING.lg.element,
    xl: RESPONSIVE_SPACING.xl.element,
    '2xl': RESPONSIVE_SPACING['2xl'].element,
  };

  if (autoFit) {
    // Auto-fit grid using CSS Grid's auto-fit feature
    return (
      <div
        className={`grid ${className}`}
        style={{
          gridTemplateColumns: `repeat(auto-fit, minmax(${minChildWidth}, 1fr))`,
          gap: gridGap.xs,
        }}
      >
        {children}
      </div>
    );
  }

  // Generate Tailwind classes for responsive columns
  const getGridColsClass = (): string => {
    const classes: string[] = [];

    if (gridColumns.xs) classes.push(`grid-cols-${gridColumns.xs}`);
    if (gridColumns.sm) classes.push(`sm:grid-cols-${gridColumns.sm}`);
    if (gridColumns.md) classes.push(`md:grid-cols-${gridColumns.md}`);
    if (gridColumns.lg) classes.push(`lg:grid-cols-${gridColumns.lg}`);
    if (gridColumns.xl) classes.push(`xl:grid-cols-${gridColumns.xl}`);
    if (gridColumns['2xl']) classes.push(`2xl:grid-cols-${gridColumns['2xl']}`);

    return classes.join(' ');
  };

  // Generate Tailwind classes for responsive gap
  const getGapClass = (): string => {
    // Convert gap values to Tailwind spacing scale
    const gapToClass = (gapValue?: string): string => {
      if (!gapValue) return '';

      // Map common spacing values to Tailwind classes
      const gapMap: Record<string, string> = {
        '0.75rem': '3',
        '1rem': '4',
        '1.25rem': '5',
        '1.5rem': '6',
        '2rem': '8',
        '2.5rem': '10',
        '3rem': '12',
      };

      return gapMap[gapValue] || '4';
    };

    const classes: string[] = [];

    if (gridGap.xs) classes.push(`gap-${gapToClass(gridGap.xs)}`);
    if (gridGap.sm) classes.push(`sm:gap-${gapToClass(gridGap.sm)}`);
    if (gridGap.md) classes.push(`md:gap-${gapToClass(gridGap.md)}`);
    if (gridGap.lg) classes.push(`lg:gap-${gapToClass(gridGap.lg)}`);
    if (gridGap.xl) classes.push(`xl:gap-${gapToClass(gridGap.xl)}`);
    if (gridGap['2xl']) classes.push(`2xl:gap-${gapToClass(gridGap['2xl'])}`);

    return classes.join(' ');
  };

  return (
    <div className={`grid ${getGridColsClass()} ${getGapClass()} ${className}`}>
      {children}
    </div>
  );
};

export default memo(ResponsiveGrid);
