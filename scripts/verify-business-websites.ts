// Isolated synthetic browser/database verification; never a hosted Auth/OAuth test.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { schema, seed, wrapPglite } from "../lib/db";
import { katieProfile } from "../lib/provider-brand-display";
import { grantBusiness } from "../lib/business-connections";
import {
  defaultFixItCopy,
  proposeWebsite,
  websiteSource,
} from "../lib/business-websites";
import type { Actor } from "../lib/booking";
async function main() {
  if (
    process.env.DATABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NODE_ENV === "production"
  )
    throw Error("Local synthetic verification only.");
  process.env.RESERVE_BUSINESS_WEBSITES_ENABLED = "true";
  await mkdir(".data", { recursive: true });
  await mkdir("artifacts/business-websites", { recursive: true });
  const pg = new PGlite(".data/reserve");
  await pg.waitReady;
  const db = wrapPglite(pg);
  await schema(db);
  await seed(db);
  const actor: Actor = {
    id: "preview-katie",
    name: "Synthetic Katie",
    email: "katie@preview.invalid",
    role: "operator",
    provider_id: "katie",
  };
  await db.query(
    "INSERT INTO reserve_provider_brands(provider_id,slug,draft,published,published_revision,updated_by) VALUES('katie','fix-it-shop',$1::jsonb,$1::jsonb,1,'preview-neil') ON CONFLICT DO NOTHING",
    [
      JSON.stringify({
        ...katieProfile,
        headline: defaultFixItCopy.headline,
        bio: defaultFixItCopy.about,
      }),
    ],
  );
  await db.query(
    "INSERT INTO reserve_business_websites(id,provider_id,path) VALUES('fix-it-shop','katie','/fix-it-shop') ON CONFLICT DO NOTHING",
  );
  // Reuse only this synthetic fixture's grant to keep repeated local verification bounded.

  await db.query(
    "UPDATE reserve_business_grants SET revoked_at=now() WHERE user_id=$1 AND oauth_client_id='synthetic-browser' AND revoked_at IS NULL",
    [actor.id],
  );
  const linked = await grantBusiness(
    db,
    actor,
    "katie",
    "synthetic-browser",
    Buffer.from(randomUUID().repeat(2)).subarray(0, 32).toString("base64url"),
    true,
  );
  const source = await websiteSource(db, actor, linked),
    headline = "Synthetic browser-approved wording " + Date.now();
  const proposal = await proposeWebsite(db, actor, linked, {
    requestId: randomUUID(),
    websiteId: "fix-it-shop",
    baseRevision: source.revision,
    content: { headline, about: "Synthetic local browser approval test." },
    serviceChanges: [],
  });
  await pg.close();
  const origin = "http://localhost:3003";
  const server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3003",
    ],
    {
      env: {
        ...process.env,
        RESERVE_DEV_PREVIEW: "true",
        APP_ORIGIN: origin,
        RESERVE_BUSINESS_CONNECTIONS_ENABLED: "false",
        RESERVE_BUSINESS_WEBSITES_ENABLED: "true",
        NEXT_TELEMETRY_DISABLED: "1",
        NODE_OPTIONS:
          "--require=" + process.cwd() + "/scripts/local-browser-offline.cjs",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let logs = "",
    browser;
  server.stdout.on("data", (d) => (logs += d));
  server.stderr.on("data", (d) => (logs += d));
  try {
    await new Promise<void>((resolve, reject) => {
      server.stdout.on("data", (d) => {
        if (String(d).includes("Ready in")) resolve();
      });
      server.on("exit", (c) => reject(Error("Server exited " + c)));
      setTimeout(() => reject(Error("Startup timeout")), 30000).unref();
    });
    browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_PATH || "/tmp/chromium",
      args: [
        "--no-sandbox",
        "--no-zygote",
        "--single-process",
        "--disable-dev-shm-usage",
      ],
    });
    const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
      }),
      page = await context.newPage();
    const login = async (identity: string) =>
      assert.equal(
        (
          await context.request.post(origin + "/api/auth", {
            headers: { Origin: origin },
            data: { action: "preview", identity },
          })
        ).status(),
        200,
      );
    await login("preview-client");
    assert.ok(
      [403, 404].includes(
        (
          await context.request.post(origin + "/api/studio/websites", {
            headers: { Origin: origin },
            data: {
              id: proposal.id,
              baseRevision: source.revision,
              decision: "approve",
            },
          })
        ).status(),
      ),
    );
    await login("preview-katie");
    assert.equal(
      (
        await context.request.post(origin + "/api/studio/websites", {
          headers: { Origin: "https://evil.example" },
          data: {
            id: proposal.id,
            baseRevision: source.revision,
            decision: "approve",
          },
        })
      ).status(),
      403,
    );
    await page.goto(origin + "/fix-it-shop");
    assert.equal(await page.getByText(headline, { exact: true }).count(), 0);
    await page.goto(origin + "/studio/websites");
    assert.equal(
      await page
        .getByRole("button", { name: "Approve and publish saved proposal" })
        .first()
        .isDisabled(),
      true,
    );
    await login("preview-neil");
    await page.goto(origin + "/studio/websites");
    const card = page
      .locator("article")
      .filter({ has: page.getByText(headline, { exact: true }) });
    const approve = card.getByRole("button", {
      name: "Approve and publish saved proposal",
    });
    await approve.focus();
    await approve.press("Enter");
    await card
      .getByText("Published. Refresh the public website to see this revision.")
      .waitFor();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await page.screenshot({
      path: "artifacts/business-websites/approval-mobile.png",
      fullPage: true,
    });
    await page.goto(origin + "/fix-it-shop");
    await page.getByText(headline, { exact: true }).waitFor();
    assert.equal(
      (
        await context.request.post(origin + "/api/studio/websites", {
          headers: { Origin: origin },
          data: {
            id: proposal.id,
            baseRevision: source.revision,
            decision: "approve",
          },
        })
      ).status(),
      409,
    );
    await writeFile(
      "artifacts/business-websites/verification.json",
      JSON.stringify(
        {
          synthetic: true,
          oauthTest: false,
          clientDenied: true,
          crossOriginDenied: true,
          draftHidden: true,
          approvalPublished: true,
          replayDenied: true,
          mobileOverflow: false,
        },
        null,
        2,
      ),
    );
    console.log(
      "Synthetic Reserve browser: draft hidden, publisher approval visible, client/CSRF/replay denied, mobile passed.",
    );
  } finally {
    await browser?.close();
    server.kill("SIGTERM");
    await writeFile("artifacts/business-websites/server.log", logs);
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
