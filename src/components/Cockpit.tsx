"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { setSubmissionStatus } from "@/app/actions";
import { PHASES } from "@/lib/strategy";
import type {
  DirectoryEnriched,
  LaunchPhase,
  SubmissionStatus,
} from "@/lib/types";

type Statuses = Record<string, SubmissionStatus>;

const DR_OPTIONS = [
  { label: "Any DR", value: 0 },
  { label: "DR 80+", value: 80 },
  { label: "DR 65+", value: 65 },
  { label: "DR 40+", value: 40 },
];

export default function Cockpit({
  projectId,
  directories,
  categories,
  initialStatuses,
}: {
  projectId: string;
  directories: DirectoryEnriched[];
  categories: string[];
  initialStatuses: Statuses;
}) {
  const [statuses, setStatuses] = useState<Statuses>(initialStatuses);
  const [search, setSearch] = useState("");
  const [phase, setPhase] = useState<LaunchPhase | 0>(0);
  const [category, setCategory] = useState("");
  const [minDR, setMinDR] = useState(0);
  const [freeOnly, setFreeOnly] = useState(false);
  const [dofollowOnly, setDofollowOnly] = useState(false);
  const [hideDone, setHideDone] = useState(false);
  const [recommendedOnly, setRecommendedOnly] = useState(true);
  const [, startTransition] = useTransition();

  const statusOf = (id: string): SubmissionStatus => statuses[id] ?? "todo";

  const submittedTotal = directories.filter(
    (d) => statusOf(d.id) === "submitted",
  ).length;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return directories.filter((d) => {
      if (recommendedOnly && !d.recommended) return false;
      if (phase && d.phase !== phase) return false;
      if (freeOnly && d.isPaid) return false;
      if (dofollowOnly && !d.isDofollow) return false;
      if (minDR && (d.domain_rating ?? 0) < minDR) return false;
      if (category && d.category !== category) return false;
      if (hideDone && statusOf(d.id) === "submitted") return false;
      if (q && !d.name.toLowerCase().includes(q)) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    directories,
    search,
    phase,
    category,
    minDR,
    freeOnly,
    dofollowOnly,
    hideDone,
    recommendedOnly,
    statuses,
  ]);

  // Group visible directories by phase.
  const byPhase = useMemo(() => {
    const m = new Map<LaunchPhase, DirectoryEnriched[]>();
    for (const d of visible) {
      const arr = m.get(d.phase) ?? [];
      arr.push(d);
      m.set(d.phase, arr);
    }
    return m;
  }, [visible]);

  function update(id: string, status: SubmissionStatus) {
    setStatuses((s) => ({ ...s, [id]: status }));
    startTransition(() => setSubmissionStatus(projectId, id, status));
  }

  const overallPct = Math.round((submittedTotal / directories.length) * 100);

  return (
    <div>
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex justify-between text-sm">
          <span className="font-medium">
            {submittedTotal}/{directories.length} submitted
          </span>
          <span className="text-muted">{overallPct}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-track">
          <div className="h-full bg-green-500" style={{ width: `${overallPct}%` }} />
        </div>
      </div>

      <StrategyExplainer />

      {/* Filters */}
      <div className="mt-4 space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search directories…"
            className="min-w-40 flex-1 rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-fg"
          />
          <select
            value={phase}
            onChange={(e) => setPhase(Number(e.target.value) as LaunchPhase | 0)}
            className="rounded-lg border border-border px-2 py-1.5 text-sm"
          >
            <option value={0}>All phases</option>
            {PHASES.map((p) => (
              <option key={p.phase} value={p.phase}>
                Phase {p.phase} — {p.title}
              </option>
            ))}
          </select>
          <select
            value={minDR}
            onChange={(e) => setMinDR(Number(e.target.value))}
            className="rounded-lg border border-border px-2 py-1.5 text-sm"
          >
            {DR_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="max-w-48 rounded-lg border border-border px-2 py-1.5 text-sm"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <Toggle
            label="⭐ Recommended only"
            checked={recommendedOnly}
            onChange={setRecommendedOnly}
          />
          <Toggle label="Free only" checked={freeOnly} onChange={setFreeOnly} />
          <Toggle
            label="Dofollow only"
            checked={dofollowOnly}
            onChange={setDofollowOnly}
          />
          <Toggle label="Hide completed" checked={hideDone} onChange={setHideDone} />
          <span className="ml-auto text-muted">{visible.length} shown</span>
        </div>
      </div>

      {/* Phase sections */}
      <div className="mt-6 space-y-8">
        {PHASES.map((p) => {
          const items = byPhase.get(p.phase) ?? [];
          if (items.length === 0) return null;
          const inPhase = directories.filter((d) => d.phase === p.phase);
          const total = recommendedOnly
            ? inPhase.filter((d) => d.recommended)
            : inPhase;
          const done = total.filter((d) => statusOf(d.id) === "submitted").length;
          const trimmed =
            recommendedOnly && total.length < inPhase.length;
          return (
            <section key={p.phase}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold">
                  Phase {p.phase} · {p.title}
                  <span className="ml-2 text-sm font-normal text-muted">
                    {p.when} · {p.rule}
                  </span>
                </h2>
                <span className="text-sm text-muted">
                  {done}/{total.length} done
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">
                {p.blurb}
                {trimmed && (
                  <>
                    {" "}
                    <span className="text-faint">
                      Showing the best {total.length} for discovery — turn off
                      “⭐ Recommended only” to see all {inPhase.length}.
                    </span>
                  </>
                )}
              </p>

              <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {items.map((d) => (
                  <Row
                    key={d.id}
                    dir={d}
                    projectId={projectId}
                    status={statusOf(d.id)}
                    onStatus={update}
                  />
                ))}
              </ul>
            </section>
          );
        })}
        {visible.length === 0 && (
          <p className="rounded-xl border border-border bg-card px-4 py-8 text-center text-sm text-muted">
            No directories match these filters.
          </p>
        )}
      </div>
    </div>
  );
}

function StrategyExplainer() {
  return (
    <details className="group mt-4 rounded-xl border border-border bg-card p-4 text-sm">
      <summary className="flex cursor-pointer items-center justify-between font-medium">
        <span>ℹ️ How this launch plan works</span>
        <span className="text-xs text-muted group-open:hidden">Show</span>
        <span className="hidden text-xs text-muted group-open:inline">Hide</span>
      </summary>

      <div className="mt-3 space-y-3 text-muted">
        <p>
          Don&apos;t blast every site at once. This plan (from the open-source
          Startup Launch List) sequences your submissions so your backlink
          profile grows naturally and you spend effort where it pays off.
          Directories are sorted into 4 phases by their authority and cost — work
          them top to bottom.
        </p>

        <ol className="space-y-2">
          {PHASES.map((p) => (
            <li key={p.phase} className="text-fg">
              <span className="font-medium">
                Phase {p.phase} · {p.title}
              </span>{" "}
              <span className="text-xs text-muted">
                ({p.when} · {p.rule})
              </span>
              <p className="text-muted">{p.blurb}</p>
            </li>
          ))}
        </ol>

        <div className="rounded-lg bg-track p-3 text-xs">
          <p className="font-medium text-fg">Quick glossary</p>
          <ul className="mt-1 space-y-1">
            <li>
              <strong>DR (Domain Rating)</strong> — a 0–100 estimate of a site&apos;s
              SEO authority. Higher = a more valuable backlink.
            </li>
            <li>
              <strong>Dofollow</strong> — the link passes SEO value to your site.{" "}
              <strong>Nofollow</strong> — it doesn&apos;t, but still drives referral
              traffic. Google expects a natural mix of both.
            </li>
            <li>
              <strong>Free / Paid</strong> — whether listing costs money. Phase 1
              prioritizes high-authority <em>free</em> links first.
            </li>
          </ul>
        </div>
      </div>
    </details>
  );
}

function Row({
  dir,
  projectId,
  status,
  onStatus,
}: {
  dir: DirectoryEnriched;
  projectId: string;
  status: SubmissionStatus;
  onStatus: (id: string, s: SubmissionStatus) => void;
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <StatusIcon status={status} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/projects/${projectId}/outlets/${dir.id}`}
            className="truncate font-medium hover:underline"
          >
            {dir.name}
          </Link>
          {dir.phase === 1 && dir.recommended && (
            <Badge tone="amber">⭐ Pick</Badge>
          )}
          {dir.domain_rating != null && <DRBadge dr={dir.domain_rating} />}
          <LinkBadge dofollow={dir.isDofollow} type={dir.link_type} />
          {dir.isPaid ? (
            <Badge tone="amber">💲 Paid</Badge>
          ) : dir.pricing ? (
            <Badge tone="blue">{dir.pricing}</Badge>
          ) : null}
          {dir.fields && <Badge tone="green">✓ guided</Badge>}
        </div>
        {dir.category && (
          <p className="truncate text-xs text-faint">{dir.category}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <StatusButton
          active={status === "submitted"}
          onClick={() =>
            onStatus(dir.id, status === "submitted" ? "todo" : "submitted")
          }
          title="Mark submitted"
        >
          ✓
        </StatusButton>
        <StatusButton
          active={status === "skipped"}
          onClick={() =>
            onStatus(dir.id, status === "skipped" ? "todo" : "skipped")
          }
          title="Skip"
        >
          ⏭
        </StatusButton>
        <Link
          href={`/projects/${projectId}/outlets/${dir.id}`}
          className="ml-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg"
        >
          Prepare →
        </Link>
      </div>
    </li>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
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

function DRBadge({ dr }: { dr: number }) {
  const tone = dr >= 80 ? "blue" : dr >= 65 ? "green" : dr >= 40 ? "gray" : "gray";
  return <Badge tone={tone}>DR {dr}</Badge>;
}

function LinkBadge({
  dofollow,
  type,
}: {
  dofollow: boolean;
  type: string | null;
}) {
  if (!type) return null;
  return <Badge tone={dofollow ? "green" : "gray"}>{type}</Badge>;
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "green" | "amber" | "blue" | "gray";
}) {
  const tones = {
    green: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
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
