import { Hono, Context } from 'hono';
import { cors } from 'hono/cors';
import { Env, LicensePayload } from './types';
import {
  checkoutSchema,
  verifySchema,
  couponCheckSchema,
  refreshLicenseSchema,
  activateLicenseSchema,
  deactivateLicenseSchema,
} from './schema';
import { RazorpayClient } from './razorpay';
import { fulfillOrder } from './fulfill';
import { signLicense, verifyLicense } from './license';
import { createAdminRouter } from './admin';
import { handleRazorpayWebhookRequest } from './webhooks';
import { getCurrentUser } from './access';
import { findCustomerId } from './customer';
import { checkOrderToken, orderToken } from './crypto';
import { fulfillSubscriptionCharge, subscriptionExpiresAt } from './subscriptions';
import { verifyCancelToken } from './cancel-token';
import { securityHeadersMiddleware, rateLimit } from './security';
import { verifyTurnstile } from './turnstile';
import { runScheduledJobs } from './cron';
import {
  createActivationToken,
  getSeatLimitDetails,
  resolveProductPrivateKey,
  resolveProductPublicKey,
} from './activation';

const app = new Hono<{ Bindings: Env; Variables: { admin_email?: string } }>();

function parseAllowedOrigins(raw: string | null | undefined): string[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((value): value is string => typeof value === 'string').map((value) => value.trim()).filter(Boolean);
    }
  } catch {
    // Fall through to csv parsing below.
  }

  return raw
    .split(/[\r\n,]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

/** Every non-public route starts here: a verified sign-in, or a 401. */
async function requireUser(c: any) {
  const user = await getCurrentUser(c.env, c.req.header('Cookie'), c.req.header('Authorization'));
  return user ? { user } : { error: c.json({ error: 'Sign in required' }, 401) };
}

function validateProductOrigin(product: any, request: Request, env: Env): boolean {
  const originHeader = request.headers.get('Origin') || request.headers.get('Referer');
  if (!originHeader) return false;

  try {
    const requestOrigin = new URL(originHeader).origin;
    const allowedOrigins = parseAllowedOrigins(product?.allowed_origins);
    const baseOrigins = [
      ...(allowedOrigins.length ? allowedOrigins : []),
      new URL(request.url).origin,
      env.SITE_URL,
      env.SITE_URL ? new URL(env.SITE_URL).origin : null,
    ].filter(Boolean) as string[];

    return baseOrigins.includes(requestOrigin);
  } catch {
    return false;
  }
}

function decodeLicenseProductId(key: string): string | null {
  try {
    const [payloadPart] = key.split('.');
    if (!payloadPart) return null;
    const bytes = Uint8Array.from(atob(payloadPart), (ch) => ch.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    return typeof payload.product === 'string' ? payload.product : null;
  } catch {
    return null;
  }
}

app.use('*', securityHeadersMiddleware);
app.use('/api/*', cors());

app.get('/api/products/:id', async (c) => {
  const id = c.req.param('id');
  // Public: the landing sites read price and details from here, so return only fields that are safe to show.
  const product = await c.env.DB.prepare(
    `SELECT id, name, tagline, description_md, kind, price_paise, period, updates_months, max_devices,
            refund_window_days, download_url, image_url, landing_url
     FROM products WHERE id = ? AND active = 1`
  ).bind(id).first();
  if (!product) {
    return c.json({ error: 'Product not found' }, 404);
  }
  return c.json({ product });
});

app.get('/api/config/public', async (c) => {
  return c.json({
    turnstile_site_key: c.env.TURNSTILE_SITE_KEY || null,
    site_url: c.env.SITE_URL,
    seller_name: c.env.SELLER_NAME,
  });
});

app.get('/api/orders/:id', async (c) => {
  const { user, error: authError } = await requireUser(c);
  if (authError) return authError;
  const id = c.req.param('id');
  if (!id.startsWith('ord_') || !(await checkOrderToken(id, c.req.query('t') ?? '', c.env.ORDER_TOKEN_SECRET))) {
    return c.json({ error: 'Not found' }, 404);
  }
  const o = await c.env.DB.prepare(`
    SELECT o.id, o.customer_id, o.status, o.product_id, o.amount_paise, o.paid_at,
           p.name AS product_name, p.download_url, p.landing_url,
           cu.email, cu.name AS customer_name,
           l.key, l.status AS license_status, pay.id AS payment_id
    FROM orders o
    JOIN products p ON p.id = o.product_id
    JOIN customers cu ON cu.id = o.customer_id
    LEFT JOIN licenses l ON l.source_id = o.id AND l.source_type = 'order'
    LEFT JOIN payments pay ON pay.order_id = o.id
    WHERE o.id = ?
  `).bind(id).first<any>();
  // The signed link is not enough: the order must belong to the signed-in account.
  if (!o || o.customer_id !== (await findCustomerId(c.env, user!))) return c.json({ error: 'Not found' }, 404);

  const paid = o.status === 'paid';
  return c.json({
    order_id: o.id,
    status: o.status,
    refunded: paid && o.license_status === 'revoked',
    product_id: o.product_id,
    product_name: o.product_name,
    license_key: paid && o.license_status === 'active' ? o.key : undefined,
    download_url: o.download_url ?? undefined,
    landing_url: o.landing_url ?? undefined,
    receipt: paid
      ? { order_id: o.id, payment_id: o.payment_id, email: o.email, name: o.customer_name, amount_paise: o.amount_paise, paid_at: o.paid_at }
      : undefined,
  });
});

app.post('/api/coupons/check', rateLimit('CHECKOUT_LIMITER', 'coupon'), async (c) => {
  const { error: authError } = await requireUser(c);
  if (authError) return authError;
  const body = await c.req.json();
  const parsed = couponCheckSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid coupon format' }, 400);
  }

  const { product_id, code } = parsed.data;
  const coupon = await c.env.DB.prepare('SELECT * FROM coupons WHERE code = ? AND active = 1').bind(code).first<any>();

  if (!coupon) {
    return c.json({ valid: false, error: 'Coupon does not exist or has expired' });
  }
  if (coupon.product_id && coupon.product_id !== product_id) {
    return c.json({ valid: false, error: 'Coupon does not apply to this product' });
  }
  if (coupon.max_uses > 0 && coupon.used >= coupon.max_uses) {
    return c.json({ valid: false, error: 'Coupon usage limit reached' });
  }
  if (coupon.expires_at && coupon.expires_at < Math.floor(Date.now() / 1000)) {
    return c.json({ valid: false, error: 'Coupon has expired' });
  }

  return c.json({
    valid: true,
    code: coupon.code,
    percent_off: coupon.percent_off,
    amount_off_paise: coupon.amount_off_paise,
  });
});

app.post('/api/checkout', rateLimit('CHECKOUT_LIMITER', 'checkout'), async (c) => {
  if (!c.env.ORDER_TOKEN_SECRET) {
    return c.json({ error: 'Checkout is not configured' }, 500);
  }

  // Buying needs a signed-in account; the licence goes to the verified email, never to one typed in the form.
  const { user, error: authError } = await requireUser(c);
  if (authError) return authError;
  const email = user!.email;

  const body = await c.req.json();
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0].message }, 400);
  }

  const { product_id, name, phone, state, gstin, coupon, turnstile_token } = parsed.data;
  const turnstileOk = await verifyTurnstile(turnstile_token, c.env.TURNSTILE_SECRET, c.req.header('cf-connecting-ip'));
  if (!turnstileOk) {
    return c.json({ error: 'Bot verification failed' }, 403);
  }

  const product = await c.env.DB.prepare(
    'SELECT * FROM products WHERE id = ? AND active = 1'
  ).bind(product_id).first<any>();

  if (!product) {
    return c.json({ error: 'Product not found' }, 404);
  }

  // Stops one email from piling up unpaid orders (each one creates a Razorpay order).
  const pending = await c.env.DB.prepare(
    `SELECT COUNT(*) AS n FROM orders o JOIN customers cu ON cu.id = o.customer_id
     WHERE cu.email = ? AND o.status = 'created' AND o.created_at > ?`
  ).bind(email.toLowerCase(), Math.floor(Date.now() / 1000) - 3600).first<{ n: number }>();
  if ((pending?.n ?? 0) >= 5) {
    return c.json({ error: 'Too many unpaid orders for this email. Try again in an hour.' }, 429);
  }

  if (!validateProductOrigin(product, c.req.raw, c.env)) {
    return c.json({ error: 'Checkout origin not allowed for this product' }, 403);
  }

  let finalAmountPaise = product.price_paise;
  let discountPaise = 0;
  let validatedCoupon: string | null = null;

  if (coupon) {
    const couponRow = await c.env.DB.prepare('SELECT * FROM coupons WHERE code = ? AND active = 1')
      .bind(coupon.toUpperCase()).first<any>();
    if (couponRow && (!couponRow.product_id || couponRow.product_id === product_id)) {
      if (couponRow.percent_off) {
        discountPaise = Math.round((finalAmountPaise * couponRow.percent_off) / 100);
      } else if (couponRow.amount_off_paise) {
        discountPaise = couponRow.amount_off_paise;
      }
      finalAmountPaise = Math.max(100, finalAmountPaise - discountPaise);
      validatedCoupon = couponRow.code;
    }
  }

  const now = Math.floor(Date.now() / 1000);
  let customerId = await findCustomerId(c.env, user!);
  if (!customerId) {
    customerId = `cust_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    try {
      await c.env.DB.prepare(
        'INSERT INTO customers (id, email, name, phone, state, gstin, clerk_user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(customerId, email, name || null, phone || null, state || null, gstin || null, user!.userId ?? null, now).run();
    } catch {
      // The email already belongs to a customer linked to a different sign-in.
      return c.json({ error: 'This email is already linked to another account.' }, 409);
    }
  } else {
    await c.env.DB.prepare(`
      UPDATE customers SET
        name = COALESCE(?, name), phone = COALESCE(?, phone),
        state = COALESCE(?, state), gstin = COALESCE(?, gstin)
      WHERE id = ?
    `).bind(name || null, phone || null, state || null, gstin || null, customerId).run();
  }

  const rzp = new RazorpayClient(c.env.RAZORPAY_KEY_ID, c.env.RAZORPAY_KEY_SECRET);

  if (product.kind === 'subscription') {
    if (!product.razorpay_plan_id) {
      return c.json({ error: 'Subscription plan not configured for this product' }, 503);
    }
    const totalCount = product.period === 'year' ? 10 : 120;
    try {
      const sub = await rzp.createSubscription({
        plan_id: product.razorpay_plan_id,
        total_count: totalCount,
        notes: {
          product_id,
          email,
          customer_id: customerId,
        },
      });

      await c.env.DB.prepare(`
        INSERT INTO subscriptions (
          id, customer_id, product_id, plan_id, status, paid_count, updated_at
        ) VALUES (?, ?, ?, ?, 'created', 0, ?)
      `).bind(sub.id, customerId, product_id, product.razorpay_plan_id, now).run();

      return c.json({
        subscription_id: sub.id,
        razorpay_subscription_id: sub.id,
        key_id: c.env.RAZORPAY_KEY_ID,
        amount: finalAmountPaise,
        currency: 'INR',
        name: product.name,
        description: product.tagline,
        prefill: { email, name: name || '', contact: phone || '' },
        kind: 'subscription',
      });
    } catch (err: any) {
      return c.json({ error: `Payment gateway error: ${err.message}` }, 502);
    }
  }

  const orderId = `ord_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  let rzpOrderId: string;
  try {
    const rzpOrder = await rzp.createOrder({
      amount: finalAmountPaise,
      currency: 'INR',
      receipt: orderId,
      notes: { product_id, email, order_id: orderId },
    });
    rzpOrderId = rzpOrder.id;
  } catch (err: any) {
    return c.json({ error: `Payment gateway error: ${err.message}` }, 502);
  }

  await c.env.DB.prepare(`
    INSERT INTO orders (
      id, razorpay_order_id, customer_id, product_id,
      amount_paise, discount_paise, coupon_code, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'created', ?)
  `).bind(orderId, rzpOrderId, customerId, product_id, finalAmountPaise, discountPaise, validatedCoupon, now).run();

  return c.json({
    order_id: orderId,
    order_token: await orderToken(orderId, c.env.ORDER_TOKEN_SECRET!),
    razorpay_order_id: rzpOrderId,
    key_id: c.env.RAZORPAY_KEY_ID,
    amount: finalAmountPaise,
    currency: 'INR',
    name: product.name,
    description: product.tagline,
    prefill: { email, name: name || '', contact: phone || '' },
    kind: 'one_time',
  });
});

