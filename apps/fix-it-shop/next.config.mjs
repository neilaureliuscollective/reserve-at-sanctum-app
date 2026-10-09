import path from "node:path";
const root = path.resolve(import.meta.dirname, "../..");
/** @type {import('next').NextConfig} */
const config = {
  devIndicators: false,
  experimental: { useTypeScriptCli: false },
  poweredByHeader: false,
  serverExternalPackages: ["@electric-sql/pglite"],
  env: { NEXT_PUBLIC_APP_EDITION: "fix-it-shop" },
  outputFileTracingRoot: root,
  turbopack: { root },
  outputFileTracingIncludes: { "/*": ["./public/fix-it-shop/app/icons/*.png"] },
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Fix-It-Release", value: "fix-it-shop-independent-phase-1-20261009" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
    ] }, { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
    { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }, { key: "Service-Worker-Allowed", value: "/" }] }];
  },
};
export default config;
