import test from "node:test";
import assert from "node:assert/strict";
import { createAIResponse, resolveAIConfig } from "../server/ai-provider.js";

test("explicit local and demo modes never select OpenAI because a key exists", () => {
  const local = resolveAIConfig({
    AI_PROVIDER: "ollama",
    OPENAI_API_KEY: "test-secret",
  });
  assert.equal(local.provider, "ollama");
  assert.equal(local.apiKey, undefined);
  assert.equal(local.model, "qwen2.5-coder:7b");
  assert.equal(
    resolveAIConfig({ AI_PROVIDER: "demo", OPENAI_API_KEY: "test-secret" }).ai,
    false,
  );
  assert.equal(resolveAIConfig({}).provider, "demo");
  assert.equal(
    resolveAIConfig({ OPENAI_API_KEY: "test-secret" }).provider,
    "openai",
  );
  assert.throws(
    () => resolveAIConfig({ AI_PROVIDER: "unknown" }),
    /AI_PROVIDER/,
  );
});

test("local generation uses Ollama JSON mode and never sends an API key", async () => {
  const answer = await createAIResponse({
    provider: "ollama",
    model: "qwen2.5-coder:7b",
    apiKey: "secret-not-for-ollama",
    prompt: "Make it blue",
    instructions: "Return a JSON project",
    fetchImpl: async (url, options) => {
      assert.equal(url, "http://127.0.0.1:11434/api/chat");
      assert.equal(options.headers.Authorization, undefined);
      assert.doesNotMatch(JSON.stringify(options), /secret-not-for-ollama/);
      const body = JSON.parse(options.body);
      assert.equal(body.format, "json");
      assert.equal(body.stream, false);
      assert.equal(body.options.num_ctx, 16384);
      assert.equal(body.messages[1].content, "Make it blue");
      return Response.json({
        done: true,
        done_reason: "stop",
        message: { content: '{"ok":true}' },
      });
    },
  });
  assert.equal(answer.status, "completed");
  assert.equal(JSON.parse(answer.output[0].content[0].text).ok, true);
});

test("local failures give instructions without falling back to a paid provider", async () => {
  let calls = 0;
  await assert.rejects(
    createAIResponse({
      provider: "ollama",
      model: "qwen2.5-coder:7b",
      prompt: "Hi",
      apiKey: "present-but-unused",
      fetchImpl: async () => {
        calls++;
        return Response.json({ error: "model not found" }, { status: 404 });
      },
    }),
    /ollama pull qwen2.5-coder:7b/,
  );
  assert.equal(calls, 1);
  await assert.rejects(
    createAIResponse({
      provider: "ollama",
      model: "qwen2.5-coder:7b",
      prompt: "Hi",
      fetchImpl: async () => {
        throw new TypeError("fetch failed");
      },
    }),
    /ollama serve/,
  );
});

test("local mode rejects cloud endpoints and incomplete generations", async () => {
  const shouldNotFetch = async () => {
    throw new Error("Unexpected request");
  };
  await assert.rejects(
    createAIResponse({
      provider: "ollama",
      model: "qwen2.5-coder:7b",
      baseURL: "https://ollama.com",
      fetchImpl: shouldNotFetch,
    }),
    /loopback/,
  );
  await assert.rejects(
    createAIResponse({
      provider: "ollama",
      model: "model:cloud",
      fetchImpl: shouldNotFetch,
    }),
    /cloud model/,
  );
  await assert.rejects(
    createAIResponse({
      provider: "ollama",
      model: "qwen2.5-coder:7b",
      fetchImpl: async () =>
        Response.json({
          done: true,
          done_reason: "length",
          message: { content: '{"unfinished":' },
        }),
    }),
    /output limit/,
  );
});

test("ordinary prompts satisfy the provider's JSON input requirement", async () => {
  const prompt = "Make it blue";
  const answer = await createAIResponse({
    apiKey: " test-key ",
    prompt,
    instructions: "Output a JSON project document.",
    fetchImpl: async (url, options) => {
      assert.equal(url, "https://api.openai.com/v1/responses");
      assert.equal(options.headers.Authorization, "Bearer test-key");
      const body = JSON.parse(options.body);
      const hasJSON = body.input.some((message) =>
        /json/i.test(message.content),
      );
      // Reproduce the provider's pre-generation check, not the model's behavior.
      if (!hasJSON)
        return Response.json(
          { error: { message: "Input must contain JSON", param: "input" } },
          { status: 400 },
        );
      assert.deepEqual(
        body.input.find((message) => message.role === "user"),
        { role: "user", content: prompt },
      );
      assert.equal(body.store, false);
      return Response.json({
        status: "completed",
        output: [{ content: [{ type: "output_text", text: '{"ok":true}' }] }],
      });
    },
  });
  assert.equal(answer.status, "completed");
  assert.equal(JSON.parse(answer.output[0].content[0].text).ok, true);
});

test("provider errors expose the actual cause and parameter, without credentials", async () => {
  await assert.rejects(
    createAIResponse({
      apiKey: "test-secret",
      prompt: "Change the heading",
      instructions: "Return JSON",
      fetchImpl: async () =>
        Response.json(
          {
            error: {
              message: "Invalid value for test-secret sk-other-secret",
              param: "input",
            },
          },
          { status: 400 },
        ),
    }),
    (error) => {
      assert.match(error.message, /\(400\)/);
      assert.match(error.message, /Invalid value/);
      assert.match(error.message, /Parameter: input/);
      assert.doesNotMatch(error.message, /test-secret|sk-other-secret|quota/);
      return true;
    },
  );
});

test("authentication errors include restart guidance and redact reflected keys", async () => {
  await assert.rejects(
    createAIResponse({
      apiKey: "sk-test-credential",
      prompt: "Hello",
      fetchImpl: async () =>
        Response.json(
          { error: { message: "Incorrect API key: sk-test-credential" } },
          { status: 401 },
        ),
    }),
    (error) => {
      assert.match(error.message, /restart the server/);
      assert.doesNotMatch(error.message, /sk-test-credential/);
      return true;
    },
  );
});

test("non-JSON error pages do not leak raw provider responses", async () => {
  await assert.rejects(
    createAIResponse({
      apiKey: "test-key",
      prompt: "Hello",
      fetchImpl: async () =>
        new Response("<html>Proxy response with private details</html>", {
          status: 502,
        }),
    }),
    /OpenAI rejected the request \(502\). The provider did not return an error description/,
  );
});
