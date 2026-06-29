"use client";

import { useRef, useState } from "react";

export type SortMode = "manual" | "az" | "za";

type Sortable = { id: string; name: string; sort_order: number };

function move<T>(arr: T[], from: number, to: number): T[] {
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Renders a list with a sort selector (Manual / A–Z / Z–A). In Manual mode,
 * rows can be drag-reordered (when `canReorder`) and the new order is persisted
 * via `onReorder`. Row content is supplied by `renderRow`, which receives a
 * drag handle to place (null when dragging is unavailable).
 */
export default function SortableList<T extends Sortable>({
  items,
  onReorder,
  renderRow,
  canReorder = true,
  headerLeft,
  empty,
}: {
  items: T[];
  onReorder: (orderedIds: string[]) => void;
  renderRow: (item: T, dragHandle: React.ReactNode) => React.ReactNode;
  canReorder?: boolean;
  headerLeft?: React.ReactNode;
  empty?: React.ReactNode;
}) {
  const [mode, setMode] = useState<SortMode>("manual");

  const byManual = [...items].sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
  );
  const idsKey = byManual.map((i) => i.id).join(",");

  // Local working copy so a drag re-renders optimistically. Re-synced during
  // render whenever the set of ids changes (add/remove/refresh) — the
  // React-recommended "adjust state from a previous-value slot" pattern.
  const [order, setOrder] = useState<T[]>(byManual);
  const [syncedKey, setSyncedKey] = useState(idsKey);
  if (syncedKey !== idsKey) {
    setSyncedKey(idsKey);
    setOrder(byManual);
  }

  const dragFrom = useRef<number | null>(null);
  const dragHandlesOn = mode === "manual" && canReorder;

  const display =
    mode === "az"
      ? [...items].sort((a, b) => a.name.localeCompare(b.name))
      : mode === "za"
        ? [...items].sort((a, b) => b.name.localeCompare(a.name))
        : order;

  function onDragOver(e: React.DragEvent, overIndex: number) {
    e.preventDefault();
    const from = dragFrom.current;
    if (from === null || from === overIndex) return;
    setOrder((prev) => move(prev, from, overIndex));
    dragFrom.current = overIndex;
  }

  function commit() {
    dragFrom.current = null;
    const ids = order.map((i) => i.id);
    if (ids.join(",") !== idsKey) onReorder(ids);
  }

  return (
    <div>
      <div className="mt-3 flex items-center justify-between text-sm text-muted">
        <span>{headerLeft}</span>
        <label className="flex items-center gap-2">
          <span className="text-xs">Sort</span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as SortMode)}
            className="rounded-lg border border-border bg-card px-2 py-1 text-xs text-fg outline-none focus:border-fg"
          >
            <option value="manual">Manual</option>
            <option value="az">A → Z</option>
            <option value="za">Z → A</option>
          </select>
        </label>
      </div>

      <ul className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {display.map((item, i) => (
          <li
            key={item.id}
            onDragOver={dragHandlesOn ? (e) => onDragOver(e, i) : undefined}
            onDrop={dragHandlesOn ? commit : undefined}
          >
            {renderRow(
              item,
              dragHandlesOn ? (
                <span
                  draggable
                  onDragStart={() => (dragFrom.current = i)}
                  onDragEnd={commit}
                  title="Drag to reorder"
                  className="cursor-grab select-none px-1 text-muted active:cursor-grabbing"
                >
                  ⠿
                </span>
              ) : null,
            )}
          </li>
        ))}
        {display.length === 0 && empty}
      </ul>
    </div>
  );
}
