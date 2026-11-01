import React from 'react';
import { AdminTablePage } from './AdminTablePage';
import { useAdminAction } from './adminAction';
import { Button } from '../../components/ui/button';

export const AdminLicenses: React.FC = () => {
  const action = useAdminAction();
  const run = (id: string, verb: 'revoke' | 'resend') => action.mutate({ url: `/api/admin/licenses/${id}/${verb}` });
  return (
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
  );
};
