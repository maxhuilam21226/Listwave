import type { Outlet, OutletEnriched, OutletField } from "@/lib/types";
import { getGuides } from "@/lib/outlets";

// NOTE: depends on the guide loader (node:fs), so this module is server-only.

/** Normalize a URL to a bare hostname (drops www., lowercased). */
export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

let guideMap: Map<string, ReturnType<typeof getGuides>[number]> | null = null;

function guidesByHostname() {
  if (guideMap) return guideMap;
  guideMap = new Map(getGuides().map((g) => [hostname(g.homepage), g]));
  return guideMap;
}

/** Overlay a curated guide onto an outlet when its hostname matches. */
export function enrichOutlet(outlet: Outlet): OutletEnriched {
  const guide = guidesByHostname().get(hostname(outlet.url));
  return {
    ...outlet,
    guided: Boolean(guide),
    submit_url: guide?.submit_url,
    fields: guide?.fields,
    steps: guide?.steps,
  };
}

export function enrichOutlets(outlets: Outlet[]): OutletEnriched[] {
  return outlets.map(enrichOutlet);
}

/** The standard launch kit, used as the prepare view for outlets without a
    hand-curated field schema. */
export const GENERIC_FIELDS: OutletField[] = [
  { key: "name", label: "Product name", type: "text", source: "name", required: true },
  { key: "website_url", label: "Website URL", type: "url", source: "url", required: true },
  { key: "one_liner", label: "One-liner (≤60)", type: "text", max: 60, source: "one_liner" },
  { key: "tagline", label: "Tagline (≤100)", type: "text", max: 100, source: "tagline" },
  {
    key: "short_desc",
    label: "Short description (≤300)",
    type: "textarea",
    max: 300,
    source: "short_desc",
    help: "Tip: write 3-4 unique description variants across sites to avoid duplicate-content flags.",
  },
  { key: "long_desc", label: "Full description", type: "textarea", source: "long_desc" },
  { key: "tags", label: "Category tags", type: "tags", source: "tags" },
  { key: "pricing", label: "Pricing", type: "text", source: "pricing_type" },
  { key: "contact_email", label: "Contact email", type: "email", source: "contact_email" },
  { key: "twitter_handle", label: "X / Twitter handle", type: "text", source: "twitter_handle", help: "e.g. @yourhandle" },
  { key: "video_url", label: "Demo video URL", type: "url", source: "video_url", help: "YouTube, Loom, etc." },
  { key: "logo", label: "Logo", type: "image", source: "logo_url" },
  { key: "screenshots", label: "Screenshots", type: "image", source: "screenshot_urls" },
];
