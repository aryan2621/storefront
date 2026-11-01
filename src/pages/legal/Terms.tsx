import React from 'react';
import { LegalPage } from '../../components/LegalPage';
import { SUPPORT_EMAIL } from '../../lib/site';

export const Terms: React.FC = () => (
  <LegalPage
    title="Terms and Conditions"
    updated="November 2026"
    sections={[
      {
        heading: 'What you buy',
        body: [
          'A Pro licence is a key for one app. A one-time purchase includes one year of updates for official builds. The version you bought stays usable after that; newer official builds need a renewed key to unlock Pro.',
          'The price and update period are shown on the product page before you pay. Prices are in INR.',
        ],
      },
      {
        heading: 'Keys and devices',
        body: [
          'A key is checked with a signature and activated online on each device. Each product has a device limit shown on its page (Murmur and Capturita: 2 devices). You can free a seat by removing a device in your account or in the app, or by emailing support.',
          'The app re-checks about daily. If the licence service is unavailable, it allows up to 30 days since the last successful check for offline use. A key is for one person. Do not share or resell keys; shared keys can be revoked.',
        ],
      },
      {
        heading: 'Payments and refunds',
        body: ['Payments are processed by Razorpay. This site does not receive or store card or UPI credentials. Refunds are available within 14 days; see the refund policy.'],
      },
      {
        heading: 'Use of the site',
        body: [
          'Do not use the website or checkout to interfere with the service, evade payment, or submit someone else’s personal information. The website and its content are provided as-is, subject to applicable law.',
          'These terms are governed by the laws of India.',
        ],
      },
      { heading: 'Questions', body: [<>Questions about these terms or your purchase? Contact {SUPPORT_EMAIL}.</>] },
    ]}
  />
);
