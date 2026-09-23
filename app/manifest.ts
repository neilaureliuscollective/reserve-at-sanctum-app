import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Reserve at Sanctum",
    short_name: "The Reserve",
    description: "The Reserve experience, visits, and private operator command.",
    id: "/",
    start_url: "/setup",
    scope: "/",
    display: "standalone",
    background_color: "#080a09",
    theme_color: "#080a09",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    shortcuts: [
      {
        name: "Reserve Command",
        short_name: "Command",
        description: "Open the private Reserve operator workspace.",
        url: "/studio",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Book a Visit",
        short_name: "Book",
        description: "Open Reserve booking.",
        url: "/book",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "The Chair",
        short_name: "Chair",
        description: "Open the Chair experience.",
        url: "/chair",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
