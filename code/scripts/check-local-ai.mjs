import "dotenv/config";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { WebSocket } from "ws";
import { resolveAIConfig } from "../server/ai-provider.js";
import {
  findNode,
  validateDocument,
  validateBackend,
} from "../server/model.js";

const config = resolveAIConfig();
if (config.provider !== "ollama")
  throw new Error("Set AI_PROVIDER=ollama before running the local check.");
const dir = await mkdtemp(path.join(tmpdir(), "weave-local-check-"));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let child;
let ws;
try {
  const probe = createServer();
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", resolve);
  });
  const port = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  const base = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ["server/index.js"], {
    cwd: path.resolve(import.meta.dirname, ".."),
    env: {
      ...process.env,
      AI_PROVIDER: "ollama",
      OPENAI_API_KEY: "",
      NODE_ENV: "production",
      PORT: String(port),
      HOST: "127.0.0.1",
      DATA_DIR: dir,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  let startupError;
  child.on("error", (error) => {
    startupError = error;
  });
  child.stdout.on("data", (chunk) => {
    log += chunk;
  });
  child.stderr.on("data", (chunk) => {
    log += chunk;
  });
  for (let i = 0; i < 100; i++) {
    if (startupError) throw startupError;
    if (child.exitCode !== null) throw new Error(`Test server stopped: ${log}`);
    if (log.includes("Weave is ready")) break;
    await wait(50);
  }
  async function request(route, body, token) {
    const res = await fetch(base + route, {
      method: body === undefined ? "GET" : "POST",
      signal: AbortSignal.timeout(310000),
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "x-project-token": token } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = await res.json();
    assert.ok(res.ok, `${route}: ${data.error || res.status}`);
    return data;
  }
  const publicConfig = await request("/api/config");
  assert.equal(publicConfig.provider, "ollama");
  assert.equal(publicConfig.model, config.model);
  let project = await request("/api/projects", { name: "Local model check" });
  const route = `/api/projects/${project.id}`;
  const messages = [];
  ws = new WebSocket(
    `${base.replace("http", "ws")}/collaborate?project=${project.id}&token=${project.token}&name=Local-check`,
  );
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Collaboration connection timed out")),
      5000,
    );
    ws.on("message", (raw) => {
      const message = JSON.parse(raw);
      messages.push(message);
      if (message.type === "welcome") {
        clearTimeout(timer);
        resolve();
      }
    });
    ws.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
  async function generate(prompt, options) {
    const result = await request(
      route + "/generate",
      { prompt, ...options, actor: "Local AI check" },
      project.token,
    );
    validateDocument(result.document);
    validateBackend(result.backend);
    for (let i = 0; i < 50; i++) {
      if (
        messages.some(
          (m) => m.type === "project" && m.project.revision === result.revision,
        )
      )
        break;
      await wait(20);
    }
    const shared = messages.find(
      (m) => m.type === "project" && m.project.revision === result.revision,
    );
    assert.ok(shared, "Generated changes must reach collaborators");
    assert.deepEqual(shared.project.document, result.document);
    assert.deepEqual(shared.project.backend, result.backend);
    const saved = JSON.parse(
      await readFile(path.join(dir, "workspace.json"), "utf8"),
    );
    assert.deepEqual(
      saved.projects.find((p) => p.id === result.id),
      result,
    );
    project = result;
    return result;
  }
  console.log(
    `Checking ${config.model} through Weave's API in a temporary workspace.`,
  );
  const start = Date.now();
  const frontend = await generate(
    'Change this button text to "Start a new chapter". Preserve all other properties.',
    { targetId: "cta" },
  );
  assert.equal(findNode(frontend.document, "cta").text, "Start a new chapter");
  console.log(
    "PASS: Selected frontend edit, validation, persistence, and live update.",
  );
  const backend = await generate(
    "Require both email and name. Use a comma-separated required field list. Preserve all other properties.",
    { targetId: "validate", area: "backend" },
  );
  const required = backend.backend.nodes
    .find((n) => n.id === "validate")
    .config.required.split(",")
    .map((s) => s.trim());
  assert.ok(required.includes("email") && required.includes("name"));
  const rejected = await request(route + "/run", { input: {} }, project.token);
  assert.equal(rejected.status, 400);
  assert.match(rejected.data.error, /email/);
  assert.match(rejected.data.error, /name/);
  const accepted = await request(
    route + "/run",
    { input: { email: "test@example.com", name: "Local check" } },
    project.token,
  );
  assert.equal(accepted.status, 200);
  assert.ok(accepted.trace.length > 0);
  console.log(
    "PASS: Selected backend edit, execution, persistence, and live update.",
  );
  const initial = await generate(
    "Create a very small book-club page: a navigation brand, a heading, a subtitle, and a join button. Use only these four elements inside a root container. Keep the existing default linear backend.",
    { initial: true },
  );
  assert.ok(initial.document.children.length > 0);
  console.log(
    "PASS: Prompt-to-page generation, validation, persistence, and live update.",
  );
  console.log(
    `Local AI checks passed in ${((Date.now() - start) / 1000).toFixed(1)} seconds.`,
  );
} finally {
  ws?.terminate();
  if (child?.pid && child.exitCode === null) {
    const ended = new Promise((resolve) => child.once("exit", resolve));
    child.kill("SIGTERM");
    await ended;
  }
  await rm(dir, { recursive: true, force: true });
}
