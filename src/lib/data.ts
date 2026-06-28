import { createClient } from "@/lib/supabase/server";
import type { Project, Submission } from "@/lib/types";

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
