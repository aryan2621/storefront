import { Context, Next } from 'hono';
import { Env } from './types';

const CSP =
  "default-src 'self'; " +
  "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://challenges.cloudflare.com; " +
  "frame-src https://api.razorpay.com https://challenges.cloudflare.com; " +
  "connect-src 'self' https://api.razorpay.com https://challenges.cloudflare.com; " +
  "img-src 'self' data: https:; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
  "font-src 'self' https://fonts.gstatic.com;";

export async function securityHeadersMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  await next();
  c.res.headers.set('X-Content-Type-Options', 'nosniff');
  c.res.headers.set('X-Frame-Options', 'DENY');
  c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (c.req.path.startsWith('/api/')) {
    c.res.headers.set('Content-Security-Policy', CSP);
  }
}

export async function rateLimitOrThrow(
  env: Env,
  bindingName: 'CHECKOUT_LIMITER' | 'REFRESH_LIMITER',
  key: string
): Promise<void> {
  const limiter = (env as Record<string, RateLimit | undefined>)[bindingName];
  if (!limiter) {
    return;
  }
  const outcome = await limiter.limit({ key });
  if (!outcome.success) {
    throw new Error('RATE_LIMITED');
  }
}
