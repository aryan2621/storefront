import React from 'react';

export type LegalSection = { heading: string; body: React.ReactNode[]; list?: React.ReactNode[] };

/** Shared layout for the policy pages so their markup lives in one place. */
export const LegalPage: React.FC<{ title: string; updated: string; sections: LegalSection[] }> = ({ title, updated, sections }) => (
  <div className="mx-auto max-w-[68ch] space-y-8 px-4 py-10 leading-relaxed sm:px-6 sm:py-14">
    <h1 className="text-[clamp(2.25rem,6vw,3.25rem)] font-extrabold leading-[0.98] tracking-[-0.03em]">{title}</h1>
    <p className="font-mono text-[0.8125rem] text-[var(--color-muted)]">Last updated: {updated}</p>
    {sections.map((s, i) => (
      <section key={s.heading} className="space-y-3">
        <h2 className="text-xl font-extrabold">
          {i + 1}. {s.heading}
        </h2>
        {s.body.map((p, j) => (
          <p key={j}>{p}</p>
        ))}
        {s.list && (
          <ul className="list-inside list-disc space-y-1">
            {s.list.map((li, k) => (
              <li key={k}>{li}</li>
            ))}
          </ul>
        )}
      </section>
    ))}
  </div>
);
