import Link from "next/link";
import { redirect } from "next/navigation";
import MasterOutlets from "@/components/MasterOutlets";
import { getMasterOutlets, getUserId } from "@/lib/data";

export default async function MasterOutletsPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const outlets = await getMasterOutlets();

  const isAdmin =
    !!process.env.OUTLET_SEED_USER_ID &&
    userId === process.env.OUTLET_SEED_USER_ID;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm text-muted">
        ← Projects
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Master outlet list</h1>
      <p className="mt-1 text-sm text-muted">
        Your reusable template. Every new project starts with a copy of this
        list — editing it here doesn&apos;t change projects you&apos;ve already
        created.
      </p>

      <div className="mt-8">
        <MasterOutlets outlets={outlets} isAdmin={isAdmin} />
      </div>
    </main>
  );
}