app.post('/api/verify', rateLimit('CHECKOUT_LIMITER', 'verify'), async (c) => {
  const { error: authError } = await requireUser(c);
  if (authError) return authError;
  const body = await c.req.json();
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Missing payment verification parameters' }, 400);
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, razorpay_subscription_id } = parsed.data;
  const rzp = new RazorpayClient(c.env.RAZORPAY_KEY_ID, c.env.RAZORPAY_KEY_SECRET);

  if (razorpay_subscription_id) {
    const isValid = await rzp.verifySubscriptionSignature(
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature
    );
    if (!isValid) {
      return c.json({ error: 'Invalid payment signature' }, 400);
    }
    try {
      const result = await fulfillSubscriptionCharge(c.env, razorpay_subscription_id, razorpay_payment_id);
      return c.json({
        success: true,
        subscription_id: razorpay_subscription_id,
        licenseKey: result.licenseKey,
        pending: !result.licenseKey,
        poll_url: `/api/orders/subscription/${razorpay_subscription_id}`,
      });
    } catch (err: any) {
      return c.json({
        success: true,
        pending: true,
        subscription_id: razorpay_subscription_id,
        message: err.message,
      });
    }
  }

  const isValid = await rzp.verifyPaymentSignature(
    razorpay_order_id!,
    razorpay_payment_id,
    razorpay_signature
  );
  if (!isValid) {
    return c.json({ error: 'Invalid payment signature' }, 400);
  }

  try {
    const result = await fulfillOrder(c.env, razorpay_order_id!, razorpay_payment_id);
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: err.message || 'Payment fulfillment failed' }, 500);
  }
});

