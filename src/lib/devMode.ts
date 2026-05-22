/**
 * Developer Mode Utilities
 *
 * Provides secure authentication bypass for development and testing.
 * Automatically disabled on production domain.
 */

const PRODUCTION_DOMAINS = [
  'erpx-ai.com',
  'www.erpx-ai.com',
  'app.erpx-ai.com'
];

/**
 * Check if the current environment allows dev authentication bypass
 */
export function isDevBypassEnabled(): boolean {
  // Check environment variable
  const devBypassEnv = import.meta.env.VITE_DEV_AUTH_BYPASS === 'true';

  if (!devBypassEnv) {
    return false;
  }

  // Security check: Disable on production domain
  const currentDomain = window.location.hostname;
  const isProductionDomain = PRODUCTION_DOMAINS.some(domain =>
    currentDomain.includes(domain)
  );

  if (isProductionDomain) {
    console.warn('🔒 Dev bypass disabled: Running on production domain');
    return false;
  }

  // Enable on localhost or staging
  const isLocalhost = currentDomain === 'localhost' || currentDomain === '127.0.0.1';
  const isStaging = currentDomain.includes('staging') || currentDomain.includes('dev');

  if (isLocalhost || isStaging) {
    console.log('🔓 Dev bypass enabled: Development environment detected');
    return true;
  }

  return false;
}

/**
 * Get the current environment type
 */
export function getEnvironmentType(): 'production' | 'staging' | 'development' {
  const currentDomain = window.location.hostname;

  if (PRODUCTION_DOMAINS.some(domain => currentDomain.includes(domain))) {
    return 'production';
  }

  if (currentDomain.includes('staging')) {
    return 'staging';
  }

  return 'development';
}

/**
 * Developer test account credentials
 */
export const DEV_ACCOUNT = {
  email: 'i.1122@erpx-ai.com',
  password: '@12345',
  role: 'developer'
};
