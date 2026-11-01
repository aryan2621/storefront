# Landing sites vs storefront

Reference: **Capturita's landing** (`capturita/landing`). Murmur's landing is almost identical. Orbit IDE's landing is older: no device activation, no key recovery, no Turnstile. Everything below is checked against those folders, not guessed.

## The split

| Landing site (one per app) | Storefront (this repo) |
|---|---|
| What the app is, features, screenshots, changelog | Pay for a Pro licence |
| Free download and install steps | Issue and email the licence key |
| Troubleshooting and "how do I use it" help | Customer account: keys, devices, receipts |
| What the app does with your files (app privacy) | Device seats: activate, deactivate, free a seat |
| A **Buy** button that sends people to storefront | Refunds, revoke, re-send, customer lookup (admin) |
| | Terms, refund policy, purchase privacy, contact (common to all apps) |

Rule of thumb: about the product → landing. About money or the key → storefront.

## Links a landing page should use

Storefront URL below is `<storefront>` (today `https://storefront.just-a-dev.workers.dev`).

| Where on the landing | Link to |
|---|---|
| Every **Buy** / **Get Pro** button (nav, pricing, home) | `<storefront>/p/<product-id>` (ids: `capturita`, `murmur`, `orbit-ide`, ...) |
| "Lost your key?", "Manage devices", "Receipts" | `<storefront>/account` (signed-in account) |
| Terms, Refund policy | `<storefront>/terms`, `<storefront>/refunds` |
| Contact for purchases | `<storefront>/contact` |

