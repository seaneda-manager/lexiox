export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabaseServer";

type SetRow = { id: string; title: string; source: string | null; version: number | null };

export default async function Page() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/toefl/reading");

  const { data, error } = await supabase
    .from("v_user_reading_sets")
    .select("id, title, source, version")
    .order("created_at", { ascending: true })
    .returns<SetRow[]>();

  if (error) {
    return <div className="p-6 text-red-600">Load error: {error.message}</div>;
  }

  const sets = data ?? [];

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">UPDATED-TOEFL Reading</h1>

      {sets.length === 0 ? (
        <p className="text-sm text-neutral-600">No reading sets.</p>
      ) : (
        <div className="space-y-3">
          {sets.map((s) => (
            <Link
              key={s.id}
              href={`/toefl/reading/test?setId=${encodeURIComponent(s.id)}`}
              className="block rounded-2xl border bg-white p-4 hover:bg-slate-50"
            >
              <div className="text-base font-semibold">{s.title || s.id}</div>
              <div className="mt-1 text-xs text-neutral-500">
                setId: {s.id} {s.source ? `· source: ${s.source}` : ""}{" "}
                {typeof s.version === "number" ? `· v${s.version}` : ""}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}