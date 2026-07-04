import Link from "next/link";
import { getMasterOutlets, getOutletCountsByProject, getProjects } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import DeleteProjectButton from "@/components/DeleteProjectButton";
import LandingPage from "@/components/LandingPage";
import TallyModal from "@/components/TallyModal";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <LandingPage />;
  }

  const [projects, masterOutlets, outletsByProject] = await Promise.all([
    getProjects(),
    getMasterOutlets(),
    getOutletCountsByProject(),
  ]);
  const masterCount = masterOutlets.length;

  // Submitted counts per project in one query.
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
      <div className="panel relative overflow-hidden rounded-3xl p-8">
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand">
              Launch cockpit
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Your <span className="brand-ink">projects</span>
            </h1>
            <p className="mt-2 max-w-md text-sm text-muted">
              Enter a project once, then launch it across your {masterCount}-outlet
              list.
            </p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <TallyModal />
            <Link
              href="/projects/new"
              className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold"
            >
              + New project
            </Link>
          </div>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="panel mt-8 rounded-3xl border-dashed p-12 text-center">
          <p className="text-muted">No projects yet.</p>
          <Link
            href="/projects/new"
            className="btn-aurora mt-5 inline-block rounded-xl px-5 py-2.5 text-sm font-semibold"
          >
            Create your first launch kit
          </Link>
        </div>
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2">
          {projects.map((p) => {
            const done = submittedByProject.get(p.id) ?? 0;
            const projectTotal = outletsByProject.get(p.id) ?? 0;
            const pct = projectTotal
              ? Math.round((done / projectTotal) * 100)
              : 0;
            return (
              <li key={p.id} className="group relative">
                <DeleteProjectButton projectId={p.id} projectName={p.name} />
                <Link
                  href={`/projects/${p.id}`}
                  className="panel panel-card block rounded-2xl p-5"
                >
                  <div className="flex items-center gap-3 pr-8">
                    {p.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.logo_url}
                        alt=""
                        className="h-11 w-11 rounded-xl object-cover ring-1 ring-white/20"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-3 text-lg font-bold text-white">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{p.name}</div>
                      <div className="truncate text-sm text-muted">
                        {p.one_liner || p.url}
                      </div>
                    </div>
                  </div>
                  <div className="mt-5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted">
                        {done}/{projectTotal} submitted
                      </span>
                      <span className="pct font-semibold text-brand">
                        {pct === 100 ? "✓ 100%" : `${pct}%`}
                      </span>
                    </div>
                    <div className="progress-track mt-1.5 h-2 overflow-hidden rounded-full bg-track">
                      <div
                        className="progress-fill h-full rounded-full"
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
