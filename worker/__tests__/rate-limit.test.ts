import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { rateLimit } from '../security';

function appWith(allow: boolean, seen: string[]) {
  const app = new Hono();
  app.post('/x', rateLimit('CHECKOUT_LIMITER', 'coupon'), (c) => c.json({ ok: true }));
  const env = { CHECKOUT_LIMITER: { limit: async ({ key }: { key: string }) => (seen.push(key), { success: allow }) } };
  return (ip: string) => app.fetch(new Request('http://t/x', { method: 'POST', headers: { 'cf-connecting-ip': ip } }), env);
}

describe('rateLimit middleware', () => {
  it('returns 429 when the limiter refuses, keyed by scope and IP', async () => {
    const seen: string[] = [];
    const res = await appWith(false, seen)('1.2.3.4');
    expect(res.status).toBe(429);
    expect(seen).toEqual(['coupon:1.2.3.4']);
  });

  it('lets the request through when allowed', async () => {
    expect((await appWith(true, [])('1.2.3.4')).status).toBe(200);
  });
});
