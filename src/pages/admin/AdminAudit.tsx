import React from 'react';
import { AdminTablePage } from './AdminTablePage';
import { formatIST } from '../../lib/format';

export const AdminAudit: React.FC = () => (
  <AdminTablePage
    title="Audit log"
    endpoint="/api/admin/audit"
    columns={[
      { key: 'at', label: 'When', render: (r) => formatIST(r.at) },
      { key: 'actor_email', label: 'Admin' },
      { key: 'action', label: 'Action' },
      { key: 'target', label: 'Target' },
    ]}
  />
);
