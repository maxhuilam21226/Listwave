import type { Directory, LaunchPhase, OutletField } from "@/lib/types";

// Encodes the Startup-Launch-List "Submission Strategy" (4 phases) as decision
// rules over the directory data. Thresholds below are how the prose maps to data:
//   Phase 1 — Authority First : DR >= 65 AND free   (max link equity, zero cost)
//   Phase 2 — Paid Boost      : DR >= 65 AND paid   (high-DR paid listings)
//   Phase 3 — Build Volume    : DR 40-64            (mid-tier, spread out)
//   Phase 4 — Long Tail       : DR < 40 or unknown  (diversity + referral traffic)

export const AUTHORITY_DR = 65;
export const MIDTIER_DR = 40;

/** Only an explicit "Paid" counts as paid; Free/Freemium/unknown are treated as free. */
export function isPaid(dir: Pick<Directory, "pricing">): boolean {
  return (dir.pricing ?? "").trim().toLowerCase() === "paid";
}

export function isDofollow(dir: Pick<Directory, "link_type">): boolean {
  return (dir.link_type ?? "").trim().toLowerCase() === "dofollow";
}

export function assignPhase(dir: Directory): LaunchPhase {
  const dr = dir.domain_rating;
  const paid = isPaid(dir);
  if (dr != null && dr >= AUTHORITY_DR) return paid ? 2 : 1;
  if (dr != null && dr >= MIDTIER_DR) return 3;
  return 4;
}

// --- "Best for discovery" curation -------------------------------------------
// Phase 1 (DR 65+ free) has ~140 directories — too many to start with. We rank
// them by a discovery-value heuristic and recommend the top N. The score favors
// authority (DR), SEO-passing links (dofollow), and categories where a startup
// actually gets discovered (startup directories, communities, marketplaces),
// while down-weighting places you can't really "submit" to (social media).

export const RECOMMENDED_PHASE1_COUNT = 40;

const CATEGORY_DISCOVERY_WEIGHT: Record<string, number> = {
  "🚀 Startup Directory": 10,
  "👥 Community": 8,
  "🧩 SaaS Marketplace": 7,
  "🤖 AI Directory": 6,
  "⭐️ Review Directory": 6,
  "📂 General Directory": 3,
  "🤝 API Marketplace": 3,
  "💻 Software Directory": 3,
  "🗞 Press Coverage": 2,
  "🌍 International": 0,
  "💫 Other": 0,
  "💵 Acquire & Sell": -4,
  "💻 Social Media": -8,
};

/** Higher = more likely to help a startup get discovered. */
export function discoveryScore(dir: Directory): number {
  let score = dir.domain_rating ?? 0;
  if (isDofollow(dir)) score += 15;
  score += CATEGORY_DISCOVERY_WEIGHT[dir.category ?? ""] ?? 0;
  return score;
}

export interface PhaseMeta {
  phase: LaunchPhase;
  title: string;
  when: string;
  blurb: string;
  rule: string;
}

export const PHASES: PhaseMeta[] = [
  {
    phase: 1,
    title: "Authority First",
    when: "Week 1",
    blurb:
      "Submit to high-authority free directories first. Maximum link equity, zero cost.",
    rule: `DR ${AUTHORITY_DR}+ · free`,
  },
  {
    phase: 2,
    title: "Paid Boost",
    when: "Week 2",
    blurb:
      "Spend on a few high-DR paid listings for enhanced visibility and faster approval.",
    rule: `DR ${AUTHORITY_DR}+ · paid`,
  },
  {
    phase: 3,
    title: "Build Volume",
    when: "Weeks 2–3",
    blurb:
      "Submit to mid-tier directories spread over 2–3 weeks so your backlink profile grows naturally. Mix dofollow and nofollow — Google expects both.",
    rule: `DR ${MIDTIER_DR}–${AUTHORITY_DR - 1}`,
  },
  {
    phase: 4,
    title: "Long Tail",
    when: "Weeks 3–4",
    blurb:
      "Complete the rest. Even low-DR sites add link diversity and referral traffic.",
    rule: `DR < ${MIDTIER_DR} or unrated`,
  },
];

export function phaseMeta(phase: LaunchPhase): PhaseMeta {
  return PHASES[phase - 1];
}

/** The "Before You Start" kit, used as the prepare view for directories that
    don't have a hand-curated field schema. */
export const GENERIC_FIELDS: OutletField[] = [
  { key: "name", label: "Product name", type: "text", source: "name", required: true },
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
  { key: "logo", label: "Logo", type: "image", source: "logo_url" },
  { key: "screenshots", label: "Screenshots", type: "image", source: "screenshot_urls" },
];
