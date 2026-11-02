import React from 'react';
import { AdminTablePage } from './AdminTablePage';

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const countryLabel = (code?: string | null) => {
  if (!code || code === 'Unknown') return 'Unknown';
  try {
    return `${regionNames.of(code)} (${code})`;
  } catch {
    return code;
  }
};
const date = (ms?: number | null) => (ms ? new Date(ms).toLocaleString() : '');

export const AdminAnalytics: React.FC = () => (
  <div className="space-y-12">
    <AdminTablePage
      title="Countries"
      endpoint="/api/admin/analytics/countries"
      columns={[
        { key: 'country', label: 'Country', render: (r) => countryLabel(r.country) },
        { key: 'users', label: 'Users', numeric: true },
        { key: 'views', label: 'Page views', numeric: true },
      ]}
    />
    <AdminTablePage
      title="Users"
      endpoint="/api/admin/analytics/users"
      columns={[
        { key: 'email', label: 'Email' },
        { key: 'country', label: 'Country', render: (r) => (r.country ? countryLabel(r.country) : r.analytics_consent ? 'Unknown' : 'No consent') },
        { key: 'buyer', label: 'Buyer', render: (r) => (r.buyer ? 'Yes' : 'No') },
        { key: 'first_seen_at', label: 'First seen', render: (r) => date(r.first_seen_at) },
        { key: 'last_seen_at', label: 'Last seen', render: (r) => date(r.last_seen_at) },
      ]}
    />
  </div>
);
