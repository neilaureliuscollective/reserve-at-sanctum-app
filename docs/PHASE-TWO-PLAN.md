> Superseded commerce authority: see SHOPIFY-POS-PLAN.md. The standalone Stripe/local inventory proposal below is retained as implementation history, not the current live commissioning direction.

# Phase 2 — Money and Legacy Reserve retail

## Verdict and scope

The next planned phase is commerce. Phase 1 PR #12 remains open, with main still at e2cf00e7. This work is stacked on Phase 1 rather than replacing it or quietly merging it. Hosted Reserve database access was denied in Phase 1; production acceptance remains a separate gate. We can build and verify the next domain without claiming an unperformed cutover or transaction.

The operational outcome is an arrived/completed visit plus optional Legacy Reserve products, an itemized order, a verified payment result, an accurate stock movement and a clear refund/return record. Booking stays independent of payment. Nothing changes the public cinematic arrival experience or exposes a made-up retail menu.

## Research findings and decisions

Stripe's webhook documentation says deliveries can be duplicated and out of order. It specifically warns against using event timestamps as an ordering guarantee. We therefore durably record event IDs, retrieve canonical processor objects, and serialize local settlement through the order row. Different event IDs for the same payment also cannot deduct stock twice.

Stripe documents pending, failed and canceled refunds. We record the request separately from settlement and reserve its amount against the remaining refundable total. A successful refund changes money, while an explicit physical return changes stock. Neither infers that an opened product is sellable.

Square's inventory documentation demonstrates useful location filtering and permissioned receipt/count adjustments. We use those operational patterns: location-owned balances, clear available/held quantities and reasoned append-only movements. This is not a copy of Square's interface or an attempt to build all of Square.

One merchant, one processor adapter and one inventory authority are enough. Stripe hosted Checkout is the build default, with cash supported in the same order ledger. No terminal hardware, Connect marketplace accounts, Shopify synchronization or external-provider payouts are assumed. These are deferred until Neil approves the actual merchant arrangement and inventory source. Existing Shopify must not be allocated the same units independently.

Sources researched October 4, 2026:

- https://docs.stripe.com/webhooks — raw-body signatures, durable delivery, duplicate events and ordering.
- https://docs.stripe.com/api/idempotent_requests — stable request keys and limited retention.
- https://docs.stripe.com/api/checkout/sessions/create — hosted card checkout, inline amounts, metadata and processor mappings.
- https://docs.stripe.com/refunds — asynchronous refund status and failure recovery.
- https://squareup.com/help/us/en/article/6110-manage-inventory-with-the-retail-pos-app — location stock and inventory permissions.
- https://squareup.com/help/us/en/article/8249-conduct-full-inventory-counts-with-square-for-retail — explicit count/review workflows.

## Durable model

| Entity                    | Purpose and authority                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Commerce settings         | Location enablement, approved tax basis points/applicability and approval reference; defaults closed         |
| SKU                       | Company-owned Legacy Reserve product, approved description/price and taxable flag; no sample production rows |
| Location stock            | Physical on-hand and reserved quantities; constraints prevent negative or oversold balances                  |
| Stock movement            | Append-only receipt/count, reserve, release, sale and physical return; actor/reason/request key              |
| Order and immutable lines | Service/product snapshots, quantities, discount allocation, tax and tip in cents                             |
| Payment                   | One cash or Stripe attempt per order; stable session/intent mapping and explicit unresolved status           |
| Refund                    | Requested/pending/succeeded/failed amounts, idempotency and external refund mapping                          |
| Return                    | Explicit sellable units returned, bounded by the original sold quantity                                      |
| Payment event inbox       | Signed event ID/type/object only; no full card or customer payload retention                                 |

An appointment can have only one nonvoid commerce order. A Phase 1 external collection blocks a new charge until reconciled, and a commerce order blocks the old collection bridge. This prevents two checkout pathways from collecting the same service unknowingly.

## Implementation sequence

