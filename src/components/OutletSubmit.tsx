"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setSubmissionStatus } from "@/app/actions";
import type {
  OutletEnriched,
  PreparedField,
  SubmissionStatus,
} from "@/lib/types";

export default function OutletSubmit({
  projectId,
  outlet,
  fields,
  initialStatus,
}: {
  projectId: string;
  outlet: OutletEnriched;
  fields: PreparedField[];
  initialStatus: SubmissionStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<SubmissionStatus>(initialStatus);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const copyFields = fields.filter((f) => f.type !== "image");
  const imageFields = fields.filter((f) => f.type === "image");
  const submitUrl = outlet.submit_url ?? outlet.url;
  const guided = outlet.guided;

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1200);
  }

  function copyAll() {
    const text = copyFields.map((f) => `${f.label}:\n${f.value}`).join("\n\n");
    copy(text, "__all");
  }

  function mark(next: SubmissionStatus) {
    setStatus(next);
    startTransition(() => {
      setSubmissionStatus(projectId, outlet.id, next);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
        <a
          href={submitUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
        >
          {guided ? "Open submit page ↗" : "Open site ↗"}
        </a>
        <button
          onClick={copyAll}
          className="rounded-lg border border-border px-4 py-2 text-sm"
        >
          {copiedKey === "__all" ? "Copied all ✓" : "Copy all fields"}
        </button>
        <span className="ml-auto text-sm">
          {status === "submitted" && "✅ Submitted"}
          {status === "skipped" && "⏭️ Skipped"}
          {status === "todo" && "⬜ Not submitted"}
        </span>
      </div>

      {!guided && (
        <p className="rounded-lg border border-border bg-card px-4 py-3 text-xs text-muted">
          No verified field map for this directory yet — below is your standard
          launch kit to copy from. Open the site and find its submit/“add your
          product” page.
        </p>
      )}

      {outlet.steps && outlet.steps.length > 0 && (
        <ol className="list-decimal space-y-1 rounded-xl border border-border bg-card p-4 pl-8 text-sm text-muted">
          {outlet.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      )}

      <div className="space-y-3">
        {copyFields.map((f) => (
          <div key={f.key} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {f.label}
                {f.required && <span className="text-red-500"> *</span>}
              </span>
              <div className="flex items-center gap-2 text-xs">
                {f.max != null && (
                  <span
                    className={
                      f.truncated
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-faint"
                    }
                  >
                    {f.value.length}/{f.max}
                    {f.truncated && " (trimmed)"}
                  </span>
                )}
                <button
                  onClick={() => copy(f.value, f.key)}
                  className="rounded border border-border px-2 py-0.5 hover:bg-track"
                >
                  {copiedKey === f.key ? "Copied ✓" : "Copy"}
                </button>
              </div>
            </div>
            {f.help && <p className="mt-0.5 text-xs text-faint">{f.help}</p>}
            <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm text-fg">
              {f.value || <span className="text-faint">— empty —</span>}
            </pre>
          </div>
        ))}
      </div>

      {imageFields.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium">Assets to upload manually</p>
          {imageFields.map((f) => {
            const urls = f.value ? f.value.split("\n").filter(Boolean) : [];
            return (
              <div key={f.key} className="mt-3">
                <p className="text-xs text-muted">{f.label}</p>
                {urls.length === 0 ? (
                  <p className="text-xs text-faint">— none uploaded —</p>
                ) : (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {urls.map((url) => (
                      <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt=""
                          className="h-16 w-24 rounded border border-border object-cover"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-3 border-t border-border pt-4">
        <button
          onClick={() => mark(status === "submitted" ? "todo" : "submitted")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            status === "submitted"
              ? "border border-border"
              : "bg-green-600 text-white"
          }`}
        >
          {status === "submitted" ? "Undo submitted" : "Mark as submitted"}
        </button>
        <button
          onClick={() => mark(status === "skipped" ? "todo" : "skipped")}
          className="rounded-lg border border-border px-4 py-2 text-sm"
        >
          {status === "skipped" ? "Unskip" : "Skip this directory"}
        </button>
      </div>
    </div>
  );
}
