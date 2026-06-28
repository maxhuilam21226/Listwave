import Link from "next/link";
import { notFound } from "next/navigation";
import ProjectForm from "@/components/ProjectForm";
import { getProject } from "@/lib/data";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href={`/projects/${project.id}`} className="text-sm text-muted">
        ← {project.name}
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Edit project</h1>
      <div className="mt-8">
        <ProjectForm project={project} />
      </div>
    </main>
  );
}
