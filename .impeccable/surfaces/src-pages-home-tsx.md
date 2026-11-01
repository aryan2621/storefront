---
version: 1
slug: "src-pages-home-tsx"
primary_target: "src/pages/Home.tsx"
related_targets: ["src/pages/ProductDetail.tsx","src/pages/PassPage.tsx"]
---

# Storefront public catalog: surface brief

Scope: `/`, `/p/:slug`, `/pass` (Persuade). Flow screens (BuyDialog, `/success`, `/recover`) and `/admin/*` inherit the world in Operate register: restrained, ledger-like, perforation and postmark only where they mark real state.

Audience/job: Indian developers on phones who already use an app and want Pro. Action: Buy (email → Razorpay UPI popup) from the first viewport. Proof: real terracotta app icons, plain ₹ prices, offline signed key, 14-day refund. No testimonials or counts exist; invent none.

Memorable moment: the catalog is one perforated stamp sheet of the real icons; buying one is tearing a stamp off; the licence key arrives postmarked.

## Direction contract

THESIS: The nine terracotta app icons already are stamps, so the catalog is one perforated sheet and the all-apps pass is the whole sheet. Refuses the centred-headline-over-card-grid SaaS store.

OWN-WORLD: Light: gummed sheet paper ground (#f6f1e7), white sheet face, terracotta stamps (#d0603f, from the icons), ink (#1d1b19), India Post red (#c4242b) only on the buy action, postmark ink. Dark: a black stock-book page (#141312) with glassine strips holding the same stamps. Bricolage Grotesque at heavy weight for headlines; Martian Mono for denominations, keys, dates. Perforated edges via CSS mask, circular postmarks, sheet selvage with plate numbers. No gradients, glows or pill chips.

STORY: The visitor sees their app among the nine stamps with its rupee price, understands Pro is a one-time stamp with a year of updates (or the whole sheet for the pass), taps it, pays with UPI, and gets a postmarked key.

FIRST VIEWPORT: Phone: two-line display headline "Nine apps. One sheet." top-left with a rotated circular postmark top-right; one line of plain copy; the perforated sheet (3 columns of stamps: icon, name, ₹ denomination) fills the rest; the pass as the dark selvage row of the sheet. Tapping a stamp selects it and a sticky red "Buy <app> Pro · ₹X" bar appears at the bottom. Desktop: sheet on the right two-thirds (wider grid), headline column left with the selected stamp's detail.

FORM: India Post commemorative stamp sheet, candidate 1 of 7 (IMPECCABLE'S PICK). seed:cab4d79d963aa704. Signature interaction: selecting a stamp lifts and tilts it as if torn from the sheet; success postmarks the key with a short stamp thump. Motion: 160–240ms ease-out, paper-light, reduced motion → instant.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
