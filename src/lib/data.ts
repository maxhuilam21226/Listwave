import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { OUTLET_SEED } from "@/lib/outlets/seed";
import type { Outlet, Project, Submission } from "@/lib/types";

/** Current authenticated user id, or null. */
export async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export type ThemeFamily = "aurora" | "editorial" | "mission" | "clay";
export type ThemePreference = {
  family: ThemeFamily;
  mode: "light" | "dark" | null;
};

/**
 * The current user's saved theme preference, or null when logged out / unset.
 * `mode: null` means "follow the OS setting". Read at the root layout so a fresh
 * device paints the right theme with no flash.
 */
export async function getThemePreference(): Promise<ThemePreference | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("theme_family, theme_mode")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    family: (data.theme_family as ThemeFamily) ?? "aurora",
    mode: (data.theme_mode as "light" | "dark" | null) ?? null,
  };
}

export async function getProjects(): Promise<Project[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getProject(id: string): Promise<Project | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function sortOutlets(rows: Outlet[]): Outlet[] {
  return [...rows].sort(
    (a, b) =>
      a.sort_order - b.sort_order ||
      a.created_at.localeCompare(b.created_at) ||
      a.name.localeCompare(b.name),
  );
}

/**
 * The user's MASTER outlet template (project_id is null). On a brand-new
 * account (no master rows yet) this seeds the starter list from the bundled CSV
 * so a new project never starts empty.
 */
export async function getMasterOutlets(): Promise<Outlet[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("outlets")
    .select("*")
    .is("project_id", null);
  if (error) throw error;

  if ((data?.length ?? 0) > 0) return sortOutlets(data!);

  // Empty account: seed the master list for this new user.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Prefer the admin's live curated list over the bundled seed file.
  const seedUserId = process.env.OUTLET_SEED_USER_ID;
  if (seedUserId && seedUserId !== user.id) {
    try {
      const adminClient = createAdminClient();
      const { data: adminOutlets } = await adminClient
        .from("outlets")
        .select("name, url, description, cost")
        .eq("user_id", seedUserId)
        .is("project_id", null)
        .order("sort_order", { ascending: true });

      if (adminOutlets && adminOutlets.length > 0) {
        const { data: seeded, error: seedErr } = await supabase
          .from("outlets")
          .insert(
            adminOutlets.map((o, i) => ({
              name: o.name,
              url: o.url,
              description: o.description,
              cost: o.cost ?? "free",
              user_id: user.id,
              project_id: null,
              sort_order: i,
            })),
          )
          .select("*");
        if (seedErr) throw seedErr;
        return sortOutlets(seeded ?? []);
      }
    } catch (err) {
      // If the admin client fails (e.g. key not set yet), fall through to the
      // bundled seed so a missing env var never breaks sign-up.
      console.error("[seed] Admin outlet fetch failed, falling back:", err);
    }
  }

  // Fallback: static bundled seed from seed.ts.
  const { data: seeded, error: seedErr } = await supabase
    .from("outlets")
    .insert(
      OUTLET_SEED.map((o, i) => ({
        ...o,
        user_id: user.id,
        project_id: null,
        sort_order: i,
      })),
    )
    .select("*");
  if (seedErr) throw seedErr;
  return sortOutlets(seeded ?? []);
}

/** A single project's own outlet list (its inherited + locally added rows). */
export async function getProjectOutlets(projectId: string): Promise<Outlet[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("outlets")
    .select("*")
    .eq("project_id", projectId);
  if (error) throw error;
  return sortOutlets(data ?? []);
}

/** outlet count per project, for the projects dashboard. */
export async function getOutletCountsByProject(): Promise<Map<string, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("outlets")
    .select("project_id")
    .not("project_id", "is", null);
  if (error) throw error;
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const pid = (row as { project_id: string }).project_id;
    counts.set(pid, (counts.get(pid) ?? 0) + 1);
  }
  return counts;
}

export async function getOutlet(id: string): Promise<Outlet | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("outlets")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Map of outlet_id -> Submission for a project (only rows that exist). */
export async function getSubmissions(
  projectId: string,
): Promise<Record<string, Submission>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("project_id", projectId);
  if (error) throw error;
  const map: Record<string, Submission> = {};
  for (const row of data ?? []) map[row.outlet_id] = row;
  return map;
}
