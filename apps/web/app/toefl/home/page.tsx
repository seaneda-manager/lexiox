// apps/web/app/toefl/home/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ToeflHomePage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?next=/toefl/home");

  const items = [
    { title: "Reading", desc: "Adaptive reading practice and review.", href: "/reading" },
    { title: "Listening", desc: "Lectures and conversations with analytics.", href: "/listening" },
    { title: "Speaking", desc: "Task practice sets and recording flow.", href: "/speaking" },
    { title: "Writing", desc: "Email and Academic Discussion tasks.", href: "/writing" },
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <div className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-100">
              UPDATED-TOEFL
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-emerald-950">
              TOEFL Home
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Pick a module. We will migrate the rest into /toefl gradually.
            </p>
          </div>

          <Link
            href="/home"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-slate-50"
          >
            Portal
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {items.map((it) => (
            <Link
              key={it.title}
              href={it.href}
              className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm hover:shadow-md"
            >
              <h2 className="text-xl font-bold text-emerald-950">{it.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{it.desc}</p>
              <p className="mt-5 text-sm font-semibold text-emerald-800">Open →</p>
            </Link>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Note</p>
          <p className="mt-1">
            If any of these links 404, tell me the exact existing route and I will wire it cleanly under /toefl.
          </p>
        </div>
      </div>
    </main>
  );
}