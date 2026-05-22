import { AlertTriangle } from 'lucide-react';
import { isDevBypassEnabled, getEnvironmentType } from '../../lib/devMode';

export default function DevModeIndicator() {
  const devBypassActive = isDevBypassEnabled();
  const environment = getEnvironmentType();

  if (!devBypassActive) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 animate-pulse">
      <div className="bg-yellow-500/90 backdrop-blur-sm text-black px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 border-2 border-yellow-400">
        <AlertTriangle className="w-5 h-5" />
        <div>
          <p className="font-bold text-sm">Developer Mode Active</p>
          <p className="text-xs opacity-80">
            Auth Bypass Enabled · {environment.charAt(0).toUpperCase() + environment.slice(1)} Environment
          </p>
        </div>
      </div>
    </div>
  );
}
