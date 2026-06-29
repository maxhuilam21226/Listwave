// Core domain types for Listwave.

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

/**
 * A hand-curated submit-form config for a known outlet — the "guided" overlay.
 * These are matched against a user's outlet BY HOSTNAME to power the rich
 * tap-to-copy prepare view. They are reference data in the repo, not DB rows.
 */
export interface OutletGuide {
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

// --- Outlets (user-managed launch directories, stored in Supabase) ---

/** A launch outlet the user can add/edit/remove. One row per outlet, per user. */
export interface Outlet {
  id: string;
  user_id: string;
  name: string;
  url: string;
  description: string;
  created_at: string;
  updated_at: string;
}

/** Editable subset of an Outlet (what the add/edit form submits). */
export type OutletInput = Pick<Outlet, "name" | "url" | "description">;

/** An outlet enriched with a curated guide overlay when its hostname matches. */
export interface OutletEnriched extends Outlet {
  /** True when a curated field-map guide matched this outlet's hostname. */
  guided: boolean;
  submit_url?: string;
  fields?: OutletField[];
  steps?: string[];
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
