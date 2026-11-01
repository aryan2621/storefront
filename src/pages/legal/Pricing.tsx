import React from 'react';

export const Pricing: React.FC = () => {
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
              <tr>
                <td className="py-2.5 px-3 text-[var(--color-foreground)] font-medium">Murmur (voice dictation)</td>
                <td className="py-2.5 px-3">One-time</td>
                <td className="py-2.5 px-3 font-mono-price font-semibold">&#8377;999</td>
                <td className="py-2.5 px-3 text-[var(--color-muted)]">12 Months</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 text-[var(--color-foreground)] font-medium">Capturita (screen recorder)</td>
                <td className="py-2.5 px-3">One-time</td>
                <td className="py-2.5 px-3 font-mono-price font-semibold">&#8377;999</td>
                <td className="py-2.5 px-3 text-[var(--color-muted)]">12 Months</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 text-[var(--color-foreground)] font-medium">Agentic Browser (AI browser)</td>
                <td className="py-2.5 px-3">One-time</td>
                <td className="py-2.5 px-3 font-mono-price font-semibold">&#8377;999</td>
                <td className="py-2.5 px-3 text-[var(--color-muted)]">12 Months</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 text-[var(--color-foreground)] font-medium">Orbit IDE (iOS and Android IDE)</td>
                <td className="py-2.5 px-3">One-time</td>
                <td className="py-2.5 px-3 font-mono-price font-semibold">&#8377;1,499</td>
                <td className="py-2.5 px-3 text-[var(--color-muted)]">12 Months</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 text-[var(--color-foreground)] font-medium">DevTools (BigView, Relay)</td>
                <td className="py-2.5 px-3">One-time</td>
                <td className="py-2.5 px-3 font-mono-price font-semibold">&#8377;999</td>
                <td className="py-2.5 px-3 text-[var(--color-muted)]">12 Months</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 text-[var(--color-foreground)] font-medium">AI Agents</td>
                <td className="py-2.5 px-3">Subscription</td>
                <td className="py-2.5 px-3 font-mono-price font-semibold">&#8377;499/mo</td>
                <td className="py-2.5 px-3 text-[var(--color-muted)]">Continuous</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">2. Taxes & GST</h2>
        <p>
          All prices are in Indian Rupees (INR). The amount shown at checkout is the amount you pay. Your licence key is shown after checkout and can be downloaded as a file.
        </p>
      </section>
    </div>
  );
};
