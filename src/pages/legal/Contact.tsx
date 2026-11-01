import React from 'react';
import { Mail } from 'lucide-react';
import { SELLER_NAME, SUPPORT_EMAIL } from '../../lib/site';

export const Contact: React.FC = () => (
  <div className="mx-auto max-w-[68ch] space-y-8 px-4 py-10 leading-relaxed sm:px-6 sm:py-14">
    <h1 className="text-[clamp(2.25rem,6vw,3.25rem)] font-extrabold leading-[0.98] tracking-[-0.03em]">Contact Us</h1>
    <p className="font-mono text-[0.8125rem] text-[var(--color-muted)]">Sold by {SELLER_NAME}</p>

    <div className="space-y-2 border-t-2 border-[var(--color-foreground)] pt-4">
      <Mail aria-hidden className="h-5 w-5 text-[var(--color-postmark)]" />
      <h3 className="font-semibold text-[var(--color-foreground)]">Email</h3>
      <p className="text-sm text-[var(--color-muted)]">For support, refunds and licence questions:</p>
      <a href={`mailto:${SUPPORT_EMAIL}`} className="block font-mono text-sm text-[var(--color-foreground)] underline hover:text-[var(--color-accent)]">
        {SUPPORT_EMAIL}
      </a>
    </div>
  </div>
);
