import React, { useState } from 'react';

interface LicensePanelProps {
  productSlug: string;
  storefrontUrl?: string;
  currentLicense?: {
    plan: string;
    email: string;
    expires?: number | null;
    updatesUntil?: number;
  } | null;
  onActivateKey: (key: string) => Promise<{ success: boolean; error?: string }>;
}

export const LicensePanel: React.FC<LicensePanelProps> = ({
  productSlug,
  storefrontUrl = 'https://storefront.local',
  currentLicense,
  onActivateKey,
}) => {
  const [inputKey, setInputKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) return;

    setLoading(true);
    setMessage(null);

    const res = await onActivateKey(inputKey.trim());
    setLoading(false);

    if (res.success) {
      setMessage({ text: 'License activated successfully! Pro unlocked.', type: 'success' });
      setInputKey('');
    } else {
      setMessage({ text: res.error || 'Invalid license key', type: 'error' });
    }
  };

  const isPro = !!currentLicense;

  return (
    <div className="p-6 rounded-2xl bg-[#0d0f17] border border-zinc-800 text-zinc-100 max-w-lg space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white">License & Pro Status</h3>
          <p className="text-xs text-zinc-400">Offline cryptographic activation</p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${
            isPro
              ? 'bg-emerald-950 border border-emerald-700 text-emerald-300'
              : 'bg-zinc-800 text-zinc-400'
          }`}
        >
          {isPro ? `${currentLicense.plan.toUpperCase()} ACTIVE` : 'COMMUNITY FREE'}
        </span>
      </div>

      {isPro ? (
        <div className="space-y-3 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs">
          <div className="flex justify-between">
            <span className="text-zinc-400">Licensed to:</span>
            <span className="font-mono text-white">{currentLicense.email}</span>
          </div>
          {currentLicense.updatesUntil && (
            <div className="flex justify-between">
              <span className="text-zinc-400">Updates valid until:</span>
              <span className="text-white">
                {new Date(currentLicense.updatesUntil * 1000).toLocaleDateString()}
              </span>
            </div>
          )}
          {currentLicense.expires && (
            <div className="flex justify-between">
              <span className="text-zinc-400">Subscription renewal:</span>
              <span className="text-white">
                {new Date(currentLicense.expires * 1000).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-zinc-300">
            Activate your license key to unlock Pro capabilities, 4K exports, and remove limits.
          </p>

          <form onSubmit={handleActivate} className="space-y-3">
            <textarea
              rows={3}
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="Paste your base64 license key here..."
              className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-700 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
            />

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={loading || !inputKey.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs disabled:opacity-50 transition-colors"
              >
                {loading ? 'Verifying...' : 'Activate License'}
              </button>

              <a
                href={`${storefrontUrl}/p/${productSlug}?ref=app`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
              >
                Buy Pro License &rarr;
              </a>
            </div>
          </form>

          {message && (
            <div
              className={`p-3 rounded-xl text-xs ${
                message.type === 'success'
                  ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                  : 'bg-red-950/60 border border-red-800 text-red-300'
              }`}
            >
              {message.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
