"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
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
          master_outlet_id: o.id,
          name: o.name,
          url: o.url,
          description: o.description,
          cost: o.cost,
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

/**
 * Edit an existing outlet's name/url/description.
 *
 * Editing a MASTER outlet (no `projectId`) propagates the change to every
 * project's copy of that outlet, found via their `master_outlet_id` link. Each
 * copy's per-outlet `field_overrides` are left untouched. A project-scoped edit
 * (`projectId` set) only touches that one row.
 */
export async function updateOutlet(
  id: string,
  input: OutletInput,
  projectId?: string,
) {
  const supabase = await createClient();
  const { error } = await supabase.from("outlets").update(input).eq("id", id);
  if (error) throw error;

  // Propagate a master edit to that outlet's project copies (matched by the
  // FK, so it's exact even if URLs collide). Project-scoped edits don't.
  if (!projectId) {
    const { data: copies, error: copyErr } = await supabase
      .from("outlets")
      .update(input)
      .eq("master_outlet_id", id)
      .select("project_id");
    if (copyErr) throw copyErr;
    // Refresh every project whose copy we just touched.
    for (const pid of new Set(
      (copies ?? []).map((r) => (r as { project_id: string }).project_id),
    )) {
      revalidatePath(`/projects/${pid}`);
    }
  }

  revalidateOutletList(projectId);
}

/** Remove an outlet (its submissions cascade away via the FK). */
export async function deleteOutlet(id: string, projectId?: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("outlets").delete().eq("id", id);
  if (error) throw error;

  revalidateOutletList(projectId);
}

/**
 * Persist a project-outlet's per-field overrides (the whole map). The client
 * holds the full set of fields, so it sends the complete merged map — keys
 * present here are frozen literals; removing a key reverts that field to the
 * value computed from the project kit.
 */
export async function saveOutletFieldOverrides(
  outletId: string,
  overrides: Record<string, string>,
  projectId: string,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("outlets")
    .update({ field_overrides: overrides })
    .eq("id", outletId);
  if (error) throw error;

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/outlets/${outletId}`);
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

/**
 * Persist the current user's theme choice so it follows them across devices.
 * `mode` null = follow the OS setting. Best-effort: called fire-and-forget from
 * the theme picker, which has already applied the change locally.
 */
export async function saveThemePreference(
  family: "aurora" | "editorial" | "mission" | "clay",
  mode: "light" | "dark" | null,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from("profiles").upsert(
    { user_id: user.id, theme_family: family, theme_mode: mode },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

export async function deleteProject(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/");
  redirect("/");
}

/**
 * Replaces the current user's master outlet list with the admin's curated list.
 * Existing project outlet copies are never touched.
 */
export async function syncWithAdminMasterList(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const seedUserId = process.env.OUTLET_SEED_USER_ID;
  if (!seedUserId || seedUserId === user.id)
    return { error: "Sync unavailable" };

  const adminClient = createAdminClient();
  const { data: adminOutlets, error: fetchErr } = await adminClient
    .from("outlets")
    .select("name, url, description, cost")
    .eq("user_id", seedUserId)
    .is("project_id", null)
    .order("sort_order", { ascending: true });

  if (fetchErr) throw fetchErr;
  if (!adminOutlets || adminOutlets.length === 0)
    return { error: "Admin list is empty" };

  const { error: deleteErr } = await supabase
    .from("outlets")
    .delete()
    .eq("user_id", user.id)
    .is("project_id", null);
  if (deleteErr) throw deleteErr;

  const { error: insertErr } = await supabase.from("outlets").insert(
    adminOutlets.map((o: { name: string; url: string; description: string; cost: string | null }, i: number) => ({
      name: o.name,
      url: o.url,
      description: o.description,
      cost: o.cost ?? "free",
      user_id: user.id,
      project_id: null,
      sort_order: i,
    })),
  );
  if (insertErr) throw insertErr;

  revalidatePath("/outlets");
  return {};
}
