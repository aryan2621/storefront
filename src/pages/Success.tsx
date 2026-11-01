import React, { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Copy, Check, Download, FileDown, Loader2 } from 'lucide-react';
import { fetchOrderStatus, VerifyResponse } from '../lib/api';
import { Postmark } from '../components/Postmark';
import { Button } from '../components/ui/button';

const todayIST = () =>
  new Date()
    .toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: '2-digit' })
    .toUpperCase();

export const Success: React.FC = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('o');
  const stateResult = (location.state as { result?: VerifyResponse })?.result;

  const [licenseKey, setLicenseKey] = useState(stateResult?.licenseKey || '');
  const [productName, setProductName] = useState(stateResult?.productName || '');
  const [downloadUrl, setDownloadUrl] = useState(stateResult?.downloadUrl || '');
  const [landingUrl, setLandingUrl] = useState('');
  const [loading, setLoading] = useState(!!orderId && !stateResult?.licenseKey);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!orderId || stateResult?.licenseKey) return;
    let attempts = 0;
    const poll = async () => {
      try {
        const status = await fetchOrderStatus(orderId);
        if (status.license_key) {
          setLicenseKey(status.license_key);
          setProductName(status.product_name || '');
          setDownloadUrl(status.download_url || '');
          setLandingUrl(status.landing_url || '');
          setLoading(false);
          return;
        }
        if (status.status === 'paid' && attempts > 10) {
          setLoading(false);
          return;
        }
      } catch {
        /* retry */
      }
      attempts += 1;
      if (attempts < 15) setTimeout(poll, 2000);
      else setLoading(false);
    };
    poll();
  }, [orderId, stateResult?.licenseKey]);

  const handleCopy = () => {
    if (!licenseKey) return;
    navigator.clipboard.writeText(licenseKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // No email delivery yet, so the buyer keeps the key as a local file.
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

  if (loading) {
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
        {productName ? `${productName} Pro is yours.` : 'Payment received.'}
      </h1>

      {licenseKey ? (
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
              'Pro unlocks immediately. The key is checked offline, nothing is sent anywhere.',
            ].map((step, i) => (
              <li key={step} className="flex gap-4 border-b border-[var(--color-border)] py-3">
                <span className="font-mono-price font-semibold text-[var(--color-muted)]">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-[var(--color-muted)]">
            We don&apos;t email keys, so download the file or copy the key now and keep it somewhere safe.
          </p>
        </>
      ) : (
        <p className="mt-6 max-w-prose leading-relaxed text-[var(--color-muted)]">
          Your licence key is still being issued. Reload this page in a minute; it will show here once it&apos;s
          ready. Keep this page&apos;s address, it is how you get back to your key.
        </p>
      )}

      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
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
