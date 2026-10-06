import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";

const base = process.env.APP_ORIGIN || "http://localhost:3000";
const out = "artifacts/customer-os";
await mkdir(out, { recursive: true });
await mkdir("/opt/cursor/artifacts/screenshots", { recursive: true }).catch(() => {});

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
});

async function check(page, path, heading) {
  const response = await page.goto(base + path, { waitUntil: "domcontentloaded" });
  assert.ok(response && response.ok(), `${path} ${response?.status()}`);
  const text = await page.locator("body").innerText();
  assert.doesNotMatch(text, /The Reserve at Sanctum|Reserve at Sanctum/);
  if (heading) await page.getByRole("heading", { name: heading }).waitFor();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  assert.equal(overflow, false, `${path} overflow at ${page.viewportSize()?.width}`);
  return text;
}

const proofs = [];
try {
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await desktop.newPage();
  page.setDefaultTimeout(20000);
  await check(page, "/home", "Welcome to Legacy Reserve.");
  for (const name of ["Home", "Book", "Shop", "My Reserve"]) {
    assert.ok(await page.getByRole("link", { name, exact: true }).count());
  }
  await page.screenshot({ path: `${out}/home-1280.png`, fullPage: true });
  await page.screenshot({ path: "/opt/cursor/artifacts/screenshots/home-1280.png", fullPage: true }).catch(() => {});

  await page.getByRole("navigation", { name: "Legacy Reserve navigation" }).getByRole("link", { name: "Shop", exact: true }).click();
  await page.waitForURL("**/shop");
  const shop = await check(page, "/shop", "What a man takes home.");
  assert.match(shop, /SQUARE NOT CONNECTED|house collection is being prepared/i);
  assert.doesNotMatch(shop, /Add to cart|\$\d/);
  await page.screenshot({ path: `${out}/shop-1280.png`, fullPage: true });
  await page.screenshot({ path: "/opt/cursor/artifacts/screenshots/shop-1280.png", fullPage: true }).catch(() => {});

  await page.getByRole("link", { name: /Vitalis/ }).first().click();
  await page.waitForURL("**/shop/vitalis");
  const detail = await check(page, "/shop/vitalis", "Vitalis");
  assert.match(detail, /NOT AVAILABLE FOR PURCHASE/);
  await page.screenshot({ path: `${out}/shop-vitalis-1280.png`, fullPage: true });

  await page.getByRole("navigation", { name: "Legacy Reserve navigation" }).getByRole("link", { name: "My Reserve", exact: true }).click();
  await page.waitForURL("**/my-reserve");
  const mine = await check(page, "/my-reserve", /Your house|Your Reserve/);
  assert.match(mine, /Sign in to continue|Your Reserve/);
  await page.screenshot({ path: `${out}/my-reserve-1280.png`, fullPage: true });
  await page.screenshot({ path: "/opt/cursor/artifacts/screenshots/my-reserve-1280.png", fullPage: true }).catch(() => {});

  await page.getByRole("navigation", { name: "Legacy Reserve navigation" }).getByRole("link", { name: "Book", exact: true }).click();
  await page.waitForURL("**/book");
  const book = await check(page, "/book");
  assert.match(book, /Square Appointments is not connected|YOUR TIME AT LEGACY RESERVE|Find a time/);
  await page.screenshot({ path: `${out}/book-1280.png`, fullPage: true });

  await page.getByRole("link", { name: "The Chair", exact: true }).first().click();
  await page.waitForURL("**/chair");
  await check(page, "/chair");
  proofs.push("desktop: home/shop/vitalis/my-reserve/book/chair");
  await desktop.close();

  for (const width of [360, 884]) {
    const mobile = await browser.newContext({ viewport: { width, height: 740 } });
    const view = await mobile.newPage();
    view.setDefaultTimeout(20000);
    await check(view, "/home", "Welcome to Legacy Reserve.");
    await check(view, "/shop", "What a man takes home.");
    await view.screenshot({ path: `${out}/shop-${width}.png`, fullPage: true });
    await check(view, "/book");
    await check(view, "/my-reserve");
    proofs.push(`${width}px: home/shop/book/my-reserve no overflow`);
    await mobile.close();
  }

  const shopApi = await fetch(base + "/api/shop").then((r) => r.json());
  assert.equal(shopApi.connected, false);
  assert.equal(shopApi.checkout, false);
  assert.deepEqual(shopApi.items, []);
  const webhook = await fetch(base + "/api/webhooks/square", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  assert.equal(webhook.status, 503);
  proofs.push("shop API disabled; webhook rejects unsigned/unconfigured posts");
  console.log(proofs.join("\n"));
} finally {
  await browser.close();
}
