import React from 'react';
import { LegalPage } from '../../components/LegalPage';
import { SUPPORT_EMAIL } from '../../lib/site';

export const Privacy: React.FC = () => (
  <LegalPage
    title="Privacy Policy"
    updated="November 2026"
    sections={[
      {
        heading: 'What this site stores',
        body: [
          'For a purchase, this site stores your email address, optional name and phone number, payment and order IDs, amount, dates, your licence key, any billing state and GSTIN you provide, the Razorpay payment records we receive for your order, and the devices it is activated on (hashed device ID, device name and last-seen time). We use it to deliver your purchase, provide support, process refunds and enforce the device limit.',
          'Payment details are handled by Razorpay and are not stored here. Purchase data is not sold or used for marketing.',
        ],
      },
      {
        heading: 'Licence checks in the apps',
        body: [
          'Official builds send your licence key, a one-way hash of your device’s hardware ID and the device name to the licence service when activating and regularly afterwards. This limits a key to its device count and lets us disable refunded keys. The hash cannot be reversed into the hardware ID. No app content is sent for this check.',
        ],
      },
      {
        heading: 'Cookies and analytics',
        body: [
          'A cookie records your cookie choice, and Clerk sets its own cookies when you sign in. When you sign in we keep your account email and when you last visited, whatever you choose. If you accept analytics, we also count page views and store the country you visit from (taken from Cloudflare, with no IP address stored) so we can see where our users are. If you choose necessary only, no page views or country are stored, and withdrawing consent later from Cookie settings in the footer clears the country stored on your account (page-view counts already recorded are kept without your account details being added). Signing in and paying work either way.',
        ],
      },
      {
        heading: 'Services we use',
        body: [
          'Razorpay processes payments. Clerk handles sign-in to your account, and purchase emails are sent through Brevo (or Resend as a fallback), so your email address is shared with them for those purposes. Cloudflare hosts the site and processes checkout requests; when configured, Cloudflare Turnstile helps prevent automated checkout abuse. Fonts load from Google Fonts and the payment window loads from Razorpay, so those services see your IP address when you visit. The site does not use advertising trackers.',
        ],
      },
      {
        heading: 'Your data',
        body: [<>To ask about or request deletion of purchase data where legally permitted, email {SUPPORT_EMAIL}. Records we must keep by law may be retained.</>],
      },
      {
        heading: 'Each app',
        body: ['What an app does with your files and content is covered by that app’s own privacy page.'],
      },
    ]}
  />
);