app.post('/api/webhooks/razorpay', async (c) => {
  const signature = c.req.header('x-razorpay-signature');
  const eventId = c.req.header('x-razorpay-event-id');
  const rawBody = await c.req.text();
  return handleRazorpayWebhookRequest(c.env, rawBody, signature, eventId);
});

app.post('/api/license/refresh', rateLimit('REFRESH_LIMITER', 'refresh'), async (c) => {
  const body = await c.req.json();
  const parsed = refreshLicenseSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid license format' }, 400);
  }

  const { key } = parsed.data;
  const productId = decodeLicenseProductId(key);
  if (!productId) {
    return c.json({ error: 'Invalid license format' }, 400);
  }

  const pubKey = await resolveProductPublicKey(c.env, productId);
  if (!pubKey) {
    return c.json({ error: 'Server license configuration missing' }, 500);
  }

  const verification = await verifyLicense(key, productId, pubKey);
  if (!verification.valid || !verification.payload) {
    return c.json({ error: verification.error || 'Invalid license key' }, 402);
  }

  const payload = verification.payload;
  const licenseRow = await c.env.DB.prepare('SELECT * FROM licenses WHERE id = ?').bind(payload.lic).first<any>();
  if (!licenseRow || licenseRow.status !== 'active') {
    return c.json({ error: 'License revoked or not found' }, 402);
  }

  if (licenseRow.source_type !== 'subscription') {
    return c.json({ error: 'Refresh only applies to subscription licenses' }, 400);
  }

  const sub = await c.env.DB.prepare('SELECT * FROM subscriptions WHERE id = ?').bind(licenseRow.source_id).first<any>();
  if (!sub || !['active', 'pending'].includes(sub.status)) {
    return c.json({ error: 'Subscription inactive' }, 402);
  }

  const expiresAt = subscriptionExpiresAt(sub.current_end);
  const now = Math.floor(Date.now() / 1000);
  const newPayload: LicensePayload = {
    ...payload,
    v: 1,
    issued: now,
    expires: expiresAt,
  };

  const productKey = await resolveProductPrivateKey(c.env, licenseRow.product_id);
  if (!productKey) {
    return c.json({ error: 'Server license configuration missing' }, 500);
  }

  const freshKey = await signLicense(newPayload, productKey);
  await c.env.DB.prepare('UPDATE licenses SET key = ?, expires_at = ? WHERE id = ?')
    .bind(freshKey, expiresAt, payload.lic).run();

  return c.json({ valid: true, key: freshKey, expires_at: expiresAt });
});

