"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { OutletInput, ProjectInput, SubmissionStatus } from "@/lib/types";

/** Create or update a project's launch kit. Redirects to its cockpit. */
export async function saveProject(input: ProjectInput, id?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let projectId = id;

  if (id) {
    const { error } = await supabase
      .from("projects")
      .update(input)
      .eq("id", id);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("projects")
      .insert({ ...input, user_id: user.id })
      .select("id")
      .single();
    if (error) throw error;
    projectId = data.id;
  }

  revalidatePath("/");
  redirect(`/projects/${projectId}`);
}

/** Set submission status for one project × outlet (upsert). */
export async function setSubmissionStatus(
  projectId: string,
  outletId: string,
  status: SubmissionStatus,
) {
  const supabase = await createClient();
  const { error } = await supabase.from("submissions").upsert(
    {
      project_id: projectId,
      outlet_id: outletId,
      status,
      submitted_at: status === "submitted" ? new Date().toISOString() : null,
    },
    { onConflict: "project_id,outlet_id" },
  );
  if (error) throw error;

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/outlets/${outletId}`);
}

// --- Outlet management (user-owned launch directory list) ------------------

/** Add a new outlet to the user's list. */
export async function addOutlet(input: OutletInput, projectId?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("outlets")
    .insert({ ...input, user_id: user.id });
  if (error) throw error;

  if (projectId) revalidatePath(`/projects/${projectId}`);
}

/** Edit an existing outlet's name/url/description. */
export async function updateOutlet(
  id: string,
  input: OutletInput,
  projectId?: string,
) {
  const supabase = await createClient();
  const { error } = await supabase.from("outlets").update(input).eq("id", id);
  if (error) throw error;

  if (projectId) revalidatePath(`/projects/${projectId}`);
}

/** Remove an outlet (its submissions cascade away via the FK). */
export async function deleteOutlet(id: string, projectId?: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("outlets").delete().eq("id", id);
  if (error) throw error;

  if (projectId) revalidatePath(`/projects/${projectId}`);
}

export async function deleteProject(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/");
  redirect("/");
}
