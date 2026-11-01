import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api-fetch';
import { useAdminAction } from './adminAction';
import { AdminState } from './AdminTablePage';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { formatINR, formatIST } from '../../lib/format';

export const AdminLookup: React.FC = () => {
  const [input, setInput] = useState('');
  const [email, setEmail] = useState('');
  const action = useAdminAction();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'lookup', email],
    enabled: !!email,
    retry: false,
    queryFn: async () => {
      const res = await apiFetch(`/api/admin/customer-lookup?email=${encodeURIComponent(email)}`);
      if (!res.ok) throw new Error(res.status === 404 ? 'No customer with that email.' : 'Lookup failed.');
      return res.json();
    },
  });

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Customer lookup</h1>
      <form
        className="mt-4 flex max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setEmail(input.trim().toLowerCase());
        }}
      >
        <Input type="email" required placeholder="buyer@example.com" value={input} onChange={(e) => setInput(e.target.value)} />
        <Button type="submit">Look up</Button>
      </form>

      {email && (isLoading || isError) && <AdminState loading={isLoading} error={false} />}
      {isError && <p role="alert" className="mt-4 text-sm text-red-600">{(error as Error).message}</p>}

      {data && (
        <div className="mt-6 space-y-8 text-sm">
          <section>
            <h2 className="text-xl font-extrabold">Licenses</h2>
            {data.licenses.map((l: any) => (
              <p key={l.id} className="mt-1">{l.product_name} · {l.status} · <code>{l.id}</code></p>
            ))}
          </section>
          <section>
            <h2 className="text-xl font-extrabold">Devices (seats in use)</h2>
            {data.devices.length === 0 && <p className="mt-1 text-[var(--color-muted)]">None.</p>}
            {data.devices.map((d: any) => (
              <div key={d.id} className="mt-1 flex items-center gap-3">
                <span>{d.device_name || 'Unnamed'} · last seen {formatIST(d.last_seen_at)}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={action.isPending}
                  onClick={() => action.mutate({ url: `/api/admin/activations/${d.id}/free` })}
                >
                  Free seat
                </Button>
              </div>
            ))}
          </section>
          <section>
            <h2 className="text-xl font-extrabold">Payments</h2>
            {data.payments.map((p: any) => (
              <p key={p.id} className="mt-1">{formatINR(p.amount_paise)} · {p.status} · {formatIST(p.created_at)} · <code>{p.id}</code></p>
            ))}
          </section>
          <section>
            <h2 className="text-xl font-extrabold">Orders</h2>
            {data.orders.map((o: any) => (
              <p key={o.id} className="mt-1">{o.product_id} · {o.status} · {formatIST(o.created_at)}</p>
            ))}
          </section>
        </div>
      )}
    </div>
  );
};
