// Target path:
// apps/web/app/(protected)/admin/naesin/passages/[id]/edit/page.tsx

import Link from "next/link";
import PassageAuthoringEditor from "@/components/naesin/authoring/PassageAuthoringEditor";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminNaesinPassagesEditPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const { data } = await supabase
    .from("naesin_passages")
    .select("id, title, slug, status, updated_at")
    .eq("id", id)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <header className="space-y-3">
        <div className="text-xs uppercase tracking-[0.18em] text-neutral-400">
          Admin / Naesin / Passages / Edit
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">Passage Edit</h1>
            <p className="mt-1 text-sm text-neutral-500">
              passageId: <span className="font-medium text-neutral-700">{id}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/naesin/passages/new"
              className="rounded-2xl border px-4 py-2 text-sm font-medium text-neutral-700"
            >
              새 지문
            </Link>
            <Link
              href={`/admin/naesin/passages/${id}/preview`}
              className="rounded-2xl bg-black px-4 py-2 text-sm font-medium text-white"
            >
              Preview
            </Link>
          </div>
        </div>
      </header>

      <section className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-neutral-400">ID</div>
            <div className="mt-2 text-sm text-neutral-800">{data?.id ?? id}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-neutral-400">Title</div>
            <div className="mt-2 text-sm text-neutral-800">{data?.title ?? "-"}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-neutral-400">Status</div>
            <div className="mt-2 text-sm text-neutral-800">{data?.status ?? "-"}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-neutral-400">Updated</div>
            <div className="mt-2 text-sm text-neutral-800">
              {data?.updated_at ? new Date(data.updated_at).toLocaleString() : "-"}
            </div>
          </div>
        </div>
      </section>

      <PassageAuthoringEditor />
    </main>
  );
}
