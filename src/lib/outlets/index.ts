import fs from "node:fs";
import path from "node:path";
import type { Outlet, OutletTraffic } from "@/lib/types";

// NOTE: uses node:fs, so this module is server-only. Import it from Server
// Components / Server Actions only — never from a "use client" file.

const DATA_DIR = path.join(process.cwd(), "src/lib/outlets/data");

const TRAFFIC_RANK: Record<OutletTraffic, number> = { high: 0, medium: 1, low: 2 };

let cache: Outlet[] | null = null;

/** Load and validate every outlet config from the JSON knowledge base. */
export function getOutlets(): Outlet[] {
  if (cache) return cache;

  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith(".json"));

  const outlets = files.map((file) => {
    const raw = fs.readFileSync(path.join(DATA_DIR, file), "utf8");
    const outlet = JSON.parse(raw) as Outlet;
    if (!outlet.id || !outlet.name || !outlet.submit_url) {
      throw new Error(`Outlet config ${file} is missing id/name/submit_url`);
    }
    return outlet;
  });

  // Highest traffic first, then alphabetical.
  outlets.sort(
    (a, b) =>
      TRAFFIC_RANK[a.traffic] - TRAFFIC_RANK[b.traffic] ||
      a.name.localeCompare(b.name),
  );

  cache = outlets;
  return outlets;
}

export function getOutlet(id: string): Outlet | undefined {
  return getOutlets().find((o) => o.id === id);
}
