import { ReactNode } from 'react';

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
}

export function ResponsiveContainer({ children, className = '' }: ResponsiveContainerProps) {
  return (
    <div
      className={`
      w-full mx-auto
      px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16
      max-w-[375px] sm:max-w-[768px] lg:max-w-[1024px] xl:max-w-[1440px]
      ${className}
    `}
    >
      {children}
    </div>
  );
}

interface GridProps {
  children: ReactNode;
  cols?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  className?: string;
}

export function ResponsiveGrid({
  children,
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = { mobile: 4, tablet: 6, desktop: 8 },
  className = '',
}: GridProps) {
  return (
    <div
      className={`
      grid
      grid-cols-${cols.mobile || 1}
      sm:grid-cols-${cols.tablet || 2}
      lg:grid-cols-${cols.desktop || 3}
      gap-${gap.mobile || 4}
      sm:gap-${gap.tablet || 6}
      lg:gap-${gap.desktop || 8}
      ${className}
    `}
    >
      {children}
    </div>
  );
}

interface FlexProps {
  children: ReactNode;
  direction?: 'row' | 'col';
  responsive?: {
    mobile?: 'row' | 'col';
    tablet?: 'row' | 'col';
    desktop?: 'row' | 'col';
  };
  gap?: number;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  className?: string;
}

export function ResponsiveFlex({
  children,
  direction = 'row',
  responsive,
  gap = 4,
  align = 'start',
  justify = 'start',
  className = '',
}: FlexProps) {
  const responsiveDir = responsive
    ? `flex-${responsive.mobile || direction} sm:flex-${responsive.tablet || direction} lg:flex-${responsive.desktop || direction}`
    : `flex-${direction}`;

  return (
    <div
      className={`
      flex ${responsiveDir}
      gap-${gap}
      items-${align}
      justify-${justify}
      ${className}
    `}
    >
      {children}
    </div>
  );
}

interface StackProps {
  children: ReactNode;
  spacing?: number;
  className?: string;
}

export function Stack({ children, spacing = 4, className = '' }: StackProps) {
  return <div className={`flex flex-col gap-${spacing} ${className}`}>{children}</div>;
}

export function HStack({ children, spacing = 4, className = '' }: StackProps) {
  return <div className={`flex flex-row gap-${spacing} ${className}`}>{children}</div>;
}