Each product row in storefront needs `landing_url` (where "Back to the app" returns after payment) and `allowed_origins` (the landing's origin) set from Admin → Products. Both are editable on Admin → Products (allowed origins is comma-separated).

## What moves from Capturita to storefront

| Capturita landing (today) | In storefront | Status |
|---|---|---|
| `worker/index.ts` `/api/checkout`, `/api/payments/verify` | `/api/checkout`, `/api/verify`, Buy dialog | Done |
| `worker/webhooks.ts` Razorpay (`payment.captured`, `order.paid`, `refund.processed`) | `worker/webhooks.ts` | Done |
| `worker/fulfill.ts` issue licence, email key | `worker/fulfill.ts` (one licence per order is enforced by a unique index) | Done |
| `worker/license.ts` Ed25519 signing | `worker/license.ts`, one shared key (`LICENSE_KEY`); a product can override it with `LICENSE_KEY_<ID>` | Done |
| `worker/activation.ts` 2-device limit, 30-day offline | `worker/activation.ts`, `/api/licenses/activate` and `/deactivate` | Done |
| `worker/refund.ts` + `/api/admin/refund` (bearer `ADMIN_TOKEN`) | Admin → Payments → Refund (Clerk login, refund window, email to buyer, audit log) | Done |
| `/api/admin/orders` | Admin pages: payments, customers, licenses, lookup, products, audit | Done |
| `Success.tsx` (key, key file, receipt, "refunded" state) | `Success.tsx`: key, key file, printable receipt, refunded / invalid / timeout states, back-to-app link | Done |
| `Terms`, `Refunds`, purchase part of `Privacy` | `/terms`, `/refunds`, `/privacy` (written from Capturita's wording) | Done |
| `RecoverKey.tsx` (email + payment ID, signed out) | Account page after Clerk sign-in. Signed-out recovery was dropped on purpose | Replaced |
| `ADMIN_TOKEN` | Clerk admin list (`ADMIN_EMAILS`) | Replaced |
| `ORDER_TOKEN_SECRET` signed order link | Same: `/api/orders/:id?t=<token>`, 7-day expiry, secret `ORDER_TOKEN_SECRET` | Done |

## Pricing: read it from storefront, don't hard-code it

Landing pages can show the live price from storefront's public endpoint, so price changes in Admin → Products reach every landing page with no redeploy:

```
GET <storefront>/api/products/<product-id>
-> { product: { id, name, tagline, kind, price_paise, period, updates_months, max_devices, refund_window_days, download_url, image_url, landing_url } }
```

It is public (CORS is open for `/api`) and returns only safe fields, never plan ids or allowed origins. Divide `price_paise` by 100 for rupees. Buying still charges the price stored on the server, whatever the page shows.

## How accounts are linked (so the landing's "my key" links make sense)

Buying needs a signed-in account (Clerk); the email comes from the verified token, not a form field, and the customer row is tied to that **Clerk user id**, so another Clerk user with the same email sees nothing. Customers created before this change are claimed on their first sign-in with the same email. The admin is also just a customer for purchases: buying with the admin email shows up under My licenses.

## Before the first cut-over

1. **Razorpay webhook:** point it at `<storefront>/api/webhooks/razorpay` for `payment.captured`, `order.paid` and `refund.processed`.
2. **Same signing key:** storefront's `LICENSE_KEY` (shared by all products; create with `pnpm keygen`) must be the private key whose public half is built into the app, and `license_kid` must match, or old keys stop verifying. There are no customers yet, so a new pair is fine now; after the first sale a key change needs a new app release.
3. **Product fields:** set `landing_url` and `allowed_origins` for each product (Admin → Products).
4. **Secrets:** `ORDER_TOKEN_SECRET`, Razorpay keys, `BREVO_API_KEY`, `LICENSE_KEY` as Worker secrets.
5. **Download links:** private app repos (Murmur, Orbit IDE) have no public releases; downloads live in `aryan2621/downloads` (`?q=murmur`, `?q=orbit`, `?q=capturita`), and storefront's seed now uses those.

Receipts are printable pages, not PDFs (decided: print is enough). Tests live in `worker/__tests__`.

## What to remove from a landing page after cut-over

Capturita landing, once storefront is live and the app points at it:

- **Whole `worker/` folder**, `migrations/`, the D1 database, `wrangler.jsonc` rate-limit and secret setup, and these secrets: `RAZORPAY_*`, `LICENSE_PRIVATE_KEY`, `LICENSE_PUBLIC_KEY_RAW`, `ADMIN_TOKEN`, `ORDER_TOKEN_SECRET`, `TURNSTILE_SECRET`.
- **Components and files:** `Buy.tsx`, `RecoverKey.tsx`, `receipt.ts`, `useTurnstile.ts`, `pages/Success.tsx`, and the checkout parts of `api.ts`.
- **Tests that move with the worker:** `activation`, `api`, `crypto-license`, `fulfill`, `refund-admin`, `receipt`.
- **Pages:** `Terms.tsx` and `Refunds.tsx` (link to storefront instead). In `Privacy.tsx` delete the purchase-data paragraph and the "Pro status" licence-check paragraph; keep what the app does with recordings, captions, AI and uploads.
- **Pricing and Support copy:** keep "what Pro includes" text and show the price from storefront's public endpoint (above); replace the Buy button with the storefront link, and the "Pro key is not accepted" help keeps its device advice but points to `<storefront>/account` to remove a device.

## What stays on a landing page

Home, Features, Pricing display (price, free vs Pro, FAQ), Download/Install with installer detection (`useInstaller.ts`), changelog, Support troubleshooting, app-specific privacy, footer, 404. Show the price from storefront's public product endpoint.

## Per-app notes

- **Capturita:** the model for the rest. Pro is ₹999 one-time, 2 Macs, 14-day refund, one year of updates.
- **Murmur:** same worker and pages as Capturita, plus `changelog.ts`. Pro is ₹999, 2 devices, 30 days offline.
- **Orbit IDE:** no activation, recovery or Turnstile yet, and its `EULA.md`, `REFUND.md` and pricing still say `TODO`. The storefront price is ₹1,499 (confirmed by the owner). Its app must first get the activation client before the storefront device limit means anything.
- **Other apps** (dev-tools, agentic-browser, and the hidden ones): follow Capturita. Nothing was checked in their repos for this document.
