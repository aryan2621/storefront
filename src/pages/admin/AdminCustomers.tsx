import React from 'react';
import { AdminTablePage } from './AdminTablePage';
import { formatINR } from '../../lib/format';

export const AdminCustomers: React.FC = () => (
  <AdminTablePage
    title="Customers"
    endpoint="/api/admin/customers"
    columns={[
      { key: 'email', label: 'Email' },
      { key: 'license_count', label: 'Licenses', numeric: true },
      { key: 'total_spent_paise', label: 'Spent', numeric: true, render: (r) => formatINR(r.total_spent_paise) },
    ]}
  />
);
