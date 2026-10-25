import { randomUUID } from "node:crypto";
export const uid = () => randomUUID();
const node = (id, type, name, text = "", style = {}, children = []) => ({
  id,
  type,
  name,
  text,
  style,
  children,
});
export function makeDocument(template = "dashboard", title = "Orbit") {
  const shop = template === "store";
  if (template === "portfolio" || shop)
    return node(
      "root",
      "container",
      "Page",
      "",
      {
        background: shop ? "#f6f4ec" : "#fcfaf7",
        color: "#25322c",
        padding: "36px",
        minHeight: "650px",
      },
      [
        node(
          "nav",
          "container",
          "Navigation",
          "",
          {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "72px",
          },
          [
            node("brand", "text", "Brand", title, {
              fontSize: "21px",
              fontWeight: "700",
            }),
            node(
              "links",
              "text",
              "Navigation links",
              shop
                ? "Shop    Our story    Journal    Bag (0)"
                : "Work    About    Contact",
              { fontSize: "12px" },
            ),
          ],
        ),
        node(
          "eyebrow",
          "badge",
          "Eyebrow",
          shop ? "A LITTLE CLOSER TO NATURE" : "INDEPENDENT DESIGNER & MAKER",
          { color: "#718772", letterSpacing: "2px", fontSize: "10px" },
        ),
        node(
          "hero",
          "text",
          "Hero heading",
          shop
            ? "Good things.\nGrown slowly."
            : "Thoughtful design.\nA little unexpected.",
          {
            fontSize: "57px",
            fontWeight: "500",
            letterSpacing: "-3px",
            lineHeight: "1.08",
            marginTop: "20px",
            marginBottom: "24px",
            whiteSpace: "pre-line",
          },
        ),
        node(
          "description",
          "text",
          "Description",
          shop
            ? "Objects and everyday essentials for a more considered life."
            : "I turn complex ideas into simple, meaningful digital experiences.",
          {
            color: "#777b73",
            fontSize: "15px",
            maxWidth: "360px",
            lineHeight: "1.7",
            marginBottom: "24px",
          },
        ),
        node(
          "cta",
          "button",
          "Primary button",
          shop ? "Explore the collection ↗" : "Explore selected work ↗",
          {
            background: "#344b3d",
            color: "#ffffff",
            padding: "13px 22px",
            borderRadius: "6px",
            fontSize: "12px",
          },
        ),
        node(
          "projects",
          "container",
          "Featured collection",
          "",
          {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "18px",
            marginTop: "48px",
          },
          [
            node(
              "work1",
              "art",
              "First collection",
              shop ? "Everyday essentials" : "01 / Forma — Brand & digital",
              { background: "#d8dfce", height: "160px", borderRadius: "8px" },
            ),
            node(
              "work2",
              "art",
              "Second collection",
              shop
                ? "Objects with a story"
                : "02 / Offscript — Creative direction",
              { background: "#e7d7c8", height: "160px", borderRadius: "8px" },
            ),
          ],
        ),
      ],
    );
  return node(
    "root",
    "container",
    "Dashboard",
    "",
    {
      background: "#fafbfe",
      color: "#202531",
      padding: "30px",
      minHeight: "620px",
    },
    [
      node(
        "nav",
        "container",
        "Navigation",
        "",
        {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "34px",
        },
        [
          node("brand", "text", "Brand", title.toLowerCase() + ".", {
            fontSize: "23px",
            fontWeight: "750",
            letterSpacing: "-1px",
          }),
          node(
            "links",
            "text",
            "Navigation links",
            "Overview     Projects     Insights",
            { color: "#858991", fontSize: "11px" },
          ),
          node("user", "badge", "Profile", "JD", {
            background: "#e8f3fa",
            color: "#0b78b3",
            borderRadius: "50%",
            padding: "10px",
            fontSize: "10px",
          }),
        ],
      ),
      node(
        "heading",
        "container",
        "Page header",
        "",
        {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "24px",
        },
        [
          node("headcopy", "container", "Header text", "", {}, [
            node(
              "hero",
              "text",
              "Page title",
              "A little clarity for your day.",
              {
                fontSize: "24px",
                fontWeight: "650",
                letterSpacing: "-0.7px",
                marginBottom: "6px",
              },
            ),
            node(
              "description",
              "text",
              "Subtitle",
              "Here’s what’s happening across your workspace.",
              { color: "#9296a0", fontSize: "11px" },
            ),
          ]),
          node("cta", "button", "Primary button", "+ New project", {
            background: "#d73220",
            color: "#ffffff",
            padding: "11px 15px",
            borderRadius: "6px",
            fontSize: "10px",
          }),
        ],
      ),
      node(
        "metrics",
        "container",
        "Metrics grid",
        "",
        {
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "14px",
          marginBottom: "20px",
        },
        [
          node(
            "metric1",
            "stat",
            "Total revenue",
            "Total revenue|$24,580|↗ 12.8% this month",
            {
              background: "#ffffff",
              border: "1px solid #edeef3",
              padding: "20px",
              borderRadius: "8px",
            },
          ),
          node(
            "metric2",
            "stat",
            "Active projects",
            "Active projects|24|↗ 4 new this month",
            {
              background: "#ffffff",
              border: "1px solid #edeef3",
              padding: "20px",
              borderRadius: "8px",
            },
          ),
          node(
            "metric3",
            "stat",
            "Team productivity",
            "Team productivity|94.2%|↗ 8.2% this month",
            {
              background: "#ffffff",
              border: "1px solid #edeef3",
              padding: "20px",
              borderRadius: "8px",
            },
          ),
        ],
      ),
      node(
        "content",
        "container",
        "Content grid",
        "",
        { display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "18px" },
        [
          node("chart", "chart", "Revenue chart", "Revenue overview", {
            background: "#ffffff",
            border: "1px solid #edeef3",
            padding: "22px",
            borderRadius: "8px",
            color: "#0b78b3",
          }),
          node(
            "tasks",
            "tasklist",
            "Recent activity",
            "Recent activity|Website redesign|Brand exploration|Mobile app concept|Design system",
            {
              background: "#ffffff",
              border: "1px solid #edeef3",
              padding: "22px",
              borderRadius: "8px",
            },
          ),
        ],
      ),
      node("footer", "text", "Footer", "A little progress, every day. ✳", {
        color: "#a0a4b0",
        fontSize: "10px",
        marginTop: "24px",
        textAlign: "center",
      }),
    ],
  );
}
export function makeBackend() {
  return {
    nodes: [
      {
        id: "request",
        type: "request",
        title: "Incoming request",
        description: "The entry point for your app",
        x: 310,
        y: 45,
        config: { method: "GET", path: "/projects" },
      },
      {
        id: "validate",
        type: "validate",
        title: "Validate input",
        description: "Check the request is ready",
        x: 310,
        y: 215,
        config: { required: "" },
      },
      {
        id: "database",
        type: "database",
        title: "Projects database",
        description: "Read your project records",
        x: 310,
        y: 385,
        config: { collection: "projects", operation: "read" },
      },
      {
        id: "response",
        type: "response",
        title: "Return response",
        description: "Send the result to your app",
        x: 310,
        y: 555,
        config: { status: 200 },
      },
    ],
    edges: [
      { source: "request", target: "validate" },
      { source: "validate", target: "database" },
      { source: "database", target: "response" },
    ],
  };
}
export function makeProject(name, template = "dashboard", prompt = "") {
  return {
    id: uid(),
    token: uid(),
    name,
    template,
    starred: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    revision: 0,
    document: makeDocument(template, name.split(" ")[0]),
    backend: makeBackend(),
    history: [],
    activity: [
      {
        id: uid(),
        actor: "Weave",
        text: prompt
          ? `Started from “${prompt}”`
          : "Your workspace is ready to build.",
        time: new Date().toISOString(),
      },
    ],
  };
}
export function findNode(root, id) {
  if (root.id === id) return root;
  for (const child of root.children || []) {
    const found = findNode(child, id);
    if (found) return found;
  }
}
export const safeTypes = [
  "container",
  "text",
  "button",
  "badge",
  "stat",
  "chart",
  "tasklist",
  "art",
];
export function validateDocument(root) {
  let count = 0;
  const ids = new Set();
  function visit(n, depth) {
    if (
      !n ||
      depth > 15 ||
      ++count > 200 ||
      typeof n.id !== "string" ||
      ids.has(n.id) ||
      !safeTypes.includes(n.type) ||
      typeof n.text !== "string" ||
      typeof n.name !== "string" ||
      !n.style ||
      typeof n.style !== "object" ||
      Array.isArray(n.style) ||
      !Array.isArray(n.children)
    )
      throw new Error("Invalid canvas document");
    ids.add(n.id);
    if (n.text.length > 12000 || Object.keys(n.style).length > 60)
      throw new Error("Canvas content is too large");
    for (const [key, value] of Object.entries(n.style)) {
      if (
        !/^[a-zA-Z]+$/.test(key) ||
        ["position", "zIndex", "pointerEvents"].includes(key) ||
        !["string", "number"].includes(typeof value) ||
        /url\s*\(|expression|javascript|@import/i.test(String(value))
      )
        throw new Error("Unsupported style");
    }
    n.children.forEach((c) => visit(c, depth + 1));
  }
  visit(root, 0);
  return root;
}
export function validateBackend(backend) {
  if (
    !backend ||
    !Array.isArray(backend.nodes) ||
    !Array.isArray(backend.edges) ||
    backend.nodes.length > 30 ||
    backend.edges.length > 60
  )
    throw new Error("Invalid backend graph");
  const ids = new Set();
  for (const n of backend.nodes) {
    if (
      !n ||
      typeof n.id !== "string" ||
      ids.has(n.id) ||
      !["request", "validate", "database", "transform", "response"].includes(
        n.type,
      ) ||
      typeof n.title !== "string" ||
      typeof n.description !== "string" ||
      !Number.isFinite(n.x) ||
      !Number.isFinite(n.y) ||
      !n.config ||
      typeof n.config !== "object" ||
      Array.isArray(n.config)
    )
      throw new Error("Invalid backend node");
    ids.add(n.id);
  }
  for (const n of backend.nodes) {
    const c = n.config;
    if (
      n.title.length > 100 ||
      n.description.length > 300 ||
      n.x < 0 ||
      n.y < 0 ||
      n.x > 10000 ||
      n.y > 10000
    )
      throw new Error("Step details are out of range");
    if (
      n.type === "database" &&
      (!/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(c.collection) ||
        ["__proto__", "constructor", "prototype"].includes(c.collection) ||
        !["read", "write"].includes(c.operation))
    )
      throw new Error("Use a named collection and a read or write operation");
    if (
      n.type === "request" &&
      (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(c.method) ||
        typeof c.path !== "string" ||
        !c.path.startsWith("/") ||
        c.path.length > 150)
    )
      throw new Error("Use an HTTP method and a path starting with /");
    if (
      n.type === "validate" &&
      (typeof c.required !== "string" || c.required.length > 500)
    )
      throw new Error("Required fields must be a comma-separated list");
    if (
      n.type === "response" &&
      (!Number.isInteger(c.status) || c.status < 200 || c.status > 599)
    )
      throw new Error("Use an HTTP status from 200 to 599");
    if (
      n.type === "transform" &&
      (typeof c.key !== "string" ||
        !/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(c.key) ||
        ["constructor", "prototype"].includes(c.key))
    )
      throw new Error("Use a simple field name for the transform");
  }
  if (
    backend.nodes.filter((n) => n.type === "request").length !== 1 ||
    backend.nodes.filter((n) => n.type === "response").length !== 1
  )
    throw new Error("A flow needs one request and one response");
  if (backend.edges.some((e) => !ids.has(e.source) || !ids.has(e.target)))
    throw new Error("Connection points to a missing node");
  const seen = new Set();
  let id = backend.nodes.find((n) => n.type === "request").id;
  while (id) {
    if (seen.has(id)) throw new Error("Flow contains a cycle");
    seen.add(id);
    const edges = backend.edges.filter((e) => e.source === id);
    if (edges.length > 1) throw new Error("Use one connection per step");
    id = edges[0]?.target;
  }
  if (
    seen.size !== ids.size ||
    backend.edges.some(
      (e) => e.source === backend.nodes.find((n) => n.type === "response").id,
    )
  )
    throw new Error("Connect every step from request to response");
  return backend;
}
export function demoEdit(project, prompt, targetId, area = "frontend") {
  const next = structuredClone(project);
  const lower = prompt.replace(/["“].+?["”]/g, "").toLowerCase();
  const quoted = prompt.match(/["“](.+?)["”]/)?.[1];
  const colors = {
    blue: "#407ce9",
    green: "#34785b",
    orange: "#de8845",
    pink: "#d56693",
    black: "#24282f",
    white: "#ffffff",
    red: "#d65353",
    teal: "#238f91",
  };
  const color =
    lower.match(/#[a-f0-9]{6}\b/i)?.[0] ||
    Object.entries(colors).find(([name]) =>
      new RegExp(`\\b${name}\\b`).test(lower),
    )?.[1];
  let changed = false;
  if (area === "backend") {
    const n =
      next.backend.nodes.find((n) => n.id === targetId) ||
      next.backend.nodes.find((n) => n.type === "database");
    if (quoted) {
      n.title = quoted;
      changed = true;
    }
    const required = prompt.match(/require(?:d)?\s+([a-z_, ]+)/i)?.[1];
    if (required && n.type === "validate") {
      n.config.required = required.trim();
      changed = true;
    }
    if (lower.includes("write") || lower.includes("save")) {
      if (n.type === "database") {
        n.config.operation = "write";
        n.description = "Save a record to the collection";
        changed = true;
      }
    }
    if (lower.includes("read") && n.type === "database") {
      n.config.operation = "read";
      changed = true;
    }
    if (!changed)
      throw new Error(
        'Demo mode: try Rename to "My step", “require email” on validation, or “save records” on the database. Add an API key for open-ended prompts.',
      );
  } else {
    const n = findNode(next.document, targetId) || next.document;
    if (quoted) {
      const t =
        n.type === "container"
          ? findNode(n, "hero") || n.children.find((c) => c.type === "text")
          : n;
      if (t) {
        t.text = quoted;
        changed = true;
      }
    }
    if (color) {
      const t = targetId ? n : findNode(next.document, "cta") || n;
      t.style[t.type === "text" ? "color" : "background"] = color;
      changed = true;
    }
    if (lower.includes("dark")) {
      next.document.style.background = "#20232c";
      next.document.style.color = "#f4f5f7";
      changed = true;
    }
    if (lower.includes("light")) {
      next.document.style.background = "#fafbfe";
      next.document.style.color = "#202531";
      changed = true;
    }
    if (/round/.test(lower)) {
      n.style.borderRadius = "20px";
      changed = true;
    }
    if (/bigger|larger/.test(lower)) {
      n.style.fontSize = `${Math.min(80, parseInt(n.style.fontSize || "24") + 8)}px`;
      changed = true;
    }
    if (/smaller/.test(lower)) {
      n.style.fontSize = `${Math.max(10, parseInt(n.style.fontSize || "24") - 4)}px`;
      changed = true;
    }
    if (/spacing|breathing room/.test(lower)) {
      n.style.padding = "40px";
      n.style.gap = "24px";
      changed = true;
    }
    if (/add.*(section|card)/.test(lower)) {
      next.document.children.push(
        node(
          uid(),
          "text",
          "New section",
          quoted || "Something new starts here.",
          {
            padding: "26px",
            marginTop: "20px",
            background: "#f0f2f4",
            color: "#536272",
            borderRadius: "8px",
          },
        ),
      );
      changed = true;
    }
    if (!changed)
      throw new Error(
        'Demo mode: try “make it blue”, “make it bigger”, “add more spacing”, or Change text to "Your words". Add an API key for open-ended prompts.',
      );
  }
  return {
    document: next.document,
    backend: next.backend,
    summary: `Applied: ${prompt}`,
  };
}
export function runFlow(backend, input, collections) {
  validateBackend(backend);
  const trace = [];
  let data = structuredClone(input);
  let current = backend.nodes.find((n) => n.type === "request");
  let status = 200;
  while (current) {
    const c = current.config;
    if (current.type === "validate") {
      const required = String(c.required || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const missing = required.filter(
        (key) => data?.[key] === undefined || data[key] === "",
      );
      if (missing.length)
        return {
          status: 400,
          data: { error: `Missing fields: ${missing.join(", ")}` },
          trace: [
            ...trace,
            { id: current.id, title: current.title, state: "error" },
          ],
        };
    }
    if (current.type === "database") {
      const key = String(c.collection || "records");
      const records = (collections[key] ||= []);
      if (c.operation === "write") {
        data = { ...data, id: uid(), createdAt: new Date().toISOString() };
        records.push(data);
      } else data = records;
    }
    if (current.type === "transform")
      data = { [String(c.key || "results")]: data };
    if (current.type === "response")
      status =
        Number(c.status) >= 200 && Number(c.status) < 600
          ? Number(c.status)
          : 200;
    trace.push({ id: current.id, title: current.title, state: "success" });
    current = backend.nodes.find(
      (n) =>
        n.id === backend.edges.find((e) => e.source === current.id)?.target,
    );
  }
  return { status, data, trace };
}
