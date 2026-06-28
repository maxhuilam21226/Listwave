import type { Directory, DirectoryEnriched } from "@/lib/types";
import {
  RECOMMENDED_PHASE1_COUNT,
  assignPhase,
  discoveryScore,
  isDofollow,
  isPaid,
} from "@/lib/strategy";
import { getOutlets } from "@/lib/outlets";
import rawData from "./data.json";

/** Normalize a URL to a hostname slug (matches the id scheme used for directories). */
function hostnameSlug(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  } catch {
    return "";
  }
}

// Editorial tech/news publications mislabeled as directories in the source CSV.
// You pitch a journalist for coverage — you cannot self-submit a product listing —
// so they're excluded entirely. (Community/aggregator sites you self-post to, and
// profile-claim directories, are intentionally kept.)
const EXCLUDED_IDS = new Set<string>([
  "techcrunch-com",
  "buzzfeednews-com",
  "geekwire-com",
  "morningbrew-com",
  "inc42-com",
  "tech-co",
  "vator-tv",
  "fintechnews-sq",
  "startupvalley-news",
  "businessinsider-in",
  "cnet-com",
  "in-mashable-com",
  "theverge-com",
  "engadget-com",
  "fastcompany-com",
  "in-pcmag-com",
  "zdnet-com",
  "arstechnica-com",
  "digitaltrends-com",
  "slate-com",
  "deals-thenextweb-com",
  "venturebeat-com",
  "makeuseof-com",
  "androidauthority-com",
  "infoworld-com",
  "kotaku-com",
  "pocket-lint-com",
  "lifehack-org",
  "appleinsider-com",
  "hackernoon-com",
  "techhive-com",
  "techdirt-com",
  "pocketgamer-com",
  "siliconangle-com",
  "techinasia-com",
  "readwrite-com",
  "yourstory-com",
  "webrazzi-com",
  "boingboing-net",
  "betakit-com",
]);

let cache: DirectoryEnriched[] | null = null;

export function getDirectories(): DirectoryEnriched[] {
  if (cache) return cache;

  // Curated overlays (the 14 hand-verified outlets), keyed by hostname slug.
  const overlays = new Map(
    getOutlets().map((o) => [hostnameSlug(o.homepage), o]),
  );

  const dirs = (rawData as Directory[])
    .filter((d) => !EXCLUDED_IDS.has(d.id))
    .map((d): DirectoryEnriched => {
    const overlay = overlays.get(d.id);
    return {
      ...d,
      phase: assignPhase(d),
      isPaid: isPaid(d),
      isDofollow: isDofollow(d),
      recommended: true, // refined for Phase 1 below
      submit_url: overlay?.submit_url,
      fields: overlay?.fields,
      steps: overlay?.steps,
      notes: overlay?.notes ?? d.description,
    };
  });

  // Trim Phase 1 to the top-N by discovery score; everything else stays recommended.
  const recommendedIds = new Set(
    dirs
      .filter((d) => d.phase === 1)
      .sort((a, b) => discoveryScore(b) - discoveryScore(a))
      .slice(0, RECOMMENDED_PHASE1_COUNT)
      .map((d) => d.id),
  );
  for (const d of dirs) {
    if (d.phase === 1) d.recommended = recommendedIds.has(d.id);
  }

  // Sort by domain rating desc (nulls last), then name.
  dirs.sort(
    (a, b) =>
      (b.domain_rating ?? -1) - (a.domain_rating ?? -1) ||
      a.name.localeCompare(b.name),
  );

  cache = dirs;
  return dirs;
}

export function getDirectory(id: string): DirectoryEnriched | undefined {
  return getDirectories().find((d) => d.id === id);
}

/** Distinct categories present in the data, sorted by frequency. */
export function getCategories(): string[] {
  const counts = new Map<string, number>();
  for (const d of getDirectories()) {
    if (!d.category) continue;
    counts.set(d.category, (counts.get(d.category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c);
}
