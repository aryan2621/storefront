import { Env } from './types';

export interface EmailOptions {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
}

function parseFrom(from: string): { name?: string; email: string } {
  const match = from.match(/^(.*)<([^>]+)>$/);
  if (match) {
    return { name: match[1].trim().replace(/^"|"$/g, '') || undefined, email: match[2].trim() };
  }
  return { email: from.trim() };
}

async function sendViaBrevo(apiKey: string, options: EmailOptions): Promise<boolean> {
  const sender = parseFrom(options.from);
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender,
      to: [{ email: options.to }],
      replyTo: options.replyTo ? { email: options.replyTo } : undefined,
      subject: options.subject,
      htmlContent: options.html,
      textContent: options.text,
    }),
  });
  if (!res.ok) {
    console.error(`Brevo API error (${res.status}):`, await res.text());
    return false;
  }
  return true;
}

async function sendViaResend(apiKey: string, options: EmailOptions): Promise<boolean> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: options.from,
      to: options.to,
      reply_to: options.replyTo,
      subject: options.subject,
      html: options.html,
      text: options.text,
    }),
  });
  if (!res.ok) {
    console.error(`Resend API error (${res.status}):`, await res.text());
    return false;
  }
  return true;
}

const isPlaceholder = (key: string | undefined, ...fakes: string[]) => !key || fakes.some((f) => key === f || key.startsWith(f));

/** Brevo first, then Resend (for after you own a domain). With neither key set the email is only logged. */
export async function sendEmail(env: Env, options: EmailOptions): Promise<boolean> {
  const brevo = env.BREVO_API_KEY?.trim();
  const resend = env.RESEND_API_KEY?.trim();
  const useBrevo = !isPlaceholder(brevo, 'sb_sample', 'test');
  const useResend = !isPlaceholder(resend, 're_sample', 'test');

  if (!useBrevo && !useResend) {
    console.log(`[Email Mock] To: ${options.to} | Subject: ${options.subject}`);
    return true;
  }

  try {
    return useBrevo ? await sendViaBrevo(brevo!, options) : await sendViaResend(resend!, options);
  } catch (err) {
    console.error('Failed to send email:', err);
    return false;
  }
}

