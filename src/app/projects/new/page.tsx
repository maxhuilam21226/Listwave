import Link from "next/link";
import ProjectForm from "@/components/ProjectForm";

export default function NewProjectPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/" className="text-sm text-muted">
        ← Projects
      </Link>
      <h1 className="mt-2 text-2xl font-bold">New project</h1>
      <p className="mt-1 text-sm text-muted">
        Enter your assets once — LaunchKit reuses them for every outlet.
      </p>
      <div className="mt-8">
        <ProjectForm />
      </div>
    </main>
  );
}
