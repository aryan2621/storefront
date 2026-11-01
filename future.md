# Future work

Not needed to start selling. Pick up when the need is real. Effort is a rough estimate.

## Likely next

| Item | Why it can wait | Effort |
|---|---|---|
| **Sale pricing**: `list_price_paise`, `sale_label`, `sale_ends_at`; one `effectivePrice()` helper used by checkout, public API, success page; public `GET /api/sales` (60 s cache) for a top banner on landing pages | Until a sale is planned, changing `price_paise` in Admin → Products does the same job | ~4 h |
| **Reconcile missed Razorpay payments (cron)**: find captured payments with no licence and fulfil them | Razorpay retries webhooks; at low volume check the Razorpay dashboard | ~2 h |
| **Admin UI for `landing_url` and `allowed_origins`** | Set once per product with the product patch API or SQL | ~1 h |

Decision to make with sales: a coupon stacks on top of the sale price (suggested), or is blocked during a sale. Only show a "was" price that was really charged before.

## Extensions (only if used)

- Announcement banner (generic message such as maintenance), beyond the sale banner. ~1.5 h
- `latest_version` and release notes served by the product API. ~1 h
- "Coming soon" status for landing pages (today: `active = 0` hides a product). ~1 h
- `?coupon=CODE` link that pre-fills the Buy dialog. ~1 h
- Admin alert when an email fails to send (today: logged only). ~1 h
- Landing pages read support email from the API (today: one constant in `src/lib/site.ts`). ~0.5 h

## Business and product

- Monthly subscriptions (one-time only for now; the subscription code exists but no product uses it).
- Signed-out key recovery (dropped on purpose; recovery is through the account page).
- PDF receipts (print is enough for now).
- Business address and GSTIN on Terms, Contact and receipts (none yet; left out on purpose).
- A one-time price for AI Agents before it is made active again.
- Reactivate hidden products (localboard, stickman-studio, burrow) only after confirming each.
- Code-split the 843 kB JS bundle.
