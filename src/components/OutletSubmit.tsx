"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveOutletFieldOverrides, setSubmissionStatus } from "@/app/actions";
import AIAssist from "@/components/AIAssist";
import type {
  OutletEnriched,
  PreparedField,
  SubmissionStatus,
} from "@/lib/types";

type Overrides = Record<string, string>;

/** Reword/tone help applies to free-text copy, never name/email/pricing/asset fields. */
function isAssistable(f: PreparedField): boolean {
  if (f.type !== "text" && f.type !== "textarea" && f.type !== "tags") return false;
  if (f.source === "name" || f.source === "contact_email" || f.source === "pricing_type")
    return false;
  if (f.key === "name" || f.key === "contact_email" || f.key === "pricing") return false;
  return true;
}

export default function OutletSubmit({
  projectId,
  outlet,
  fields,
  initialOverrides,
  initialStatus,
}: {
  projectId: string;
  outlet: OutletEnriched;
  fields: PreparedField[];
  initialOverrides: Overrides;
  initialStatus: SubmissionStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<SubmissionStatus>(initialStatus);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Overrides>(initialOverrides);
  const overridesRef = useRef<Overrides>(initialOverrides);
  const [, startTransition] = useTransition();

  const copyFields = fields.filter((f) => f.type !== "image");
  const imageFields = fields.filter((f) => f.type === "image");
  const submitUrl = outlet.submit_url ?? outlet.url;
  const guided = outlet.guided;

  const valueOf = (f: PreparedField): string =>
    f.key in overrides ? overrides[f.key] : f.value;

  function persist() {
    startTransition(() =>
      saveOutletFieldOverrides(outlet.id, overridesRef.current, projectId),
    );
  }

  /** Edit (or reset) one field's override; `null` reverts to the kit default. */
  function setOverride(key: string, value: string | null, save: boolean) {
    setOverrides((prev) => {
      const next = { ...prev };
      if (value === null) delete next[key];
      else next[key] = value;
      overridesRef.current = next;
      return next;
    });
    if (save) persist();
  }

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1200);
  }

  function copyAll() {
    const text = copyFields
      .map((f) => `${f.label}:\n${valueOf(f)}`)
      .join("\n\n");
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

      <p className="text-xs text-faint">
        Edit any field to tailor it for this outlet — your edit is saved for this
        outlet only and won’t change if you later edit the project’s defaults.
      </p>

      {outlet.steps && outlet.steps.length > 0 && (
        <ol className="list-decimal space-y-1 rounded-xl border border-border bg-card p-4 pl-8 text-sm text-muted">
          {outlet.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      )}

      <div className="space-y-3">
        {copyFields.map((f) => {
          const value = valueOf(f);
          const overridden = f.key in overrides;
          const over = f.max != null && value.length > f.max;
          return (
            <div key={f.key} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  {f.label}
                  {f.required && <span className="text-red-500"> *</span>}
                  <span
                    className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      overridden
                        ? "bg-accent/15 text-accent"
                        : "bg-track text-muted"
                    }`}
                  >
                    {overridden ? "Edited" : "Default"}
                  </span>
                </span>
                <div className="flex items-center gap-2 text-xs">
                  {f.max != null && (
                    <span
                      className={
                        over
                          ? "text-red-600 dark:text-red-400"
                          : f.truncated && !overridden
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-faint"
                      }
                    >
                      {value.length}/{f.max}
                      {f.truncated && !overridden && " (trimmed)"}
                      {over && " (over)"}
                    </span>
                  )}
                  {isAssistable(f) && (
                    <AIAssist
                      text={value}
                      max={f.max}
                      onResult={(next) => setOverride(f.key, next, true)}
                    />
                  )}
                  {overridden && (
                    <button
                      onClick={() => setOverride(f.key, null, true)}
                      className="rounded border border-border px-2 py-0.5 hover:bg-track"
                    >
                      Reset
                    </button>
                  )}
                  <button
                    onClick={() => copy(value, f.key)}
                    className="rounded border border-border px-2 py-0.5 hover:bg-track"
                  >
                    {copiedKey === f.key ? "Copied ✓" : "Copy"}
                  </button>
                </div>
              </div>
              {f.help && <p className="mt-0.5 text-xs text-faint">{f.help}</p>}
              {f.type === "textarea" ? (
                <textarea
                  rows={4}
                  value={value}
                  onChange={(e) => setOverride(f.key, e.target.value, false)}
                  onBlur={persist}
                  className="mt-2 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 font-sans text-sm text-fg outline-none focus:border-fg"
                />
              ) : (
                <input
                  value={value}
                  onChange={(e) => setOverride(f.key, e.target.value, false)}
                  onBlur={persist}
                  className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 font-sans text-sm text-fg outline-none focus:border-fg"
                />
              )}
            </div>
          );
        })}
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
