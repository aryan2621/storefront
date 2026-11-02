import { Env } from './types';

export const hasAnalyticsConsent = (cookieHeader?: string) => /(?:^|;\s*)sf_consent=analytics(?:;|$)/.test(cookieHeader ?? '');

/** Country comes from Cloudflare's edge, so no IP address is read or stored. Null in local dev. */
export const countryOf = (request: Request): string | null => (request as any).cf?.country ?? null;

/**
 * Upserts the signed-in user. Email and first/last seen are account data; the country and the consent flag follow the
 * visitor's cookie, and withdrawing consent clears the stored country.
 */
export async function recordUser(env: Env, user: { email: string; userId?: string }, request: Request) {
  if (!user.userId) return; // dev bypass / Cloudflare Access have no Clerk id to key on
  const consent = hasAnalyticsConsent(request.headers.get('Cookie') ?? undefined) ? 1 : 0;
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO app_users (clerk_user_id, email, country, analytics_consent, consent_at, first_seen_at, last_seen_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)
     ON CONFLICT(clerk_user_id) DO UPDATE SET
       email = excluded.email,
       country = CASE WHEN excluded.analytics_consent = 1 THEN COALESCE(excluded.country, app_users.country) ELSE NULL END,
       consent_at = CASE WHEN excluded.analytics_consent != app_users.analytics_consent THEN ?6 ELSE app_users.consent_at END,
       analytics_consent = excluded.analytics_consent,
       last_seen_at = ?6`
  )
    .bind(user.userId, user.email, consent ? countryOf(request) : null, consent, consent ? now : null, now)
    .run();
}

export async function recordPageView(env: Env, request: Request, path: string, clerkUserId?: string) {
  await env.DB.prepare('INSERT INTO page_views (ts, country, path, clerk_user_id) VALUES (?, ?, ?, ?)')
    .bind(Date.now(), countryOf(request), path, clerkUserId ?? null)
    .run();
}
