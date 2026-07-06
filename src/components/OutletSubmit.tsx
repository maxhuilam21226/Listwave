"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveOutletFieldOverrides, setSubmissionStatus, setSubmissionScheduledAt } from "@/app/actions";
import AIAssist from "@/components/AIAssist";
import ConfirmModal from "@/components/ConfirmModal";
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
  if (f.key === "name" || f.key === "contact_email" || f.key === "pricing" || f.key === "twitter_handle") return false;
  return true;
}

/** Product name is read-only — edit it in the project settings. */
function isReadOnly(f: PreparedField): boolean {
  return f.source === "name" || f.key === "name";
}

export default function OutletSubmit({
  projectId,
  outlet,
  fields,
  initialOverrides,
  initialStatus,
  initialNotes,
  initialScheduledAt,
}: {
  projectId: string;
  outlet: OutletEnriched;
  fields: PreparedField[];
  initialOverrides: Overrides;
  initialStatus: SubmissionStatus;
  initialNotes: string | null;
  initialScheduledAt: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<SubmissionStatus>(initialStatus);
  const [skipReason, setSkipReason] = useState<string>(initialNotes ?? "");
  const [scheduledAt, setScheduledAt] = useState<string>(
    initialScheduledAt ? initialScheduledAt.slice(0, 10) : "",
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Overrides>(initialOverrides);
  const overridesRef = useRef<Overrides>(initialOverrides);
  const savedOverridesRef = useRef<Overrides>({ ...initialOverrides });
  const [isDirty, setIsDirty] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const copyFields = fields.filter((f) => f.type !== "image");
  const imageFields = fields.filter((f) => f.type === "image");
  const submitUrl = outlet.submit_url ?? outlet.url;
  const guided = outlet.guided;

  const valueOf = (f: PreparedField): string =>
    f.key in overrides ? overrides[f.key] : f.value;

  // Warn on browser refresh / tab close while dirty.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Intercept in-app link clicks while dirty.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest("a");
      if (!anchor) return;
      let href: string;
      try {
        const url = new URL((anchor as HTMLAnchorElement).href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname) return;
        href = url.pathname + url.search + url.hash;
      } catch {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      setPendingHref(href);
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [isDirty]);

  function persist() {
    savedOverridesRef.current = { ...overridesRef.current };
    setIsDirty(false);
    startTransition(() =>
      saveOutletFieldOverrides(outlet.id, overridesRef.current, projectId),
    );
  }

  async function persistAndNavigate(href: string) {
    setPendingHref(null);
    setIsDirty(false);
    savedOverridesRef.current = { ...overridesRef.current };
    await saveOutletFieldOverrides(outlet.id, overridesRef.current, projectId);
    router.push(href);
  }

  function discardAndNavigate(href: string) {
    const saved = savedOverridesRef.current;
    setOverrides({ ...saved });
    overridesRef.current = { ...saved };
    setIsDirty(false);
    setPendingHref(null);
    router.push(href);
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
    else setIsDirty(true);
  }

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1200);
  }

  function mark(next: SubmissionStatus) {
    setStatus(next);
    if (next !== "skipped") setSkipReason("");
    startTransition(() => {
      setSubmissionStatus(projectId, outlet.id, next, next === "skipped" ? skipReason || undefined : undefined);
      router.refresh();
    });
  }

  function saveSkipReason() {
    startTransition(() => {
      setSubmissionStatus(projectId, outlet.id, "skipped", skipReason || undefined);
    });
  }

  function saveScheduledAt(value: string) {
    setScheduledAt(value);
    startTransition(() => {
      setSubmissionScheduledAt(projectId, outlet.id, value ? new Date(value).toISOString() : null);
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <a
              href={submitUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
            >
              {guided ? "Open submit page ↗" : "Open site ↗"}
            </a>
            {isDirty && (
              <button
                onClick={persist}
                className="rounded-lg border border-border px-4 py-2 text-sm"
              >
                Save changes
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
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
              {status === "skipped" ? "Unskip" : "Skip"}
            </button>
          </div>
        </div>

        {status === "skipped" && (
          <div>
            <label className="block text-xs text-muted mb-1">
              Reason for skipping <span className="text-faint">(optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Requires paid plan, not relevant for this project…"
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
              onBlur={saveSkipReason}
              className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 font-sans text-sm text-fg outline-none focus:border-fg"
            />
          </div>
        )}

        {status === "submitted" && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted whitespace-nowrap">📅 Scheduled launch:</label>
            <input
              type="date"
              value={scheduledAt}
              onChange={(e) => saveScheduledAt(e.target.value)}
              className="rounded-lg border border-border bg-surface px-2 py-1 text-sm text-fg outline-none focus:border-fg"
            />
            {scheduledAt && (
              <button
                onClick={() => saveScheduledAt("")}
                className="text-xs text-muted hover:text-fg"
              >
                Clear
              </button>
            )}
          </div>
        )}
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
                  {isReadOnly(f) ? (
                    <span className="ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium bg-track text-muted">
                      Read-only
                    </span>
                  ) : (
                    <span
                      className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        overridden
                          ? "bg-accent/15 text-accent"
                          : "bg-track text-muted"
                      }`}
                    >
                      {overridden ? "Edited" : "Default"}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2 text-xs">
                  {!isReadOnly(f) && f.max != null && (
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
                  {!isReadOnly(f) && overridden && (
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
              {isReadOnly(f) ? (
                <p className="mt-2 w-full rounded-lg border border-border bg-track px-3 py-2 font-sans text-sm text-muted">
                  {value}
                </p>
              ) : f.type === "textarea" ? (
                <textarea
                  rows={4}
                  value={value}
                  onChange={(e) => setOverride(f.key, e.target.value, false)}
                  className="mt-2 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 font-sans text-sm text-fg outline-none focus:border-fg"
                />
              ) : (
                <input
                  value={value}
                  onChange={(e) => setOverride(f.key, e.target.value, false)}
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

      {pendingHref && (
        <ConfirmModal
          title="Unsaved changes"
          body="You have unsaved changes. Save them before leaving or discard?"
          confirmLabel="Save & leave"
          cancelLabel="Stay"
          secondaryAction={{
            label: "Discard changes",
            onClick: () => discardAndNavigate(pendingHref),
          }}
          onConfirm={() => persistAndNavigate(pendingHref)}
          onCancel={() => setPendingHref(null)}
        />
      )}
    </div>
  );
}
