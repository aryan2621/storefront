import { apiFetch } from '../../lib/api-fetch';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { formatINR, formatIST } from '../../lib/format';
import { fetchProducts } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { useAdminFilters } from './AdminLayout';
import { AdminState } from './AdminTablePage';

async function getJSON(url: string) {
  const res = await apiFetch(url);
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

const SERIES = 5; // top products get a fixed colour slot each; the rest fold into Other
const color = (i: number) => (i < SERIES ? `var(--color-chart-${i + 1})` : 'var(--color-chart-other)');

const Kpi: React.FC<{ label: string; value: string; note?: string }> = ({ label, value, note }) => (
  <div className="border-b border-r border-[var(--color-border)] px-4 py-3">
    <dt className="text-sm text-[var(--color-muted)]">{label}</dt>
    <dd className="mt-0.5 font-mono-price text-xl font-semibold">{value}</dd>
    {note && <dd className="text-[0.8125rem] text-[var(--color-muted)]">{note}</dd>}
  </div>
);

export const AdminOverview: React.FC = () => {
  const { qs, interval } = useAdminFilters();
  const overview = useQuery({ queryKey: ['admin-overview', qs], queryFn: () => getJSON(`/api/admin/overview?${qs}`) });
  const series = useQuery({
    queryKey: ['admin-series', qs],
    queryFn: () => getJSON(`/api/admin/series?metric=revenue&${qs}`),
  });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: fetchProducts });
  const nameOf = (id: string) => products.find((p) => p.id === id)?.name ?? id;

  if (overview.isLoading || overview.isError) {
    return <AdminState loading={overview.isLoading} error={overview.isError} onRetry={() => overview.refetch()} />;
  }

  const k = overview.data.kpis;
  const rows: { bucket: string; product_id: string; revenue_paise: number }[] = series.data?.series ?? [];

  // Rank products by revenue so colour follows the entity, not its position in a bucket.
  const totals = new Map<string, number>();
  rows.forEach((r) => totals.set(r.product_id, (totals.get(r.product_id) ?? 0) + r.revenue_paise));
  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const keys = ranked.slice(0, SERIES).map(([id]) => id);
  const keyOf = (id: string) => (keys.includes(id) ? id : 'other');
  const seriesKeys = ranked.length > SERIES ? [...keys, 'other'] : keys;

  const byBucket = new Map<string, Record<string, number | string>>();
  rows.forEach((r) => {
    const row = byBucket.get(r.bucket) ?? { bucket: r.bucket };
    const key = keyOf(r.product_id);
    row[key] = ((row[key] as number) ?? 0) + r.revenue_paise / 100;
    byBucket.set(r.bucket, row);
  });
  const chartData = [...byBucket.values()];
  const maxTotal = ranked[0]?.[1] ?? 0;
  const label = (key: string) => (key === 'other' ? 'Other' : nameOf(key));

  return (
    <div className="space-y-10">
      <section aria-labelledby="kpi-heading">
        <h1 id="kpi-heading" className="text-3xl font-extrabold">
          Overview
        </h1>
        <dl className="mt-4 grid grid-cols-2 border-l border-t border-[var(--color-border)] bg-[var(--color-surface-1)] sm:grid-cols-3 xl:grid-cols-5">
          <Kpi label="Gross revenue" value={formatINR(k.gross_revenue_paise)} />
          <Kpi label="Refunds" value={formatINR(k.refunds_paise)} />
          <Kpi label="Net revenue" value={formatINR(k.net_revenue_paise)} />
          <Kpi label="Razorpay fees" value={formatINR(k.fees_paise)} note="incl. GST on fee" />
          <Kpi label="Take-home" value={formatINR(k.take_home_paise)} />
          <Kpi label="Customers" value={String(k.customer_count)} note="all time" />
          <Kpi label="Active licences" value={String(k.active_licenses)} />
          <Kpi label="MRR" value={formatINR(k.mrr_paise)} />
          <Kpi label="ARR" value={formatINR(k.arr_paise)} />
          <Kpi label="Active subscribers" value={String(k.active_subscribers)} note="incl. pending" />
        </dl>
      </section>

      <section aria-labelledby="rev-heading" className="grid gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <h2 id="rev-heading" className="text-xl font-extrabold">
            Revenue by {interval}
          </h2>
          {series.isError ? (
            <AdminState error onRetry={() => series.refetch()} />
          ) : chartData.length === 0 ? (
            <AdminState empty="No captured payments in this range." />
          ) : (
            <div className="mt-4 h-72 text-[var(--color-muted)]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap="20%">
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 12, fill: 'currentColor' }} tickLine={false} axisLine={{ stroke: 'var(--color-border-strong)' }} minTickGap={16} />
                  <YAxis
                    tick={{ fontSize: 12, fill: 'currentColor' }}
                    tickLine={false}
                    axisLine={false}
                    width={64}
                    tickFormatter={(v: number) => formatINR(v * 100)}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--color-surface-2)' }}
                    formatter={(v, name) => [formatINR(Number(v) * 100), label(String(name))]}
                    contentStyle={{
                      background: 'var(--color-surface-1)',
                      border: '1px solid var(--color-border-strong)',
                      borderRadius: 4,
                      color: 'var(--color-foreground)',
                      fontSize: 13,
                    }}
                  />
                  <Legend formatter={(v) => <span className="text-sm text-[var(--color-foreground)]">{label(String(v))}</span>} />
                  {seriesKeys.map((key, i) => (
                    <Bar
                      key={key}
                      dataKey={key}
                      stackId="rev"
                      fill={color(key === 'other' ? SERIES : i)}
                      stroke="var(--color-surface-1)"
                      strokeWidth={2}
                      radius={i === seriesKeys.length - 1 ? [4, 4, 0, 0] : 0}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-extrabold">By product</h2>
          {ranked.length === 0 ? (
            <AdminState empty="Nothing sold in this range yet." />
          ) : (
            <ul className="mt-4 space-y-3" aria-label="Revenue by product">
              {ranked.map(([id, total], i) => (
                <li key={id}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate font-semibold">{nameOf(id)}</span>
                    <span className="font-mono-price">{formatINR(total)}</span>
                  </div>
                  <div className="mt-1 h-2 bg-[var(--color-surface-2)]" aria-hidden>
                    <div
                      className="h-full rounded-r-[4px]"
                      style={{ width: `${(total / maxTotal) * 100}%`, background: color(Math.min(i, SERIES)) }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section aria-labelledby="recent-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="recent-heading" className="text-xl font-extrabold">
            Recent payments
          </h2>
          <Button variant="outline" size="sm" asChild>
            <a href="/api/admin/export.csv?table=payments">
              <Download className="h-4 w-4" aria-hidden /> Export CSV
            </a>
          </Button>
        </div>
        {(overview.data.recent_payments ?? []).length === 0 ? (
          <AdminState empty="No payments yet. Test-mode payments show up here too." />
        ) : (
          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date (IST)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overview.data.recent_payments.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="max-w-[16rem] truncate">{p.email}</TableCell>
                  <TableCell>{p.product_name}</TableCell>
                  <TableCell className="text-right font-mono-price">{formatINR(p.amount_paise)}</TableCell>
                  <TableCell className="text-[var(--color-muted)]">{p.method ?? '—'}</TableCell>
                  <TableCell>
                    <Badge>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-[var(--color-muted)] tabular">{formatIST(p.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
};
