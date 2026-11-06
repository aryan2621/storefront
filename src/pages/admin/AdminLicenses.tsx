import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api-fetch';
import { AdminTablePage } from './AdminTablePage';
import { useAdminAction } from './adminAction';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

/** Issue a Pro key for any product without a payment (testing, gifts, support). The key is shown once to copy and is also listed below. */
const GrantLicense: React.FC = () => {
  const action = useAdminAction();
  const products = useQuery({
    queryKey: ['admin', '/api/admin/products'],
    queryFn: async () => ((await (await apiFetch('/api/admin/products')).json()).products as { id: string; name: string }[]),
  });
  const [email, setEmail] = useState('');
  const [productId, setProductId] = useState('');
  const [key, setKey] = useState('');
  const chosen = productId || products.data?.[0]?.id || '';
  const grant = () =>
    action.mutate(
      { url: '/api/admin/licenses', body: { email, product_id: chosen, plan: 'pro' } },
      { onSuccess: (d: { key: string }) => { setKey(d.key); setEmail(''); } },
    );
  return (
    <div className="mb-6 space-y-3 border border-[var(--color-border-strong)] p-4">
      <h2 className="text-base font-medium">Grant a license</h2>
      <div className="flex flex-wrap items-center gap-2">
        <Input className="w-64" type="email" placeholder="Customer email" aria-label="Customer email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <select className="h-10 border border-[var(--color-border-strong)] bg-transparent px-2" aria-label="Product" value={chosen} onChange={(e) => setProductId(e.target.value)}>
          {(products.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <Button size="sm" disabled={action.isPending || !email || !chosen} onClick={grant}>Grant</Button>
      </div>
      {key && <textarea readOnly className="w-full border border-[var(--color-border-strong)] bg-transparent p-2 font-mono text-xs" rows={3} value={key} onFocus={(e) => e.currentTarget.select()} aria-label="New license key" />}
    </div>
  );
};

export const AdminLicenses: React.FC = () => {
  const action = useAdminAction();
  const run = (id: string, verb: 'revoke' | 'resend') => action.mutate({ url: `/api/admin/licenses/${id}/${verb}` });
  return (
    <>
    <GrantLicense />
    <AdminTablePage
      title="Licenses"
      endpoint="/api/admin/licenses"
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'customer_email', label: 'Email' },
        { key: 'product_name', label: 'Product' },
        { key: 'status', label: 'Status', status: true },
        { key: 'source_type', label: 'Source' },
        {
          key: 'actions',
          label: '',
          render: (r) => (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={action.isPending} onClick={() => run(r.id, 'resend')}>
                Re-send
              </Button>
              {r.status === 'active' && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={action.isPending}
                  onClick={() => window.confirm(`Revoke ${r.id}?`) && run(r.id, 'revoke')}
                >
                  Revoke
                </Button>
              )}
            </div>
          ),
        },
      ]}
    />
    </>
  );
};
