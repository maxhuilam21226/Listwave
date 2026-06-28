import type {
  KitFieldKey,
  Outlet,
  OutletField,
  PreparedField,
  Project,
} from "@/lib/types";

const PRICING_LABELS: Record<string, string> = {
  free: "Free",
  freemium: "Freemium",
  paid: "Paid",
  subscription: "Subscription",
  one_time: "One-time purchase",
};

/** Render a single kit field to the string a form expects. */
function kitValueToString(key: KitFieldKey, project: Project): string {
  const v = project[key];
  if (v == null) return "";
  if (Array.isArray(v)) {
    // tags -> comma list; screenshot_urls -> newline list.
    return key === "screenshot_urls" ? v.join("\n") : v.join(", ");
  }
  if (key === "pricing_type") return PRICING_LABELS[String(v)] ?? String(v);
  return String(v);
}

/** Interpolate {{kit_key}} placeholders in a template against the project. */
function applyTemplate(template: string, project: Project): string {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, key: string) =>
    kitValueToString(key as KitFieldKey, project),
  );
}

/** Truncate to `max` chars, preferring the last word boundary; no ellipsis. */
function truncateSmart(text: string, max: number): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  // Only back off to a word boundary if it doesn't lose too much.
  if (lastSpace > max * 0.6) return slice.slice(0, lastSpace).trimEnd();
  return slice.trimEnd();
}

/** Resolve one outlet field into a ready-to-paste prepared value. */
export function prepareField(field: OutletField, project: Project): PreparedField {
  let raw = "";
  if (field.template) raw = applyTemplate(field.template, project);
  else if (field.source) raw = kitValueToString(field.source, project);

  raw = raw.trim();

  let value = raw;
  let truncated = false;
  if (field.max != null && raw.length > field.max) {
    value = truncateSmart(raw, field.max);
    truncated = true;
  }

  return {
    ...field,
    value,
    truncated,
    overLimit: field.max != null && value.length > field.max,
  };
}

/** Prepare a list of fields against a project. */
export function prepareFields(
  fields: OutletField[],
  project: Project,
): PreparedField[] {
  return fields.map((f) => prepareField(f, project));
}

/** Prepare every field for an outlet, ready for the per-outlet submit view. */
export function prepareOutlet(outlet: Outlet, project: Project): PreparedField[] {
  return prepareFields(outlet.fields, project);
}

/** Image fields hold URLs to assets the user uploads manually, not copy. */
export function isCopyField(field: OutletField): boolean {
  return field.type !== "image";
}
