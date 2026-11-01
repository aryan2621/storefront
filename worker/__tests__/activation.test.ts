import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import worker from '../index';
import { signLicense } from '../license';
import { processRazorpayWebhook } from '../webhooks';
import { createTestDb } from './d1.setup';

const pair = generateKeyPairSync('ed25519');
const PRIV = pair.privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64');
const PUB = pair.publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
const hex = (n: number) => n.toString(16).padStart(64, '0');

let env: any;
let dispose: () => Promise<void>;
let goodKey: string;
let revokedKey: string;
const now = Math.floor(Date.now() / 1000);

async function issue(db: D1Database, id: string, status: 'active' | 'revoked') {
  const key = await signLicense(
    { lic: id, product: 'demo', email: 'buyer@example.com', plan: 'pro', seats: 1, issued: now, updates_until: now + 1e7, expires: null, kid: 'v1' },
    PRIV
  );
  await db.prepare(
    `INSERT INTO licenses (id, customer_id, product_id, source_type, source_id, issued_at, status, key)
     VALUES (?, 'cust_1', 'demo', 'manual', ?, ?, ?, ?)`
  ).bind(id, id, now, status, key).run();
  return key;
}

beforeAll(async () => {
  const t = await createTestDb();
  dispose = t.dispose;
  const db = t.db;
  await db.prepare(
    `INSERT INTO products (id, name, tagline, description_md, kind, price_paise, updates_months, active, sort, max_devices, created_at)
     VALUES ('demo', 'Demo', 't', 'd', 'one_time', 10000, 12, 1, 1, 3, ?)`
  ).bind(now).run();
  await db.prepare("INSERT INTO customers (id, email, created_at) VALUES ('cust_1', 'buyer@example.com', ?)").bind(now).run();
  goodKey = await issue(db, 'lic_good', 'active');
  revokedKey = await issue(db, 'lic_revoked', 'revoked');
  env = {
    DB: db,
    LICENSE_KEY_DEMO: PRIV,
    LICENSE_PUBLIC_KEY_DEMO: PUB,
    SITE_URL: 'https://x.example.com',
    EMAIL_FROM: 'x <x@example.com>',
    EMAIL_REPLY_TO: 'x@example.com',
  };
}, 60_000);

afterAll(() => dispose?.());

const ctx = { waitUntil() {}, passThroughOnException() {} } as any;
const app = {
  request: (path: string, init: RequestInit, e: any) => worker.fetch(new Request(`http://localhost${path}`, init), e, ctx),
};

const activate = (key: string, n: number) =>
  app.request(
    '/api/licenses/activate',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, product_id: 'demo', device_id: hex(n), device_name: `d${n}` }) },
    env
  );

describe('activation', () => {
  it('issues a token with the fields the desktop app verifies', async () => {
    const res = await activate(await issue(env.DB, 'lic_token', 'active'), 9); // own license: keeps the seat-race test's seats free
    expect(res.status).toBe(200);
    const token = ((await res.json()) as any).token as string;
    const body = JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString());
    expect(body).toMatchObject({ type: 'device_activate', product: 'demo', license_id: 'lic_token', device_id: hex(9) });
    expect(body.iat).toBeLessThanOrEqual(Math.floor(Date.now() / 1000));
    expect(body.exp).toBeGreaterThan(body.iat);
  });

  it('refuses a revoked key', async () => {
    const res = await activate(revokedKey, 1);
    expect(res.status).toBe(402);
    expect((await res.json() as any).error).toBe('revoked');
  });

  it('rejects a device id that is not a 64-hex hash', async () => {
    const res = await app.request('/api/licenses/activate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: goodKey, product_id: 'demo', device_id: 'abc' }) }, env);
    expect(res.status).toBe(400);
  });

  it('never gives out more seats than max_devices, even when devices race', async () => {
    const results = await Promise.all([1, 2, 3, 4, 5].map((n) => activate(goodKey, n)));
    const statuses = results.map((r) => r.status).sort();
    expect(statuses.filter((s) => s === 200)).toHaveLength(3);
    expect(statuses.filter((s) => s === 409)).toHaveLength(2);
    const count = await env.DB.prepare("SELECT COUNT(*) as c FROM activations WHERE license_id = 'lic_good' AND deactivated_at IS NULL").first();
    expect(count.c).toBe(3);
  });

  it('lets an already-active device refresh without using another seat', async () => {
    expect((await activate(goodKey, 1)).status).toBe(200);
  });

  it('frees a seat on deactivate so another device can take it', async () => {
    const del = await app.request('/api/licenses/deactivate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product_id: 'demo', key: goodKey, device_id: hex(1) }) }, env);
    expect(del.status).toBe(200);
    expect((await activate(goodKey, 9)).status).toBe(200);
  });

  it('refuses to deactivate without a valid key', async () => {
    const del = await app.request('/api/licenses/deactivate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product_id: 'demo', key: 'x.y', device_id: hex(9) }) }, env);
    expect(del.status).toBe(402);
  });

  it('signs the activation token with the product kid', async () => {
    const res = await activate(goodKey, 9);
    const body = (await res.json()) as any;
    const payload = JSON.parse(atob(body.token.split('.')[0]));
    expect(payload.kid).toBe('default');
    expect(payload.product).toBe('demo');
  });
});

describe('webhook idempotency', () => {
  it('a duplicate payment.captured creates one payment and one license', async () => {
    await env.DB.prepare(
      `INSERT INTO orders (id, razorpay_order_id, customer_id, product_id, amount_paise, status, created_at)
       VALUES ('ord_1', 'order_rzp_1', 'cust_1', 'demo', 10000, 'created', ?)`
    ).bind(now).run();
    const event = {
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_1', order_id: 'order_rzp_1', amount: 10000, status: 'captured', method: 'upi', fee: 0, tax: 0, international: false, email: 'buyer@example.com', created_at: now } } },
    };
    await Promise.all([processRazorpayWebhook(env, event), processRazorpayWebhook(env, event)]).catch(() => undefined);
    await processRazorpayWebhook(env, event);
    const pays = await env.DB.prepare("SELECT COUNT(*) as c FROM payments WHERE id = 'pay_1'").first();
    const lics = await env.DB.prepare("SELECT COUNT(*) as c FROM licenses WHERE source_id = 'ord_1'").first();
    expect(pays.c).toBe(1);
    expect(lics.c).toBe(1);
  });
});
