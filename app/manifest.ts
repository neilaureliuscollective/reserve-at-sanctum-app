import type { MetadataRoute } from "next";
import { fixItManifest } from "@/lib/fix-it-booking";
export default function manifest(): MetadataRoute.Manifest {
  return { ...fixItManifest(), id: "/", start_url: "/enter" };
}
