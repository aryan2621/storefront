import React from 'react';
import { AdminTablePage } from './AdminTablePage';
import { formatIST } from '../../lib/format';

export const AdminEvents: React.FC = () => (
  <AdminTablePage
    title="Webhook events"
    endpoint="/api/admin/events"
    columns={[
      { key: 'type', label: 'Event' },
      { key: 'received_at', label: 'Received', render: (r) => formatIST(r.received_at) },
      { key: 'error', label: 'Error' },
    ]}
  />
);
