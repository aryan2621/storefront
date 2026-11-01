import React from 'react';
import { LegalPage } from '../../components/LegalPage';
import { SUPPORT_EMAIL } from '../../lib/site';

export const Refunds: React.FC = () => (
  <LegalPage
    title="Cancellation & Refund Policy"
    updated="November 2026"
    sections={[
      {
        heading: 'Refund window',
        body: [
          'If a Pro licence does not meet your expectations, you can ask for a full refund within the refund window shown on the product page. No reason is required.',
          <>Email {SUPPORT_EMAIL} with:</>,
        ],
        list: [
          'Your purchase email address',
          'Your order ID (it starts with ord_ and is on your thank-you page; if you no longer have it, the payment ID from your receipt works too)',
        ],
      },
      {
        heading: 'What happens next',
        body: [
          'Refund requests are reviewed by email. Once a refund is issued, the key is marked revoked. Official builds disable it at their next successful licence check; if the service is unreachable, the app may allow up to 30 days of offline use after the last successful check.',
          'Once approved, the refund goes back to your original payment method (bank account, UPI handle, or card) via Razorpay. It usually shows up within 5 to 7 business days, depending on your bank. You will get a confirmation email.',
        ],
      },
    ]}
  />
);
