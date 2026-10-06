import { brand } from "@/lib/brand";
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.name,
    short_name: brand.shortName,
    description: brand.description,
    id: "/",
    start_url: "/enter",
    scope: "/",
    display: "standalone",
    background_color: brand.backgroundColor,
    theme_color: brand.themeColor,
    icons: [
      { src: brand.appIcon192, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: brand.appIcon512, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: brand.appIconMaskable, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Legacy Command",
        short_name: "Command",
        description: "Open the private Legacy Reserve operator workspace.",
        url: "/studio",
        icons: [{ src: brand.appIcon192, sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Book a Visit",
        short_name: "Book",
        description: "Open Legacy Reserve booking.",
        url: "/book",
        icons: [{ src: brand.appIcon192, sizes: "192x192", type: "image/png" }],
      },
      {
        name: "My Reserve",
        short_name: "My Reserve",
        description: "Open your Legacy Reserve relationship.",
        url: "/my-reserve",
        icons: [{ src: brand.appIcon192, sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Shop",
        short_name: "Shop",
        description: "Open the Legacy Reserve shop.",
        url: "/shop",
        icons: [{ src: brand.appIcon192, sizes: "192x192", type: "image/png" }],
      },
      {
        name: "The Chair",
        short_name: "Chair",
        description: "Open the Chair experience.",
        url: "/chair",
        icons: [{ src: brand.appIcon192, sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
