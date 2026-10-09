import { fixItManifest } from "@/lib/fix-it-booking";
export function GET() {
  return Response.json(fixItManifest(), {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
