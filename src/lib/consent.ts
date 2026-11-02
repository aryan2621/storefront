import { useSyncExternalStore } from 'react';

export type Consent = 'analytics' | 'necessary' | null;

const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => (listeners.add(fn), () => void listeners.delete(fn));

/** The cookie is the record: the worker reads it to decide whether to store country and page views. */
export const getConsent = (): Consent =>
  (document.cookie.match(/(?:^|;\s*)sf_consent=(analytics|necessary)/)?.[1] as Consent | undefined) ?? null;

export function setConsent(value: 'analytics' | 'necessary') {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `sf_consent=${value}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`;
  listeners.forEach((fn) => fn());
}

export const useConsent = () => useSyncExternalStore(subscribe, getConsent, () => null);

/** Footer's "Cookie settings" reopens the banner. */
export const REOPEN_EVENT = 'sf:cookie-settings';