1. Extend capabilities for checkout, discounts, inventory and refunds. Owners/managers control money corrections; reception can checkout. Providers retain their existing operational/Chair scope, with no blanket commerce authority. Owner approval is required for company catalog and tax commissioning.
2. Add migration 009 with checks, foreign keys, unique mappings, RLS and immutable-history triggers. Keep the existing checksum migration runner. Hosted migration credentials stay separate from runtime credentials.
3. Build SKU/configuration and opening-stock adjustments. No opening stock is inferred from website mockups or booking history.
4. Create orders in an atomic transaction: check commissioned location, snapshot eligible service, calculate amounts, reserve product units and audit. Discounts allocate integer cents deterministically before configured tax; tips are separately stated. Final totals come from the server, never browser prices.
5. Implement cash settlement and Stripe hosted card checkout. Save local payment intent before external calls. Use the same order ID as the processor idempotency key; retry ambiguous creates only inside a conservative 23-hour window. Uncertain payment keeps stock held. Do not release it from a local timeout.
6. Verify signed raw webhooks, store minimal event mapping durably, and process via a protected worker. Canonical session success settles once; confirmed expiry releases once. Failed/unmapped events remain visible for reconciliation and have bounded retries/backoff.
7. Implement amount-reserved partial/full refunds, canonical refund reconciliation and separate physical returns. Refunding service/products/tips is an explicitly approved amount; this phase does not invent automatic tax refund or item-return policy.
8. Connect mobile commerce workspace, checkout links from visits, inventory/configuration forms, secure checkout handoff, itemized customer receipts, daily order reconciliation and recovery actions.
9. Prove local concurrency, authorization, migration preservation and phone/desktop journeys. Document actual hosted commissioning and live-transaction gates.

## Interfaces and permission boundaries

The staff workspace lives at /studio/commerce. Operators select location/date, an eligible service visit, products and quantities. Available/held stock and approved prices are visible before the server freezes the sale. Payment state and stock hold remain visible while awaiting a processor result.

Owners edit company products and approve location tax settings. Managers adjust opening/received stock, authorize discounts/refunds and record sellable physical returns. Reception can create and settle orders but cannot adjust prices, grant access, modify stock or issue refunds. Customers see only receipts linked to their verified customer account. Walk-in receipts stay staff-only until identity is deliberately linked; no public UUID receipt access is granted.

No commerce query reads Chair profiles, emotional context or staff notes. Aethelios receives no new private-data access.

## Tests and acceptance

Required tests cover competing orders for the last unit, reservation release, duplicate cash collection, lost checkout responses, duplicate and out-of-order event IDs, processor amount/currency/session mismatches, stock consumption once, pending and failed refunds, refund amount contention, return quantity limits, tax/discount rounding, immutable history, browser-role denial, customer receipt ownership and location boundaries. Test fake processors are injected into domain tests only and are not a production payment option.

Browser acceptance must configure a synthetic location's commerce settings, create a product, record opening stock, create a checkout, record cash, observe the receipt and reduced stock, refund and return explicitly, then reject a customer attempting staff commerce. Narrow mobile must remain operable without horizontal overflow. Hosted acceptance separately requires actual processor test transactions and the actual Postgres pooler.

## Migration and release concerns

Migration 009 creates new commercial records only. It does not synthesize payments from completed appointments or migrate an old external receipt into a new settled order. Existing receipt reconciliation remains available. Apply staging migration with a migration credential and grant the runtime group access to the new tables; immutable tables require SELECT/INSERT only. Browser Data API grants/policies must remain denied.

Reconcile actual opening counts with a dated reference. Reserve becomes the inventory authority only for explicitly assigned in-location units. Do not start Shopify sync without deciding ownership, reservations and transfer policy. Pause commerce and the worker during migration/cutover; use the Phase 1 backup/restore procedure and preserve subsequent commercial deltas.

## Real commissioning gate

Before real commerce: Phase 1 staged/accepted, hosted migration and restricted runtime tested, real merchant account confirmed, tax/pricing/refund policies approved, real SKUs/opening units reconciled, sender/receipts operational, verified staff rehearsed, and actual Stripe test success/decline/expiry/refund/replay demonstrated. Enable live mode only through explicit production configuration after this proof. No production merchant account, processor credentials, sender or tax rate is fabricated by the build.

The phase makes integrated service/retail orders possible. It does not include memberships, e-commerce shipping, card-present terminals, bank settlement accounting, automated tax filing, purchase orders, supplier replenishment, bundles/gift cards or cross-channel inventory synchronization. Those are later capabilities or integrations, not hidden launch promises.
