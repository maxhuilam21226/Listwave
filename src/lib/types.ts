// Core domain types for LaunchKit.

/** The canonical keys of a project "launch kit" — every outlet field maps to one of these. */
export type KitFieldKey =
  | "name"
  | "url"
  | "one_liner"
  | "tagline"
  | "short_desc"
  | "long_desc"
  | "tags"
  | "pricing_type"
  | "contact_email"
  | "logo_url"
  | "screenshot_urls";

/** A project's stored assets — entered once, reused for every launch. */
export interface Project {
  id: string;
  user_id: string;
  name: string;
  url: string;
  one_liner: string; // <= 60
  tagline: string; // <= 100
  short_desc: string; // <= 240
  long_desc: string;
  tags: string[];
  pricing_type: PricingType;
  contact_email: string;
  logo_url: string | null;
  screenshot_urls: string[];
  created_at: string;
  updated_at: string;
}

export type PricingType = "free" | "freemium" | "paid" | "subscription" | "one_time";

/** Editable subset of a Project (everything except server-managed columns). */
export type ProjectInput = Omit<
  Project,
  "id" | "user_id" | "created_at" | "updated_at"
>;

export type OutletTraffic = "high" | "medium" | "low";
export type OutletCost = "free" | "paid";
export type OutletFieldType = "text" | "textarea" | "url" | "email" | "tags" | "image" | "select";

/** One field a directory's submit form asks for, plus where its value comes from. */
export interface OutletField {
  key: string; // the directory's own field name
  label: string; // human label shown in the UI
  type: OutletFieldType;
  max?: number; // character limit, if any
  required?: boolean;
  /** Which kit field feeds this. Omit for fields the user must fill manually per-outlet. */
  source?: KitFieldKey;
  /**
   * Compose the value from multiple kit fields using {{kit_key}} placeholders,
   * e.g. "Show HN: {{name}} – {{one_liner}}". Takes precedence over `source`.
   */
  template?: string;
  help?: string;
}

/** A curated config for a single launch directory — the product's moat. */
export interface Outlet {
  id: string;
  name: string;
  homepage: string;
  submit_url: string;
  traffic: OutletTraffic;
  cost: OutletCost;
  requires_login: boolean;
  category?: string;
  notes?: string;
  steps?: string[];
  fields: OutletField[];
}

// --- Directory database (from the Startup-Launch-List CSV, 582 entries) ---

export type LaunchPhase = 1 | 2 | 3 | 4;

/** A raw directory entry as parsed from the CSV. */
export interface Directory {
  id: string; // slug derived from hostname
  name: string;
  url: string;
  domain_rating: number | null;
  link_type: string | null; // "Dofollow" | "Nofollow" | null
  pricing: string | null; // "Free" | "Freemium" | "Paid" | null
  category: string | null;
  description: string;
}

/** A directory enriched with strategy metadata + any curated submission overlay. */
export interface DirectoryEnriched extends Directory {
  phase: LaunchPhase;
  isPaid: boolean;
  isDofollow: boolean;
  /** True for the curated "best for discovery" subset (Phase 1 is trimmed to ~40;
      Phases 2–4 are all true). Drives the cockpit's "Recommended only" view. */
  recommended: boolean;
  // Optional curated overlay (present for hand-verified outlets, matched by hostname):
  submit_url?: string;
  fields?: OutletField[];
  steps?: string[];
  notes?: string;
}

export type SubmissionStatus = "todo" | "submitted" | "skipped";

/** Per project × outlet progress. */
export interface Submission {
  id: string;
  project_id: string;
  outlet_id: string;
  status: SubmissionStatus;
  submitted_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Result of mapping one kit value into one outlet field. */
export interface PreparedField extends OutletField {
  value: string;
  truncated: boolean;
  overLimit: boolean; // value still exceeds max even after best-effort (shouldn't happen post-truncate)
}
