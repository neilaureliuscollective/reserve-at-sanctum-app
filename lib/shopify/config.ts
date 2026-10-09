export type ShopifyConfig = {
  domain: string;
  token: string;
  collection: string;
  version: string;
  checkout: boolean;
  checkoutHosts: string[];
};
export function shopifySettings(
  env: Record<string, string | undefined> = process.env,
) {
  const selected = env.RESERVE_COMMERCE_PROVIDER === "shopify";
  const domain = (env.SHOPIFY_STORE_DOMAIN || "").trim().toLowerCase();
  const token = (env.SHOPIFY_STOREFRONT_ACCESS_TOKEN || "").trim();
  const collection = (env.SHOPIFY_COLLECTION_HANDLE || "").trim();
  const version = (env.SHOPIFY_API_VERSION || "2026-07").trim();
  const checkoutHosts = [
    domain,
    ...(env.SHOPIFY_CHECKOUT_HOSTS || "").split(","),
  ]
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const issues: string[] = [];
  if (!selected) issues.push("Shopify is not the selected commerce provider.");
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain))
    issues.push("A valid Shopify store domain is required.");
  if (!token) issues.push("A server-side Storefront token is required.");
  if (collection && !/^[a-z0-9][a-z0-9_-]{0,99}$/.test(collection))
    issues.push("The collection handle is invalid.");
  if (version !== "2026-07")
    issues.push(
      "This bridge requires the tested Storefront API version 2026-07.",
    );
  if (
    checkoutHosts.some(
      (host) => !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(host),
    )
  )
    issues.push("Checkout hosts must be exact HTTPS hostnames.");
  const config: ShopifyConfig | null = issues.length
    ? null
    : {
        domain,
        token,
        collection,
        version,
        checkout: env.SHOPIFY_CHECKOUT_ENABLED === "true",
        checkoutHosts: [...new Set(checkoutHosts)],
      };
  return { selected, config, issues };
}
/** The storefront and Studio receive this projection, never the token or cart secrets. */
export function shopifyReadiness(
  env: Record<string, string | undefined> = process.env,
) {
  const settings = shopifySettings(env);
  return {
    selected: settings.selected,
    configured: Boolean(settings.config),
    checkoutEnabled: Boolean(settings.config?.checkout),
    apiVersion: "2026-07",
    issues: settings.issues,
    memberPricing: false,
    subscriptions: false,
    orderSync: false,
  };
}
export function checkoutUrl(value: string, config: ShopifyConfig) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw Error("Invalid checkout destination.");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !config.checkoutHosts.includes(url.hostname.toLowerCase())
  )
    throw Error("Invalid checkout destination.");
  return url.href;
}
