import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

// Two different Clerk users who both have the same verified email.
vi.mock('jose', () => ({
  createRemoteJWKSet: () => ({}),
  jwtVerify: async (token: string) => {
    if (token === 'userA') return { payload: { sub: 'user_A', email: 'buyer@example.com', email_verified: true } };
    if (token === 'userB') return { payload: { sub: 'user_B', email: 'buyer@example.com', email_verified: true } };
    throw new Error('bad token');
  },
}));

import worker from '../index';
import { checkOrderToken, orderToken } from '../crypto';
import { createTestDb } from './d1.setup';

const SECRET = 'test-order-secret';
const now = Math.floor(Date.now() / 1000);
let env: any;
let dispose: () => Promise<void>;

const ctx = { waitUntil() {}, passThroughOnException() {} } as any;
const call = (path: string, init: RequestInit = {}) => worker.fetch(new Request(`http://localhost${path}`, init), env, ctx);
const authed = (path: string, token: string, init: RequestInit = {}) => call(path, { ...init, headers: { Authorization: `Bearer ${token}` } });

beforeAll(async () => {
  const t = await createTestDb();
  dispose = t.dispose;
  const db = t.db;
  const run = (sql: string, ...args: unknown[]) => db.prepare(sql).bind(...args).run();
  await run(
    `INSERT INTO products (id, name, tagline, description_md, kind, price_paise, updates_months, active, sort, razorpay_plan_id, allowed_origins, landing_url, download_url, created_at)
     VALUES ('demo', 'Demo', 't', 'd', 'one_time', 10000, 12, 1, 1, 'plan_secret', '["https://demo.example.com"]', 'https://demo.example.com', 'https://dl.example.com', ?)`, now);
  await run("INSERT INTO customers (id, email, created_at) VALUES ('cust_1', 'buyer@example.com', ?)", now);
  await run("INSERT INTO orders (id, razorpay_order_id, customer_id, product_id, amount_paise, status, created_at, paid_at) VALUES ('ord_1', 'o1', 'cust_1', 'demo', 10000, 'paid', ?, ?)", now, now);
  await run("INSERT INTO payments (id, order_id, customer_id, product_id, amount_paise, status, created_at) VALUES ('pay_1', 'ord_1', 'cust_1', 'demo', 10000, 'captured', ?)", now);
  await run("INSERT INTO licenses (id, customer_id, product_id, source_type, source_id, issued_at, status, key) VALUES ('lic_1', 'cust_1', 'demo', 'order', 'ord_1', ?, 'active', 'KEY.SIG')", now);
  await run("INSERT INTO activations (id, license_id, device_id, device_name, activated_at, last_seen_at, created_at) VALUES ('act_1', 'lic_1', ?, 'Mac', ?, ?, ?)", 'a'.repeat(64), now, now, now);
  env = { DB: db, SITE_URL: 'https://x.example.com', CLERK_JWKS_URL: 'https://clerk.test/jwks', ORDER_TOKEN_SECRET: SECRET };
}, 60_000);

afterAll(() => dispose?.());

describe('order token', () => {
  it('accepts its own order and rejects other orders, tampering, expiry and a missing secret', async () => {
    const t = await orderToken('ord_1', SECRET, now);
    expect(await checkOrderToken('ord_1', t, SECRET, now)).toBe(true);
    expect(await checkOrderToken('ord_2', t, SECRET, now)).toBe(false);
    expect(await checkOrderToken('ord_1', t.slice(0, -1) + (t.endsWith('a') ? 'b' : 'a'), SECRET, now)).toBe(false);
    expect(await checkOrderToken('ord_1', t, SECRET, now + 8 * 86400)).toBe(false);
    expect(await checkOrderToken('ord_1', t, undefined, now)).toBe(false);
  });
});

