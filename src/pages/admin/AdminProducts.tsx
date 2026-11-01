import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api-fetch';
import { useAdminAction } from './adminAction';
import { AdminState } from './AdminTablePage';
import { Input } from '../../components/ui/input';
import { formatINR } from '../../lib/format';

const useRows = (url: string, key: string) =>
  useQuery({
    queryKey: ['admin', url],
    queryFn: async () => {
      const res = await apiFetch(url);
      if (!res.ok) throw new Error(String(res.status));
      return (await res.json())[key] as any[];
    },
  });

/** Number field that saves one product setting on blur. */
const Setting: React.FC<{ id: string; field: string; value: number; scale?: number; label: string }> = ({ id, field, value, scale = 1, label }) => {
  const action = useAdminAction();
  return (
    <label className="block text-xs text-[var(--color-muted)]">
      {label}
      <Input
        type="number"
        min={0}
        defaultValue={value / scale}
        className="mt-1 h-9 w-28"
        onBlur={(e) => {
          const next = Math.round(Number(e.target.value) * scale);
          if (Number.isFinite(next) && next !== value) action.mutate({ url: `/api/admin/products/${id}`, method: 'PATCH', body: { [field]: next } });
        }}
      />
    </label>
  );
};

export const AdminProducts: React.FC = () => {
  const products = useRows('/api/admin/products', 'products');
  const sales = useRows('/api/admin/product-sales', 'products');
  const salesById = new Map((sales.data ?? []).map((s) => [s.id, s]));

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Products</h1>
      {products.isLoading || products.isError ? (
        <AdminState loading={products.isLoading} error={products.isError} onRetry={() => products.refetch()} />
      ) : (
        <div className="mt-4 space-y-4">
          {products.data!.map((p) => {
            const s = salesById.get(p.id);
            return (
              <div key={p.id} className="rounded-[var(--radius-md)] border border-[var(--color-border-strong)] p-4">
                <p className="font-extrabold">{p.name} <span className="font-normal text-[var(--color-muted)]">· {p.id}</span></p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  Sales {formatINR(s?.gross_paise ?? 0)} · refunded {formatINR(s?.refunded_paise ?? 0)} · {s?.payments ?? 0} payments
                </p>
                <div className="mt-3 flex flex-wrap gap-4">
                  <Setting id={p.id} field="price_paise" value={p.price_paise} scale={100} label="Price (₹)" />
                  <Setting id={p.id} field="max_devices" value={p.max_devices} label="Devices" />
                  <Setting id={p.id} field="updates_months" value={p.updates_months} label="Updates (months)" />
                  <Setting id={p.id} field="refund_window_days" value={p.refund_window_days} label="Refund window (days)" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
