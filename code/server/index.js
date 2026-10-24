import "dotenv/config";
import { createAIResponse, resolveAIConfig } from "./ai-provider.js";
import express from "express";
import { generationInstructions, expandGeneratedResult } from "./generation.js";
import { createServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  renameSync,
  existsSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  uid,
  makeProject,
  findNode,
  validateDocument,
  validateBackend,
  demoEdit,
  runFlow,
} from "./model.js";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const aiConfig = resolveAIConfig();
const dataDir = process.env.DATA_DIR || path.join(root, ".data");
mkdirSync(dataDir, { recursive: true });
const dataFile = path.join(dataDir, "workspace.json");
let store = existsSync(dataFile)
  ? JSON.parse(readFileSync(dataFile, "utf8"))
  : {
      projects: [
        makeProject("Orbit dashboard"),
        makeProject("Forma portfolio", "portfolio"),
        makeProject("Sunday Supply", "store"),
      ],
      collections: {},
    };
function persist() {
  writeFileSync(dataFile + ".tmp", JSON.stringify(store));
  renameSync(dataFile + ".tmp", dataFile);
}
persist();
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ noServer: true, maxPayload: 16384 });
app.use(express.json({ limit: "256kb" }));
app.use((req, res, next) => {
  res.set("Referrer-Policy", "no-referrer");
  res.set("X-Content-Type-Options", "nosniff");
  next();
});
app.use("/api", (req, res, next) => {
  const origin = req.get("origin");
  if (origin && new URL(origin).host !== req.get("host"))
    return res.status(403).json({ error: "Use the workspace origin" });
  next();
});
const peers = new Map();
function broadcast(id, data) {
  for (const [ws, peer] of peers)
    if (peer.projectId === id && ws.readyState === WebSocket.OPEN)
      ws.send(JSON.stringify(data));
}
function presence(id) {
  broadcast(id, {
    type: "presence",
    peers: [...peers.values()]
      .filter((p) => p.projectId === id)
      .map(({ projectId, ...p }) => p),
  });
}
function projectFor(req, res) {
  const p = store.projects.find((p) => p.id === req.params.id);
  if (!p || req.get("x-project-token") !== p.token) {
    res
      .status(404)
      .json({ error: "Project not found. Open a valid shared link." });
    return;
  }
  return p;
}
function record(p, actor, text, previous) {
  if (previous)
    p.history = [
      ...p.history,
      {
        id: uid(),
        document: previous.document,
        backend: previous.backend,
        text,
        actor,
        time: new Date().toISOString(),
      },
    ].slice(-30);
  p.revision++;
  p.updatedAt = new Date().toISOString();
  p.activity = [
    ...p.activity,
    {
      id: uid(),
      actor: String(actor || "Teammate").slice(0, 40),
      text,
      time: p.updatedAt,
    },
  ].slice(-60);
  persist();
  broadcast(p.id, { type: "project", project: p });
}
app.get("/api/config", (_, res) =>
  res.json({
    ai: aiConfig.ai,
    mode: aiConfig.mode,
    provider: aiConfig.provider,
    model: aiConfig.ai ? aiConfig.model : null,
  }),
);
app.get("/api/projects", (_, res) => res.json(store.projects));
app.post("/api/projects", (req, res) => {
  if (store.projects.length >= 100)
    return res.status(400).json({ error: "Workspace limit reached" });
  const name = String(req.body.name || "Untitled project")
    .trim()
    .slice(0, 80);
  const p = makeProject(
    name,
    ["dashboard", "portfolio", "store"].includes(req.body.template)
      ? req.body.template
      : "dashboard",
    String(req.body.prompt || "").slice(0, 4000),
  );
  store.projects.unshift(p);
  persist();
  res.status(201).json(p);
});
app.get("/api/projects/:id", (req, res) => {
  const p = projectFor(req, res);
  if (p) res.json(p);
});
app.patch("/api/projects/:id", (req, res) => {
  const p = projectFor(req, res);
  if (!p) return;
  const previous = structuredClone(p);
  const body = req.body;
  if (Number.isInteger(body.revision) && body.revision !== p.revision)
    return res.status(409).json({
      error:
        "A teammate changed this project. Your workspace has refreshed; try again.",
    });
  try {
    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim())
        throw new Error("Enter a project name");
      p.name = body.name.trim().slice(0, 80);
    }
    if (typeof body.starred === "boolean") p.starred = body.starred;
    if (body.nodeId) {
      const n = findNode(p.document, body.nodeId);
      if (!n) throw new Error("This element no longer exists");
      if (typeof body.text === "string") n.text = body.text;
      if (body.style) n.style = { ...n.style, ...body.style };
      validateDocument(p.document);
    }
    if (body.backendNode) {
      const n = p.backend.nodes.find((n) => n.id === body.backendNode.id);
      if (!n) throw new Error("Step not found");
      for (const key of ["title", "description", "x", "y", "config"])
        if (body.backendNode[key] !== undefined) n[key] = body.backendNode[key];
      validateBackend(p.backend);
    }
    if (body.backend) p.backend = validateBackend(body.backend);
    record(
      p,
      body.actor,
      body.note ||
        (body.nodeId
          ? "Updated an element"
          : body.backendNode
            ? "Updated a backend step"
            : "Updated project settings"),
      body.nodeId || body.backendNode || body.backend ? previous : null,
    );
    res.json(p);
  } catch (error) {
    Object.assign(p, previous);
    res.status(400).json({ error: error.message });
  }
});
app.post("/api/projects/:id/undo", (req, res) => {
  const p = projectFor(req, res);
  if (!p) return;
  if (req.body.revision !== p.revision)
    return res.status(409).json({
      error: "The project changed. Review the latest version before undoing.",
    });
  const previous = p.history.pop();
  if (!previous)
    return res.status(400).json({ error: "No changes to undo yet" });
  p.document = previous.document;
  p.backend = previous.backend;
  record(p, req.body.actor, `Undid: ${previous.text}`);
  res.json(p);
});
app.post("/api/projects/:id/duplicate", (req, res) => {
  const p = projectFor(req, res);
  if (!p) return;
  const next = {
    ...structuredClone(p),
    id: uid(),
    token: uid(),
    name: p.name + " copy",
    history: [],
    activity: [],
    revision: 0,
    updatedAt: new Date().toISOString(),
  };
  store.projects.unshift(next);
  persist();
  res.status(201).json(next);
});
const generating = new Set();
app.post("/api/projects/:id/generate", async (req, res) => {
  const p = projectFor(req, res);
  if (!p) return;
  const { prompt, targetId, area = "frontend", actor, initial } = req.body;
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 4000)
    return res
      .status(400)
      .json({ error: "Use a prompt between 1 and 4,000 characters" });
  if (generating.has(p.id))
    return res.status(409).json({
      error: "A change is already being generated. Try again when it finishes.",
    });
  generating.add(p.id);
  broadcast(p.id, { type: "generating", actor, active: true });
  const revision = p.revision;
  try {
    let result;
    if (!aiConfig.ai) result = demoEdit(p, prompt, targetId, area);
    else {
      const answer = await createAIResponse({
        ...aiConfig,
        prompt,
        instructions: generationInstructions(p, { targetId, area, initial }),
      });
      if (answer.status !== "completed")
        throw new Error("Generation did not finish. Try a smaller change.");
      const output = answer.output
        ?.flatMap((item) => item.content || [])
        .filter((c) => c.type === "output_text")
        .map((c) => c.text)
        .join("");
      result = expandGeneratedResult(JSON.parse(output), p, {
        targetId,
        area,
        initial,
      });
    }
    if (p.revision !== revision)
      return res.status(409).json({
        error:
          "A teammate edited the project during generation. Nothing was overwritten; please try again.",
      });
    validateDocument(result.document);
    validateBackend(result.backend);
    const previous = structuredClone(p);
    const candidate = structuredClone(p);
    if (initial) {
      candidate.document = result.document;
      candidate.backend = result.backend;
    } else if (area === "backend") {
      if (targetId) {
        const nextNode = result.backend.nodes.find((n) => n.id === targetId);
        const oldNode = candidate.backend.nodes.find((n) => n.id === targetId);
        if (!nextNode || !oldNode)
          throw new Error("Selected step was removed. Try a general prompt.");
        Object.assign(oldNode, nextNode);
      } else candidate.backend = result.backend;
    } else if (targetId) {
      const oldNode = findNode(candidate.document, targetId);
      const nextNode = findNode(result.document, targetId);
      if (!oldNode || !nextNode)
        throw new Error("Selected element was removed. Try a general prompt.");
      Object.assign(oldNode, nextNode);
    } else candidate.document = result.document;
    validateDocument(candidate.document);
    validateBackend(candidate.backend);
    p.document = candidate.document;
    p.backend = candidate.backend;
    record(p, actor, String(result.summary || prompt).slice(0, 500), previous);
    res.json(p);
  } catch (error) {
    res.status(400).json({ error: error.message });
  } finally {
    generating.delete(p.id);
    broadcast(p.id, { type: "generating", active: false });
  }
});
app.post("/api/projects/:id/run", (req, res) => {
  const p = projectFor(req, res);
  if (!p) return;
  try {
    const collections = (store.collections[p.id] ||= {});
    const result = runFlow(p.backend, req.body.input ?? {}, collections);
    persist();
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname !== "/collaborate") {
    if (process.env.NODE_ENV === "production") socket.destroy();
    return;
  }
  const p = store.projects.find(
    (p) => p.id === url.searchParams.get("project"),
  );
  if (
    url.pathname !== "/collaborate" ||
    !p ||
    p.token !== url.searchParams.get("token") ||
    (req.headers.origin &&
      new URL(req.headers.origin).host !== req.headers.host)
  ) {
    socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    const peer = {
      id: uid(),
      projectId: p.id,
      name: (url.searchParams.get("name") || "Teammate").slice(0, 40),
      color: ["#0b78b3", "#d73220", "#1f0062", "#68150a"][peers.size % 4],
      cursor: null,
      selection: null,
      area: "frontend",
    };
    peers.set(ws, peer);
    ws.send(JSON.stringify({ type: "welcome", id: peer.id, project: p }));
    presence(p.id);
    ws.on("message", (raw) => {
      try {
        const m = JSON.parse(raw);
        if (
          m.type === "cursor" &&
          Number.isFinite(m.x) &&
          Number.isFinite(m.y)
        ) {
          peer.cursor = {
            x: Math.max(0, Math.min(1, m.x)),
            y: Math.max(0, Math.min(1, m.y)),
          };
          peer.area = m.area === "backend" ? "backend" : "frontend";
          broadcast(p.id, { type: "cursor", peer });
        }
        if (m.type === "selection") {
          peer.selection = typeof m.id === "string" ? m.id.slice(0, 100) : null;
          presence(p.id);
        }
      } catch {}
    });
    ws.on("close", () => {
      peers.delete(ws);
      presence(p.id);
    });
    ws.on("error", () => ws.close());
    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
    });
  });
});
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, 30000);
heartbeat.unref();
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(root, "dist")));
  app.get("/{*path}", (_, res) =>
    res.sendFile(path.join(root, "dist/index.html")),
  );
} else {
  const { createServer: createVite } = await import("vite");
  const vite = await createVite({
    root,
    server: { middlewareMode: true, hmr: { server } },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
app.use((err, req, res, next) =>
  res.status(400).json({ error: err.message || "Request failed" }),
);
server.listen(
  Number(process.env.PORT || 3000),
  process.env.HOST || "0.0.0.0",
  () =>
    console.log(
      `Weave is ready at http://localhost:${process.env.PORT || 3000}`,
    ),
);