describe('GET /api/orders/:id', () => {
  it('needs a sign-in, a valid token and ownership', async () => {
    const t = await orderToken('ord_1', SECRET);
    expect((await call(`/api/orders/ord_1?t=${t}`)).status).toBe(401);
    expect((await authed('/api/orders/ord_1', 'userA')).status).toBe(404);
    expect((await authed('/api/orders/ord_1?t=1.abc', 'userA')).status).toBe(404);
  });

  it('returns the key, receipt and links with a valid token', async () => {
    const t = await orderToken('ord_1', SECRET);
    const body = (await (await authed(`/api/orders/ord_1?t=${t}`, 'userA')).json()) as any;
    expect(body.license_key).toBe('KEY.SIG');
    expect(body.receipt).toMatchObject({ payment_id: 'pay_1', email: 'buyer@example.com', amount_paise: 10000 });
    expect(body.landing_url).toBe('https://demo.example.com');
    expect(body.refunded).toBe(false);
  });

  it('reports a refunded order and hides its key', async () => {
    await env.DB.prepare("UPDATE licenses SET status = 'revoked' WHERE id = 'lic_1'").run();
    const t = await orderToken('ord_1', SECRET);
    const body = (await (await authed(`/api/orders/ord_1?t=${t}`, 'userA')).json()) as any;
    expect(body.refunded).toBe(true);
    expect(body.license_key).toBeUndefined();
    await env.DB.prepare("UPDATE licenses SET status = 'active' WHERE id = 'lic_1'").run();
  });
});

describe('GET /api/products/:id', () => {
  it('exposes price and details but not internal fields', async () => {
    const body = (await (await call('/api/products/demo')).json()) as any;
    expect(body.product).toMatchObject({ id: 'demo', price_paise: 10000, max_devices: 2 });
    expect(body.product.razorpay_plan_id).toBeUndefined();
    expect(body.product.allowed_origins).toBeUndefined();
  });
});

describe('account is linked to the Clerk user id', () => {
  it('the first sign-in claims the customer and sees its licenses', async () => {
    const body = (await (await authed('/api/account/licenses', 'userA')).json()) as any;
    expect(body.licenses.map((l: any) => l.id)).toEqual(['lic_1']);
    const row = await env.DB.prepare("SELECT clerk_user_id FROM customers WHERE id = 'cust_1'").first();
    expect(row.clerk_user_id).toBe('user_A');
  });

  it('a different Clerk user with the same email sees nothing and cannot remove devices', async () => {
    const lic = (await (await authed('/api/account/licenses', 'userB')).json()) as any;
    expect(lic.licenses).toEqual([]);
    expect(((await (await authed('/api/account/devices', 'userB')).json()) as any).devices).toEqual([]);
    expect((await authed('/api/account/devices/act_1', 'userB', { method: 'DELETE' })).status).toBe(404);
  });

  it('the owner still sees devices and receipts, and can remove a device', async () => {
    expect(((await (await authed('/api/account/devices', 'userA')).json()) as any).devices).toHaveLength(1);
    expect(((await (await authed('/api/account/receipts', 'userA')).json()) as any).receipts).toHaveLength(1);
    expect((await authed('/api/account/devices/act_1', 'userA', { method: 'DELETE' })).status).toBe(200);
  });

  it('signed out gets 401', async () => {
    expect((await call('/api/account/licenses')).status).toBe(401);
  });

  it('another account cannot read the order even with a valid token', async () => {
    const t = await orderToken('ord_1', SECRET);
    expect((await authed(`/api/orders/ord_1?t=${t}`, 'userB')).status).toBe(404);
  });

  it('coupon check and payment verify need a sign-in', async () => {
    const json = { 'Content-Type': 'application/json' };
    expect((await call('/api/coupons/check', { method: 'POST', headers: json, body: JSON.stringify({ product_id: 'demo', code: 'X' }) })).status).toBe(401);
    expect((await call('/api/verify', { method: 'POST', headers: json, body: '{}' })).status).toBe(401);
  });

  it('checkout refuses a coming-soon product', async () => {
    await env.DB.prepare("UPDATE products SET coming_soon = 1 WHERE id = 'demo'").run();
    const res = await call('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://demo.example.com', Authorization: 'Bearer userA' }, body: JSON.stringify({ product_id: 'demo' }) });
    await env.DB.prepare("UPDATE products SET coming_soon = 0 WHERE id = 'demo'").run();
    expect(res.status).toBe(409);
  });

  it('checkout needs a signed-in user', async () => {
    const body = JSON.stringify({ product_id: 'demo' });
    const headers = { 'Content-Type': 'application/json', Origin: 'https://demo.example.com' };
    expect((await call('/api/checkout', { method: 'POST', headers, body })).status).toBe(401);
    const signedIn = await call('/api/checkout', { method: 'POST', headers: { ...headers, Authorization: 'Bearer userA' }, body });
    expect(signedIn.status).not.toBe(401); // reaches Razorpay (not configured in tests), so 5xx/502 is fine
  });
});
