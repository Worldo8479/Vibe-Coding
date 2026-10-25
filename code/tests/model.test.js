import test from "node:test";
import assert from "node:assert/strict";
import {
  makeProject,
  makeDocument,
  makeBackend,
  validateDocument,
  validateBackend,
  demoEdit,
  findNode,
  runFlow,
} from "../server/model.js";
test("starter documents validate and contain individually addressable elements", () => {
  for (const type of ["dashboard", "portfolio", "store"]) {
    const d = makeDocument(type);
    assert.equal(validateDocument(d), d);
    assert.ok(findNode(d, "hero"));
    assert.ok(findNode(d, "cta"));
  }
});
test("scoped prompts change only the requested element", () => {
  const p = makeProject("Test");
  const edited = demoEdit(p, "Make it blue", "cta");
  assert.equal(findNode(edited.document, "cta").style.background, "#407ce9");
  assert.deepEqual(
    findNode(edited.document, "hero"),
    findNode(p.document, "hero"),
  );
  assert.equal(findNode(p.document, "cta").style.background, "#d73220");
});
test("quoted text and explicit unsupported demo feedback", () => {
  const p = makeProject("Test");
  assert.equal(
    findNode(
      demoEdit(p, 'Change text to "Welcome, team"', "hero").document,
      "hero",
    ).text,
    "Welcome, team",
  );
  assert.throws(
    () => demoEdit(p, "integrate a payment provider", null),
    /Demo mode/,
  );
});
test("unsafe styles, repeated identifiers and unknown node types are rejected", () => {
  const d = makeDocument();
  d.style.background = "url(https://example.com/collect)";
  assert.throws(() => validateDocument(d));
  const a = makeDocument();
  a.children[1].id = a.children[0].id;
  assert.throws(() => validateDocument(a));
  const b = makeDocument();
  b.type = "script";
  assert.throws(() => validateDocument(b));
});
test("backend writes persist and read flows return the saved data", () => {
  const backend = makeBackend(),
    collections = {};
  backend.nodes.find((n) => n.id === "database").config.operation = "write";
  backend.nodes.find((n) => n.id === "validate").config.required = "name";
  const failed = runFlow(backend, {}, collections);
  assert.equal(failed.status, 400);
  assert.equal(collections.projects, undefined);
  const success = runFlow(backend, { name: "A project" }, collections);
  assert.equal(success.status, 200);
  assert.equal(collections.projects.length, 1);
  backend.nodes.find((n) => n.id === "database").config.operation = "read";
  const read = runFlow(backend, {}, {});
  assert.equal(read.status, 400);
  const result = runFlow(backend, { name: "test" }, collections);
  assert.equal(result.data[0].name, "A project");
});
test("transforms wrap records and flow validation rejects cycles and orphan nodes", () => {
  const b = makeBackend();
  b.nodes.push({
    id: "transform",
    type: "transform",
    title: "Wrap",
    description: "Wrap records",
    x: 0,
    y: 0,
    config: { key: "items" },
  });
  b.edges[2].target = "transform";
  b.edges.push({ source: "transform", target: "response" });
  assert.deepEqual(runFlow(b, {}, {}).data, { items: [] });
  b.edges.push({ source: "response", target: "request" });
  assert.throws(() => validateBackend(b), /cycle/);
  const orphan = makeBackend();
  orphan.edges.pop();
  assert.throws(() => validateBackend(orphan), /Connect/);
});

test("text-only demo prompts do not accidentally match color words", () => {
  const p = makeProject("Test");
  const result = demoEdit(
    p,
    'Change text to "A shared space with blue skies"',
    "hero",
  );
  assert.deepEqual(
    findNode(result.document, "hero").style,
    findNode(p.document, "hero").style,
  );
});
test("backend configuration rejects reserved collection names and invalid statuses", () => {
  const b = makeBackend();
  b.nodes.find((n) => n.id === "database").config.collection = "constructor";
  assert.throws(() => validateBackend(b), /collection/);
  const r = makeBackend();
  r.nodes.find((n) => n.id === "response").config.status = 999;
  assert.throws(() => validateBackend(r), /HTTP status/);
});
