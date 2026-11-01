import React from 'react';
import { Link } from 'react-router-dom';

const legal = [
  ['/terms', 'Terms'],
  ['/privacy', 'Privacy'],
  ['/refunds', 'Refunds'],
  ['/delivery', 'Delivery'],
  ['/contact', 'Contact'],
  ['/pricing', 'Pricing'],
] as const;

export const Footer: React.FC = () => (
  <footer className="mt-auto border-t border-dashed border-[var(--color-border-strong)]">
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-6">
      <div className="max-w-sm">
        <p className="font-extrabold">Storefront</p>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted)]">
          Pro licences for desktop apps. Pay in rupees; keys are signed and verified in the app.
        </p>
        <p className="mt-4 font-mono text-xs text-[var(--color-muted)]">
          © {new Date().getFullYear()} · Payments via Razorpay
        </p>
      </div>
      <nav className="grid grid-cols-3 gap-x-6 gap-y-1 sm:flex sm:flex-wrap" aria-label="Legal">
        {legal.map(([to, label]) => (
          <Link
            key={to}
            to={to}
            className="flex h-10 items-center text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:underline"
          >
            {label}
          </Link>
        ))}
      </nav>
    </div>
  </footer>
);
