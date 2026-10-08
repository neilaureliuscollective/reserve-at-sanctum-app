import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:net";
import { memberRead } from "../lib/experience/member";
import { hostedDatabase } from "../lib/hosted-db";
import { authFetch } from "../lib/auth-fetch";

test("stalled member records resolve unavailable instead of an endless loader", async () => {
  const result = await memberRead(() => new Promise<never>(() => {}), 25);
  assert.deepEqual(result, { state: "unavailable", data: null });
  assert.deepEqual(await memberRead(async () => ["real"]), { state: "ready", data: ["real"] });
  assert.deepEqual(await memberRead(async () => { throw Error("offline"); }), { state: "unavailable", data: null });
});

test("hosted connection handshake that never responds is bounded", async () => {
  const sockets = new Set<import("node:net").Socket>();
  const server = createServer(socket => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as import("node:net").AddressInfo).port;
  const started = Date.now();
  try {
    const db = hostedDatabase(`postgres://test:test@127.0.0.1:${port}/test`);
    await assert.rejects(db.query("SELECT 1"), /timeout|terminated/i);
    assert.ok(Date.now() - started < 7000);
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test("auth transport respects an already aborted upstream request", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(authFetch("http://127.0.0.1:1/auth", { signal: controller.signal }), /abort/i);
});
