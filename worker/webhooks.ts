import { Env } from './types';
import { RazorpayClient } from './razorpay';
import { fulfillOrder } from './fulfill';
import {
  fulfillSubscriptionCharge,
  handleSubscriptionLifecycleEmail,
  upsertSubscriptionFromRzp,
} from './subscriptions';

async function revokeLicensesForOrder(env: Env, orderId: string, reason: string): Promise<void> {
  await env.DB.prepare(
    'UPDATE licenses SET status = "revoked", revoked_reason = ? WHERE source_id = ? AND status = "active"'
  ).bind(reason, orderId).run();
}

async function handleRefund(env: Env, refundEntity: any): Promise<void> {
  const paymentId = refundEntity?.payment_id;
  if (!paymentId) return;

  const payment = await env.DB.prepare('SELECT * FROM payments WHERE id = ?').bind(paymentId).first<any>();
  const refundAmount = refundEntity.amount || 0;
  const originalAmount = payment?.amount_paise || refundAmount;
  const isFull = refundAmount >= originalAmount;

  const status = isFull ? 'refunded' : 'partially_refunded';
  await env.DB.prepare(
    'UPDATE payments SET status = ?, refunded_paise = ? WHERE id = ?'
  ).bind(status, refundAmount, paymentId).run();

  if (isFull && payment?.order_id) {
    await revokeLicensesForOrder(env, payment.order_id, 'Payment refunded');
  }
}

export async function processRazorpayWebhook(env: Env, event: any): Promise<void> {
  switch (event.event) {
    case 'order.paid':
    case 'payment.captured': {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;
      const subscriptionId = paymentEntity?.subscription_id;

      if (subscriptionId && paymentId) {
        await fulfillSubscriptionCharge(env, subscriptionId, paymentId, paymentEntity);
      } else if (orderId && paymentId) {
        await fulfillOrder(env, orderId, paymentId, paymentEntity);
      }
      break;
    }

    case 'payment.failed': {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      if (orderId) {
        await env.DB.prepare('UPDATE orders SET status = "failed" WHERE razorpay_order_id = ?').bind(orderId).run();
      }
      break;
    }

    case 'refund.created':
    case 'refund.processed': {
      const refundEntity = event.payload?.refund?.entity;
      await handleRefund(env, refundEntity);
      break;
    }

    case 'refund.failed':
      break;

    case 'payment.dispute.created': {
      const paymentId = event.payload?.payment?.entity?.id;
      if (paymentId) {
        await env.DB.prepare('UPDATE payments SET status = "disputed" WHERE id = ?').bind(paymentId).run();
      }
      break;
    }

    case 'payment.dispute.lost': {
      const paymentId = event.payload?.payment?.entity?.id;
      if (paymentId) {
        await env.DB.prepare('UPDATE payments SET status = "disputed" WHERE id = ?').bind(paymentId).run();
        const payment = await env.DB.prepare('SELECT order_id FROM payments WHERE id = ?').bind(paymentId).first<any>();
        if (payment?.order_id) {
          await revokeLicensesForOrder(env, payment.order_id, 'Dispute lost');
        }
      }
      break;
    }

    case 'payment.dispute.won':
    case 'payment.dispute.closed':
      break;

    case 'subscription.authenticated':
    case 'subscription.activated':
    case 'subscription.updated':
    case 'subscription.pending':
    case 'subscription.halted':
    case 'subscription.cancelled':
    case 'subscription.completed':
    case 'subscription.paused':
    case 'subscription.resumed': {
      const subEntity = event.payload?.subscription?.entity;
      if (subEntity?.id) {
        await upsertSubscriptionFromRzp(env, subEntity);
        await handleSubscriptionLifecycleEmail(env, event.event, subEntity.id);
      }
      break;
    }

    case 'subscription.charged': {
      const paymentEntity = event.payload?.payment?.entity;
      const subEntity = event.payload?.subscription?.entity;
      if (subEntity?.id) {
        await upsertSubscriptionFromRzp(env, subEntity);
      }
      if (subEntity?.id && paymentEntity?.id) {
        await fulfillSubscriptionCharge(env, subEntity.id, paymentEntity.id, paymentEntity);
      }
      break;
    }

    default:
      break;
  }
}

export async function handleRazorpayWebhookRequest(
  env: Env,
  rawBody: string,
  signature: string | undefined,
  eventId: string | undefined
): Promise<Response> {
  if (!signature) {
    return Response.json({ error: 'Missing webhook signature' }, { status: 400 });
  }

  const isValid = await RazorpayClient.verifyWebhookSignature(rawBody, signature, env.RAZORPAY_WEBHOOK_SECRET);
  if (!isValid) {
    return Response.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const now = Math.floor(Date.now() / 1000);
  const dedupeId = eventId || `ev_${now}_${Math.random().toString(36).substring(7)}`;

  const existingEvent = await env.DB.prepare('SELECT id FROM events WHERE id = ?').bind(dedupeId).first();
  if (existingEvent) {
    return Response.json({ status: 'already_processed' }, { status: 200 });
  }

  await env.DB.prepare('INSERT INTO events (id, type, payload, received_at) VALUES (?, ?, ?, ?)')
    .bind(dedupeId, event.event, rawBody, now)
    .run();

  try {
    await processRazorpayWebhook(env, event);
    await env.DB.prepare('UPDATE events SET processed_at = ? WHERE id = ?').bind(Math.floor(Date.now() / 1000), dedupeId).run();
    return Response.json({ status: 'ok' }, { status: 200 });
  } catch (err: any) {
    console.error('Webhook processing error:', err);
    await env.DB.prepare('UPDATE events SET error = ? WHERE id = ?').bind(err?.message || 'Error', dedupeId).run();
    return Response.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
