import { fixItBooking } from "./fix-it-booking";
import { providerIdentity } from "./booking-identity";
import type { BrandProfile, BrandRow } from "./provider-brands";
export const katieProfile: BrandProfile = {
  name: "Fix It Shop",
  professional: "Katie Guidry",
  title: "Founder of Fix It Shop",
  headline: "Your next visit. With Katie.",
  bio: "Personal attention. Professional care. A visit made for you.",
  theme: "#0b1b2a",
  accent: "#d4af70",
  logo: null,
  cover: null,
};
export function brandIdentity(
  row: Pick<BrandRow, "slug" | "provider_id">,
  p: BrandProfile,
) {
  return row.provider_id === "katie"
    ? { ...fixItBooking, theme: p.theme }
    : providerIdentity(
        row.slug,
        row.provider_id,
        p.name,
        p.professional,
        p.theme,
      );
}
export function brandAsset(id: string, size = "image", privatePreview = false) {
  return `${privatePreview ? "/api/studio/brands/assets" : "/api/provider-brand-assets"}/${id}?size=${size}`;
}
export function logoFor(
  p: BrandProfile,
  provider: string,
  size = 192,
  preview = false,
) {
  return p.logo
    ? brandAsset(p.logo, String(size), preview)
    : provider === "katie"
      ? `/fix-it-shop/app/icons/${size}.png`
      : null;
}
