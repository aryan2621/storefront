import { Env, LicensePayload } from './types';
import { RazorpayClient, RazorpayPaymentResponse } from './razorpay';
import { signLicense } from './license';
import {
  sendEmail,
  renderSubscriptionStartedEmail,
  renderSubscriptionRenewalEmail,
  renderSubscriptionEndedEmail,
  renderSubscriptionFailedEmail,
} from './email';
import { createCancelToken } from './cancel-token';
import { resolveProductPrivateKey } from './activation';

const GRACE_SECONDS = 7 * 86400;

export function subscriptionExpiresAt(currentEnd: number | null | undefined): number | null {
  if (!currentEnd) {
    return null;
  }
  return currentEnd + GRACE_SECONDS;
}

export async function upsertSubscriptionFromRzp(
  env: Env,
  sub: {
    id: string;
    plan_id: string;
    status: string;
    current_start?: number;
    current_end?: number;
    paid_count?: number;
    notes?: Record<string, string>;
  }
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const productId = sub.notes?.product_id;
  const customerId = sub.notes?.customer_id;
  if (!productId || !customerId) {
    return;
  }

  await env.DB.prepare(`
    INSERT INTO subscriptions (
      id, customer_id, product_id, plan_id, status,
      current_start, current_end, paid_count, started_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status,
      current_start = excluded.current_start,
      current_end = excluded.current_end,
      paid_count = excluded.paid_count,
      updated_at = excluded.updated_at,
      ended_at = CASE WHEN excluded.status IN ('cancelled','completed','halted') THEN excluded.updated_at ELSE ended_at END
  `).bind(
    sub.id,
    customerId,
    productId,
    sub.plan_id,
    mapRzpSubStatus(sub.status),
    sub.current_start ?? null,
    sub.current_end ?? null,
    sub.paid_count ?? 0,
    sub.current_start ?? now,
    now
  ).run();
}

function mapRzpSubStatus(status: string): string {
  const allowed = ['created', 'authenticated', 'active', 'pending', 'halted', 'cancelled', 'completed', 'paused'];
  const normalized = status.toLowerCase();
  return allowed.includes(normalized) ? normalized : 'created';
}

