import { apiFetch } from '../lib/api-fetch';
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AuthControls } from '../components/AuthControls';
import { Button } from '../components/ui/button';
import { formatINR, formatIST } from '../lib/format';

interface AccountLicense {
  id: string;
  product_id: string;
  product_name: string;
  kind: string;
  plan: string;
  status: string;
  key: string;
  source_type: string;
  issued_at: number;
  expires_at: number | null;
  updates_until: number | null;
  revoked_reason: string | null;
  download_url?: string | null;
}

async function fetchAccountLicenses(): Promise<{ email: string; role: string; licenses: AccountLicense[] }> {
  const res = await apiFetch('/api/account/licenses');
  if (!res.ok) {
    throw new Error('Please sign in to view your licenses');
  }
  return res.json();
}

interface Device { id: string; device_name: string | null; product_name: string; activated_at: number; last_seen_at: number }
interface Receipt { id: string; product_name: string; amount_paise: number; refunded_paise: number; status: string; created_at: number }

async function getJson<T>(url: string): Promise<T> {
  const res = await apiFetch(url);
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

function formatDate(ts?: number | null) {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export const Account: React.FC = () => {
  const query = useQuery({
    queryKey: ['account-licenses'],
    queryFn: fetchAccountLicenses,
    retry: false,
  });

  const qc = useQueryClient();
  const devices = useQuery({ queryKey: ['account-devices'], queryFn: () => getJson<{ devices: Device[] }>('/api/account/devices'), enabled: query.isSuccess });
  const receipts = useQuery({ queryKey: ['account-receipts'], queryFn: () => getJson<{ receipts: Receipt[] }>('/api/account/receipts'), enabled: query.isSuccess });
  const removeDevice = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/account/devices/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Could not remove device');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['account-devices'] }),
  });

  const licenses = query.data?.licenses ?? [];

  if (query.isLoading) return null;
  if (query.isError) {
    return (
      <div className="mx-auto mt-16 max-w-md px-4 text-center">
        <h1 className="text-2xl font-extrabold">Sign in to see your licenses</h1>
        <p className="mt-3 text-sm text-[var(--color-muted)]">Use the email you bought with. Your keys, devices and receipts are here.</p>
        <div className="mt-6 flex justify-center"><AuthControls /></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-3 border-b border-[var(--color-border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-[var(--color-muted)]">Account</p>
          <h1 className="mt-2 text-3xl font-extrabold">My licenses</h1>
        </div>
        <div className="text-sm text-[var(--color-muted)]">Signed in as {query.data?.email}</div>
      </div>

      <div className="mt-8 space-y-5">
        {licenses.map((license) => (
          <div key={license.id} className="rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xl font-extrabold">{license.product_name}</p>
                <div className="mt-1 flex flex-wrap gap-2 text-sm text-[var(--color-muted)]">
                  <span>{license.kind}</span>
                  <span>•</span>
                  <span>{license.plan}</span>
                  <span>•</span>
                  <span className={license.status === 'active' ? 'text-emerald-600' : 'text-red-500'}>{license.status}</span>
                </div>
              </div>
              {license.download_url && (
                <a href={license.download_url} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-md border border-[var(--color-border-strong)] px-3 font-semibold">
                  Download
                </a>
              )}
            </div>

            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-[var(--color-muted)]">Issued</dt>
                <dd className="mt-1 font-medium">{formatDate(license.issued_at)}</dd>
              </div>
              <div>
                <dt className="text-[var(--color-muted)]">Updates until</dt>
                <dd className="mt-1 font-medium">{formatDate(license.updates_until)}</dd>
              </div>
              <div>
                <dt className="text-[var(--color-muted)]">Expires</dt>
                <dd className="mt-1 font-medium">{formatDate(license.expires_at)}</dd>
              </div>
              <div>
                <dt className="text-[var(--color-muted)]">License source</dt>
                <dd className="mt-1 font-medium">{license.source_type}</dd>
              </div>
            </dl>

            <div className="mt-4 rounded-md border border-[var(--color-border)] bg-black/5 p-3">
              <p className="mb-2 text-xs uppercase tracking-[0.15em] text-[var(--color-muted)]">License key</p>
              <code className="break-all text-[0.8rem] leading-relaxed">{license.key}</code>
            </div>

            {license.revoked_reason && (
              <p className="mt-4 text-sm text-red-600">
                {/refund/i.test(license.revoked_reason)
                  ? 'This purchase was refunded and the key no longer works.'
                  : `This key was revoked: ${license.revoked_reason}`}
              </p>
            )}
          </div>
        ))}
      </div>

      {licenses.length === 0 && <p className="mt-8 text-[var(--color-muted)]">No licenses on this email yet.</p>}

      <h2 className="mt-12 text-2xl font-extrabold">Devices</h2>
      <div className="mt-4 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
        {(devices.data?.devices ?? []).map((d) => (
          <div key={d.id} className="flex items-center justify-between gap-3 py-3 text-sm">
            <div>
              <p className="font-semibold">{d.device_name || 'Unnamed device'} · {d.product_name}</p>
              <p className="text-[var(--color-muted)]">Last seen {formatDate(d.last_seen_at)}</p>
            </div>
            <Button variant="outline" size="sm" disabled={removeDevice.isPending} onClick={() => removeDevice.mutate(d.id)}>
              Remove
            </Button>
          </div>
        ))}
        {devices.data?.devices.length === 0 && <p className="py-3 text-sm text-[var(--color-muted)]">No devices are using a seat.</p>}
      </div>
      {removeDevice.isError && <p role="alert" className="mt-2 text-sm text-red-600">Could not remove that device. Try again.</p>}

      <h2 className="mt-12 text-2xl font-extrabold">Receipts</h2>
      <div className="mt-4 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
        {(receipts.data?.receipts ?? []).map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3 py-3 text-sm">
            <div>
              <p className="font-semibold">{r.product_name} · {formatINR(r.amount_paise)}</p>
              <p className="text-[var(--color-muted)]">{formatIST(r.created_at)} · {r.status} · {r.id}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.print()}>Print</Button>
          </div>
        ))}
        {receipts.data?.receipts.length === 0 && <p className="py-3 text-sm text-[var(--color-muted)]">No payments yet.</p>}
      </div>

      <p className="mt-10 text-sm text-[var(--color-muted)]">
        Need a refund? Read the <Link to="/refunds" className="underline">refund policy</Link>.
      </p>
    </div>
  );
};
