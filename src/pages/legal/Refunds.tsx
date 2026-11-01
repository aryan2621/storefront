import React from 'react';

export const Refunds: React.FC = () => {
  return (
    <div className="mx-auto max-w-[68ch] space-y-8 px-4 py-10 leading-relaxed sm:px-6 sm:py-14">
      <h1 className="text-[clamp(2.25rem,6vw,3.25rem)] font-extrabold leading-[0.98] tracking-[-0.03em]">Cancellation & Refund Policy</h1>
      <p className="font-mono text-[0.8125rem] text-[var(--color-muted)]">Effective as of October 2026</p>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">1. 14-Day Money Back Guarantee</h2>
        <p>
          We want you to be completely satisfied with your purchase. We offer a 14-day money-back guarantee on all one-time software license purchases.
        </p>
        <p>
          If any application does not meet your expectations or does not integrate seamlessly with your workstation, you may request a 100% refund within 14 days of your initial purchase date.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">2. How to Request a Refund</h2>
        <p>
          To request a refund, simply send an email to <strong className="text-[var(--color-foreground)]">support@storefront.local</strong> with:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Your purchase email address</li>
          <li>Your Razorpay Payment ID or Order ID (e.g. `pay_...` or `ord_...`)</li>
        </ul>
        <p>
          No reason is required. A refunded purchase’s license key is revoked.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">3. Refund Processing Timeline</h2>
        <p>
          Once approved, the refund will be credited back to your original payment method (bank account, UPI handle, or credit/debit card) via Razorpay. Depending on your bank, it usually reflects within 5–7 business days.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">4. Subscription Cancellations</h2>
        <p>
          For recurring subscriptions (such as AI Agents), you can cancel at any time. When cancelled, your access will remain active until the end of your current paid billing period, and no subsequent charges will be incurred.
        </p>
      </section>
    </div>
  );
};
