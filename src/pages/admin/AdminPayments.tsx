import React from 'react';
import { AdminTablePage } from './AdminTablePage';
import { useAdminAction } from './adminAction';
import { Button } from '../../components/ui/button';
import { formatINR, formatIST } from '../../lib/format';

export const AdminPayments: React.FC = () => {
  const action = useAdminAction();
  return (
    <AdminTablePage
      title="Payments"
      endpoint="/api/admin/payments"
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'customer_email', label: 'Customer' },
        { key: 'product_name', label: 'Product' },
        { key: 'amount_paise', label: 'Amount', numeric: true, render: (r) => formatINR(r.amount_paise) },
        { key: 'status', label: 'Status', status: true },
        { key: 'created_at', label: 'Date', render: (r) => formatIST(r.created_at) },
        {
          key: 'actions',
          label: '',
          render: (r) =>
            r.status === 'captured' && (
              <Button
                variant="outline"
                size="sm"
                disabled={action.isPending}
                onClick={() =>
                  window.confirm(`Refund ${formatINR(r.amount_paise)} to ${r.customer_email}? This revokes the key and emails them.`) &&
                  action.mutate({ url: `/api/admin/payments/${r.id}/refund` })
                }
              >
                Refund
              </Button>
            ),
        },
      ]}
    />
  );
};
