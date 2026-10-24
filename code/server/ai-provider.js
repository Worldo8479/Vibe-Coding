export function resolveAIConfig(env = process.env) {
  const provider = (
    env.AI_PROVIDER || (env.OPENAI_API_KEY?.trim() ? "openai" : "demo")
  )
    .toLowerCase()
    .trim();
  if (!["openai", "ollama", "demo"].includes(provider)) {
    throw new Error("AI_PROVIDER must be openai, ollama, or demo.");
  }
  return {
    provider,
    model:
      provider === "ollama"
        ? (env.OLLAMA_MODEL || "qwen2.5-coder:7b").trim()
        : (env.OPENAI_MODEL || "gpt-4.1-mini").trim(),
    baseURL: env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
    apiKey: provider === "openai" ? env.OPENAI_API_KEY?.trim() : undefined,
    ai: provider !== "demo",
    mode:
      provider === "ollama"
        ? "Local AI"
        : provider === "openai"
          ? "OpenAI"
          : "Demo mode",
  };
}

async function createOllamaResponse({
  prompt,
  instructions,
  model,
  baseURL,
  maxOutputTokens,
  fetchImpl,
}) {
  const url = new URL(baseURL || "http://127.0.0.1:11434");
  if (
    !["http:", "https:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.username ||
    url.password
  ) {
    throw new Error(
      "Local AI requires OLLAMA_BASE_URL to use localhost or a loopback address.",
    );
  }
  if (/cloud/i.test(model))
    throw new Error(
      "Choose a downloaded local model in OLLAMA_MODEL, not an Ollama cloud model.",
    );
  let response;
  try {
    // No OpenAI credential is ever included in a local-model request.
    response = await fetchImpl(new URL("/api/chat", url).href, {
      method: "POST",
      signal: AbortSignal.timeout(300000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        format: "json",
        keep_alive: "2m",
        messages: [
          {
            role: "system",
            content: `${instructions || ""}\nReturn only valid JSON. No Markdown fences or explanatory text.`,
          },
          { role: "user", content: prompt },
        ],
        options: {
          temperature: 0.1,
          num_ctx: 16384,
          num_predict: Math.min(maxOutputTokens, 8192),
        },
      }),
    });
  } catch (error) {
    if (error.name === "TimeoutError" || error.name === "AbortError")
      throw new Error(
        "The local model took longer than five minutes. Try a smaller change or a smaller model.",
      );
    throw new Error(
      "Cannot reach local Ollama. Open the Ollama app or run `ollama serve`, then try again.",
    );
  }
  const answer = await response.json().catch(() => null);
  if (!response.ok || answer?.error) {
    const detail =
      typeof answer?.error === "string"
        ? answer.error.slice(0, 500)
        : "No error description was returned.";
    const help =
      response.status === 404 ? ` Download it with: ollama pull ${model}` : "";
    throw new Error(
      `Ollama rejected the request (${response.status}). ${detail}${help}`,
    );
  }
  if (
    !answer?.done ||
    typeof answer.message?.content !== "string" ||
    !answer.message.content.trim()
  )
    throw new Error(
      "Ollama returned no completed response. Try again with a smaller change.",
    );
  if (answer.done_reason === "length")
    throw new Error(
      "The local model reached its output limit. Try changing one element at a time.",
    );
  return {
    status: "completed",
    output: [
      { content: [{ type: "output_text", text: answer.message.content }] },
    ],
  };
}

// Keep the JSON requirement in input as well as the project instructions.
// Responses JSON mode validates input messages before running the model.
export async function createAIResponse({
  prompt,
  instructions,
  apiKey,
  model = "gpt-4.1-mini",
  provider = "openai",
  baseURL,
  maxOutputTokens = 14000,
  fetchImpl = fetch,
}) {
  if (provider === "ollama")
    return createOllamaResponse({
      prompt,
      instructions,
      model,
      baseURL,
      maxOutputTokens,
      fetchImpl,
    });
  if (provider !== "openai")
    throw new Error("Choose the openai or ollama AI provider.");
  const key = apiKey?.trim();
  if (!key)
    throw new Error(
      "OPENAI_API_KEY is missing. Add a key, or set AI_PROVIDER=ollama to use a local model.",
    );
  const response = await fetchImpl("https://api.openai.com/v1/responses", {
    method: "POST",
    signal: AbortSignal.timeout(90000),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      store: false,
      text: { format: { type: "json_object" } },
      instructions,
      input: [
        { role: "developer", content: "Return the requested result as JSON." },
        { role: "user", content: prompt },
      ],
      max_output_tokens: maxOutputTokens,
    }),
  });
  const answer = await response.json().catch(() => null);
  if (!response.ok) {
    const scrub = (value) => {
      let text = typeof value === "string" ? value : "";
      if (key) text = text.replaceAll(key, "[redacted]");
      return text.replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]").slice(0, 700);
    };
    const detail = scrub(answer?.error?.message);
    const parameter = scrub(answer?.error?.param);
    const guidance = {
      401: "Check OPENAI_API_KEY in .env, then restart the server.",
      403: "Check your API project's permissions and model access.",
      404: "Check OPENAI_MODEL and whether your API project can access it.",
      429: "Check your API project's billing, usage limits, or rate limit.",
    }[response.status];
    throw new Error(
      [
        `OpenAI rejected the request (${response.status}).`,
        detail || "The provider did not return an error description.",
        parameter ? `Parameter: ${parameter}.` : "",
        guidance || "",
      ]
        .filter(Boolean)
        .join(" "),
    );
  }
  if (!answer)
    throw new Error(
      "OpenAI returned an unreadable response. Please try again.",
    );
  return answer;
}
