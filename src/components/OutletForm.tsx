"use client";

import { useState } from "react";
import type { OutletInput } from "@/lib/types";

/** Add/edit form for a single outlet (name + url + optional description). */
export default function OutletForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
  embedded,
}: {
  initial?: { name: string; url: string; description: string };
  onSubmit: (input: OutletInput) => void;
  onCancel: () => void;
  submitLabel: string;
  embedded?: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");

  const canSubmit = name.trim() !== "" && url.trim() !== "";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({ name: name.trim(), url: url.trim(), description: description.trim() });
  }

  return (
    <form
      onSubmit={submit}
      className={
        embedded
          ? "space-y-2 rounded-lg border border-border bg-surface p-3"
          : "mt-3 space-y-2 rounded-xl border border-border bg-card p-4"
      }
    >
      <div className="flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Outlet name"
          className="min-w-40 flex-1 rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-fg"
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          type="url"
          className="min-w-40 flex-1 rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-fg"
        />
      </div>
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Short description (optional)"
        className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-fg"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg disabled:opacity-50"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border px-3 py-1.5 text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
