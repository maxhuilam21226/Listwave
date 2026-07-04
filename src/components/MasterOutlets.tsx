"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addOutlet, deleteOutlet, reorderOutlets, updateOutlet } from "@/app/actions";
import type { Outlet, OutletCost, OutletInput } from "@/lib/types";
import OutletForm from "@/components/OutletForm";
import SortableList from "@/components/SortableList";

/**
 * The user's master outlet template. Edits here only affect outlets new
 * projects inherit — existing projects keep their own independent copies.
 */
export default function MasterOutlets({
  outlets,
  isAdmin = false,
}: {
  outlets: Outlet[];
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [costFilter, setCostFilter] = useState<"all" | OutletCost>("all");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return outlets.filter((o) => {
      if (costFilter !== "all" && o.cost !== costFilter) return false;
      if (
        q &&
        !o.name.toLowerCase().includes(q) &&
        !o.description.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [outlets, search, costFilter]);

  const canReorder = search.trim() === "" && costFilter === "all";

  function create(input: OutletInput) {
    startTransition(async () => {
      await addOutlet(input);
      setAdding(false);
      router.refresh();
    });
  }

  function edit(id: string, input: OutletInput) {
    startTransition(async () => {
      await updateOutlet(id, input);
      setEditingId(null);
      router.refresh();
    });
  }

  function remove(o: Outlet) {
    if (!confirm(`Remove “${o.name}” from your master list?`)) return;
    startTransition(async () => {
      await deleteOutlet(o.id);
      router.refresh();
    });
  }

  function reorder(orderedIds: string[]) {
    startTransition(async () => {
      await reorderOutlets(orderedIds);
      router.refresh();
    });
  }

  return (
    <div>
      {isAdmin && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-brand/30 bg-accent/10 px-4 py-3 text-sm">
          <span className="mt-0.5 text-base leading-none">🌱</span>
          <div>
            <span className="font-semibold text-brand">Default seed</span>
            <span className="ml-1.5 text-muted">
              — new users inherit a snapshot of this list on sign-up. Keep it
              curated here; existing users are not affected by changes.
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search outlets…"
          className="min-w-40 flex-1 rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-fg"
        />
        <label className="flex items-center gap-2 text-sm text-muted">
          <span className="text-xs">Cost</span>
          <select
            value={costFilter}
            onChange={(e) => setCostFilter(e.target.value as "all" | OutletCost)}
            className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-fg outline-none focus:border-fg"
          >
            <option value="all">All</option>
            <option value="free">Free</option>
            <option value="paid">Paid</option>
          </select>
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

      <SortableList
        items={visible}
        onReorder={reorder}
        canReorder={canReorder}
        headerLeft={`${visible.length} of ${outlets.length} outlets`}
        empty={
          <li className="px-4 py-8 text-center text-sm text-muted">
            {outlets.length === 0
              ? "No outlets yet — add one to get started."
              : "No outlets match this search."}
          </li>
        }
        renderRow={(o, dragHandle) =>
          editingId === o.id ? (
            <div className="p-2">
              <OutletForm
                initial={o}
                onSubmit={(input) => edit(o.id, input)}
                onCancel={() => setEditingId(null)}
                submitLabel="Save"
                embedded
              />
            </div>
          ) : (
            <Row
              outlet={o}
              dragHandle={dragHandle}
              onEdit={() => {
                setEditingId(o.id);
                setAdding(false);
              }}
              onRemove={() => remove(o)}
            />
          )
        }
      />
    </div>
  );
}

function Row({
  outlet,
  dragHandle,
  onEdit,
  onRemove,
}: {
  outlet: Outlet;
  dragHandle: React.ReactNode;
  onEdit: () => void;
  onRemove: () => void;
}) {
  let host = outlet.url;
  try {
    host = new URL(outlet.url).hostname.replace(/^www\./, "");
  } catch {}

  return (
    <div className="flex items-center gap-2 px-4 py-2.5">
      {dragHandle}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{outlet.name}</span>
          {outlet.cost === "paid" && (
            <span className="shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              $ paid
            </span>
          )}
        </div>
        {outlet.description && (
          <p className="truncate text-xs text-faint">{outlet.description}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <a
          href={outlet.url}
          target="_blank"
          rel="noopener noreferrer"
          title={`Open ${host} in a new tab`}
          className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted hover:border-faint"
        >
          View ↗
        </a>
        <IconButton onClick={onEdit} title="Edit outlet">
          ✎
        </IconButton>
        <IconButton onClick={onRemove} title="Remove outlet">
          🗑
        </IconButton>
      </div>
    </div>
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
