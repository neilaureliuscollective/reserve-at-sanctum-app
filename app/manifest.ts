import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Reserve at Sanctum",
    short_name: "The Reserve",
    description: "The Reserve experience, visits, and private operator command.",
    id: "/",
    start_url: "/enter",
    scope: "/",
    display: "standalone",
    background_color: "#070909",
    theme_color: "#163E43",
    icons: [
      { src: "/brand/reserve-rs-v1/app-icon-rs2-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/reserve-rs-v1/app-icon-rs2-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/reserve-rs-v1/app-icon-rs2-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Reserve Command",
        short_name: "Command",
        description: "Open the private Reserve operator workspace.",
        url: "/studio",
        icons: [{ src: "/brand/reserve-rs-v1/app-icon-rs2-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Book a Visit",
        short_name: "Book",
        description: "Open Reserve booking.",
        url: "/book",
        icons: [{ src: "/brand/reserve-rs-v1/app-icon-rs2-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "The Chair",
        short_name: "Chair",
        description: "Open the Chair experience.",
        url: "/chair",
        icons: [{ src: "/brand/reserve-rs-v1/app-icon-rs2-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
