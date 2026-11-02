import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api-fetch';
import { REOPEN_EVENT, setConsent, useConsent } from '../lib/consent';
import { Button } from './ui/button';

export const CookieConsent: React.FC = () => {
  const consent = useConsent();
  const [reopened, setReopened] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const open = () => setReopened(true);
    window.addEventListener(REOPEN_EVENT, open);
    return () => window.removeEventListener(REOPEN_EVENT, open);
  }, []);

  if (consent && !reopened) return null;

  const choose = (value: 'analytics' | 'necessary') => {
    setConsent(value);
    setReopened(false);
    // Tells the server so a signed-in user's stored consent and country update now, not at the next session load.
    apiFetch('/api/consent', { method: 'POST' })
      .then(() => queryClient.invalidateQueries({ queryKey: ['me'] }))
      .catch(() => {});
  };

  return (
    <div role="dialog" aria-label="Cookie consent" className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--color-border-strong)] bg-[var(--color-surface-1)] px-4 py-4 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm leading-relaxed text-[var(--color-muted)]">
          We use a cookie to remember this choice. With your OK we also count page views and note the country you visit from (no IP address is stored)
          to understand who uses the store. Payments and sign-in work either way. See the{' '}
          <Link to="/privacy" className="underline">privacy policy</Link>.
        </p>
        <div className="flex shrink-0 gap-3">
          <Button variant="outline" onClick={() => choose('necessary')}>Necessary only</Button>
          <Button onClick={() => choose('analytics')}>Accept analytics</Button>
        </div>
      </div>
    </div>
  );
};

/** Sends one page view per route change, only while the visitor has accepted analytics. */
export const PageTracker: React.FC = () => {
  const { pathname } = useLocation();
  const consent = useConsent();

  useEffect(() => {
    if (consent !== 'analytics' || pathname.startsWith('/admin')) return;
    apiFetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname }),
    }).catch(() => {});
  }, [pathname, consent]);

  return null;
};
