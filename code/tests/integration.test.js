import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { WebSocket } from "ws";
const base = "http://127.0.0.1:3199";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function request(route, body, token, method = "POST") {
  const res = await fetch(base + route, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "x-project-token": token } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: res.status, data: await res.json() };
}
function connect(project, name) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(
      `ws://127.0.0.1:3199/collaborate?project=${project.id}&token=${project.token}&name=${name}`,
    );
    ws.messages = [];
    ws.on("message", (raw) => {
      const m = JSON.parse(raw);
      ws.messages.push(m);
      if (m.type === "welcome") resolve(ws);
    });
    ws.on("error", reject);
  });
}
async function expectMessage(ws, predicate) {
  for (let i = 0; i < 50; i++) {
    const m = ws.messages.find(predicate);
    if (m) return m;
    await wait(20);
  }
  throw new Error("Expected collaboration message not received");
}
test("API, live rooms, conflicts, undo and disk persistence", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "weave-test-"));
  let child;
  const clients = [];
  async function start() {
    child = spawn(process.execPath, ["server/index.js"], {
      cwd: path.resolve(import.meta.dirname, ".."),
      env: {
        ...process.env,
        NODE_ENV: "production",
        PORT: "3199",
        HOST: "127.0.0.1",
        DATA_DIR: dir,
        OPENAI_API_KEY: "",
        AI_PROVIDER: "demo",
      },
      stdio: "pipe",
    });
    let stderr = "";
    child.stderr.on("data", (b) => (stderr += b));
    for (let i = 0; i < 100; i++) {
      try {
        const r = await fetch(base + "/api/config");
        if (r.ok) return;
      } catch {}
      if (child.exitCode !== null) throw new Error(stderr);
      await wait(50);
    }
    throw new Error("Server failed to start: " + stderr);
  }
  async function stop() {
    if (child && child.exitCode === null) {
      const ended = new Promise((r) => child.once("exit", r));
      child.kill("SIGTERM");
      await ended;
    }
  }
  try {
    await start();
    const created = await request("/api/projects", {
      name: "Collaboration test",
      template: "dashboard",
    });
    assert.equal(created.status, 201);
    let p = created.data;
    const route = "/api/projects/" + p.id;
    assert.equal((await request(route, null, "wrong", "GET")).status, 404);
    const a = await connect(p, "Alex"),
      b = await connect(p, "Sam");
    clients.push(a, b);
    assert.equal(
      (
        await expectMessage(
          a,
          (m) => m.type === "presence" && m.peers.length === 2,
        )
      ).peers.length,
      2,
    );
    a.send(
      JSON.stringify({ type: "cursor", x: 0.3, y: 0.5, area: "frontend" }),
    );
    assert.equal(
      (await expectMessage(b, (m) => m.type === "cursor")).peer.cursor.x,
      0.3,
    );
    const edit = await request(
      route,
      {
        nodeId: "hero",
        text: "Built together",
        revision: p.revision,
        actor: "Alex",
      },
      p.token,
      "PATCH",
    );
    assert.equal(edit.status, 200);
    p = edit.data;
    assert.equal(
      (
        await expectMessage(
          b,
          (m) => m.type === "project" && m.project.revision === 1,
        )
      ).project.document.children[1].children[0].children[0].text,
      "Built together",
    );
    assert.equal(
      (
        await request(
          route,
          { nodeId: "hero", text: "Stale edit", revision: 0 },
          p.token,
          "PATCH",
        )
      ).status,
      409,
    );
    const gen = await request(
      route + "/generate",
      {
        prompt: "Make it blue",
        targetId: "cta",
        area: "frontend",
        actor: "Sam",
      },
      p.token,
    );
    assert.equal(gen.status, 200);
    p = gen.data;
    assert.equal(
      (
        await request(
          route + "/undo",
          { revision: p.revision, actor: "Alex" },
          p.token,
        )
      ).status,
      200,
    );
    const invalid = await request(
      route,
      { nodeId: "hero", style: { background: "url(https://invalid.test)" } },
      p.token,
      "PATCH",
    );
    assert.equal(invalid.status, 400);
    const run = await request(route + "/run", { input: {} }, p.token);
    assert.equal(run.status, 200);
    assert.deepEqual(run.data.data, []);
    assert.equal(run.data.trace.length, 4);
    for (const ws of clients) ws.close();
    await stop();
    await start();
    const restored = await request(route, null, p.token, "GET");
    assert.equal(restored.status, 200);
    assert.equal(
      restored.data.document.children[1].children[0].children[0].text,
      "Built together",
    );
  } finally {
    for (const ws of clients) ws.terminate();
    await stop();
    await rm(dir, { recursive: true, force: true });
  }
});
