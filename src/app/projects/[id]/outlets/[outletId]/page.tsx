import Link from "next/link";
import { notFound } from "next/navigation";
import OutletSubmit from "@/components/OutletSubmit";
import { getProject, getSubmissions } from "@/lib/data";
import { getDirectory } from "@/lib/directories";
import { prepareFields } from "@/lib/mapping";
import { GENERIC_FIELDS, phaseMeta } from "@/lib/strategy";

export default async function OutletSubmitPage({
  params,
}: {
  params: Promise<{ id: string; outletId: string }>;
}) {
  const { id, outletId } = await params;
  const project = await getProject(id);
  if (!project) notFound();
  const dir = getDirectory(outletId);
  if (!dir) notFound();

  const fields = prepareFields(dir.fields ?? GENERIC_FIELDS, project);
  const submissions = await getSubmissions(id);
  const initialStatus = submissions[outletId]?.status ?? "todo";

  let host = dir.url;
  try {
    host = new URL(dir.url).hostname;
  } catch {}

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href={`/projects/${id}`} className="text-sm text-muted">
        ← {project.name}
      </Link>
      <div className="mt-2 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{dir.name}</h1>
        <a
          href={dir.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted hover:underline"
        >
          {host}
        </a>
      </div>
      {dir.description && (
        <p className="mt-1 text-sm text-muted">{dir.description}</p>
      )}

      <div className="mt-8">
        <OutletSubmit
          projectId={id}
          dir={dir}
          fields={fields}
          phase={phaseMeta(dir.phase)}
          initialStatus={initialStatus}
        />
      </div>
    </main>
  );
}
