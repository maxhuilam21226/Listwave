import fs from "node:fs";
import path from "node:path";
import type { OutletGuide, OutletTraffic } from "@/lib/types";

// NOTE: uses node:fs, so this module is server-only. Import it from Server
// Components / Server Actions only — never from a "use client" file.
//
// These are the hand-curated "guided" submit-form configs. They are reference
// data, matched against a user's outlets by hostname (see ./enrich). They are
// NOT the user's outlet list — that lives in Supabase.

const DATA_DIR = path.join(process.cwd(), "src/lib/outlets/data");

const TRAFFIC_RANK: Record<OutletTraffic, number> = { high: 0, medium: 1, low: 2 };

let cache: OutletGuide[] | null = null;

/** Load and validate every curated guide config from the JSON knowledge base. */
export function getGuides(): OutletGuide[] {
  if (cache) return cache;

  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));

  const guides = files.map((file) => {
    const raw = fs.readFileSync(path.join(DATA_DIR, file), "utf8");
    const guide = JSON.parse(raw) as OutletGuide;
    if (!guide.id || !guide.name || !guide.submit_url) {
      throw new Error(`Guide config ${file} is missing id/name/submit_url`);
    }
    return guide;
  });

  // Highest traffic first, then alphabetical.
  guides.sort(
    (a, b) =>
      TRAFFIC_RANK[a.traffic] - TRAFFIC_RANK[b.traffic] ||
      a.name.localeCompare(b.name),
  );

  cache = guides;
  return guides;
}
