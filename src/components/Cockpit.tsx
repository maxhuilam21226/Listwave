"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addOutlet, deleteOutlet, setSubmissionStatus, updateOutlet } from "@/app/actions";
import type { OutletEnriched, OutletInput, SubmissionStatus } from "@/lib/types";

type Statuses = Record<string, SubmissionStatus>;

export default function Cockpit({
  projectId,
  outlets,
  initialStatuses,
}: {
  projectId: string;
  outlets: OutletEnriched[];
  initialStatuses: Statuses;
}) {
  const router = useRouter();
  const [statuses, setStatuses] = useState<Statuses>(initialStatuses);
  const [search, setSearch] = useState("");
  const [hideDone, setHideDone] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const statusOf = (id: string): SubmissionStatus => statuses[id] ?? "todo";

  const submittedTotal = outlets.filter(
    (o) => statusOf(o.id) === "submitted",
  ).length;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return outlets.filter((o) => {
      if (hideDone && statusOf(o.id) === "submitted") return false;
      if (
        q &&
        !o.name.toLowerCase().includes(q) &&
        !o.description.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outlets, search, hideDone, statuses]);

  function update(id: string, status: SubmissionStatus) {
    setStatuses((s) => ({ ...s, [id]: status }));
    startTransition(() => setSubmissionStatus(projectId, id, status));
  }

  function create(input: OutletInput) {
    startTransition(async () => {
      await addOutlet(input, projectId);
      setAdding(false);
      router.refresh();
    });
  }

  function edit(id: string, input: OutletInput) {
    startTransition(async () => {
      await updateOutlet(id, input, projectId);
      setEditingId(null);
      router.refresh();
    });
  }

  function remove(o: OutletEnriched) {
    if (!confirm(`Remove “${o.name}” from your outlet list? Its progress is lost.`))
      return;
    startTransition(async () => {
      await deleteOutlet(o.id, projectId);
      router.refresh();
    });
  }

  const total = outlets.length;
  const overallPct = total ? Math.round((submittedTotal / total) * 100) : 0;

  return (
    <div>
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex justify-between text-sm">
          <span className="font-medium">
            {submittedTotal}/{total} submitted
          </span>
          <span className="text-muted">{overallPct}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-track">
          <div className="h-full bg-green-500" style={{ width: `${overallPct}%` }} />
        </div>
      </div>

      {/* Controls */}
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search outlets…"
          className="min-w-40 flex-1 rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-fg"
        />
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={hideDone}
            onChange={(e) => setHideDone(e.target.checked)}
          />
          Hide completed
        </label>
        <button
          onClick={() => {
            setAdding((a) => !a);
            setEditingId(null);
          }}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg"
        >
          {adding ? "Cancel" : "+ Add outlet"}
        </button>
      </div>

      {adding && (
        <OutletForm
          onSubmit={create}
          onCancel={() => setAdding(false)}
          submitLabel="Add outlet"
        />
      )}

      <div className="mt-3 flex items-center justify-between text-sm text-muted">
        <span>
          {visible.length} of {total} outlets
        </span>
      </div>

      <ul className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {visible.map((o) =>
          editingId === o.id ? (
            <li key={o.id} className="p-2">
              <OutletForm
                initial={o}
                onSubmit={(input) => edit(o.id, input)}
                onCancel={() => setEditingId(null)}
                submitLabel="Save"
                embedded
              />
            </li>
          ) : (
            <Row
              key={o.id}
              outlet={o}
              projectId={projectId}
              status={statusOf(o.id)}
              onStatus={update}
              onEdit={() => {
                setEditingId(o.id);
                setAdding(false);
              }}
              onRemove={() => remove(o)}
            />
          ),
        )}
        {visible.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-muted">
            {total === 0
              ? "No outlets yet — add one to get started."
              : "No outlets match this search."}
          </li>
        )}
      </ul>
    </div>
  );
}

function Row({
  outlet,
  projectId,
  status,
  onStatus,
  onEdit,
  onRemove,
}: {
  outlet: OutletEnriched;
  projectId: string;
  status: SubmissionStatus;
  onStatus: (id: string, s: SubmissionStatus) => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <StatusIcon status={status} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/projects/${projectId}/outlets/${outlet.id}`}
            className="truncate font-medium hover:underline"
          >
            {outlet.name}
          </Link>
          {outlet.guided && <Badge tone="green">✓ guided</Badge>}
        </div>
        {outlet.description && (
          <p className="truncate text-xs text-faint">{outlet.description}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <StatusButton
          active={status === "submitted"}
          onClick={() =>
            onStatus(outlet.id, status === "submitted" ? "todo" : "submitted")
          }
          title="Mark submitted"
        >
          ✓
        </StatusButton>
        <StatusButton
          active={status === "skipped"}
          onClick={() => onStatus(outlet.id, status === "skipped" ? "todo" : "skipped")}
          title="Skip"
        >
          ⏭
        </StatusButton>
        <IconButton onClick={onEdit} title="Edit outlet">
          ✎
        </IconButton>
        <IconButton onClick={onRemove} title="Remove outlet">
          🗑
        </IconButton>
        <Link
          href={`/projects/${projectId}/outlets/${outlet.id}`}
          className="ml-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg"
        >
          Prepare →
        </Link>
      </div>
    </li>
  );
}

function OutletForm({
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

function IconButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="h-7 w-7 rounded-lg border border-border text-sm text-muted hover:border-faint"
    >
      {children}
    </button>
  );
}

function StatusButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`h-7 w-7 rounded-lg border text-sm ${
        active
          ? "border-accent bg-accent text-accent-fg"
          : "border-border text-muted hover:border-faint"
      }`}
    >
      {children}
    </button>
  );
}

function StatusIcon({ status }: { status: SubmissionStatus }) {
  const map = {
    submitted: { icon: "✅", label: "Submitted" },
    skipped: { icon: "⏭️", label: "Skipped" },
    todo: { icon: "⬜", label: "To do" },
  } as const;
  return (
    <span title={map[status].label} aria-label={map[status].label}>
      {map[status].icon}
    </span>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "green" | "gray";
}) {
  const tones = {
    green: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
    gray: "bg-track text-muted",
  };
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
