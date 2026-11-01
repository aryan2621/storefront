import React from 'react';
import { Mail, Clock, MapPin } from 'lucide-react';

export const Contact: React.FC = () => {
  return (
    <div className="mx-auto max-w-[68ch] space-y-8 px-4 py-10 leading-relaxed sm:px-6 sm:py-14">
      <h1 className="text-[clamp(2.25rem,6vw,3.25rem)] font-extrabold leading-[0.98] tracking-[-0.03em]">Contact Us</h1>
      <p className="font-mono text-[0.8125rem] text-[var(--color-muted)]">Official business contact information</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
        <div className="space-y-2 border-t-2 border-[var(--color-foreground)] pt-4">
          <Mail aria-hidden className="w-5 h-5 text-[var(--color-postmark)]" />
          <h3 className="font-semibold text-[var(--color-foreground)]">Email Support</h3>
          <p className="text-sm text-[var(--color-muted)]">
            For support inquiries, refunds, and corporate licenses:
          </p>
          <a href="mailto:support@storefront.local" className="block font-mono text-sm text-[var(--color-foreground)] underline hover:text-[var(--color-accent)]">
            support@storefront.local
          </a>
        </div>

        <div className="space-y-2 border-t-2 border-[var(--color-foreground)] pt-4">
          <Clock aria-hidden className="w-5 h-5 text-[var(--color-postmark)]" />
          <h3 className="font-semibold text-[var(--color-foreground)]">Operating Hours</h3>
          <p className="text-sm text-[var(--color-muted)]">
            Monday through Friday<br />
            10:00 AM – 6:00 PM IST
          </p>
          <p className="text-sm text-[var(--color-muted)]">Response time: within 24 hours</p>
        </div>

        <div className="space-y-2 border-t-2 border-[var(--color-foreground)] pt-4">
          <MapPin aria-hidden className="w-5 h-5 text-[var(--color-postmark)]" />
          <h3 className="font-semibold text-[var(--color-foreground)]">Business Location</h3>
          <p className="text-sm text-[var(--color-muted)]">
            Aryan Storefront<br />
            Bengaluru, Karnataka 560001<br />
            India
          </p>
        </div>
      </div>
    </div>
  );
};
