// worker/fulfill.ts: Idempotent payment fulfillment logic

import { Env, LicensePayload } from './types';
import { RazorpayClient, RazorpayPaymentResponse } from './razorpay';
import { signLicense } from './license';
import { sendEmail, renderPurchaseEmail } from './email';
import { resolveProductPrivateKey } from './activation';

export interface FulfillmentResult {
  success: boolean;
  alreadyFulfilled?: boolean;
  orderId: string;
  licenseKey: string;
  productName: string;
  downloadUrl?: string;
  paymentId: string;
}

export async function fulfillOrder(
  env: Env,
  orderIdentifier: string, // our ord_... or razorpay order_id
  paymentId: string,
  prefetchedPayment?: RazorpayPaymentResponse
): Promise<FulfillmentResult> {
  // 1. Check if payment was already recorded
  const existingPayment = await env.DB.prepare(
    'SELECT * FROM payments WHERE id = ?'
  ).bind(paymentId).first<any>();

  if (existingPayment) {
    const existingLicense = await env.DB.prepare(
      'SELECT l.key, p.name, p.download_url FROM licenses l JOIN products p ON l.product_id = p.id WHERE l.source_id = ? OR l.source_id = ?'
    ).bind(existingPayment.order_id, paymentId).first<any>();

    if (existingLicense) {
      return {
        success: true,
        alreadyFulfilled: true,
        orderId: existingPayment.order_id,
        licenseKey: existingLicense.key,
        productName: existingLicense.name,
        downloadUrl: existingLicense.download_url,
        paymentId,
      };
    }
  }

  // 2. Fetch order record
  const order = await env.DB.prepare(
    'SELECT * FROM orders WHERE id = ? OR razorpay_order_id = ?'
  ).bind(orderIdentifier, orderIdentifier).first<any>();

  if (!order) {
    throw new Error(`Order not found for identifier: ${orderIdentifier}`);
  }

  // 3. Fetch product & customer
  const product = await env.DB.prepare(
    'SELECT * FROM products WHERE id = ?'
  ).bind(order.product_id).first<any>();

  if (!product) {
    throw new Error(`Product not found: ${order.product_id}`);
  }

  const customer = await env.DB.prepare(
    'SELECT * FROM customers WHERE id = ?'
  ).bind(order.customer_id).first<any>();

  if (!customer) {
    throw new Error(`Customer not found: ${order.customer_id}`);
  }

  // 4. If order is already paid, return existing license
  if (order.status === 'paid') {
    const lic = await env.DB.prepare(
      'SELECT key FROM licenses WHERE source_id = ?'
    ).bind(order.id).first<any>();

    if (lic) {
      return {
        success: true,
        alreadyFulfilled: true,
        orderId: order.id,
        licenseKey: lic.key,
        productName: product.name,
        downloadUrl: product.download_url,
        paymentId,
      };
    }
  }

  // 5. Fetch Razorpay payment details if not prefetched
  let payment = prefetchedPayment;
  if (!payment) {
    const rzp = new RazorpayClient(env.RAZORPAY_KEY_ID, env.RAZORPAY_KEY_SECRET);
    try {
      payment = await rzp.fetchPayment(paymentId);
    } catch (err) {
      console.warn(`Could not fetch payment from Razorpay API (${err}), creating fallback payment row`);
      payment = {
        id: paymentId,
        entity: 'payment',
        amount: order.amount_paise,
        currency: 'INR',
        status: 'captured',
        order_id: order.razorpay_order_id,
        method: 'upi',
        fee: Math.round(order.amount_paise * 0.02),
        tax: Math.round(order.amount_paise * 0.02 * 0.18),
        international: false,
        email: customer.email,
        contact: customer.phone || '',
        notes: {},
        created_at: Math.floor(Date.now() / 1000),
      };
    }
  }

  // 6. Generate digital license
  const now = Math.floor(Date.now() / 1000);
  const licId = `lic_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const updatesMonths = product.updates_months ?? 12;
  const updatesUntil = now + (updatesMonths * 30 * 86400);

  let expiresAt: number | null = null;
  if (product.kind === 'subscription') {
    // 30 days + 7 days grace for monthly; 365 + 7 days for yearly
    expiresAt = product.period === 'month' ? now + (37 * 86400) : now + (372 * 86400);
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

  // 7. Atomic batch update in D1
  const batchStatements = [
    // Mark order paid
    env.DB.prepare(
      'UPDATE orders SET status = "paid", paid_at = ? WHERE id = ?'
    ).bind(now, order.id),

    // Record payment
    env.DB.prepare(`
      INSERT OR REPLACE INTO payments (
        id, order_id, customer_id, product_id, amount_paise,
        fee_paise, fee_tax_paise, method, status, international, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      paymentId,
      order.id,
      customer.id,
      product.id,
      payment.amount,
      payment.fee || 0,
      payment.tax || 0,
      payment.method || 'upi',
      'captured',
      payment.international ? 1 : 0,
      now
    ),

    // Record license
    env.DB.prepare(`
      INSERT INTO licenses (
        id, customer_id, product_id, source_type, source_id,
        plan, seats, issued_at, expires_at, updates_until, status, key
      ) VALUES (?, ?, ?, 'order', ?, ?, 1, ?, ?, ?, 'active', ?)
    `).bind(
      licId,
      customer.id,
      product.id,
      order.id,
      payload.plan,
      now,
      expiresAt,
      updatesUntil,
      signedKey
    ),
  ];

  if (order.coupon_code) {
    batchStatements.push(
      env.DB.prepare(
        'UPDATE coupons SET used = used + 1 WHERE code = ? AND (max_uses = 0 OR used < max_uses)'
      ).bind(order.coupon_code)
    );
  }

  try {
    await env.DB.batch(batchStatements);
  } catch (err) {
    // A concurrent duplicate delivery won the unique index on licenses; the batch rolled back, so reuse its license.
    const winner = await env.DB.prepare(
      "SELECT l.key, p.name, p.download_url FROM licenses l JOIN products p ON l.product_id = p.id WHERE l.source_type = 'order' AND l.source_id = ?"
    ).bind(order.id).first<any>();
    if (!winner) throw err;
    return {
      success: true,
      alreadyFulfilled: true,
      orderId: order.id,
      licenseKey: winner.key,
      productName: winner.name,
      downloadUrl: winner.download_url,
      paymentId,
    };
  }

  // 8. Deliver receipt & key via email
  const emailContent = renderPurchaseEmail({
    productName: product.name,
    amountPaise: order.amount_paise,
    paymentId,
    licenseKey: signedKey,
    downloadUrl: product.download_url,
    supportEmail: env.EMAIL_REPLY_TO || 'support@storefront.local',
  });

  await sendEmail(env, {
    from: env.EMAIL_FROM || 'Aryan <billing@storefront.local>',
    to: customer.email,
    replyTo: env.EMAIL_REPLY_TO,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
  });

  return {
    success: true,
    orderId: order.id,
    licenseKey: signedKey,
    productName: product.name,
    downloadUrl: product.download_url,
    paymentId,
  };
}
