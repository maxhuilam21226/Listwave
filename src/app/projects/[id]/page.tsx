import Link from "next/link";
import { notFound } from "next/navigation";
import Cockpit from "@/components/Cockpit";
import { getProject, getProjectOutlets, getSubmissions } from "@/lib/data";
import { enrichOutlets } from "@/lib/outlets/enrich";
import type { SubmissionStatus } from "@/lib/types";

export default async function CockpitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const outlets = enrichOutlets(await getProjectOutlets(id));
  const submissions = await getSubmissions(id);
  const initialStatuses: Record<string, SubmissionStatus> = {};
  for (const [outletId, sub] of Object.entries(submissions))
    initialStatuses[outletId] = sub.status;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm text-muted">
        ← Projects
      </Link>
      <div className="mt-2 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {project.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.logo_url}
              alt=""
              className="h-12 w-12 rounded-lg object-cover"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <p className="text-sm text-muted">{project.one_liner}</p>
          </div>
        </div>
        <Link
          href={`/projects/${project.id}/edit`}
          className="rounded-lg border border-border px-3 py-1.5 text-sm"
        >
          Edit kit
        </Link>
      </div>

      <div className="mt-8">
        <Cockpit
          projectId={project.id}
          outlets={outlets}
          initialStatuses={initialStatuses}
        />
      </div>
    </main>
  );
}
