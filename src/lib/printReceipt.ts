import { formatINR, formatIST } from './format';
import { SELLER_NAME, SUPPORT_EMAIL } from './site';

export interface ReceiptData {
  paymentId: string;
  orderId?: string | null;
  paidAt: number | null;
  email: string;
  name?: string | null;
  product: string;
  amountPaise: number;
  refundedPaise?: number | null;
  status?: string | null;
}

const esc = (v: string) => v.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

function receiptHtml(r: ReceiptData): string {
  const row = (label: string, value: string) => `<tr><th>${label}</th><td>${esc(value)}</td></tr>`;
  const refunded = r.refundedPaise ? row('Refunded', formatINR(r.refundedPaise)) : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Receipt ${esc(r.paymentId)}</title>
<style>
  body{font:14px/1.5 -apple-system,Helvetica,Arial,sans-serif;color:#111;margin:0;padding:40px}
  .doc{max-width:640px;margin:0 auto}
  h1{font-size:22px;margin:0}
  .muted{color:#666}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:16px}
  table{width:100%;border-collapse:collapse;margin-top:24px}
  th,td{text-align:left;padding:8px 0;border-bottom:1px solid #ddd;vertical-align:top}
  th{width:35%;font-weight:600;color:#444}
  .total td{font-size:18px;font-weight:700}
  footer{margin-top:32px;font-size:12px;color:#666}
</style></head><body><div class="doc">
  <div class="head">
    <div><h1>Payment receipt</h1><div class="muted">${esc(SELLER_NAME)}</div></div>
    <div class="muted" style="text-align:right">${r.paidAt ? esc(formatIST(r.paidAt)) : ''}</div>
  </div>
  <table>
    ${row('Product', `${r.product} Pro licence (one-time)`)}
    ${row('Billed to', r.name ? `${r.name} (${r.email})` : r.email)}
    ${r.orderId ? row('Order ID', r.orderId) : ''}
    ${row('Payment ID', r.paymentId)}
    ${r.status ? row('Status', r.status) : ''}
    ${refunded}
    <tr class="total"><th>Amount paid</th><td>${esc(formatINR(r.amountPaise))}</td></tr>
  </table>
  <footer>Paid in INR through Razorpay. Questions about this payment: ${esc(SUPPORT_EMAIL)}.</footer>
</div></body></html>`;
}

/** Prints a purpose-built receipt in a hidden frame, so the app's own page is never printed. */
export function printReceipt(r: ReceiptData): void {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  frame.srcdoc = receiptHtml(r);
  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 60_000);
  };
  document.body.appendChild(frame);
}
