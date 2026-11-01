# Storefront: requirements

Status: partly built. See "Implementation status" below (code skim on 2026-11-01, nothing run or tested).
Items marked **[verify]** come from a quick skim of the code and must be confirmed before work starts.
Items marked **[proposal]** are suggestions the owner has not yet approved.

## Implementation status

**Covered (code exists, not yet tested)**
- §4/§5: Clerk token verification, `ADMIN_EMAILS` list, one shared admin middleware (403), `GET /api/me`, dev bypass ignored on deployed URLs, legacy admin login removed.
- §7.1: product columns (`max_devices`, `offline_grace_days`, `refund_window_days`, `license_kid`, `landing_url`, `allowed_origins`, `download_url`); per-product keys via `LICENSE_KEY_<ID>`.
- §7.2: `activations` table, `/api/licenses/activate` and `/deactivate`, seat limit.
- §7.3: `/api/account/licenses` and an Account page (licenses only).
- §7.4: admin routes for overview, payments, customers, licenses, subscriptions, events, coupons, CSV, product patch, issue, resend, revoke, refund, audit writes.
- §7.5: product `allowed_origins` check; subscriptions code and cron.
- §7.6: Brevo and Resend senders. §7.7: legal pages.

**Added 2026-11-01 (typechecked, 25 admin-guard tests pass, run locally; not tested against real Clerk or Razorpay)**
- Removed: public product list, `/api/license/resend` and `Recover.tsx`, `PassPage`, All-Apps seed row, global signing key vars, singular activation aliases, `RESEND_LIMITER`.
- Refund enforces the refund window, revokes by payment, emails the buyer. Added free-seat, customer lookup, per-product sales, audit log routes and admin pages (lookup, products settings, audit; refund, revoke, re-send buttons).
- Account page: licenses, devices with Remove, receipts, refund-policy link, refunded-key message. Sign-in through Clerk (`VITE_CLERK_PUBLISHABLE_KEY`); Home shows account links only when signed in.
- Activation: seat check is now inside the INSERT; token now carries the product's `kid` (it was missing).
- Checkout needs an Origin header, accepts same-origin and the product's `allowed_origins`; success page links back to the landing URL. Renewal reminder email in the daily cron.

**Also added**
- Email sender is Brevo (`BREVO_API_KEY`), with Resend as the fallback for after a domain exists. A Gmail SMTP sender was tried and removed.
- Migration 0004: one license per paid order. A racing duplicate webhook used to issue two keys; it now reuses the first.
- Activation tests on real SQLite (revoked key, bad device id, seat-limit race, free a seat, token `kid`) and a duplicate-webhook test. Device ids must now be 64-hex.
- Decision: `/api/license/refresh` stays. It re-checks a signed key daily (revoked or expired), which is separate from device seats in `/api/licenses/*`.

**Still left**
- Dashboard work: Clerk session token claims (`email`, `email_verified`), Razorpay test keys, a Brevo API key.
- Browser test of the UI, then real Clerk, Razorpay and Gmail runs.
- Outside this repo: §8 landing cleanup, §9 desktop changes, §10 vault backups and rotation docs, §13 domain and live Clerk.

## 1. Purpose

Storefront becomes the single back office for every desktop product (Murmur, Capturita, Orbit IDE, and later ones). It handles everything about **money and licenses**, for both the owner (admin) and the buyers (customers).

Each product keeps its own **landing site**, which only provides information and the app download. All purchasing, license recovery, device management and refunds happen in storefront.

**Rule of thumb**
- About the product (what it is, how it looks, how to install it): landing site.
- About the customer's money or key (paying, refunding, devices, recovering a key): storefront.

## 2. Goals and non-goals

**Goals**
- One place to add a product, set its price, and see all sales.
- Customers can buy, sign in, see their keys and devices, remove a device, and get a lost key back without contacting the owner.
- The owner can refund, revoke, re-send a key and free a seat from an admin screen.
- Adding a new product means one new row in storefront plus one new landing page. No new backend.

**Non-goals**
- A public "browse all products" store. Storefront is not a marketplace, so it never lists every product on a home page.
- Passwords. Customers and admin sign in through Clerk only.
- The All-Apps Pass (dropped for now, see section 13).
- Migrating existing customers. There are none yet, so no migration or backward compatibility is required.

