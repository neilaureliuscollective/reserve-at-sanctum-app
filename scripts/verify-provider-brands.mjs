import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { DateTime } from "luxon";
if (
  process.env.DATABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NODE_ENV === "production"
)
  throw Error("Isolated synthetic preview only.");
const origin = "http://localhost:3000",
  provider = "pilot-" + Date.now().toString(36),
  slug = provider + "-studio",
  base = `/providers/${slug}/app`;
await mkdir("artifacts/provider-brands", { recursive: true });
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3000",
  ],
  {
    env: { ...process.env, RESERVE_DEV_PREVIEW: "true", APP_ORIGIN: origin },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let logs = "",
  browser,
  page;
server.stdout.on("data", (d) => (logs += d));
server.stderr.on("data", (d) => (logs += d));
try {
  await new Promise((resolve, reject) => {
    server.stdout.on("data", (d) => {
      if (String(d).includes("Ready in")) resolve();
    });
    server.on("exit", (c) => reject(Error("Server exit " + c)));
    setTimeout(() => reject(Error("Startup timeout")), 30000).unref();
  });
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/tmp/chromium",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const api = async (path, data, method = "POST") =>
    ctx.request.fetch(origin + path, {
      method,
      headers: { Origin: origin },
      ...(data ? { data } : {}),
    });
  const json = async (path, data, method = "POST") => {
    const r = await api(path, data, method),
      j = await r.json();
    assert.ok(r.ok(), JSON.stringify(j));
    return j;
  };
  const login = async (identity) =>
    json("/api/auth", { action: "preview", identity });
  const visit = async (path) => {
    await page.goto(origin + path);
    await page.waitForLoadState("networkidle");
  };
  assert.equal(
    (await ctx.request.get(origin + "/api/studio/brands")).status(),
    401,
  );
  await login("preview-neil");
  await visit("/studio/brands");
  const onboard = page.locator(".brand-onboard").first();
  await onboard.locator("summary").click();
  await onboard
    .getByLabel("Provider identifier", { exact: true })
    .fill(provider);
  await onboard
    .getByLabel("Brand name", { exact: true })
    .fill("Synthetic Provider Studio");
  await onboard
    .getByLabel("Professional name", { exact: true })
    .fill("Synthetic Professional");
  await onboard.getByLabel("Booking link slug", { exact: true }).fill(slug);
  await onboard.getByRole("button", { name: "Create private draft" }).click();
  await page.getByText(/Private brand draft created/).waitFor();
  assert.equal(
    (
      await ctx.request.get(origin + `/providers/${slug}/booking.webmanifest`)
    ).status(),
    404,
  );
  assert.ok(
    !(await (await ctx.request.get(origin + base)).text()).includes(
      "Synthetic Provider Studio",
    ),
  );
  await page
    .getByLabel("Logo / home-screen icon")
    .setInputFiles("public/fix-it-shop/app/icons/192.png");
  await page.getByText(/Image uploaded privately/).waitFor();
  const privateImg = await page
    .locator(".brand-live-preview img")
    .first()
    .getAttribute("src");
  const assetId = privateImg.split("/").at(-1).split("?")[0];
  assert.equal(
    (
      await ctx.request.get(
        origin + `/api/provider-brand-assets/${assetId}?size=192`,
      )
    ).status(),
    404,
  );
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page.getByText(/Draft saved/).waitFor();
  await page.getByLabel(/I reviewed the saved profile/).check();
  await page.getByRole("button", { name: "Publish saved draft" }).click();
  await page.getByText(/Brand published/).waitFor();
  let data = await json("/api/studio/brands", null, "GET"),
    p = data.providers.find((p) => p.id === provider);
  assert.equal(p.enabled, false);
  assert.equal(p.services, 0);
  for (const w of [320, 390, 540, 768, 884, 1440]) {
    await page.setViewportSize({ width: w, height: 900 });
    await visit("/studio/brands");
    await page.locator(".brand-select select").selectOption(provider);
    await page.locator(".brand-edit-grid").waitFor();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "studio overflow " + w,
    );
    await page.screenshot({
      path: `artifacts/provider-brands/studio-${w}.png`,
    });
  }
  await visit(base);
  assert.equal(await page.locator(".reserve-app-shell").count(), 0);
  assert.equal(await page.locator('link[rel="manifest"]').count(), 1);
  const cdp = await ctx.newCDPSession(page),
    manifest = await cdp.send("Page.getAppManifest");
  assert.equal(manifest.errors.length, 0);
  const m = JSON.parse(manifest.data);
  assert.equal(m.id, base);
  assert.equal(m.scope, `/providers/${slug}/`);
  assert.ok(m.start_url.startsWith(m.scope));
  for (const icon of m.icons)
    assert.equal((await ctx.request.get(origin + icon.src)).status(), 200);
  const apple = await page
    .locator('link[rel="apple-touch-icon"]')
    .evaluateAll((items) => items.map((x) => x.getAttribute("href")));
  assert.ok(
    apple.length && apple.every((x) => x.startsWith(`/providers/${slug}/`)),
  );
  await page.getByText(/Booking is in preparation/).waitFor();
  for (const w of [320, 390, 540, 768, 884, 1440]) {
    await page.setViewportSize({ width: w, height: 900 });
    await visit(base);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "provider overflow " + w,
    );
    await page.screenshot({ path: `artifacts/provider-brands/home-${w}.png` });
  }
  const propose = async (input) => {
    const r = await json("/api/studio/operations", input);
    await json(
      "/api/studio/operations",
      { id: r.proposal.id, action: "apply", acknowledge: true },
      "PATCH",
    );
    return r.proposal;
  };
  const service = await propose({
    kind: "service",
    provider_id: provider,
    target_revision: 0,
    enabled: true,
    name: "Synthetic visit",
    description: "Illustrative test only",
    minutes: 30,
    buffer: 15,
    price: 3000,
  });
  await propose({
    kind: "provider",
    provider_id: provider,
    target_revision: 1,
    enabled: true,
    name: "Synthetic Professional",
    open_hour: 9,
    close_hour: 17,
    weekdays: [2, 3, 4, 5, 6],
    location_id: "eunice",
  });
  await login("preview-katie");
  const own = await json("/api/studio/brands", null, "GET");
  assert.ok(own.providers.every((p) => p.id === "katie"));
  assert.equal(
    (
      await api("/api/studio/brands", {
        action: "publish",
        provider,
        revision: p.brand_revision,
      })
    ).status(),
    403,
  );
  assert.equal(
    (
      await ctx.request.get(
        origin + `/api/studio/brands/assets/${assetId}?size=192`,
      )
    ).status(),
    403,
  );
  // Public images are intentionally public only after publication.
  assert.equal(
    (
      await ctx.request.get(
        origin + `/api/provider-brand-assets/${assetId}?size=192`,
      )
    ).status(),
    200,
  );
  await json("/api/auth", { action: "signout" });
  await visit(base + "/appointments");
  await page.waitForURL(`**/providers/${slug}/app/signin?**`);
  assert.equal(
    await page.getByRole("button", { name: /Katie’s studio/ }).count(),
    0,
  );
  let day = DateTime.now()
    .setZone("America/Chicago")
    .startOf("day")
    .plus({ days: 22 });
  while (![2, 3, 4, 5, 6].includes(day.weekday)) day = day.plus({ days: 1 });
  const avail = await json(
    `/api/availability?service=${service.service_id}&location=eunice&date=${day.toISODate()}`,
    null,
    "GET",
  );
  assert.ok(avail.slots.length);
  const params = new URLSearchParams({
    provider: "katie",
    location: "eunice",
    service: service.service_id,
    date: day.toISODate(),
    start: avail.slots[0].start,
  });
  await visit(base + "/book?" + params);
  assert.ok(
    decodeURIComponent(
      await page
        .getByRole("link", { name: /Continue to sign in/ })
        .getAttribute("href"),
    ).includes("provider=" + provider),
  );
  await page.getByRole("link", { name: /Continue to sign in/ }).click();
  await page.getByRole("button", { name: /Experience a client visit/ }).click();
  await page.waitForURL(`**/providers/${slug}/app/book?**`);
  await page
    .getByRole("button", { name: "Reserve preview visit", exact: true })
    .click();
  await page.getByText(/Your test appointment is saved/).waitFor();
  const ics = await page
      .getByRole("link", { name: "Save to calendar" })
      .getAttribute("href"),
    id = ics.split("/").at(-2);
  await page.getByRole("link", { name: /Manage my visits/ }).click();
  await page.waitForLoadState("networkidle");
  await page.reload();
  await page.waitForLoadState("networkidle");
  assert.ok(
    (
      await json("/api/appointments?provider=" + provider, null, "GET")
    ).visits.some((v) => v.id === id),
  );
  assert.ok(
    !(await json("/api/appointments?provider=katie", null, "GET")).visits.some(
      (v) => v.id === id,
    ),
  );
  await login("preview-other");
  assert.equal((await ctx.request.get(origin + ics)).status(), 404);
  assert.equal(
    (await ctx.request.get(origin + "/api/studio/brands")).status(),
    403,
  );
  await login("preview-neil");
  data = await json("/api/studio/brands", null, "GET");
  p = data.providers.find((p) => p.id === provider);
  await json("/api/studio/brands", {
    action: "unpublish",
    provider,
    revision: p.brand_revision,
  });
  assert.equal(
    (
      await ctx.request.get(origin + `/providers/${slug}/booking.webmanifest`)
    ).status(),
    404,
  );
  assert.ok(
    !(await (await ctx.request.get(origin + base)).text()).includes(
      "Synthetic Provider Studio",
    ),
  );
  assert.equal(
    (
      await ctx.request.get(
        origin + `/api/provider-brand-assets/${assetId}?size=192`,
      )
    ).status(),
    404,
  );
  await login("preview-client");
  assert.ok(
    (await json("/api/appointments", null, "GET")).visits.some(
      (v) => v.id === id,
    ),
  );
  assert.equal((await ctx.request.get(origin + ics)).status(), 200);
  await json(
    "/api/appointments/" + id,
    { action: "cancel", revision: 1 },
    "PATCH",
  );
  const master = await (
    await ctx.request.get(origin + "/manifest.webmanifest")
  ).json();
  assert.equal(master.name, "Legacy Reserve");
  assert.equal(master.id, "/");
  assert.deepEqual(errors, []);
  console.log(
    "PASS: owner onboarding, private uploads, draft/publish separation, two-provider isolation, stable manifest and icons, six mobile widths, shared-auth booking and persistence, ownership, unpublish preserves appointments.",
  );
} catch (e) {
  await writeFile("artifacts/provider-brands/server.log", logs);
  await page
    ?.screenshot({
      path: "artifacts/provider-brands/failure.png",
      fullPage: true,
    })
    .catch(() => {});
  console.error(logs.slice(-3500));
  throw e;
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
