import { Context, Next } from 'hono';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { Env } from './types';

let cachedJWKS: any = null;

function normalizeEmail(email?: string | null): string {
  return (email || '').trim().toLowerCase();
}

function getConfiguredAdminEmails(env: Env): string[] {
  const entries = [env.ADMIN_EMAILS, env.ADMIN_EMAIL]
    .flatMap((value) => (value || '').split(/[\n,;\s]+/))
    .map(normalizeEmail)
    .filter(Boolean);

  return [...new Set(entries)];
}

function getCookieValue(cookieHeader: string | undefined, name: string): string | undefined {
  const raw = cookieHeader
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  return raw ? raw.slice(name.length + 1) : undefined;
}

function isDeployedSiteUrl(siteUrl?: string): boolean {
  if (!siteUrl) return false;
  try {
    const host = new URL(siteUrl).hostname;
    return host !== 'localhost' && host !== '127.0.0.1' && !host.endsWith('.local');
  } catch {
    return true;
  }
}

// Clerk templates may render a boolean shortcode as the string "true".
const isTrue = (v: unknown) => v === true || v === 'true';

function extractEmailFromTokenPayload(payload: any): { email: string; verified: boolean } | null {
  const emailAddresses = Array.isArray(payload?.email_addresses) ? payload.email_addresses : [];
  for (const item of emailAddresses) {
    const email = normalizeEmail(typeof item === 'string' ? item : item?.email_address);
    if (!email) continue;
    const verified =
      item?.verification?.status === 'verified' ||
      item?.verified === true ||
      isTrue(payload?.email_verified);
    return { email, verified };
  }

  const directEmail = normalizeEmail(
    typeof payload?.email === 'string'
      ? payload.email
      : typeof payload?.primary_email === 'string'
        ? payload.primary_email
        : typeof payload?.email_address === 'string'
          ? payload.email_address
          : undefined
  );
  if (!directEmail) return null;
  return { email: directEmail, verified: isTrue(payload?.email_verified) };
}

async function verifyClerkSession(token: string | undefined, env: Env): Promise<{ email: string; userId?: string } | null> {
  if (!token || !env.CLERK_JWKS_URL) return null;

  try {
    const jwks = createRemoteJWKSet(new URL(env.CLERK_JWKS_URL));
    const verifyOptions: Record<string, string> = {};
    if (env.CLERK_ISSUER) verifyOptions.issuer = env.CLERK_ISSUER;
    if (env.CLERK_JWT_AUDIENCE) verifyOptions.audience = env.CLERK_JWT_AUDIENCE;

    const { payload } = await jwtVerify(token, jwks, verifyOptions);
    const extracted = extractEmailFromTokenPayload(payload);
    if (!extracted || !extracted.verified) return null;
    return { email: extracted.email, userId: typeof payload.sub === 'string' ? payload.sub : undefined };
  } catch {
    return null;
  }
}

export async function getCurrentUser(
  env: Env,
  cookieHeader?: string,
  authorizationHeader?: string,
  cfAccessJwt?: string
): Promise<{ email: string; userId?: string; isAdmin: boolean } | null> {
  const adminEmails = getConfiguredAdminEmails(env);

  if (env.ADMIN_DEV_BYPASS === 'true' && !isDeployedSiteUrl(env.SITE_URL)) {
    const email = adminEmails[0] || 'admin@storefront.local';
    return { email, isAdmin: true };
  }

  const bearer = authorizationHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
  const sessionToken = bearer || getCookieValue(cookieHeader, '__session') || getCookieValue(cookieHeader, 'session');
  const clerkUser = await verifyClerkSession(sessionToken, env);
  if (clerkUser) {
    const email = clerkUser.email;
    return { email, userId: clerkUser.userId, isAdmin: adminEmails.includes(email) };
  }

  if (env.CF_ACCESS_AUD && env.CF_ACCESS_TEAM_DOMAIN) {
    const jwt = cfAccessJwt || getCookieValue(cookieHeader, 'Cf-Access-Jwt-Assertion');
    if (jwt) {
      try {
        const certsUrl = new URL(`https://${env.CF_ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`);
        if (!cachedJWKS) cachedJWKS = createRemoteJWKSet(certsUrl);

        const { payload } = await jwtVerify(jwt, cachedJWKS, {
          issuer: `https://${env.CF_ACCESS_TEAM_DOMAIN}`,
          audience: env.CF_ACCESS_AUD,
        });

        const extracted = extractEmailFromTokenPayload(payload);
        if (extracted?.email && extracted.verified) {
          return { email: extracted.email, isAdmin: adminEmails.includes(extracted.email) };
        }
      } catch {
        // Ignore and fall through.
      }
    }
  }

  return null;
}

export async function adminAccessMiddleware(
  c: Context<{ Bindings: Env; Variables: { admin_email?: string } }>,
  next: Next
) {
  const env = c.env;
  const user = await getCurrentUser(
    env,
    c.req.header('Cookie'),
    c.req.header('Authorization'),
    c.req.header('Cf-Access-Jwt-Assertion')
  );

  if (!user) {
    return c.json({ error: 'Not signed in' }, 401);
  }

  if (!user.isAdmin) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  c.set('admin_email', user.email);
  return next();
}
