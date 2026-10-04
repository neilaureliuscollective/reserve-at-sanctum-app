-- Run with migration credentials after migration 010; preserve existing Phase 1 runtime provisioning.
GRANT SELECT,INSERT,UPDATE ON reserve_shopify_locations,reserve_shopify_orders,reserve_shopify_events TO reserve_runtime;
REVOKE DELETE ON reserve_shopify_locations,reserve_shopify_orders,reserve_shopify_events FROM reserve_runtime;
GRANT SELECT,INSERT ON reserve_shopify_link_history TO reserve_runtime;
REVOKE UPDATE,DELETE ON reserve_shopify_link_history FROM reserve_runtime;
GRANT USAGE,SELECT ON SEQUENCE reserve_shopify_link_history_id_seq TO reserve_runtime;
