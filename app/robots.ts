import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  // Search activation requires a separate approved change; previews stay closed.
  return {rules:{userAgent:"*",disallow:"/"}};
}
