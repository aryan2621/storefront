import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Postmark } from '../components/Postmark';
import { AuthControls } from '../components/AuthControls';
import { useSession } from '../lib/session';

const faqs = [
  {
    q: 'How does offline licensing work?',
    a: 'Each license is an Ed25519-signed payload. Your app verifies it locally with an embedded public key — no account server for one-time products.',
  },
  {
    q: 'Which payment methods are supported?',
    a: 'UPI, Indian debit and credit cards, net banking, and wallets through Razorpay. Prices are in INR.',
  },
  {
    q: 'What does one year of updates mean?',
    a: 'One-time purchases include twelve months of app updates from the purchase date. Older builds keep working offline forever.',
  },
  {
    q: 'How many devices can I use?',
    a: 'Personal licenses are honor-system for up to three machines you own.',
  },
  {
    q: 'Can I get a refund?',
    a: 'Yes — 14-day refund window. See the refund policy for details.',
  },
];

const steps = [
  ['Pay', 'UPI, cards, net banking or wallets through Razorpay. Prices in rupees.'],
  ['Get the key', 'Shown on screen the moment payment clears, with a button to download it as a file.'],
  ['Activate offline', 'Paste it in the app under Settings → License. No account, no phone-home.'],
  ['Change your mind', 'Full refund within 14 days, no questions.'],
] as const;

export const Home: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const me = useSession().data;

  return (
    <>
      <section className="mx-auto max-w-5xl px-4 pb-10 pt-6 sm:px-6 sm:pt-10 lg:pb-16">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-[clamp(2.5rem,9vw,4.5rem)] font-extrabold leading-[0.92] tracking-[-0.035em]">
            License flow.
            <br />
            Product by product.
          </h1>
          <Postmark className="postmark-thump h-20 w-20 shrink-0 sm:h-24 sm:w-24" />
        </div>
        <p className="mt-4 max-w-2xl text-lg leading-snug text-[var(--color-muted)]">
          Each desktop app keeps its own landing page. Storefront handles payment, key issuance, refunds, device slots,
          and account recovery for that app only. Buy from the app&apos;s own page.
        </p>

        {me ? (
          <div className="mt-8 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] p-5 sm:p-6">
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-[var(--color-muted)]">
              Signed in as {me.email}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to="/account" className="inline-flex h-11 items-center rounded-md bg-[var(--color-foreground)] px-4 font-semibold text-[var(--color-surface-1)]">
                My licenses and devices
              </Link>
              {me.role === 'admin' && (
                <Link to="/admin" className="inline-flex h-11 items-center rounded-md border border-[var(--color-border-strong)] px-4 font-semibold">
                  Admin
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-8 flex items-center gap-3 text-[var(--color-muted)]">
            <span>Already bought something? Sign in to see your keys and devices.</span>
            <AuthControls />
          </div>
        )}
      </section>

      <section className="border-y border-[var(--color-border)] bg-[var(--color-surface-1)]" aria-labelledby="how-heading">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
          <div>
            <h2 id="how-heading" className="text-3xl font-extrabold">
              What you get
            </h2>
            <p className="mt-3 max-w-md text-[var(--color-muted)]">
              Every app is free to download from GitHub. A Pro licence is a signed key for one app; one-time
              licences include a year of updates.
            </p>
          </div>
          <dl className="grid gap-x-8 sm:grid-cols-2">
            {steps.map(([term, detail]) => (
              <div key={term} className="border-t border-[var(--color-border-strong)] py-4">
                <dt className="font-extrabold">{term}</dt>
                <dd className="mt-1 text-[var(--color-muted)]">{detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="text-3xl font-extrabold">
          Questions
        </h2>
        <div className="border-t-2 border-[var(--color-foreground)]">
          {faqs.map((faq, i) => {
            const open = openFaq === i;
            const panelId = `faq-panel-${i}`;
            return (
              <div key={faq.q} className="border-b border-[var(--color-border-strong)]">
                <button
                  type="button"
                  id={`faq-trigger-${i}`}
                  aria-expanded={open}
                  aria-controls={panelId}
                  className="flex min-h-14 w-full items-center justify-between gap-4 py-3 text-left font-semibold"
                  onClick={() => setOpenFaq(open ? null : i)}
                >
                  {faq.q}
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-[var(--color-muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    aria-hidden
                  />
                </button>
                {open && (
                  <p id={panelId} role="region" aria-labelledby={`faq-trigger-${i}`} className="max-w-prose pb-4 text-[var(--color-muted)]">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

    </>
  );
};
