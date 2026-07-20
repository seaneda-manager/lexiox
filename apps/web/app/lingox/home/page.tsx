// apps/web/app/lingox/home/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LingoXHomePage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?next=/lingox/home");

  const items = [
    {
      title: "Vocab Session",
      desc: "Prescreen → Spelling → Learning → Speed → Drill flow.",
      href: "/vocab/session",
    },
    {
      title: "Vocab Results",
      desc: "Review answers and history.",
      href: "/vocab/results",
    },
    {
      title: "Admin: Vocab Tracks",
      desc: "Tracks, day sets, and sync utilities.",
      href: "/admin/vocab/tracks",
    },
    {
      title: "Admin: Users",
      desc: "Student and account management.",
      href: "/admin/users",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <div className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-100">
              Lingo-X
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-emerald-950">
              Lingo-X Home
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Separate entrance from TOEFL. We will move remaining pages under /lingox gradually.
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
            If any link path differs in your repo, tell me the real path and I will rewire this home cleanly.
          </p>
        </div>
      </div>
    </main>
  );
}