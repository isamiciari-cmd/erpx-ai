// Design System Tokens
// Modern SaaS/Food Delivery Platform

export const designTokens = {
  // Breakpoints
  breakpoints: {
    mobile: '320px',
    mobileLarge: '480px',
    tablet: '768px',
    tabletLarge: '1024px',
    desktop: '1440px',
    desktopLarge: '1920px',
  },

  // Grid System
  grid: {
    mobile: {
      columns: 4,
      gutter: '16px',
      margin: '16px',
    },
    tablet: {
      columns: 8,
      gutter: '24px',
      margin: '24px',
    },
    desktop: {
      columns: 12,
      gutter: '32px',
      margin: '32px',
    },
  },

  // Spacing (8pt grid system)
  spacing: {
    '0': '0',
    '1': '8px',    // 8pt
    '2': '16px',   // 16pt
    '3': '24px',   // 24pt
    '4': '32px',   // 32pt
    '5': '40px',   // 40pt
    '6': '48px',   // 48pt
    '7': '56px',   // 56pt
    '8': '64px',   // 64pt
    '10': '80px',  // 80pt
    '12': '96px',  // 96pt
    '16': '128px', // 128pt
  },

  // Typography Scale
  typography: {
    // Desktop
    desktop: {
      h1: { size: '64px', lineHeight: '72px', weight: '700' },
      h2: { size: '48px', lineHeight: '56px', weight: '700' },
      h3: { size: '36px', lineHeight: '44px', weight: '600' },
      h4: { size: '28px', lineHeight: '36px', weight: '600' },
      h5: { size: '24px', lineHeight: '32px', weight: '600' },
      h6: { size: '20px', lineHeight: '28px', weight: '600' },
      body: { size: '16px', lineHeight: '24px', weight: '400' },
      small: { size: '14px', lineHeight: '20px', weight: '400' },
      tiny: { size: '12px', lineHeight: '16px', weight: '400' },
    },
    // Tablet
    tablet: {
      h1: { size: '48px', lineHeight: '56px', weight: '700' },
      h2: { size: '36px', lineHeight: '44px', weight: '700' },
      h3: { size: '28px', lineHeight: '36px', weight: '600' },
      h4: { size: '24px', lineHeight: '32px', weight: '600' },
      h5: { size: '20px', lineHeight: '28px', weight: '600' },
      h6: { size: '18px', lineHeight: '24px', weight: '600' },
      body: { size: '16px', lineHeight: '24px', weight: '400' },
      small: { size: '14px', lineHeight: '20px', weight: '400' },
      tiny: { size: '12px', lineHeight: '16px', weight: '400' },
    },
    // Mobile
    mobile: {
      h1: { size: '36px', lineHeight: '44px', weight: '700' },
      h2: { size: '28px', lineHeight: '36px', weight: '700' },
      h3: { size: '24px', lineHeight: '32px', weight: '600' },
      h4: { size: '20px', lineHeight: '28px', weight: '600' },
      h5: { size: '18px', lineHeight: '24px', weight: '600' },
      h6: { size: '16px', lineHeight: '22px', weight: '600' },
      body: { size: '16px', lineHeight: '24px', weight: '400' },
      small: { size: '14px', lineHeight: '20px', weight: '400' },
      tiny: { size: '12px', lineHeight: '16px', weight: '400' },
    },
  },

  // Colors - Food Delivery Theme (Black + Yellow)
  colors: {
    // Brand Colors
    brand: {
      primary: '#FFC107',      // Yellow
      primaryDark: '#FFA000',
      primaryLight: '#FFECB3',
      secondary: '#000000',    // Black
      secondaryDark: '#121212',
      secondaryLight: '#1E1E1E',
    },

    // Semantic Colors
    semantic: {
      success: '#10B981',
      successLight: '#D1FAE5',
      warning: '#F59E0B',
      warningLight: '#FEF3C7',
      error: '#EF4444',
      errorLight: '#FEE2E2',
      info: '#3B82F6',
      infoLight: '#DBEAFE',
    },

    // Neutral Colors (Dark Mode)
    neutralDark: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
      950: '#030712',
    },

    // Neutral Colors (Light Mode)
    neutralLight: {
      50: '#030712',
      100: '#111827',
      200: '#1F2937',
      300: '#374151',
      400: '#4B5563',
      500: '#6B7280',
      600: '#9CA3AF',
      700: '#D1D5DB',
      800: '#E5E7EB',
      900: '#F3F4F6',
      950: '#F9FAFB',
    },
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    glow: '0 0 20px rgba(255, 193, 7, 0.3)',
  },

  // Border Radius
  radius: {
    none: '0',
    sm: '4px',
    base: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '32px',
    full: '9999px',
  },

  // Z-Index
  zIndex: {
    base: 1,
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modalBackdrop: 1300,
    modal: 1400,
    popover: 1500,
    tooltip: 1600,
  },

  // Transitions
  transitions: {
    fast: '150ms',
    base: '200ms',
    slow: '300ms',
    slower: '500ms',
  },

  // Easing
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
};

export type DesignTokens = typeof designTokens;
