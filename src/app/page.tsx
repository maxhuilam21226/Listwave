import Link from "next/link";
import { getProjects } from "@/lib/data";
import { getDirectories } from "@/lib/directories";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const projects = await getProjects();
  const totalOutlets = getDirectories().length;

  // Submitted counts per project in one query.
  const supabase = await createClient();
  const { data: subs } = await supabase
    .from("submissions")
    .select("project_id, status")
    .eq("status", "submitted");
  const submittedByProject = new Map<string, number>();
  for (const s of subs ?? [])
    submittedByProject.set(
      s.project_id,
      (submittedByProject.get(s.project_id) ?? 0) + 1,
    );

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Your projects</h1>
          <p className="mt-1 text-sm text-muted">
            Enter a project once, then launch it across {totalOutlets} outlets.
          </p>
        </div>
        <Link
          href="/projects/new"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
        >
          New project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-muted">No projects yet.</p>
          <Link
            href="/projects/new"
            className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
          >
            Create your first launch kit
          </Link>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {projects.map((p) => {
            const done = submittedByProject.get(p.id) ?? 0;
            const pct = Math.round((done / totalOutlets) * 100);
            return (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="block rounded-xl border border-border bg-card p-5 transition hover:border-faint"
                >
                  <div className="flex items-center gap-3">
                    {p.logo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.logo_url}
                        alt=""
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{p.name}</div>
                      <div className="truncate text-sm text-muted">
                        {p.one_liner || p.url}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-muted">
                      <span>
                        {done}/{totalOutlets} submitted
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-track">
                      <div
                        className="h-full bg-green-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
