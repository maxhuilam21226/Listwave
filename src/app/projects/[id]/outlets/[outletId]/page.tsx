import Link from "next/link";
import { notFound } from "next/navigation";
import OutletSubmit from "@/components/OutletSubmit";
import { getOutlet, getProject, getSubmissions } from "@/lib/data";
import { GENERIC_FIELDS, enrichOutlet } from "@/lib/outlets/enrich";
import { prepareFields } from "@/lib/mapping";

export default async function OutletSubmitPage({
  params,
}: {
  params: Promise<{ id: string; outletId: string }>;
}) {
  const { id, outletId } = await params;
  const [project, rawOutlet] = await Promise.all([
    getProject(id),
    getOutlet(outletId),
  ]);
  if (!project) notFound();
  if (!rawOutlet) notFound();
  const outlet = enrichOutlet(rawOutlet);

  const fields = prepareFields(outlet.fields ?? GENERIC_FIELDS, project);
  const submissions = await getSubmissions(id);
  const sub = submissions[outletId];
  const initialStatus = sub?.status ?? "todo";
  const initialNotes = sub?.notes ?? null;
  const initialScheduledAt = sub?.scheduled_at ?? null;

  let host = outlet.url;
  try {
    host = new URL(outlet.url).hostname;
  } catch {}

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href={`/projects/${id}`} className="text-sm text-muted">
        ← {project.name}
      </Link>
      <div className="mt-2 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{outlet.name}</h1>
        <a
          href={outlet.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted hover:underline"
        >
          {host}
        </a>
      </div>
      {outlet.description && (
        <p className="mt-1 text-sm text-muted">{outlet.description}</p>
      )}

      <div className="mt-8">
        <OutletSubmit
          projectId={id}
          outlet={outlet}
          fields={fields}
          initialOverrides={rawOutlet.field_overrides ?? {}}
          initialStatus={initialStatus}
          initialNotes={initialNotes}
          initialScheduledAt={initialScheduledAt}
        />
      </div>
    </main>
  );
}
