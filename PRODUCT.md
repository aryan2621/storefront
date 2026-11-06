# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Buyers (primary):** Indian developers and power users, mostly on phones, paying in INR with UPI, Indian cards, net banking or wallets. They already know the apps (often from GitHub) and come to buy a Pro license for one app or the all-apps pass.
- **Owner/admin (secondary):** the single seller, checking paid customers, revenue, MRR and licenses per product, and resending, revoking or issuing keys.

## Product Purpose
One site that sells Pro licenses for a family of open-source desktop apps (orbit-ide, murmur, localboard, capturita, stickman-studio, dev-tools, ai-agents, agentic-browser, burrow, plus an all-apps pass). It succeeds when a buyer goes from app page to license key on their screen and in their inbox in one short checkout, and when the owner can see every product's sales on one dashboard.

## Positioning
- The apps are free and open source. Pro sells convenience: signed builds, Pro features and a year of updates.
- Licenses are Ed25519-signed keys the apps verify on the device. Official builds also activate online (first activation needs the internet) and re-check regularly; the last successful check allows 30 days offline.
- No customer accounts: the email address is the identity, and lost keys are re-sent by email.
- Priced in rupees, with Indian payment methods first (Razorpay).

## Operating Context
- **Checkout:** Razorpay Checkout.js popup, opened from a buy dialog (email, optional name/phone/state, coupon). Turnstile protects the public forms.
- **After payment:** a success page shows the key with a copy button and activation steps. The key is also emailed. A buyer who loses a key signs in and finds it on the account page; there is no emailed recovery form.
- **Admin:** lives at `/admin`, behind Cloudflare Access.
- **Legal pages:** Razorpay activation review requires them (terms, privacy, refunds, delivery, contact, pricing).

## Capabilities and Constraints
- **Stack:** React 18, Vite and Tailwind v4 with local shadcn-style components. Backend is a Cloudflare Worker (Hono) on D1.
- **Money:** all amounts in paise, shown with ₹. Dates in IST.
- **Product kinds:** `one_time` (with 12 months of updates) and `subscription` (month/year).
- **CSP:** must allow checkout.razorpay.com and challenges.cloudflare.com.
- **Undecided:** final brand name and domain. "Storefront" is a placeholder, so the identity must not depend on the name.

## Brand Commitments
- Voice: plain, technical, honest. No hype and no marketing superlatives.
- Name "Storefront" is a placeholder.

## Evidence on Hand
- Real app icons and screenshots/video exist in the app repos (aryan2621/*), to be imported under `public/apps/<slug>/`.
- Real facts that can be stated: 14-day refund window, two devices per key (each activated online), signature verification on the device, UPI/cards via Razorpay.
- **Absent:** testimonials, customer counts, press, ratings, benchmarks. Never fabricate these.

## Product Principles
1. Show the real app. Screenshots and icons beat abstract decoration.
2. State the deal plainly: price, what Pro adds, what stays free, refund terms.
3. Make checkout to key the fastest path on a phone.
4. Respect privacy: least data, offline licenses, say so where it matters.
5. The admin view is for one person checking numbers quickly: dense, exact, calm.

## Accessibility & Inclusion
- WCAG AA contrast in both light and dark themes.
- Keyboard-operable dialogs and FAQs.
- Respect reduced motion.
- Mobile-first, with 44px touch targets.
