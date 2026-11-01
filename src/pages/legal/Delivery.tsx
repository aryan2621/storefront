import { SUPPORT_EMAIL } from '../../lib/site';
import React from 'react';

export const Delivery: React.FC = () => {
  return (
    <div className="mx-auto max-w-[68ch] space-y-8 px-4 py-10 leading-relaxed sm:px-6 sm:py-14">
      <h1 className="text-[clamp(2.25rem,6vw,3.25rem)] font-extrabold leading-[0.98] tracking-[-0.03em]">Shipping & Delivery Policy</h1>
      <p className="font-mono text-[0.8125rem] text-[var(--color-muted)]">Effective as of October 2026</p>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">1. Nature of Products</h2>
        <p>
          All products offered here are digital software goods. No physical media (such as CD-ROMs, USB drives, or boxed packaging) will be shipped.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">2. Delivery Method & Instant Fulfillment</h2>
        <p>
          Delivery occurs electronically immediately upon successful payment authorization:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>On-Screen Display:</strong> Your license key and the app download link are shown on the payment success screen.</li>
          <li><strong>Key File:</strong> The success screen lets you download your license key as a text file to keep.</li>
          <li><strong>Email and account:</strong> You sign in to buy. The key is emailed to your account email and always available under My licenses.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">3. Delivery Timeline</h2>
        <p>
          Your key is usually shown within a few seconds of payment. If the success screen closes before you save your key, sign in and open My licenses, or email {SUPPORT_EMAIL} with your Razorpay Payment ID.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">4. Shipping Charges</h2>
        <p>
          Because all products are delivered electronically, there are zero shipping fees.
        </p>
      </section>
    </div>
  );
};
