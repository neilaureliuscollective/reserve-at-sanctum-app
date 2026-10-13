import type { Metadata } from "next";
// Review allowlist for a later approved search launch. Private booking, account,
// Chair and Studio routes never inherit a public canonical or sitemap entry.
export const fixItPublicPaths = ["/fix-it-shop/app", "/fix-it-shop", "/fix-it-shop/app/founder"] as const;
export function fixItSearchMetadata(path: typeof fixItPublicPaths[number], env: Record<string,string|undefined> = process.env): Metadata {
  let canonical: string | undefined;
  if (env.VERCEL_ENV === "production" && env.RESERVE_PUBLIC_CANONICAL_ORIGIN) {
    try {
      const origin = new URL(env.RESERVE_PUBLIC_CANONICAL_ORIGIN);
      if (origin.protocol === "https:" && origin.origin === env.RESERVE_PUBLIC_CANONICAL_ORIGIN && !origin.hostname.endsWith(".vercel.app")) canonical = new URL(path, origin).href;
    } catch { /* Invalid/unapproved origin stays excluded. */ }
  }
  return {robots:{index:false,follow:false}, alternates:{canonical}, openGraph:{url:canonical}};
}
