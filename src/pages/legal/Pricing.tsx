import React from 'react';
import { useQueries } from '@tanstack/react-query';
import { fetchProduct } from '../../lib/api';
import { formatINR } from '../../lib/format';

const ROWS: [string, string][] = [
  ['murmur', 'Murmur (voice dictation)'],
  ['capturita', 'Capturita (screen recorder)'],
  ['agentic-browser', 'Agentic Browser (AI browser)'],
  ['orbit-ide', 'Orbit IDE (Android IDE, iOS coming soon)'],
  ['dev-tools', 'DevTools (BigView, Relay)'],
];

export const Pricing: React.FC = () => {
  const products = useQueries({ queries: ROWS.map(([id]) => ({ queryKey: ['product', id], queryFn: () => fetchProduct(id) })) });
  return (
    <div className="mx-auto max-w-[68ch] space-y-8 px-4 py-10 leading-relaxed sm:px-6 sm:py-14">
      <h1 className="text-[clamp(2.25rem,6vw,3.25rem)] font-extrabold leading-[0.98] tracking-[-0.03em]">Pricing Details & Model</h1>
      <p className="font-mono text-[0.8125rem] text-[var(--color-muted)]">Transparent Indian pricing in INR (&rupee;)</p>

      <section className="space-y-4">
        <h2 className="text-xl font-extrabold">1. Software License Tiers</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border-strong)] text-[var(--color-muted)]">
                <th className="py-2.5 px-3">Product</th>
                <th className="py-2.5 px-3">Model</th>
                <th className="py-2.5 px-3">Price (INR)</th>
                <th className="py-2.5 px-3">Updates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {ROWS.map(([id, label], i) => {
                const p = products[i].data;
                return (
                  <tr key={id}>
                    <td className="py-2.5 px-3 text-[var(--color-foreground)] font-medium">{label}</td>
                    <td className="py-2.5 px-3">{p ? (p.kind === 'subscription' ? `Per ${p.period}` : 'One-time') : '—'}</td>
                    <td className="py-2.5 px-3 font-mono-price font-semibold">{p ? formatINR(p.price_paise) : '—'}</td>
                    <td className="py-2.5 px-3 text-[var(--color-muted)]">{p ? `${p.updates_months} Months` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">2. Currency and delivery</h2>
        <p>
          All prices are in Indian Rupees (INR). The amount shown at checkout is the amount you pay. Your licence key is shown after checkout, emailed to you, and kept on your account page.
        </p>
      </section>
    </div>
  );
};
