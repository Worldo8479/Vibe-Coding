import test from "node:test";
import assert from "node:assert/strict";
import {
  makeProject,
  findNode,
  validateDocument,
  validateBackend,
} from "../server/model.js";
import {
  generationInstructions,
  expandGeneratedResult,
} from "../server/generation.js";

test("scoped prompts send only the selected element to the model", () => {
  const project = makeProject("Test");
  const instructions = generationInstructions(project, { targetId: "cta" });
  assert.match(instructions, /Primary button/);
  assert.doesNotMatch(instructions, /Total revenue|Projects database/);
  assert.throws(
    () => generationInstructions(project, { targetId: "missing" }),
    /no longer exists/,
  );
});

test("a scoped result preserves every unselected element and the original project", () => {
  const project = makeProject("Test");
  const node = structuredClone(findNode(project.document, "cta"));
  node.style.background = "#407ce9";
  const next = expandGeneratedResult(
    { node, summary: "Made the button blue" },
    project,
    { targetId: "cta" },
  );
  validateDocument(next.document);
  assert.equal(findNode(next.document, "cta").style.background, "#407ce9");
  assert.equal(findNode(project.document, "cta").style.background, "#7b6ae6");
  assert.deepEqual(
    findNode(next.document, "metrics"),
    findNode(project.document, "metrics"),
  );
  assert.deepEqual(next.backend, project.backend);
});

test("scoped backend edits preserve the flow connections", () => {
  const project = makeProject("Test");
  const node = structuredClone(
    project.backend.nodes.find((n) => n.id === "database"),
  );
  node.config.operation = "write";
  const next = expandGeneratedResult(
    { node, summary: "Save records" },
    project,
    { targetId: "database", area: "backend" },
  );
  validateBackend(next.backend);
  assert.deepEqual(next.backend.edges, project.backend.edges);
  assert.equal(
    project.backend.nodes.find((n) => n.id === "database").config.operation,
    "read",
  );
});

test("scoped output cannot change identity, type, or omit required fields", () => {
  const project = makeProject("Test");
  assert.throws(
    () =>
      expandGeneratedResult({ node: { id: "other" } }, project, {
        targetId: "cta",
      }),
    /preserve/,
  );
  assert.throws(
    () =>
      expandGeneratedResult({ node: { id: "cta", type: "text" } }, project, {
        targetId: "cta",
      }),
    /type/,
  );
  const partial = expandGeneratedResult(
    { node: { id: "cta", type: "button" } },
    project,
    { targetId: "cta" },
  );
  assert.throws(() => validateDocument(partial.document));
});