export function renderPurchaseEmail(params: {
  productName: string;
  amountPaise: number;
  paymentId: string;
  licenseKey: string;
  downloadUrl?: string;
  supportEmail: string;
}): { subject: string; html: string; text: string } {
  const formattedAmount = `₹${(params.amountPaise / 100).toLocaleString('en-IN')}`;
  const subject = `Your ${params.productName} License Key & Receipt (${params.paymentId})`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; background: #0c0d12; color: #e5e7eb; padding: 24px;">
  <div style="max-width: 580px; margin: 0 auto; background: #13151f; border: 1px solid #232736; border-radius: 12px; padding: 32px;">
    <h2 style="color: #fff;">Thank you for your purchase</h2>
    <p style="color: #9ca3af;">${params.productName} · ${formattedAmount}</p>
    <p>Your license key is below. Sign in to storefront with this purchase email if you need it later.</p>
    <div style="background: #090a0f; border: 1px solid #2d3345; border-radius: 8px; padding: 16px; word-break: break-all; font-family: monospace; color: #6ee7b7;">${params.licenseKey}</div>
    ${params.downloadUrl ? `<p><a href="${params.downloadUrl}" style="color: #818cf8;">Download</a></p>` : ''}
    <p style="font-size: 12px; color: #6b7280;">Payment ID: ${params.paymentId}. Support: ${params.supportEmail}</p>
  </div>
</body>
</html>`;

  const text = `Thank you for purchasing ${params.productName} (${formattedAmount}).
License key:
${params.licenseKey}
Payment ID: ${params.paymentId}
Download: ${params.downloadUrl || 'N/A'}
Support: ${params.supportEmail}
Sign in to storefront with this email to recover the key later.`;

  return { subject, html, text };
}

export function renderRecoveryEmail(params: {
  licenses: Array<{ productName: string; key: string; issuedAt: string }>;
  supportEmail: string;
}): { subject: string; html: string; text: string } {
  const subject = `Your license keys`;
  const itemsHtml = params.licenses
    .map(
      (l) => `
    <div style="background: #090a0f; border: 1px solid #2d3345; border-radius: 8px; padding: 16px; margin: 12px 0;">
      <strong style="color: #ffffff;">${l.productName}</strong>
      <div style="font-family: monospace; font-size: 12px; color: #6ee7b7; word-break: break-all; margin-top: 8px;">${l.key}</div>
    </div>`
    )
    .join('');

  const html = `<html><body style="font-family: sans-serif; background: #0c0d12; color: #e5e7eb; padding: 24px;">
  <div style="max-width: 580px; margin: 0 auto; background: #13151f; border-radius: 12px; padding: 32px;">
    <h2 style="color: #fff;">Your licenses</h2>
    ${itemsHtml}
    <p style="font-size: 12px; color: #6b7280;">Support: ${params.supportEmail}</p>
  </div></body></html>`;

  const text = `Your licenses:\n${params.licenses.map((l) => `${l.productName}:\n${l.key}\n`).join('\n')}Support: ${params.supportEmail}`;
  return { subject, html, text };
}

export function renderRefundEmail(params: {
  productName: string;
  amountPaise: number;
  paymentId: string;
  supportEmail: string;
}): { subject: string; html: string; text: string } {
  const amount = `₹${(params.amountPaise / 100).toLocaleString('en-IN')}`;
  const subject = `Refund processed for ${params.productName}`;
  const html = `<p>We refunded ${amount} for ${params.productName}.</p>
<p>The license key for this purchase no longer works. The app will clear it on the next check.</p>
<p>Payment ID: ${params.paymentId}</p>
<p>Support: ${params.supportEmail}</p>`;
  const text = `Refund of ${amount} for ${params.productName} is processed. The license key is revoked. Payment ID: ${params.paymentId}. Support: ${params.supportEmail}`;
  return { subject, html, text };
}

export function renderRenewalReminderEmail(params: {
  productName: string;
  updatesUntil: number;
  accountUrl: string;
}): { subject: string; html: string; text: string } {
  const date = new Date(params.updatesUntil * 1000).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
  const subject = `Updates for ${params.productName} end on ${date}`;
  const text = `Your updates for ${params.productName} end on ${date}. Your key keeps working on builds released before then. Manage it: ${params.accountUrl}`;
  return { subject, html: `<p>${text}</p>`, text };
}

function formatDateIST(unix?: number | null): string {
  if (!unix) return '—';
  return new Date(unix * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

export function renderSubscriptionStartedEmail(params: {
  productName: string;
  nextChargeDate?: number | null;
  cancelUrl: string;
  supportEmail: string;
}) {
  const subject = `Subscription active: ${params.productName}`;
  const html = `<p>Your subscription for <strong>${params.productName}</strong> is active.</p>
<p>Next billing date: ${formatDateIST(params.nextChargeDate)}</p>
<p><a href="${params.cancelUrl}">Cancel at period end</a></p>
<p>Support: ${params.supportEmail}</p>`;
  return { subject, html, text: subject };
}

export function renderSubscriptionRenewalEmail(params: {
  productName: string;
  amountPaise: number;
  paymentId: string;
  nextChargeDate?: number | null;
  supportEmail: string;
}) {
  const amount = `₹${(params.amountPaise / 100).toLocaleString('en-IN')}`;
  const subject = `Renewal receipt: ${params.productName} (${amount})`;
  const html = `<p>Thank you — ${amount} charged for ${params.productName}.</p>
<p>Payment ID: ${params.paymentId}</p>
<p>Next billing: ${formatDateIST(params.nextChargeDate)}</p>`;
  return { subject, html, text: subject };
}

export function renderSubscriptionFailedEmail(params: { productName: string; supportEmail: string }) {
  const subject = `Payment failed: ${params.productName} subscription`;
  const html = `<p>We could not charge your subscription for ${params.productName}. Please update your payment method in Razorpay.</p>
<p>Contact ${params.supportEmail} if you need help.</p>`;
  return { subject, html, text: subject };
}

export function renderSubscriptionEndedEmail(params: {
  productName: string;
  accessEnd?: number | null;
  resubscribeUrl: string;
  supportEmail: string;
}) {
  const subject = `Subscription ended: ${params.productName}`;
  const html = `<p>Access to ${params.productName} ends ${formatDateIST(params.accessEnd)}.</p>
<p><a href="${params.resubscribeUrl}">Resubscribe</a></p>`;
  return { subject, html, text: subject };
}

export function renderAdminDailySummary(params: {
  grossPaise: number;
  paymentCount: number;
  newSubs: number;
  webhookErrors: number;
}) {
  const gross = `₹${(params.grossPaise / 100).toLocaleString('en-IN')}`;
  const subject = `Storefront daily summary — ${gross}`;
  const html = `<ul>
<li>Gross revenue: ${gross} (${params.paymentCount} payments)</li>
<li>New subscriptions: ${params.newSubs}</li>
<li>Webhook errors (24h): ${params.webhookErrors}</li>
</ul>`;
  return { subject, html, text: subject };
}
