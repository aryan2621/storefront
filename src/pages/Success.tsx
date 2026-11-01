import React, { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Copy, Check, Download, FileDown, Loader2, Printer } from 'lucide-react';
import { fetchOrderStatus, Receipt, VerifyResponse } from '../lib/api';
import { formatINR, formatIST } from '../lib/format';
import { SUPPORT_EMAIL } from '../lib/site';
import { printReceipt } from '../lib/printReceipt';
import { Postmark } from '../components/Postmark';
import { Button } from '../components/ui/button';

const todayIST = () =>
  new Date()
    .toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: '2-digit' })
    .toUpperCase();

type View = 'loading' | 'ready' | 'refunded' | 'invalid' | 'timeout';

export const Success: React.FC = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('o');
  const token = searchParams.get('t');
  const stateResult = (location.state as { result?: VerifyResponse })?.result;

  const [licenseKey, setLicenseKey] = useState(stateResult?.licenseKey || '');
  const [productName, setProductName] = useState(stateResult?.productName || '');
  const [downloadUrl, setDownloadUrl] = useState(stateResult?.downloadUrl || '');
  const [landingUrl, setLandingUrl] = useState('');
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [view, setView] = useState<View>(stateResult?.licenseKey ? 'ready' : orderId && token ? 'loading' : 'invalid');
  const [copied, setCopied] = useState(false);

  // Polls the order until its key is issued. Even when the key arrived with the payment, one fetch fills in the receipt and the back link.
  useEffect(() => {
    if (!orderId || !token) return;
    let attempts = 0;
    let stopped = false;
    const poll = async () => {
      try {
        const status = await fetchOrderStatus(orderId, token);
        if (stopped) return;
        setProductName((n) => status.product_name || n);
        setDownloadUrl((u) => status.download_url || u);
        setLandingUrl(status.landing_url || '');
        setReceipt(status.receipt ?? null);
        if (status.refunded) return setView('refunded');
        if (status.license_key) {
          setLicenseKey(status.license_key);
          return setView('ready');
        }
        if (stateResult?.licenseKey) return;
      } catch (err) {
        // 404 means a wrong or expired link; anything else is a network blip, so retry.
        if ((err as Error).message === '404') return setView('invalid');
      }
      attempts += 1;
      if (attempts < 15) setTimeout(poll, 2000);
      else if (!stateResult?.licenseKey) setView('timeout');
    };
    poll();
    return () => {
      stopped = true;
    };
  }, [orderId, token, stateResult?.licenseKey]);

  const handleCopy = () => {
    if (!licenseKey) return;
    navigator.clipboard.writeText(licenseKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Offer the key as a file too, in case the email is delayed.
  const handleDownloadKey = () => {
    const name = productName || 'licence';
    const text = [
      `${name} Pro licence key`,
      `Issued: ${new Date().toISOString().slice(0, 10)}`,
      stateResult?.paymentId ? `Payment ID: ${stateResult.paymentId}` : '',
      '',
      licenseKey,
      '',
      'Paste the whole key (one line) into the app to activate Pro.',
      'Keep this file safe. Anyone with this key can activate Pro.',
    ]
      .filter((l, i) => l || i > 2)
      .join('\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-pro-licence.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (view === 'loading') {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center" role="status">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-muted)]" aria-hidden />
        <p className="font-semibold">Payment received. Signing your licence…</p>
        <p className="text-sm text-[var(--color-muted)]">This usually takes a few seconds. Keep this tab open.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-[clamp(2.25rem,7vw,3.5rem)] font-extrabold leading-[0.95] tracking-[-0.035em]">
        {view === 'refunded'
          ? 'This purchase was refunded.'
          : view === 'invalid'
            ? 'We can’t open this order.'
            : productName
              ? `${productName} Pro is yours.`
              : 'Payment received.'}
      </h1>

      {view === 'refunded' ? (
        <p className="mt-6 max-w-prose leading-relaxed text-[var(--color-muted)]">
          The refund was issued and the licence key no longer works. The app clears it at its next check. Questions? Email {SUPPORT_EMAIL}.
        </p>
      ) : view === 'invalid' ? (
        <p className="mt-6 max-w-prose leading-relaxed text-[var(--color-muted)]">
          This link is wrong or has expired. Your keys are safe: sign in with the email you bought with and open My licenses, or email {SUPPORT_EMAIL}.
        </p>
      ) : licenseKey ? (
        <>
          <div className="sheet relative mt-8 p-4 pt-14 sm:p-6 sm:pt-16">
            <Postmark
              waves
              top="STOREFRONT"
              middle={todayIST()}
              bottom="LICENCE ISSUED"
              className="postmark-thump absolute -top-6 right-2 h-20 w-auto sm:right-6 sm:h-24"
            />
            <p className="text-sm font-semibold">Your licence key</p>
            <pre
              className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap break-all border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-0)] p-3 font-mono text-[0.8125rem] leading-relaxed"
              aria-label="Licence key"
            >
              {licenseKey}
            </pre>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Button onClick={handleDownloadKey} size="lg">
              <FileDown className="h-4 w-4" aria-hidden /> Download key file
            </Button>
            <Button onClick={handleCopy} size="lg" variant="outline" aria-live="polite">
              {copied ? (
                <>
                  <Check className="h-4 w-4" aria-hidden /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" aria-hidden /> Copy key
                </>
              )}
            </Button>
            </div>
          </div>

          <ol className="mt-8 list-none space-y-0 border-t-2 border-[var(--color-foreground)] p-0">
            {[
              downloadUrl ? 'Download and install the app, if you haven’t already.' : 'Open the app.',
              'Go to Settings → License and paste the key.',
              'Pro unlocks immediately. The app also registers this device so you can manage it from your account.',
            ].map((step, i) => (
              <li key={step} className="flex gap-4 border-b border-[var(--color-border)] py-3">
                <span className="font-mono-price font-semibold text-[var(--color-muted)]">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-[var(--color-muted)]">
            We also emailed this key to you, and it stays under My licenses when you sign in. Keep a copy somewhere safe too.
          </p>
        </>
      ) : (
        <p className="mt-6 max-w-prose leading-relaxed text-[var(--color-muted)]">
          Your payment went through but the key is taking longer than usual. Reload this page in a minute, or sign in and
          open My licenses. If it still isn&apos;t there, email {SUPPORT_EMAIL} with your order ID{orderId ? ` (${orderId})` : ''}.
        </p>
      )}

      {receipt && view === 'ready' && (
        <div className="sheet mt-8 p-4 text-sm sm:p-6">
          <p className="font-semibold">Receipt</p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <dt className="text-[var(--color-muted)]">Order</dt><dd className="font-mono">{receipt.order_id}</dd>
            {receipt.payment_id && (<><dt className="text-[var(--color-muted)]">Payment</dt><dd className="font-mono">{receipt.payment_id}</dd></>)}
            <dt className="text-[var(--color-muted)]">Product</dt><dd>{productName} Pro</dd>
            <dt className="text-[var(--color-muted)]">Amount</dt><dd>{formatINR(receipt.amount_paise)}</dd>
            {receipt.paid_at && (<><dt className="text-[var(--color-muted)]">Paid</dt><dd>{formatIST(receipt.paid_at)}</dd></>)}
            <dt className="text-[var(--color-muted)]">Email</dt><dd>{receipt.email}</dd>
          </dl>
          <Button variant="outline" size="sm" className="mt-3 print:hidden" onClick={() => printReceipt({
            paymentId: receipt.payment_id ?? receipt.order_id, orderId: receipt.order_id, paidAt: receipt.paid_at,
            email: receipt.email, name: receipt.name, product: productName, amountPaise: receipt.amount_paise, status: 'Paid',
          })}>
            <Printer className="h-4 w-4" aria-hidden /> Print receipt
          </Button>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-2 sm:flex-row print:hidden">
        {downloadUrl && (
          <Button variant="outline" size="lg" asChild>
            <a href={downloadUrl} target="_blank" rel="noreferrer">
              <Download className="h-4 w-4" aria-hidden />
              Download app
            </a>
          </Button>
        )}
        {landingUrl && (
          <Button variant="outline" size="lg" asChild>
            <a href={landingUrl}>Back to {productName || 'the app'}</a>
          </Button>
        )}
        <Button variant="ghost" size="lg" asChild>
          <Link to="/">Back to storefront</Link>
        </Button>
      </div>
    </div>
  );
};
