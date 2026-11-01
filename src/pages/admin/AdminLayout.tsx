import { useSession } from '../../lib/session';
import React from 'react';
import { NavLink, Outlet, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchProducts } from '../../lib/api';

const links = [
  ['', 'Overview'],
  ['payments', 'Payments'],
  ['customers', 'Customers'],
  ['subscriptions', 'Subscriptions'],
  ['licenses', 'Licenses'],
  ['lookup', 'Customer lookup'],
  ['products', 'Products'],
  ['audit', 'Audit log'],
  ['events', 'Webhook events'],
] as const;

const RANGES = [
  ['7d', 7],
  ['30d', 30],
  ['90d', 90],
  ['12m', 365],
  ['all', 0],
] as const;

/** Filters live in the URL so a view can be bookmarked or shared. */
export function useAdminFilters() {
  const [params, setParams] = useSearchParams();
  const range = params.get('range') ?? '30d';
  const product = params.get('product') ?? '';
  const interval = params.get('interval') === 'month' ? 'month' : 'day';
  const days = RANGES.find(([r]) => r === range)?.[1] ?? 30;
  const from = days ? Math.floor(Date.now() / 1000) - days * 86400 : 0;
  const qs = new URLSearchParams({ from: String(from), interval, ...(product ? { product } : {}) }).toString();
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  return { range, product, interval, qs, set, search: params.toString() };
}

const selectClass =
  'h-10 rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] px-2 text-sm font-semibold text-[var(--color-foreground)]';

const Filters: React.FC = () => {
  const { range, product, interval, set } = useAdminFilters();
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: fetchProducts });
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filters">
      <label className="sr-only" htmlFor="f-product">
        Product
      </label>
      <select id="f-product" className={selectClass} value={product} onChange={(e) => set('product', e.target.value)}>
        <option value="">All products</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <div className="flex h-10 rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] p-0.5" role="radiogroup" aria-label="Date range">
        {RANGES.map(([r]) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={range === r}
            onClick={() => set('range', r === '30d' ? '' : r)}
            className="rounded-[2px] px-2.5 font-mono text-[0.8125rem] font-medium text-[var(--color-muted)] aria-checked:bg-[var(--color-foreground)] aria-checked:text-[var(--color-surface-1)]"
          >
            {r}
          </button>
        ))}
      </div>
      <label className="sr-only" htmlFor="f-interval">
        Interval
      </label>
      <select id="f-interval" className={selectClass} value={interval} onChange={(e) => set('interval', e.target.value === 'day' ? '' : e.target.value)}>
        <option value="day">By day</option>
        <option value="month">By month</option>
      </select>
    </div>
  );
};

const SignedOutView: React.FC = () => (
  <div className="mx-auto mt-16 max-w-md px-4 text-center">
    <h1 className="text-2xl font-extrabold">Admin access</h1>
    <p className="mt-3 text-sm text-[var(--color-muted)]">
      Sign in with Clerk and use a verified administrator email configured on the server.
    </p>
    <a href="/" className="mt-6 inline-flex rounded-md border border-[var(--color-border-strong)] px-4 py-2 font-semibold">
      Back to storefront
    </a>
  </div>
);

export const AdminLayout: React.FC = () => {
  const { search } = useAdminFilters();
  const me = useSession();
  if (me.isLoading) return null;
  if (me.data?.role !== 'admin') return <SignedOutView />;
  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-10 lg:py-10">
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <p className="text-xl font-extrabold">Ledger</p>
        <nav
          className="-mx-4 mt-4 flex gap-1 overflow-x-auto border-b border-[var(--color-border)] px-4 lg:mx-0 lg:flex-col lg:border-0 lg:px-0"
          aria-label="Admin"
        >
          {links.map(([path, label]) => (
            <NavLink
              key={path}
              to={{ pathname: path ? `/admin/${path}` : '/admin', search }}
              end={!path}
              className={({ isActive }) =>
                `flex h-11 shrink-0 items-center whitespace-nowrap border-b-2 px-2 text-[0.9375rem] font-semibold lg:border-b-0 lg:border-l-2 lg:px-3 ${
                  isActive
                    ? 'border-[var(--color-foreground)] text-[var(--color-foreground)]'
                    : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-foreground)]'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <Filters />
        <div className="mt-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
