import React from 'react';

export const Privacy: React.FC = () => {
  return (
    <div className="mx-auto max-w-[68ch] space-y-8 px-4 py-10 leading-relaxed sm:px-6 sm:py-14">
      <h1 className="text-[clamp(2.25rem,6vw,3.25rem)] font-extrabold leading-[0.98] tracking-[-0.03em]">Privacy Policy</h1>
      <p className="font-mono text-[0.8125rem] text-[var(--color-muted)]">Written under India’s Digital Personal Data Protection (DPDP) Act, 2023</p>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">1. Data Minimization Principle</h2>
        <p>
          We believe in collecting the absolute minimum amount of personal data required to issue and maintain your software license and comply with tax statutory regulations.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">2. Information We Collect</h2>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Email Address:</strong> Used to identify the licenses you bought and to contact you about your purchase.</li>
          <li><strong>Name & Phone Number (Optional):</strong> Stored with your order and passed to Razorpay to pre-fill checkout.</li>
          <li><strong>State / Place of Supply:</strong> Collected to determine appropriate GST/tax calculations under Indian tax law.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">3. Payment Information Security</h2>
        <p>
          We never process or store your credit/debit card numbers, UPI PINs, or bank credentials on our servers. All financial transactions are securely processed by Razorpay, a PCI-DSS Level 1 compliant payment gateway.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">4. Desktop Application Privacy</h2>
        <p>
          License verification runs locally on your machine: the app checks the key’s Ed25519 signature with a public key built into the app, and does not contact our servers to do it. Subscription products are the exception: they contact our server to renew their key when it is close to expiry.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">5. Data Retention & Deletion</h2>
        <p>
          You have the right to request deletion of your customer profile at any time by contacting support@storefront.local. Financial records will be retained only for the minimum duration required by applicable Indian tax regulations (~8 years).
        </p>
      </section>
    </div>
  );
};