export async function fulfillSubscriptionCharge(
  env: Env,
  subscriptionId: string,
  paymentId: string,
  prefetchedPayment?: RazorpayPaymentResponse
): Promise<{ licenseKey?: string; alreadyFulfilled?: boolean }> {
  const existingPayment = await env.DB.prepare('SELECT id FROM payments WHERE id = ?').bind(paymentId).first();
  if (existingPayment) {
    const lic = await env.DB.prepare(
      'SELECT key FROM licenses WHERE source_type = "subscription" AND source_id = ? ORDER BY issued_at DESC LIMIT 1'
    ).bind(subscriptionId).first<{ key: string }>();
    return { licenseKey: lic?.key, alreadyFulfilled: true };
  }

  const rzp = new RazorpayClient(env.RAZORPAY_KEY_ID, env.RAZORPAY_KEY_SECRET);
  const sub = await rzp.fetchSubscription(subscriptionId);
  await upsertSubscriptionFromRzp(env, sub);

  const subRow = await env.DB.prepare('SELECT * FROM subscriptions WHERE id = ?').bind(subscriptionId).first<any>();
  if (!subRow) {
    throw new Error('Subscription row missing');
  }

  const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(subRow.product_id).first<any>();
  const customer = await env.DB.prepare('SELECT * FROM customers WHERE id = ?').bind(subRow.customer_id).first<any>();
  if (!product || !customer) {
    throw new Error('Product or customer missing for subscription');
  }

  let payment = prefetchedPayment;
  if (!payment) {
    payment = await rzp.fetchPayment(paymentId);
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = subscriptionExpiresAt(subRow.current_end ?? sub.current_end ?? null);
  const updatesUntil = now + (365 * 86400);

  const existingLic = await env.DB.prepare(
    'SELECT id, key FROM licenses WHERE source_type = "subscription" AND source_id = ? AND status = "active" ORDER BY issued_at DESC LIMIT 1'
  ).bind(subscriptionId).first<any>();

  let licId = existingLic?.id as string | undefined;
  if (!licId) {
    licId = `lic_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  }

  const productKey = await resolveProductPrivateKey(env, product.id);
  if (!productKey) {
    throw new Error(`No private signing key configured for product: ${product.id}`);
  }

  const payload: LicensePayload = {
    v: 1,
    lic: licId,
    product: product.id,
    email: customer.email,
    plan: 'pro',
    seats: 1,
    issued: now,
    updates_until: updatesUntil,
    expires: expiresAt,
    kid: product.license_kid || env.LICENSE_KID || 'v1',
  };

  const signedKey = await signLicense(payload, productKey);

  const batch = [
    env.DB.prepare(`
      INSERT OR REPLACE INTO payments (
        id, order_id, subscription_id, customer_id, product_id, amount_paise,
        fee_paise, fee_tax_paise, method, status, international, created_at
      ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, 'captured', ?, ?)
    `).bind(
      paymentId,
      subscriptionId,
      customer.id,
      product.id,
      payment.amount,
      payment.fee || 0,
      payment.tax || 0,
      payment.method || 'upi',
      payment.international ? 1 : 0,
      now
    ),
  ];

  if (existingLic) {
    batch.push(
      env.DB.prepare(
        'UPDATE licenses SET key = ?, expires_at = ?, issued_at = ? WHERE id = ?'
      ).bind(signedKey, expiresAt, now, licId)
    );
  } else {
    batch.push(
      env.DB.prepare(`
        INSERT INTO licenses (
          id, customer_id, product_id, source_type, source_id,
          plan, seats, issued_at, expires_at, updates_until, status, key
        ) VALUES (?, ?, ?, 'subscription', ?, ?, 1, ?, ?, ?, 'active', ?)
      `).bind(
        licId,
        customer.id,
        product.id,
        subscriptionId,
        payload.plan,
        now,
        expiresAt,
        updatesUntil,
        signedKey
      )
    );
  }

  await env.DB.batch(batch);

  const cancelToken = await createCancelToken(env, subscriptionId, customer.email);
  const cancelUrl = `${env.SITE_URL}/api/subscription/cancel?token=${encodeURIComponent(cancelToken)}`;

  if ((sub.paid_count ?? subRow.paid_count) <= 1) {
    const email = renderSubscriptionStartedEmail({
      productName: product.name,
      nextChargeDate: subRow.current_end ?? sub.current_end,
      cancelUrl,
      supportEmail: env.EMAIL_REPLY_TO,
    });
    await sendEmail(env, {
      from: env.EMAIL_FROM,
      to: customer.email,
      replyTo: env.EMAIL_REPLY_TO,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
  } else {
    const email = renderSubscriptionRenewalEmail({
      productName: product.name,
      amountPaise: payment.amount,
      paymentId,
      nextChargeDate: subRow.current_end ?? sub.current_end,
      supportEmail: env.EMAIL_REPLY_TO,
    });
    await sendEmail(env, {
      from: env.EMAIL_FROM,
      to: customer.email,
      replyTo: env.EMAIL_REPLY_TO,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
  }

  return { licenseKey: signedKey };
}

export async function handleSubscriptionLifecycleEmail(
  env: Env,
  event: string,
  subscriptionId: string
): Promise<void> {
  const subRow = await env.DB.prepare(`
    SELECT s.*, c.email, p.name as product_name
    FROM subscriptions s
    JOIN customers c ON s.customer_id = c.id
    JOIN products p ON s.product_id = p.id
    WHERE s.id = ?
  `).bind(subscriptionId).first<any>();

  if (!subRow) {
    return;
  }

  if (event === 'subscription.pending') {
    const email = renderSubscriptionFailedEmail({
      productName: subRow.product_name,
      supportEmail: env.EMAIL_REPLY_TO,
    });
    await sendEmail(env, {
      from: env.EMAIL_FROM,
      to: subRow.email,
      replyTo: env.EMAIL_REPLY_TO,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
  }

  if (['subscription.halted', 'subscription.cancelled', 'subscription.completed'].includes(event)) {
    const periodEnd = Number(subRow.current_end) || Math.floor(Date.now() / 1000);
    await env.DB.prepare(
      `UPDATE licenses SET expires_at = ?
       WHERE source_type = "subscription" AND source_id = ? AND status = "active"`
    ).bind(periodEnd, subscriptionId).run();
    if (periodEnd <= Math.floor(Date.now() / 1000)) {
      await env.DB.prepare(
        'UPDATE licenses SET status = "revoked", revoked_reason = ? WHERE source_type = "subscription" AND source_id = ?'
      ).bind(event, subscriptionId).run();
    }

    const email = renderSubscriptionEndedEmail({
      productName: subRow.product_name,
      accessEnd: subRow.current_end,
      resubscribeUrl: `${env.SITE_URL}/p/${subRow.product_id}`,
      supportEmail: env.EMAIL_REPLY_TO,
    });
    await sendEmail(env, {
      from: env.EMAIL_FROM,
      to: subRow.email,
      replyTo: env.EMAIL_REPLY_TO,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
  }
}
