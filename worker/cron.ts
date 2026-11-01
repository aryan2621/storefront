import { Env } from './types';
import { RazorpayClient } from './razorpay';
import { fulfillOrder } from './fulfill';
import { sendEmail, renderAdminDailySummary, renderRenewalReminderEmail } from './email';

export async function runScheduledJobs(env: Env): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const staleCutoff = now - 86400;

  await env.DB.prepare(
    'UPDATE orders SET status = "expired" WHERE status = "created" AND created_at < ?'
  ).bind(staleCutoff).run();

  const from = now - 48 * 3600;
  try {
    const rzp = new RazorpayClient(env.RAZORPAY_KEY_ID, env.RAZORPAY_KEY_SECRET);
    const listed = await rzp.listPayments({ from, to: now, count: 100 });
    for (const payment of listed.items || []) {
      if (payment.status !== 'captured' || !payment.order_id) continue;
      const known = await env.DB.prepare('SELECT id FROM payments WHERE id = ?').bind(payment.id).first();
      if (!known) {
        try {
          await fulfillOrder(env, payment.order_id, payment.id, payment);
        } catch (err) {
          console.error('[Cron reconcile] fulfill failed', payment.id, err);
        }
      }
    }
  } catch (err) {
    console.error('[Cron reconcile] Razorpay list failed', err);
  }

  // The job runs daily, so a one-day window sends each reminder once.
  const due = await env.DB.prepare(`
    SELECT l.updates_until, p.name as product_name, c.email
    FROM licenses l JOIN products p ON p.id = l.product_id JOIN customers c ON c.id = l.customer_id
    WHERE l.status = 'active' AND p.kind = 'one_time' AND l.updates_until >= ? AND l.updates_until < ?
  `).bind(now + 6 * 86400, now + 7 * 86400).all<any>();
  for (const row of due.results) {
    const mail = renderRenewalReminderEmail({
      productName: row.product_name,
      updatesUntil: row.updates_until,
      accountUrl: `${env.SITE_URL}/account`,
    });
    await sendEmail(env, { from: env.EMAIL_FROM, to: row.email, replyTo: env.EMAIL_REPLY_TO, ...mail });
  }

  const dayStart = now - 86400;
  const summary = await env.DB.prepare(`
    SELECT COALESCE(SUM(amount_paise), 0) as gross, COUNT(*) as cnt
    FROM payments WHERE status = 'captured' AND created_at >= ? AND created_at < ?
  `).bind(dayStart, now).first<any>();

  const newSubs = await env.DB.prepare(`
    SELECT COUNT(*) as cnt FROM subscriptions WHERE started_at >= ? AND started_at < ?
  `).bind(dayStart, now).first<any>();

  const webhookErrors = await env.DB.prepare(`
    SELECT COUNT(*) as cnt FROM events WHERE error IS NOT NULL AND received_at >= ?
  `).bind(dayStart).first<any>();

  if (env.ADMIN_EMAIL && (env.BREVO_API_KEY || env.RESEND_API_KEY)) {
    const email = renderAdminDailySummary({
      grossPaise: summary?.gross || 0,
      paymentCount: summary?.cnt || 0,
      newSubs: newSubs?.cnt || 0,
      webhookErrors: webhookErrors?.cnt || 0,
    });
    await sendEmail(env, {
      from: env.EMAIL_FROM,
      to: env.ADMIN_EMAIL,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
  }
}
