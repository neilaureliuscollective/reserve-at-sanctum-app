# Phase 2 commissioning

This implementation is stacked on Phase 1 PR #12. Neither public booking nor live payment commissioning is implied by a passing local test.

1. Accept/migrate Phase 1 in isolated staging; retain backup/restore proof and correct verified staff/location configuration.
2. Review/apply migration 009 using the migration credential. No production SKU, price or stock is seeded. Browser access remains denied by RLS.
3. Apply scripts/commerce-runtime-grants.sql using migration privileges after the runtime group exists. Do not grant schema CREATE or migration access to runtime. Preserve append-only history triggers.
4. Configure one approved Stripe account with STRIPE_SECRET_KEY, STRIPE_ACCOUNT_ID, STRIPE_WEBHOOK_SECRET and exact APP_ORIGIN. The REST adapter pins Stripe API version 2026-02-25.clover. Use test credentials in staging. Live keys fail closed outside production or without RESERVE_LIVE_COMMERCE=true.
5. Register POST /api/commerce/webhook for checkout.session.completed, checkout.session.expired, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed, refund.created, refund.updated and refund.failed. Signatures require raw bytes, a matching environment and a timestamp within five minutes. Durable receipt failures return non-2xx so Stripe can retry.
6. Schedule POST /api/cron/commerce using the same protected RESERVE_CRON_SECRET model as Phase 1 communications. The inbox retains minimal mapping, retries with backoff and surfaces failures. Monitor held payments, failed events, overdue refunds and unmapped external refunds; processor-dashboard changes are not silently ignored or assumed locally complete.
7. Approve tax applicability/rate and reference with the merchant's accounting process. No Louisiana rate or legal conclusion is supplied by the app. Current tax model is configured per-line rounding, order-discount allocation and a separate untaxed tip; approve its suitability before use. Configure real SKUs and dated opening stock. Do not duplicate those units in Shopify.
8. Exercise actual test-mode processor transactions, declines, lost-response retries, expiry, duplicate signed webhooks, partial/full/failed refunds, physical returns and invalid signatures. Check mappings and balance against Stripe. Rehearse cash confirmation/refund and actual receipt delivery/printing workflow. The customer receipt is an authenticated web receipt; no automated order-email sender is claimed in this phase.
9. Match collected gross/refunds by order and location/date against cash drawer and processor records. The money summary follows payment/refund settlement dates; the order list follows creation date and is bounded to 100 rows. Older unresolved orders are surfaced separately. Extract ledger data for larger order histories. This is not a bank payout report. Fees, disputes, chargebacks and deposits require processor/accounting reconciliation.
10. Enable location commerce only after approved catalog/tax/opening stock. Enable live payment config only after merchant/founder release approval and staging evidence. Terminal hardware is a later integration; hosted Checkout is not a card-present POS terminal.

Pending card orders retain stock. Use canonical reconciliation or confirmed processor expiry, never force a local release. Unmapped or late payments/refunds require manual processor investigation and reviewed financial correction. Refund money and return sellable stock as separate acts. Cash buttons record actual money transferred; they do not move money themselves.

Use the Phase 1 recovery procedure. Commercial records are append-only; never edit order lines or stock movements to correct a sale. Void an unpaid draft, issue an authorized refund, or add a reasoned movement. Do not downgrade the database after receiving real commerce writes without reconciling all deltas.

## Verified implementation evidence

42 automated tests passed, including concurrent stock reservation, duplicate settlement, refund limits, receipt ownership and customer identity merging. TypeScript and the production build passed. The isolated browser journey passed cash checkout, partial cash refund, explicit stock return, protected receipts and a 390px mobile layout. Processor tests use injected test doubles; no live Stripe transaction or hosted Reserve database migration was performed.

Hosted card checkout itemizes frozen service/product lines with allocated discounts and tax included, plus a separate gratuity. USD card orders below $0.50 remain cash-only; approve merchant settlement currency/minimum suitability during commissioning.
