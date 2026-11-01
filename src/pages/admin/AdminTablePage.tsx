import { apiFetch } from '../../lib/api-fetch';
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';

/** Shared loading / error / empty block for admin views. */
export const AdminState: React.FC<{ loading?: boolean; error?: boolean; empty?: string; onRetry?: () => void }> = ({
  loading,
  error,
  empty,
  onRetry,
}) => (
  <div
    className="mt-4 flex min-h-32 flex-col items-center justify-center gap-3 border border-dashed border-[var(--color-border-strong)] px-4 py-8 text-center text-[var(--color-muted)]"
    role={error ? 'alert' : 'status'}
  >
    {loading && (
      <>
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        <span>Loading…</span>
      </>
    )}
    {error && (
      <>
        <span>Couldn&apos;t load this. If you just signed in, reload; otherwise the Worker logs have the cause.</span>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        )}
      </>
    )}
    {!loading && !error && empty}
  </div>
);

export type Column = {
  key: string;
  label: string;
  render?: (row: any) => React.ReactNode;
  numeric?: boolean;
  status?: boolean;
};

export function AdminTablePage({ title, endpoint, columns }: { title: string; endpoint: string; columns: Column[] }) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', endpoint],
    queryFn: async () => {
      const res = await apiFetch(endpoint);
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    },
  });

  const rowsKey = Object.keys(data || {}).find((k) => Array.isArray(data[k])) ?? '';

  const rows = useMemo(() => {
    const list: any[] = [...(data?.[rowsKey] || [])];
    if (sort) list.sort((a, b) => (a[sort.key] > b[sort.key] ? 1 : a[sort.key] < b[sort.key] ? -1 : 0) * sort.dir);
    return list;
  }, [data, rowsKey, sort]);

  const toggleSort = (key: string) =>
    setSort((s) => (s?.key !== key ? { key, dir: 1 } : s.dir === 1 ? { key, dir: -1 } : null));

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-3xl font-extrabold">{title}</h1>
        {!isLoading && !isError && <span className="font-mono text-sm text-[var(--color-muted)]">{rows.length} rows</span>}
      </div>
      {isLoading || isError ? (
        <AdminState loading={isLoading} error={isError} onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <AdminState empty={`No ${title.toLowerCase()} yet.`} />
      ) : (
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead
                  key={c.key}
                  className={c.numeric ? 'text-right' : undefined}
                  aria-sort={sort?.key === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(c.key)}
                    className="inline-flex h-10 items-center gap-1 hover:text-[var(--color-foreground)]"
                  >
                    {c.label}
                    {sort?.key === c.key &&
                      (sort.dir === 1 ? <ArrowUp className="h-3.5 w-3.5" aria-hidden /> : <ArrowDown className="h-3.5 w-3.5" aria-hidden />)}
                  </button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row: any) => (
              <TableRow key={row.id || row.email || row.code}>
                {columns.map((c) => (
                  <TableCell key={c.key} className={c.numeric ? 'text-right font-mono-price' : undefined}>
                    {c.render ? c.render(row) : c.status ? <Badge>{row[c.key]}</Badge> : String(row[c.key] ?? '')}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
