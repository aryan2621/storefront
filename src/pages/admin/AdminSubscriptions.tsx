import React from 'react';
import { AdminTablePage } from './AdminTablePage';
import { formatIST } from '../../lib/format';

export const AdminSubscriptions: React.FC = () => (
  <AdminTablePage
    title="Subscriptions"
    endpoint="/api/admin/subscriptions"
    columns={[
      { key: 'id', label: 'ID' },
      { key: 'email', label: 'Customer' },
      { key: 'product_name', label: 'Product' },
      { key: 'status', label: 'Status', status: true },
      { key: 'current_end', label: 'Next charge', render: (r) => formatIST(r.current_end) },
    ]}
  />
);
