import React from 'react';

export const Terms: React.FC = () => {
  return (
    <div className="mx-auto max-w-[68ch] space-y-8 px-4 py-10 leading-relaxed sm:px-6 sm:py-14">
      <h1 className="text-[clamp(2.25rem,6vw,3.25rem)] font-extrabold leading-[0.98] tracking-[-0.03em]">Terms and Conditions</h1>
      <p className="font-mono text-[0.8125rem] text-[var(--color-muted)]">Last updated: October 2026</p>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">1. Introduction</h2>
        <p>
          Welcome to Aryan Storefront. By purchasing software, downloading release binaries, or obtaining a cryptographic license key from our platform, you agree to comply with and be bound by these terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">2. License Grant</h2>
        <p>
          Each single-product license grants you a perpetual, non-exclusive, non-transferable license to use the designated application Pro features. You may activate and run the application on up to three (3) personal workstations or computers owned and operated exclusively by you.
        </p>
        <p>
          Sharing, publishing, renting, or publicly redistributing digital license keys or signatures is strictly prohibited and constitutes grounds for immediate revocation.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">3. Updates & Maintenance</h2>
        <p>
          One-time license purchases include access to every update released within twelve (12) months of the date of purchase. After this 12-month period expires, your license remains perpetually valid for all releases published within that period.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">4. Offline Privacy</h2>
        <p>
          Our desktop applications verify your license key locally using an embedded Ed25519 public key; one-time licenses are checked without contacting our servers. Subscription licenses are renewed online when close to expiry.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">5. Governing Law</h2>
        <p>
          These terms are governed by and construed in accordance with the laws of India. Any disputes arising out of these terms shall be subject to the exclusive jurisdiction of the courts located in Bengaluru, Karnataka, India.
        </p>
      </section>
    </div>
  );
};
