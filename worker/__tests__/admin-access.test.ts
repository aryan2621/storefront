import { describe, it, expect, vi } from 'vitest';

// Token "admin" and "customer" stand in for verified Clerk sessions.
vi.mock('jose', () => ({
  createRemoteJWKSet: () => ({}),
  jwtVerify: async (token: string) => {
    if (token === 'admin') return { payload: { email: 'owner@example.com', email_verified: true } };
    if (token === 'customer') return { payload: { email: 'buyer@example.com', email_verified: true } };
    if (token === 'unverified') return { payload: { email: 'owner@example.com', email_verified: false } };
    throw new Error('bad token');
  },
}));

import { createAdminRouter } from '../admin';

const env = {
  CLERK_JWKS_URL: 'https://clerk.test/jwks',
  ADMIN_EMAILS: 'Owner@Example.com',
  ADMIN_DEV_BYPASS: 'false',
  SITE_URL: 'https://storefront.example.com',
} as any;

const router = createAdminRouter();
const call = (method: string, path: string, token?: string) =>
  router.request(path, { method, headers: token ? { Authorization: `Bearer ${token}` } : {} }, env);

// Every admin route, derived from the router so a new route is covered automatically.
const routes = router.routes
  .filter((r) => r.method !== 'ALL')
  .map((r) => ({ method: r.method, path: r.path.replace(/:\w+/g, 'x') }));

describe('admin routes', () => {
  it('registers routes to test', () => expect(routes.length).toBeGreaterThan(10));

  for (const { method, path } of routes) {
    it(`${method} ${path}: 401 signed out, 403 for a customer, 403 for an unverified email`, async () => {
      expect((await call(method, path)).status).toBe(401);
      expect((await call(method, path, 'customer')).status).toBe(403);
      expect((await call(method, path, 'unverified')).status).toBe(401);
    });
  }

  it('lets a verified admin email (case-insensitive) through the guard', async () => {
    const res = await call('GET', '/me', 'admin');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ email: 'owner@example.com' });
  });

  it('ignores the dev bypass on a deployed site URL', async () => {
    const res = await router.request('/me', {}, { ...env, ADMIN_DEV_BYPASS: 'true' });
    expect(res.status).toBe(401);
  });
});
