"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  isWebGPUAvailable,
  reword,
  type LoadProgress,
  type RewordOp,
} from "@/lib/ai/webllm";

const TONES = ["Professional", "Casual", "Playful", "Formal", "Bold"];

type Status =
  | { kind: "idle" }
  | { kind: "loading"; progress: number }
  | { kind: "working" }
  | { kind: "error"; message: string };

/**
 * "✨ AI" button that rewords a text field in-browser via WebGPU. Renders
 * nothing when WebGPU is unavailable. `onResult` receives the rewritten text.
 */
export default function AIAssist({
  text,
  onResult,
  max,
}: {
  text: string;
  onResult: (next: string) => void;
  max?: number;
}) {
  // SSR-safe WebGPU detection: server renders nothing, client checks navigator
  // on hydration — no synchronous setState in an effect.
  const available = useSyncExternalStore(
    () => () => {},
    () => isWebGPUAvailable(),
    () => false,
  );
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!available) return null;

  const busy = status.kind === "loading" || status.kind === "working";

  async function run(op: RewordOp) {
    setOpen(false);
    if (!text.trim()) {
      setStatus({ kind: "error", message: "Nothing to reword" });
      return;
    }
    setStatus({ kind: "loading", progress: 0 });
    try {
      const onProgress = (p: LoadProgress) =>
        setStatus(
          p.progress >= 1 ? { kind: "working" } : { kind: "loading", progress: p.progress },
        );
      const next = await reword(text, op, { max, onProgress });
      onResult(next);
      setStatus({ kind: "idle" });
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      const isNetworkCache =
        raw.includes("Cache") || raw.includes("fetch") || raw.includes("network");
      setStatus({
        kind: "error",
        message: isNetworkCache
          ? "Model download failed — check your connection and retry. (Requires ~1 GB from HuggingFace.)"
          : raw || "AI failed",
      });
    }
  }

  const label =
    status.kind === "loading"
      ? `Loading model… ${Math.round(status.progress * 100)}%`
      : status.kind === "working"
        ? "Rewording…"
        : "✨ AI";

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        disabled={busy}
        onClick={() => setOpen((o) => !o)}
        title="Reword with in-browser AI"
        className="rounded border border-border px-2 py-0.5 text-xs text-muted hover:bg-track disabled:opacity-60"
      >
        {label}
      </button>

      {status.kind === "error" && (
        <div className="absolute right-0 z-10 mt-1 w-56 rounded border border-border bg-card p-2 text-xs text-red-600 dark:text-red-400">
          <p>{status.message}</p>
          <button
            type="button"
            onClick={() => setStatus({ kind: "idle" })}
            className="mt-1.5 rounded border border-border px-2 py-0.5 text-muted hover:bg-track"
          >
            Dismiss
          </button>
        </div>
      )}

      {open && !busy && (
        <div className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-lg border border-border bg-card py-1 text-sm shadow-lg">
          <MenuItem onClick={() => run({ kind: "shorter" })}>Make shorter</MenuItem>
          <MenuItem onClick={() => run({ kind: "longer" })}>Make longer</MenuItem>
          <div className="my-1 border-t border-border" />
          <p className="px-3 py-0.5 text-[10px] uppercase tracking-wide text-faint">
            Tone
          </p>
          {TONES.map((tone) => (
            <MenuItem key={tone} onClick={() => run({ kind: "tone", tone })}>
              {tone}
            </MenuItem>
          ))}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full px-3 py-1.5 text-left hover:bg-track"
    >
      {children}
    </button>
  );
}
