# Storefront — Sovereign Desktop Software Store & Licensing Engine

A unified, high-performance storefront and offline licensing platform built specifically for sovereign desktop applications.

- **Frontend**: React 18 + Vite + Tailwind CSS (SPA served via Cloudflare Workers Static Assets)
- **Backend API**: Hono on Cloudflare Workers (TypeScript)
- **Database**: Cloudflare D1 (SQLite) with strict integer paise currency
- **Payments**: Direct Razorpay REST integration (UPI, Cards, NetBanking) with constant-time HMAC validation
- **Licensing**: Offline Ed25519 digital signatures via WebCrypto
- **Admin**: Revenue analytics and key management protected by Cloudflare Access

---

## Quick Start (Local Development)

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Apply D1 Database Migrations & Seed Catalog
```bash
# Apply schema to local SQLite simulation
pnpm d1:migrate:local

# Seed the desktop apps
pnpm d1:seed:local
```

### 3. Run Development (Worker + SPA + local D1)
```bash
pnpm dev
```
Open the URL shown in the terminal (typically [http://localhost:5173](http://localhost:5173)).

Set `ADMIN_DEV_BYPASS=true` in `.dev.vars` for local admin API access without Cloudflare Access.

---

## Directory Structure

```
storefront/
├── src/                        # React SPA
│   ├── components/             # Navbar, Footer, BuyModal, ProductCard
│   ├── pages/                  # Home, ProductDetail, Success, Account, Admin
│   ├── pages/legal/            # Terms, Privacy, Refunds, Delivery, Contact, Pricing
│   └── lib/                    # api.ts, razorpay.ts, format.ts
├── worker/                     # Cloudflare Worker Backend (Hono)
│   ├── index.ts                # Routing and scheduled() Cron handler
│   ├── license.ts              # WebCrypto Ed25519 signing & verification
│   ├── razorpay.ts             # Direct fetch client & constant-time HMAC
│   ├── fulfill.ts              # Idempotent order fulfillment engine
│   ├── email.ts                # Transactional email sender (Resend)
│   ├── access.ts               # Cloudflare Access JWT validator
│   ├── schema.ts               # Shared Zod validation schemas
│   └── types.ts                # Environment bindings
├── migrations/
│   └── 0001_init.sql           # D1 schema (products, customers, orders, payments, etc.)
├── seed/
│   └── products.sql            # Catalog seed
├── scripts/
│   ├── keygen.mjs              # Ed25519 keypair generator
│   ├── rust/                   # Rust crate for Tauri apps & Burrow daemon
│   ├── ts/                     # TypeScript module for Electron
│   └── react/                  # Reusable LicensePanel settings component
├── wrangler.jsonc              # Cloudflare configuration
└── package.json
```

---

## Key Invariants

1. **Server-Side Pricing**: Prices are strictly fetched from the database. The frontend never dictates the price.
2. **Idempotent Fulfillment**: Whether the user finishes the browser callback or the Razorpay webhook arrives first, `fulfillOrder()` runs exactly once and deduplicates events.
3. **100% Offline App Verification**: Desktop apps verify licenses using the public key embedded in the app without network calls.
