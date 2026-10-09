import { cp, mkdir, rm, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "apps/fix-it-shop");
// Generated route composition only. Business modules remain shared through @/.
const routes = ["fix-it-shop", "auth", "studio", "chair"];
const apis = ["auth", "session", "health", "appointments", "availability", "locations", "chair", "provider-brand-assets", "studio"];
for (const route of routes) {
  const destination = path.join(target, "app", route);
  await rm(destination, { recursive: true, force: true });
  await cp(path.join(root, "app", route), destination, { recursive: true });
}
await rm(path.join(target, "app/api"), { recursive: true, force: true });
await mkdir(path.join(target, "app/api"), { recursive: true });
for (const api of apis) await cp(path.join(root, "app/api", api), path.join(target, "app/api", api), { recursive: true });
// Owner-only ecosystem products and AI are outside Katie's application.
for (const route of ["commerce", "memberships", "vitalis", "build", "content"]) {
  await rm(path.join(target, "app/studio", route), { recursive: true, force: true });
  await rm(path.join(target, "app/api/studio", route), { recursive: true, force: true });
}
for (const route of ["aethelios", "command"]) await rm(path.join(target, "app/api/studio", route), { recursive: true, force: true });
await rm(path.join(target, "public"), { recursive: true, force: true });
await cp(path.join(root, "public"), path.join(target, "public"), { recursive: true });
await cp(path.join(target, "pwa"), path.join(target, "public"), { recursive: true });
await cp(path.join(root, "migrations"), path.join(target, "migrations"), { recursive: true });
console.log(`Prepared Fix It Shop routes from shared source (${(await readdir(path.join(target, "app"))).length} route groups).`);
