import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Product } from '../lib/api';
import type { ProductContent } from '../content/types';

const Section: React.FC<{ id: string; title: string; children: React.ReactNode }> = ({ id, title, children }) => (
  <section aria-labelledby={id} className="border-t border-[var(--color-border)] py-12">
    <h2 id={id} className="text-2xl font-extrabold">
      {title}
    </h2>
    <div className="mt-6">{children}</div>
  </section>
);

const Faq: React.FC<{ items: NonNullable<ProductContent['faq']> }> = ({ items }) => {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="border-t-2 border-[var(--color-foreground)]">
      {items.map((item, i) => (
        <div key={item.q} className="border-b border-[var(--color-border-strong)]">
          <button
            type="button"
            aria-expanded={open === i}
            className="flex min-h-14 w-full items-center justify-between gap-4 py-3 text-left font-semibold"
            onClick={() => setOpen(open === i ? null : i)}
          >
            {item.q}
            <ChevronDown className={`h-5 w-5 shrink-0 text-[var(--color-muted)] transition-transform ${open === i ? 'rotate-180' : ''}`} aria-hidden />
          </button>
          {open === i && <div className="max-w-prose pb-4 text-[var(--color-muted)]">{item.a}</div>}
        </div>
      ))}
    </div>
  );
};

/** Everything below the product header: plan, features, install, FAQ, changelog. */
export const ProductSections: React.FC<{ product: Product; content?: ProductContent }> = ({ product, content }) => {
  const plan: [string, string][] = [
    ['Licence', product.kind === 'subscription' ? `Subscription, billed every ${product.period || 'month'}` : 'One-time purchase'],
    ...(product.kind !== 'subscription' ? [['Updates included', `${product.updates_months || 12} months`] as [string, string]] : []),
    ...(product.max_devices ? [['Devices', `${product.max_devices}`] as [string, string]] : []),
    ...(product.refund_window_days ? [['Refund window', `${product.refund_window_days} days`] as [string, string]] : []),
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 pb-14 sm:px-6">
      <Section id="plan-heading" title="What's included">
        <dl className="grid gap-x-8 sm:grid-cols-2">
          {plan.map(([term, detail]) => (
            <div key={term} className="border-t border-[var(--color-border-strong)] py-3">
              <dt className="font-extrabold">{term}</dt>
              <dd className="mt-1 text-[var(--color-muted)]">{detail}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {content?.features.length ? (
        <Section id="features-heading" title="Features">
          <div className="space-y-10">
            {content.features.map((f) => (
              <div key={f.title} className="grid gap-6 md:grid-cols-2 md:items-center">
                <div>
                  <h3 className="text-xl font-extrabold">{f.title}</h3>
                  <p className="mt-2 text-[var(--color-muted)]">{f.text}</p>
                </div>
                {f.image && (
                  <img src={f.image} alt={f.imageAlt || ''} loading="lazy" className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)]" />
                )}
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {content?.install && (
        <Section id="install-heading" title={content.install.steps.length ? 'Install' : 'Requirements'}>
          <ol className="space-y-4">
            {content.install.steps.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="font-mono-price text-[var(--color-muted)]">{i + 1}</span>
                <div>
                  <p className="font-extrabold">{s.title}</p>
                  <div className="text-[var(--color-muted)]">{s.text}</div>
                </div>
              </li>
            ))}
          </ol>
          {content.install.requirements?.length ? (
            <ul className="mt-6 list-disc space-y-1 pl-5 text-[var(--color-muted)]">
              {content.install.requirements.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          ) : null}
        </Section>
      )}

      {content?.faq?.length ? (
        <Section id="faq-heading" title="Questions">
          <Faq items={content.faq} />
        </Section>
      ) : null}

      {content?.changelog?.length ? (
        <Section id="changelog-heading" title="Changelog">
          <div className="space-y-6">
            {content.changelog.map((c) => (
              <div key={c.version}>
                <p className="font-extrabold">
                  {c.version} <span className="font-normal text-[var(--color-muted)]">· {c.date}</span>
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-[var(--color-muted)]">
                  {c.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      ) : null}
    </div>
  );
};
