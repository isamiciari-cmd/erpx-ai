import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function OAuthConsentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const clientId = params.get('client_id') ?? 'erpx-ai-preview';
  const redirectUri = params.get('redirect_uri') ?? 'http://localhost:3000/oauth/consent';
  const responseType = params.get('response_type') ?? 'code';
  const scope = params.get('scope') ?? 'openid profile email';
  const state = params.get('state');
  const nonce = params.get('nonce');

  const handleApprove = () => {
    setIsProcessing(true);

    try {
      const target = new URL(redirectUri);
      target.searchParams.set('code', 'erpx-preview-code');
      if (state) target.searchParams.set('state', state);
      if (nonce) target.searchParams.set('nonce', nonce);
      window.location.assign(target.toString());
    } catch {
      navigate('/dashboard', { replace: true });
    }
  };

  const handleDeny = () => {
    setIsProcessing(true);

    try {
      const target = new URL(redirectUri);
      target.searchParams.set('error', 'access_denied');
      if (state) target.searchParams.set('state', state);
      window.location.assign(target.toString());
    } catch {
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/50">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-400">OAuth Consent</p>
          <h1 className="mt-3 text-3xl font-bold">Authorize ERPX-AI</h1>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-4 text-sm text-slate-200">
          <p><span className="text-slate-400">Client:</span> {clientId}</p>
          <p><span className="text-slate-400">Redirect:</span> {redirectUri}</p>
          <p><span className="text-slate-400">Response type:</span> {responseType}</p>
          <p><span className="text-slate-400">Scope:</span> {scope}</p>
        </div>

        <p className="mt-6 text-slate-300">
          This application is requesting permission to access your profile and sign-in information.
          Review the request below, then approve or deny access.
        </p>

        <div className="mt-6 grid gap-3 text-sm text-slate-200">
          <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/70 px-4 py-3">
            <span>OpenID Connect</span>
            <span className="text-emerald-400">Allowed</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/70 px-4 py-3">
            <span>Profile</span>
            <span className="text-emerald-400">Allowed</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/70 px-4 py-3">
            <span>Email</span>
            <span className="text-emerald-400">Allowed</span>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleApprove}
            disabled={isProcessing}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isProcessing ? 'Processing...' : 'Allow access'}
          </button>
          <button
            type="button"
            onClick={handleDeny}
            disabled={isProcessing}
            className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 font-semibold text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Deny
          </button>
        </div>
      </div>
    </div>
  );
}