**Anti-goals** (failures even if it technically works)
- A customer-facing change or bug that exposes admin routes.
- Losing a product's signing key. Server secrets cannot be read back, so keys must be backed up (section 10).

## 3. Who uses what

### Storefront

| User | What they do there |
|---|---|
| Customer | Pay at checkout, receive the key on screen and by email, sign in, see keys, receipts and devices, remove a device, view the refund policy. A lost key is recovered by signing in (no emailed copy). |
| Admin (owner) | Dashboard of sales per product, customer lookup by email, refund (revokes the key and emails the buyer), revoke a key, re-send a key, free a seat, edit product settings, view the audit log. |
| Desktop app | Activate, deactivate and refresh a license against one shared URL. |

### Landing sites (one per product)

| User | What they do there |
|---|---|
| Visitor / customer | Learn about the product, see screenshots, read the FAQ and docs, download the app, click **Buy** (which opens storefront), follow links to storefront's account and recovery pages. |
| Admin (owner) | Edit that product's copy, screenshots, changelog and download links. No money or license management. |

## 4. Customer and admin separation

**One site, one sign-in, two views (decided).** Admin and customers use the same storefront and the same Clerk sign-in. Who is an admin is decided by the **server**, not by the browser.

- **Hard-coded admin list.** The server holds a fixed list of admin email addresses (for example the secret `ADMIN_EMAILS`, kept in the Worker's configuration, never in the front end bundle and never editable from the UI). Changing the list needs a deploy or a secret change.
- **Admin check.** An admin is a user who is signed in through Clerk **and** whose **verified** email is in that list. The server checks this on every admin request by verifying the Clerk session token, reading the verified email from it, and comparing it with the list. It never trusts an email, role or flag sent by the browser.
- **Which UI shows.** After sign-in, the app asks the server `GET /api/me`, which returns `{ role: "admin" | "customer" }`. Admin sees the admin UI, everyone else sees the customer UI. This only chooses what to display and is **not** the security. The security is the server check in the next point.
- **Server enforces everything.** Every admin API route (`/api/admin/*`: refund, revoke, re-send key, free a seat, product settings, audit log, customer lookup) rejects any caller who is not on the admin list, with a 403, whatever the UI shows. A customer who edits the front end or calls an admin URL directly gets nothing.
- **Customers only reach their own data.** Every customer API route filters by the signed-in user's verified email. No route takes an email or customer id from the request to decide whose data to return.
- **Admin email safety.** Because access depends on the admin's email, the admin's Clerk account must use a verified email, with 2-step verification (MFA) switched on in Clerk. The admin list must hold exact, lower-cased addresses.
- **Audit.** Every admin action is written to the audit log with the admin's email.
- `ADMIN_DEV_BYPASS` must be `false` in every deployed environment. Remove the bypass from production builds entirely if practical.
- **Optional extra layer [proposal]:** put the `/admin` path behind **Cloudflare Access** later, once a domain exists. It is not required for the first release.

**Trade-off to accept:** with one site, a mistake in the admin check would expose admin routes to customers. That is why the check must live in one shared server function used by every admin route, and why section 12 includes tests that a customer session is refused on each admin route.

## 5. Authentication (Clerk)

**Clerk runs in dev mode for now (decided).** It works without a custom domain, on `*.workers.dev` and localhost, but is capped at about 500 users and shows a development banner. Before the first real sale, move to a live Clerk instance, which needs an owned domain and new keys.

- **Customers:** sign in with the purchase email through Clerk (email code or link). Clerk sends its own sign-in email.
- **Identity link:** a customer is matched to storefront data by their **verified** email address. A Clerk user whose email is not verified must see nothing.
- **Admin:** signs in through Clerk like any customer. The server then recognises them by the hard-coded admin email list (section 4).
- The worker must verify Clerk session tokens itself (signature and expiry through Clerk's published keys). It must never trust an email or role sent by the browser.
- **Signed-out purchase must still work.** A buyer can pay without an account. After payment the key is shown on screen and emailed. The account is only needed to come back later.
- Remove the legacy admin login (see section 6).

Session lengths are still open (section 13). Default proposal: Clerk defaults for customers, 8 hours for admin.

## 6. What to remove from storefront

All **[verify]** against the code before deleting.

- Legacy admin login flows are removed; Clerk plus Cloudflare Access are the supported paths.
- The public all-products catalog: the product grid on the home page and `/api/products` as a public list. Keep a single-product buy view (section 7).
- The single global signing key (`LICENSE_PRIVATE_KEY`, `LICENSE_PUBLIC_KEY*`). Replace with one key per product (section 7).
- The unauthenticated customer email form for recovery (`/api/license/resend`, `Recover.tsx`), replaced by the signed-in account page. There is no signed-out recovery (decided).
- `ADMIN_DEV_BYPASS` in production configuration.
- The `app-license/` client libraries, only if each product's app will use its own activation client instead. Otherwise keep and extend them.
- Anything in the public deployment that serves admin routes.

## 7. What to add to storefront

### 7.1 Per-product configuration
- Extend the `products` table with: `max_devices`, `offline_grace_days` (default 30), `refund_window_days` (default 14), `license_kid`, and a link to the landing site URL and download URL (already partly present).
- A per-product signing key. Store the private key as a secret named per product (for example `LICENSE_KEY_<PRODUCT_ID>`), and publish only the public key. Sign each license with the right key, and put `product` and `kid` in the payload.
- The existing `kind` (one-time or subscription) stays.

### 7.2 Device seats and activation
Port the tested logic from Murmur's worker (`landing/worker/activation.ts`) into storefront, keyed by product.
- New `activations` table: license id, device id (64-hex hash from the app), device name, activated at, last seen, deactivated at. One unique row per license and device.
- `POST /api/licenses/activate`: takes or refreshes a seat, race-safe (the seat count check lives inside the write). Returns a signed, device-bound token with a 30-day expiry. Handles `invalid_key`, `revoked`, and `seat_limit` (listing the devices).
- `POST /api/licenses/deactivate`: frees a seat by device hash or by activation id.
- Rate limiting and a bot check on these routes, as in the existing sites.
- Replace the existing `/api/license/refresh` if it overlaps **[verify]**.

### 7.3 Customer account (Clerk)
- Pages: **My licenses** (key, product, status, updates-until), **Devices** (list, with a Remove button), **Receipts** (download or print), **Refund policy**.
- Show a clear message when a key was refunded and no longer works.
- **Recover key is sign-in only (decided).** A buyer who lost their key signs in with Clerk and sees their keys. There is no signed-out email-the-key flow.

### 7.4 Admin panel
Extend the existing admin screens (`AdminOverview`, `AdminCustomers`, `AdminLicenses`, `AdminPayments`, `AdminSubscriptions`) with:
- Sales and refunds per product.
- **Customer lookup by email**: orders, licenses, devices, payments in one view.
- **Refund** button: enforces the product's refund window, calls Razorpay, revokes the license, emails the customer, and records an audit entry.
- **Revoke**, **re-send key**, **free a seat**.
- **Product settings** (price, devices, updates period, refund window).
- **Audit log** of every admin action (the `admin_audit` table already exists).

### 7.5 Checkout that works from another site
- Checkout takes a product id and opens as a popup or redirect from a product's landing site, then returns the buyer to a configured landing URL.
- Each product has an **allowed origins** list so only its own landing site can start a checkout.
- Keep: server-side pricing, idempotent fulfillment, the Razorpay webhook, coupons, Turnstile.
- **Subscriptions and renewals are in the first release (decided).** Keep the existing subscription code (`worker/subscriptions.ts`), and make sure activation and refunds also handle subscription licenses (a cancelled or failed subscription ends the license at the paid period's end).

### 7.6 Emails (Resend)
Keep the existing transactional email code, and add or confirm:
- Purchase (key and receipt), refund confirmation, key re-send.
- Subscription started, renewed, failed and ended emails (the templates already exist), and a renewal reminder before updates end.
- Clerk sends its own sign-in emails, so storefront does not send sign-in codes. Clerk cannot send storefront's own emails.
- **Sender (decided):** until a domain is owned, use **Brevo's HTTP API** with a verified Gmail address as the sender (free tier about 300 a day; mail may land in spam). Gmail SMTP through a Workers add-on is the fallback. Before launch, buy a domain and send through **Resend** on it (or Cloudflare's send binding after checking its current status).
- The success page shows the key right after payment, and the account page keeps it, so a delayed email never loses a buyer their key.

### 7.7 Legal pages
- Generic Terms, Privacy and Refund policy for purchases live in storefront.
- Each landing site adds only its product-specific text (EULA, third-party notices) and links to storefront for purchase terms.

## 8. What stays on each landing site

Keep: home page, features, screenshots, hero, changelog, FAQ, install and download page, support page, product-specific legal files.

Remove, once storefront is live:
- The Buy dialog and checkout code, Success page, Recover page, and the receipt PDF.
- The whole `worker/` folder, D1 database, migrations, rate limiters, and Razorpay and license secrets.
- The license tests that move to storefront.

Replace with:
- A **Buy** button linking or popping up storefront's checkout for the product id.
- Links to storefront's **My licenses** and **Recover key** pages.
- Pricing text that reads from a single value in storefront if practical, otherwise kept in sync by hand.

## 9. Desktop app changes (per product)

- Point the app's activation URL at storefront (`/api/licenses/activate`, `/api/licenses/deactivate`).
- Include the `product` id in requests. Storefront picks the signing key by it.
- Embed that product's public key in the build (already done for Murmur via `MURMUR_LICENSE_PUBKEY`).
- Behaviour stays as it is: activate with the key, daily refresh, up to 30 days offline, cleared on refund or revoke.
- Because there are no customers yet, public keys may be regenerated now. Do this before any real sale. After the first sale, a key change needs a new app release.

## 10. Secrets and backup

- Each product's private signing key, plus the admin and Razorpay secrets, must have an **encrypted offline backup** in the `vault` repo (`storefront/dev.vars.enc`, plus one entry per product key). Cloudflare secrets cannot be read back.
- Document how to rotate a product's signing key (`license_kid`).
- Clerk keys: a publishable key in the front end, and the secret key only as a Worker secret.

## 11. Rollout order

1. Storefront: per-product keys, activation tables and API, with tests ported from Murmur.
2. Storefront: Clerk sign-in, then the customer account pages.
3. Storefront: hard-coded admin email list, `/api/me`, one shared admin check on every admin route, admin and customer UI, remove legacy admin login.
4. Storefront: admin additions (refund with revoke and email, customer lookup, seat controls).
5. Storefront: cross-site checkout and allowed origins.
6. Move **Murmur** first: new Buy button, remove its worker, re-point its desktop build, end-to-end test (buy, activate, remove device, refund, recover).
7. Move **Capturita** and **Orbit IDE** the same way.
8. Back up all keys to the vault, then go live.

Rough effort: 7 to 14 working days in total, around 10 as the working estimate. Adding subscriptions to the first release adds about 1 to 2 days of testing, so plan for 8 to 16.

## 12. Acceptance checks

- A new product can go live with one database row, one key and a landing page, with no new backend.
- A buyer can pay, get a key on screen and by email, activate on two devices, be refused on a third, remove a device, and recover a lost key.
- A refund inside the window revokes the key at once, emails the buyer, and the app clears the license on its next check.
- A customer session is refused (403) on every admin route, tested route by route. Only a signed-in user whose verified email is in the server's admin list can use them.
- Editing the front end or calling an admin URL directly gives a customer no admin data or actions.
- An unverified Clerk email sees no licenses.
- Duplicate webhooks and double-clicks never create two licenses or two orders.
- All product signing keys are backed up and a restore has been tested.

## 13. Decisions

Decided by the owner:
1. **All-Apps Pass: dropped for now.** Remove it from the seed catalog. Revisit once more than one app is live.
2. **No public product list** in storefront. Only per-product buy pages, reached from each landing site.
3. **No signed-out key recovery.** Recovery is through Clerk sign-in only.
4. **Subscriptions and renewals are in the first release.**

Still open (default proposal applies until answered):
5. Session lengths: Clerk defaults for customers, 8 hours for admin.
6. **Domain:** to buy before launch (Cloudflare Registrar or Porkbun). It is needed for live Clerk and Resend, and for Cloudflare Access later if used. A free-hosting subdomain will not work.
