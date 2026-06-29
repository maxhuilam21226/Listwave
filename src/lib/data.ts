import { createClient } from "@/lib/supabase/server";
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

/**
 * The user's outlets. On a brand-new account (no outlets yet) this seeds the
 * starter list from the bundled CSV so the cockpit is never empty.
 */
export async function getOutlets(): Promise<Outlet[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("outlets")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;

  if ((data?.length ?? 0) > 0) return data!;

  // Empty: seed the starter list for the current user, then return it.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: seeded, error: seedErr } = await supabase
    .from("outlets")
    .insert(OUTLET_SEED.map((o) => ({ ...o, user_id: user.id })))
    .select("*");
  if (seedErr) throw seedErr;
  return (seeded ?? []).sort(
    (a, b) => a.created_at.localeCompare(b.created_at) || a.name.localeCompare(b.name),
  );
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
