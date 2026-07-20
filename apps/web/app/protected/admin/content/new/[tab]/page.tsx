import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionAndRole } from "@/lib/authServer";
import ReadingEditorClient from "./_client/ReadingEditorClient";

export const dynamic = "force-dynamic";

type Params = { tab?: string };

export default async function AdminContentNewTabPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { session, role } = await getSessionAndRole();

  if (!session) redirect("/auth/login?next=/admin/content/new/json");

  if (role !== "admin") {
    if (role === "teacher") redirect("/home/teacher");
    redirect("/home/student");
  }

  const { tab } = await params;
  const _tab = String(tab ?? "").toLowerCase();

  if (_tab !== "json") {
    redirect("/admin/content/new/json");
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">
          New Content — Naesin Reading JSON Editor
        </h1>

        <div className="flex items-center gap-2">
          <Link
            href="/reading/admin"
            className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
            title="Legacy advanced reading editor"
          >
            Legacy Reading Admin
          </Link>
        </div>
      </header>

      <nav className="flex items-center gap-3 text-sm">
        <Link href="/reading/admin" className="text-gray-600 hover:underline">
          Legacy Manual Editor
        </Link>
        <span className="text-gray-300">|</span>
        <Link
          href="/admin/content/new/json"
          className="font-semibold underline"
        >
          Naesin JSON Editor
        </Link>
      </nav>

      <section className="space-y-3 rounded border p-4">
        <p className="text-sm text-gray-700">
          Paste a Naesin Reading payload JSON and save it directly into the
          <code className="ml-1">naesin_reading_*</code> tables.
        </p>
        <ReadingEditorClient />
      </section>
    </div>
  );
}