async function handleLicenseActivation(c: Context<{ Bindings: Env; Variables: { admin_email?: string } }, any>, body: unknown) {
  const parsed = activateLicenseSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0]?.message || 'Invalid activation payload' }, 400);
  }

  const { key, product_id, device_id, device_name } = parsed.data;
  const pubKey = await resolveProductPublicKey(c.env, product_id);
  if (!pubKey) {
    return c.json({ error: 'Product license configuration missing' }, 500);
  }

  const verification = await verifyLicense(key, product_id, pubKey);
  if (!verification.valid || !verification.payload) {
    return c.json({ error: 'invalid_key' }, 402);
  }

  const licenseRow = await c.env.DB.prepare('SELECT * FROM licenses WHERE id = ? AND product_id = ?').bind(verification.payload.lic, product_id).first<any>();
  if (!licenseRow) {
    return c.json({ error: 'invalid_key' }, 402);
  }
  if (licenseRow.status !== 'active') {
    return c.json({ error: 'revoked' }, 402);
  }

  const product = await c.env.DB.prepare('SELECT * FROM products WHERE id = ? AND active = 1').bind(product_id).first<any>();
  const maxDevices = Math.max(1, Number(product?.max_devices ?? 1));

  const existing = await c.env.DB.prepare(
    'SELECT * FROM activations WHERE license_id = ? AND device_id = ? AND deactivated_at IS NULL LIMIT 1'
  ).bind(licenseRow.id, device_id).first<any>();

  if (existing) {
    const updatedAt = Math.floor(Date.now() / 1000);
    await c.env.DB.prepare(
      'UPDATE activations SET device_name = COALESCE(?, device_name), last_seen_at = ? WHERE id = ?'
    ).bind(device_name || existing.device_name || null, updatedAt, existing.id).run();

    const token = await createActivationToken(c.env, product_id, device_id, licenseRow.id, product?.license_kid || 'default');
    return c.json({
      ok: true,
      token,
      license_id: licenseRow.id,
      product_id,
      device_id,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      seat_limit: maxDevices,
      devices: await getSeatLimitDetails(c.env, licenseRow.id),
    });
  }

  const now = Math.floor(Date.now() / 1000);
  const activationId = `act_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  // The seat check is part of the INSERT so two devices racing for the last seat cannot both win.
  const inserted = await c.env.DB.prepare(`
    INSERT INTO activations (id, license_id, device_id, device_name, activated_at, last_seen_at, deactivated_at, created_at)
    SELECT ?, ?, ?, ?, ?, ?, NULL, ?
    WHERE (SELECT COUNT(*) FROM activations WHERE license_id = ? AND deactivated_at IS NULL) < ?
  `).bind(activationId, licenseRow.id, device_id, device_name || null, now, now, now, licenseRow.id, maxDevices).run();

  if (!inserted.meta.changes) {
    return c.json({
      error: 'seat_limit',
      devices: await getSeatLimitDetails(c.env, licenseRow.id),
      seat_limit: maxDevices,
    }, 409);
  }

  const token = await createActivationToken(c.env, product_id, device_id, licenseRow.id, product?.license_kid || 'default');
  return c.json({
    ok: true,
    token,
    license_id: licenseRow.id,
    product_id,
    device_id,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    seat_limit: maxDevices,
    devices: await getSeatLimitDetails(c.env, licenseRow.id),
  });
}

async function handleLicenseDeactivation(c: Context<{ Bindings: Env; Variables: { admin_email?: string } }, any>, body: unknown) {
  const parsed = deactivateLicenseSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0]?.message || 'Invalid deactivation payload' }, 400);
  }

  const { product_id, key, device_id } = parsed.data;
  // Only the key holder can free a seat; signed-in customers use /api/account/devices/:id instead.
  const pubKey = await resolveProductPublicKey(c.env, product_id);
  const verification = pubKey ? await verifyLicense(key, product_id, pubKey) : null;
  if (!verification?.valid || !verification.payload) {
    return c.json({ error: 'invalid_key' }, 402);
  }
  const row = await c.env.DB.prepare(
    'SELECT * FROM activations WHERE license_id = ? AND device_id = ? AND deactivated_at IS NULL LIMIT 1'
  ).bind(verification.payload.lic, device_id).first<any>();

  if (!row) {
    return c.json({ ok: true, deactivated: false }, 200);
  }

  const now = Math.floor(Date.now() / 1000);
  await c.env.DB.prepare(
    'UPDATE activations SET deactivated_at = ?, last_seen_at = ? WHERE id = ?'
  ).bind(now, now, row.id).run();

  return c.json({ ok: true, deactivated: true, activation_id: row.id });
}

app.post('/api/licenses/activate', rateLimit('REFRESH_LIMITER', 'activate'), async (c) => {
  const body = await c.req.json();
  return handleLicenseActivation(c, body);
});

app.post('/api/licenses/deactivate', rateLimit('REFRESH_LIMITER', 'deactivate'), async (c) => {
  const body = await c.req.json();
  return handleLicenseDeactivation(c, body);
});

app.get('/api/subscription/cancel', async (c) => {
  const token = c.req.query('token');
  if (!token) {
    return c.text('Invalid cancel link', 400);
  }
  const verified = await verifyCancelToken(c.env, token);
  if (!verified) {
    return c.text('Invalid or expired cancel link', 400);
  }

  const rzp = new RazorpayClient(c.env.RAZORPAY_KEY_ID, c.env.RAZORPAY_KEY_SECRET);
  await rzp.cancelSubscription(verified.subscriptionId, true);
  return c.html(
    `<html><body style="font-family:sans-serif;padding:2rem"><h1>Subscription cancelled</h1><p>Your subscription will end at the close of the current billing period.</p><a href="${c.env.SITE_URL}">Back to store</a></body></html>`
  );
});

app.get('/api/me', async (c) => {
  const user = await getCurrentUser(c.env, c.req.header('Cookie'), c.req.header('Authorization'));
  if (!user) {
    return c.json({ error: 'Not signed in' }, 401);
  }

  return c.json({
    email: user.email,
    role: user.isAdmin ? 'admin' : 'customer',
  });
});

async function requireCustomer(c: any) {
  const { user, error } = await requireUser(c);
  if (error) return { error };
  // Every account route is scoped to this id, never to anything the browser sends.
  return { user: user!, customerId: await findCustomerId(c.env, user!) };
}

app.get('/api/account/licenses', async (c) => {
  const { user, customerId, error } = await requireCustomer(c);
  if (error) return error;
  const role = user!.isAdmin ? 'admin' : 'customer';
  if (!customerId) return c.json({ licenses: [], email: user!.email, role });

  const licenses = await c.env.DB.prepare(`
    SELECT l.*, p.name as product_name, p.download_url, p.image_url, p.kind
    FROM licenses l JOIN products p ON p.id = l.product_id
    WHERE l.customer_id = ? ORDER BY l.issued_at DESC
  `).bind(customerId).all<any>();

  return c.json({
    email: user!.email,
    role,
    licenses: licenses.results.map((row) => ({
      id: row.id,
      product_id: row.product_id,
      product_name: row.product_name,
      kind: row.kind,
      plan: row.plan,
      status: row.status,
      key: row.key,
      source_type: row.source_type,
      issued_at: row.issued_at,
      expires_at: row.expires_at,
      updates_until: row.updates_until,
      revoked_reason: row.revoked_reason,
      download_url: row.download_url,
      image_url: row.image_url,
    })),
  });
});

app.get('/api/account/devices', async (c) => {
  const { customerId, error } = await requireCustomer(c);
  if (error) return error;
  if (!customerId) return c.json({ devices: [] });
  const rows = await c.env.DB.prepare(`
    SELECT a.id, a.device_name, a.activated_at, a.last_seen_at, l.id as license_id, p.name as product_name
    FROM activations a
    JOIN licenses l ON l.id = a.license_id
    JOIN products p ON p.id = l.product_id
    WHERE l.customer_id = ? AND a.deactivated_at IS NULL
    ORDER BY a.last_seen_at DESC
  `).bind(customerId).all();
  return c.json({ devices: rows.results });
});

app.delete('/api/account/devices/:id', async (c) => {
  const { customerId, error } = await requireCustomer(c);
  if (error) return error;
  if (!customerId) return c.json({ error: 'Device not found' }, 404);
  const now = Math.floor(Date.now() / 1000);
  // The customer filter is what stops one customer removing another's device.
  const res = await c.env.DB.prepare(`
    UPDATE activations SET deactivated_at = ?
    WHERE id = ? AND deactivated_at IS NULL
      AND license_id IN (SELECT id FROM licenses WHERE customer_id = ?)
  `).bind(now, c.req.param('id'), customerId).run();
  if (!res.meta.changes) return c.json({ error: 'Device not found' }, 404);
  return c.json({ ok: true });
});

app.get('/api/account/receipts', async (c) => {
  const { customerId, error } = await requireCustomer(c);
  if (error) return error;
  if (!customerId) return c.json({ receipts: [] });
  const rows = await c.env.DB.prepare(`
    SELECT pay.id, pay.amount_paise, pay.refunded_paise, pay.status, pay.method, pay.created_at, p.name as product_name
    FROM payments pay JOIN products p ON p.id = pay.product_id
    WHERE pay.customer_id = ? ORDER BY pay.created_at DESC
  `).bind(customerId).all();
  return c.json({ receipts: rows.results });
});

app.route('/api/admin', createAdminRouter());

app.all('*', async (c) => {
  if (c.env.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw);
  }
  return c.text('Not Found', 404);
});

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    await runScheduledJobs(env);
  },
};
