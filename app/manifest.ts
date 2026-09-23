import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Reserve at Sanctum",
    short_name: "The Reserve",
    description: "Your Reserve experience and visits.",
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
  };
}
