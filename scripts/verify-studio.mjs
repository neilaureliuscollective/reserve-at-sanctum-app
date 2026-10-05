import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
if (process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)
  throw Error("Synthetic local verification only.");
await mkdir("artifacts", { recursive: true });
const origin = "http://localhost:3000";
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
    env: {
      ...process.env,
      RESERVE_DEV_PREVIEW: "true",
      NEXT_TELEMETRY_DISABLED: "1",
      NODE_OPTIONS:
        "--require=" + process.cwd() + "/scripts/local-browser-offline.cjs",
      APP_ORIGIN: origin,
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let browser,
  logs = "";
server.stdout.on("data", (d) => (logs += d));
server.stderr.on("data", (d) => (logs += d));
try {
  await new Promise((resolve, reject) => {
    server.stdout.on("data", (d) => {
      if (String(d).includes("Ready in")) resolve();
    });
    server.on("exit", (c) => reject(Error("Server exited " + c)));
    setTimeout(() => reject(Error("Startup timed out")), 30000).unref();
  });
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    page = await context.newPage();
  page.setDefaultTimeout(20000);
  await context.route("**/*", (route) =>
    route.request().url().startsWith(origin) ? route.continue() : route.abort(),
  );
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const login = async (identity) => {
    const r = await context.request.post(origin + "/api/auth", {
      headers: { Origin: origin },
      data: { action: "preview", identity },
    });
    assert.equal(r.status(), 200);
  };
  const visit = async (path) => {
    await page.goto(origin + path);
    await page.waitForLoadState("networkidle");
    assert.equal(await page.locator("[data-nextjs-dialog]").count(), 0);
  };
  const post = async (body) =>
    context.request.post(origin + "/api/studio/command", {
      headers: { Origin: origin },
      data: body,
    });
  const patch = async (body) =>
    context.request.patch(origin + "/api/studio/command", {
      headers: { Origin: origin },
      data: body,
    });
  await visit("/studio");
  assert.ok(await page.locator("body").innerText());
  assert.equal(
    (await context.request.get(origin + "/api/studio/command")).status(),
    401,
  );
  await login("preview-neil");
  await visit("/studio");
  await page.getByRole("heading", { name: "Reserve Command." }).waitFor();
  const privateResponse = await post({
    kind: "decision",
    lane: "reserve",
    title: "Owner private " + Date.now(),
    detail: "Private business context",
    assignee: "neil",
    visibility: "owner",
  });
  assert.equal(privateResponse.status(), 201);
  const privateItem = (await privateResponse.json()).item;
  for (const identity of ["preview-neil", "preview-katie"]) {
    await login(identity);
    for (const width of [320, 390, 884, 1440]) {
      await page.setViewportSize({ width, height: 960 });
      for (const route of [
        "/studio",
        "/studio/content",
        "/studio/build",
        "/studio/schedule",
        "/studio/clients",
        "/studio/operations",
      ]) {
        await visit(route);
        assert.ok((await page.locator("main").innerText()).trim().length > 20);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
          `${identity} ${route} overflow ${width}`,
        );
      }
      await visit("/studio");
      await page.screenshot({
        path: `artifacts/studio-${identity}-${width}.png`,
        fullPage: true,
      });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await login("preview-katie");
  await visit("/studio");
  await page.getByRole("heading", { name: "Katie’s Studio." }).waitFor();
  const data = await (
    await context.request.get(origin + "/api/studio/command")
  ).json();
  assert.ok(!data.items.some((i) => i.id === privateItem.id));
  assert.equal(
    (
      await patch({ id: privateItem.id, revision: 1, status: "approved" })
    ).status(),
    404,
  );
  await visit("/studio/content");
  const draftTitle = "Content persistence " + Date.now();
  await page.getByLabel("Draft title").fill(draftTitle);
  await page.getByLabel("Your copy").fill("Premium working draft. ".repeat(60));
  await page.getByRole("button", {name:"Save draft",exact:true}).click();
  await page.getByText("Draft saved.", {exact:true}).waitFor();
  await page.reload();
  await page.getByRole("button").filter({hasText:draftTitle}).click();
  assert.equal(await page.getByLabel("Your copy").inputValue(), "Premium working draft. ".repeat(60).trim());
  await page.getByRole("button", {name:"Shape with Aethelios",exact:true}).click();
  await page.getByRole("dialog").waitFor();
  await page.getByText("Connection pending.", {exact:false}).waitFor();
  await page.getByRole("button",{name:"Close Aethelios"}).click();
  await page.getByRole("button",{name:"Send to Neil",exact:true}).click();
  await page.getByText("Saved and sent to Neil for review.", {exact:true}).waitFor();
  await visit("/studio");
  await page.getByRole("tab",{name:"Work",exact:true}).click();
  await page.getByRole("tabpanel").getByText(draftTitle).waitFor();
  await page.getByRole("tab",{name:"Work",exact:true}).press("ArrowRight");
  assert.equal(await page.getByRole("tab",{name:"Activity",exact:true}).getAttribute("aria-selected"),"true");
  await visit("/studio/build?capture=1");
  const title = "Phone approval " + Date.now();
  await page.getByLabel("What needs to happen?").fill(title);
  await page
    .getByLabel("Context", { exact: true })
    .fill("A shared decision from Katie.");
  await page.getByLabel("Kind").selectOption("decision");
  await page.getByRole("button", { name: "Save work", exact: true }).click();
  await page.getByRole("button").filter({ hasText: title }).click();
  await page.getByRole("dialog").waitFor();
  assert.equal(
    await page.getByRole("button", { name: "Approve this revision" }).count(),
    0,
  );
  await page.getByRole("button", { name: "Send to Neil", exact: true }).click();
  await page.getByText("Saved in the shared workspace.").waitFor();
  const review = (
    await (await context.request.get(origin + "/api/studio/command")).json()
  ).items.find((i) => i.title === title);
  assert.equal(review.status, "review");
  assert.equal(
    (
      await patch({
        id: review.id,
        revision: review.revision,
        status: "approved",
      })
    ).status(),
    403,
  );
  await login("preview-neil");
  await visit("/studio/build?view=review");
  await page.getByRole("button").filter({ hasText: title }).click();
  await page
    .getByRole("button", { name: "Approve this revision", exact: true })
    .click();
  const approved = (
    await (await context.request.get(origin + "/api/studio/command")).json()
  ).items.find((i) => i.id === review.id);
  assert.equal(approved.status, "approved");
  assert.equal(approved.approved_revision, approved.revision);
  await login("preview-katie");
  const edited = await patch({
    id: approved.id,
    revision: approved.revision,
    detail: "Changed approved copy",
  });
  assert.equal(edited.status(), 200);
  assert.equal((await edited.json()).item.status, "review");
  assert.equal(
    (
      await patch({
        id: approved.id,
        revision: approved.revision,
        detail: "Stale tab",
      })
    ).status(),
    409,
  );
  await login("preview-client");
  assert.equal(
    (await context.request.get(origin + "/api/studio/command")).status(),
    403,
  );
  assert.equal(
    (await context.request.get(origin + "/api/studio/clients")).status(),
    403,
  );
  await visit("/studio");
  assert.equal(
    await page.getByRole("navigation", { name: "Studio rooms" }).count(),
    0,
  );
  await page.getByRole("link", { name: "Your visits", exact: true }).waitFor();
  assert.deepEqual(errors, []);
  await writeFile(
    "artifacts/studio-verification.txt",
    "PASS: owner/operator mobile rooms; API identity isolation; shared draft and owner approval; invalidation and conflicts; client denial; no overflow at 320/390/884/1440; no page errors.\n",
  );
  console.log("Studio browser verification passed.");
} finally {
  await browser?.close();
  server.kill("SIGTERM");
  await writeFile("artifacts/studio-server.log", logs);
}
