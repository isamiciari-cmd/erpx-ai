/** Development authentication is available only in an explicit local dev build. */
export function isLocalDevelopmentHost(hostname: string): boolean {
  return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname.toLowerCase());
}

export function allowsLocalDemo(devBuild: boolean, enabled: unknown, hostname: string): boolean {
  return devBuild && enabled === 'true' && isLocalDevelopmentHost(hostname);
}

export function isDevBypassEnabled(): boolean {
  return allowsLocalDemo(
    import.meta.env.DEV,
    import.meta.env.VITE_DEMO_MODE,
    typeof window === 'undefined' ? '' : window.location.hostname,
  );
}

export function getEnvironmentType(): 'production' | 'staging' | 'development' {
  if (import.meta.env.DEV && typeof window !== 'undefined' && isLocalDevelopmentHost(window.location.hostname)) {
    return 'development';
  }
  return 'production';
}
