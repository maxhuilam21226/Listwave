// In-browser AI rewording via WebGPU (WebLLM). Client-only: every export here
// touches browser globals and the web-llm engine is dynamically imported so it
// never lands in the server bundle. The model weights (~1GB) download once on
// first use and are cached by WebLLM in browser storage thereafter.

import type { MLCEngine } from "@mlc-ai/web-llm";

const MODEL_ID = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";

/** True when the browser exposes WebGPU. AI controls hide entirely when false. */
export function isWebGPUAvailable(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

/** How to transform the text. */
export type RewordOp =
  | { kind: "shorter" }
  | { kind: "longer" }
  | { kind: "tone"; tone: string };

/** Progress while the model downloads/initializes (0..1), with a label. */
export type LoadProgress = { progress: number; text: string };

let enginePromise: Promise<MLCEngine> | null = null;

/**
 * Lazily create (once) and return the shared engine. `onProgress` fires during
 * the first load only; subsequent calls resolve immediately.
 */
async function getEngine(
  onProgress?: (p: LoadProgress) => void,
): Promise<MLCEngine> {
  if (!enginePromise) {
    enginePromise = (async () => {
      const { CreateMLCEngine, prebuiltAppConfig } = await import(
        "@mlc-ai/web-llm"
      );
      return CreateMLCEngine(MODEL_ID, {
        // HuggingFace migrated model weights to their Xet CDN, which serves the
        // shard URLs via a cross-origin 302 redirect. WebLLM's default cache
        // backend stores downloads with Chrome's `Cache.add()`, and that API
        // rejects cross-origin redirects with `net::ERR_FAILED` ("Cache.add()
        // encountered a network error"). The IndexedDB backend downloads with a
        // plain `fetch()` that follows the redirect, so it sidesteps the bug.
        appConfig: { ...prebuiltAppConfig, cacheBackend: "indexeddb" },
        initProgressCallback: (r) =>
          onProgress?.({ progress: r.progress, text: r.text }),
      });
    })().catch((err) => {
      console.error("[WebLLM] engine load failed:", err);
      enginePromise = null;
      throw err;
    });
  } else if (onProgress) {
    // Already (or nearly) loaded — report complete so callers can clear UI.
    onProgress({ progress: 1, text: "Model ready" });
  }
  return enginePromise;
}

function instructionFor(op: RewordOp, max?: number): string {
  switch (op.kind) {
    case "shorter":
      return max
        ? `Rewrite it to be noticeably shorter and punchier, ideally within ${max} characters, while keeping the core meaning.`
        : "Rewrite it to be noticeably shorter and punchier while keeping the core meaning.";
    case "longer":
      return "Rewrite it to be more detailed and a bit longer, adding specificity without inventing facts.";
    case "tone":
      return `Rewrite it in a ${op.tone} tone while keeping the core meaning.`;
  }
}

/**
 * Reword `text` per `op`, returning only the rewritten text. Triggers a one-time
 * model load (reported via `onProgress`). Caller must ensure WebGPU is available.
 */
export async function reword(
  text: string,
  op: RewordOp,
  opts: { max?: number; onProgress?: (p: LoadProgress) => void } = {},
): Promise<string> {
  const engine = await getEngine(opts.onProgress);

  const system =
    "You are a copy editor for product launch listings. You rewrite marketing copy. " +
    "Respond with ONLY the rewritten text — no quotes, no preamble, no explanation, no markdown.";
  const user = `${instructionFor(op, opts.max)}\n\nText:\n${text}`;

  const reply = await engine.chat.completions.create({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.7,
  });

  const out = reply.choices[0]?.message?.content ?? "";
  // Models sometimes wrap output in quotes despite instructions — strip a single
  // matched pair.
  return out.trim().replace(/^["'""']([\s\S]*)["'""']$/, "$1").trim();
}
