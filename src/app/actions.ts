"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMasterOutlets } from "@/lib/data";
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

    // Inherit a copy of the master outlet template. From here the project's
    // list is independent — edits/removes here never touch the master.
    const master = await getMasterOutlets();
    if (master.length > 0) {
      const { error: copyErr } = await supabase.from("outlets").insert(
        master.map((o) => ({
          user_id: user.id,
          project_id: projectId,
          name: o.name,
          url: o.url,
          description: o.description,
          sort_order: o.sort_order,
        })),
      );
      if (copyErr) throw copyErr;
    }
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

// --- Outlet management ------------------------------------------------------
// A `projectId` scopes the action to that project's own list; omitting it
// targets the user's master template (project_id is null).

function revalidateOutletList(projectId?: string) {
  if (projectId) revalidatePath(`/projects/${projectId}`);
  else revalidatePath("/outlets");
}

/** Add a new outlet to a project's list, or to the master template. */
export async function addOutlet(input: OutletInput, projectId?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("outlets").insert({
    ...input,
    user_id: user.id,
    project_id: projectId ?? null,
    sort_order: Date.now(), // append to the end of the list
  });
  if (error) throw error;

  revalidateOutletList(projectId);
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

  revalidateOutletList(projectId);
}

/** Remove an outlet (its submissions cascade away via the FK). */
export async function deleteOutlet(id: string, projectId?: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("outlets").delete().eq("id", id);
  if (error) throw error;

  revalidateOutletList(projectId);
}

/** Persist a manual drag order: sort_order becomes each id's position. */
export async function reorderOutlets(orderedIds: string[], projectId?: string) {
  const supabase = await createClient();
  const results = await Promise.all(
    orderedIds.map((id, i) =>
      supabase.from("outlets").update({ sort_order: i }).eq("id", id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;

  revalidateOutletList(projectId);
}

export async function deleteProject(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/");
  redirect("/");
}
