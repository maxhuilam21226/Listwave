"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ProjectInput, SubmissionStatus } from "@/lib/types";

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

export async function deleteProject(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/");
  redirect("/");
}
