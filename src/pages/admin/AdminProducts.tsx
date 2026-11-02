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

/** Text field that saves one product setting on blur; empty clears it. Used for landing URL, allowed origins and the description (multiline). */
const TextSetting: React.FC<{ id: string; field: string; value: string; label: string; placeholder?: string; multiline?: boolean }> = ({ id, field, value, label, placeholder, multiline }) => {
  const action = useAdminAction();
  const save = (raw: string) => {
    const next = raw.trim();
    if (next !== value) action.mutate({ url: `/api/admin/products/${id}`, method: 'PATCH', body: { [field]: next || null } });
  };
  return (
    <label className={multiline ? 'block w-full text-xs text-[var(--color-muted)]' : 'block text-xs text-[var(--color-muted)]'}>
      {label}
      {multiline ? (
        <textarea
          defaultValue={value}
          placeholder={placeholder}
          rows={4}
          className="mt-1 w-full rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-transparent p-2 text-sm text-[var(--color-foreground)]"
          onBlur={(e) => save(e.target.value)}
        />
      ) : (
        <Input type="text" defaultValue={value} placeholder={placeholder} className="mt-1 h-9 w-72" onBlur={(e) => save(e.target.value)} />
      )}
    </label>
  );
};

/** Checkbox that saves a 0/1 product flag on change. */
const ToggleSetting: React.FC<{ id: string; field: string; value: boolean; label: string }> = ({ id, field, value, label }) => {
  const action = useAdminAction();
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        defaultChecked={value}
        className="h-4 w-4"
        onChange={(e) => action.mutate({ url: `/api/admin/products/${id}`, method: 'PATCH', body: { [field]: e.target.checked ? 1 : 0 } })}
      />
      {label}
    </label>
  );
};

/** allowed_origins is stored as a JSON array or comma-separated text; show it comma-separated. */
const originsText = (raw: string | null): string => {
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.join(', ');
  } catch {
    // plain csv
  }
  return raw;
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
                  <TextSetting id={p.id} field="landing_url" value={p.landing_url ?? ''} label="Landing URL (Back to the app)" placeholder="https://capturita.example.com" />
                  <TextSetting id={p.id} field="allowed_origins" value={originsText(p.allowed_origins)} label="Allowed origins (comma-separated)" placeholder="https://capturita.example.com" />
                  <TextSetting id={p.id} field="description_md" value={p.description_md ?? ''} label="Description (shown on the product page)" multiline />
                  <ToggleSetting id={p.id} field="coming_soon" value={!!p.coming_soon} label="Coming soon (cannot be bought)" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
