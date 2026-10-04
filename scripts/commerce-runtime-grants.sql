-- Run with migration credentials after migration 009 and Phase 1 runtime provisioning.
GRANT SELECT,INSERT,UPDATE,DELETE ON reserve_commerce_settings,reserve_skus,reserve_stock,reserve_orders,reserve_payments,reserve_refunds,reserve_payment_events TO reserve_runtime;
GRANT SELECT,INSERT ON reserve_order_lines,reserve_stock_movements,reserve_returns TO reserve_runtime;
REVOKE UPDATE,DELETE ON reserve_order_lines,reserve_stock_movements,reserve_returns FROM reserve_runtime;
