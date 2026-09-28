export const erpxV2Tokens = {
  brand: { primary: '#EAB308', primaryStrong: '#CA8A04' },
  motion: { fast: 0.14, base: 0.18, slow: 0.24 },
  radius: { sm: 10, md: 13, lg: 16, xl: 20 },
  breakpoints: { mobile: 640, tablet: 1024, desktop: 1280, wide: 1536 },
} as const;

export type ERPXV2Tokens = typeof erpxV2Tokens;
