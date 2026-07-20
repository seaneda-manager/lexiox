export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabaseServer";

export default async function Page() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/lingox/reading");

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">LingoX Reading</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Link className="rounded-2xl border bg-white p-5 hover:bg-slate-50" href="/lingox/reading/ms">
          <div className="font-semibold">MS (내신)</div>
          <div className="mt-1 text-xs text-neutral-500">Middle school exams</div>
        </Link>
        <Link className="rounded-2xl border bg-white p-5 hover:bg-slate-50" href="/lingox/reading/hs">
          <div className="font-semibold">HS (모의)</div>
          <div className="mt-1 text-xs text-neutral-500">High school mock tests</div>
        </Link>
        <Link className="rounded-2xl border bg-white p-5 hover:bg-slate-50" href="/lingox/reading/junior">
          <div className="font-semibold">Junior</div>
          <div className="mt-1 text-xs text-neutral-500">Textbook-style reading</div>
        </Link>
      </div>
    </main>
  );
}