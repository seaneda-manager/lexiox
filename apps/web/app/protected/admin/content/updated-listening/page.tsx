import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { PlusCircle } from "lucide-react";
import TestRowActions from "./_client/TestRowActions";

export const dynamic = "force-dynamic";

type Row = { id: string; label: string; is_locked: boolean | null; updated_at: string | null };

function fmt(iso: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

export default async function Listening2026AdminListPage() {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("listening_tests_2026")
    .select("id,label,is_locked,updated_at")
    .order("updated_at", { ascending: false });

  const tests: Row[] = data ?? [];

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Listening 2026 – 시험 관리</h1>
          {error && <p className="mt-1 text-xs text-rose-600">{error.message}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/content/updated-listening/assign"
            className="inline-flex items-center gap-1.5 rounded-lg border border-teal-400 px-3 py-1.5 text-xs font-semibold text-teal-600 hover:bg-teal-50"
          >
            시험 배정
          </Link>
          <Link
            href="/admin/content/updated-listening/new-mst"
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400 px-3 py-1.5 text-xs font-semibold text-violet-600 hover:bg-violet-50"
          >
            MST 적응형 생성
          </Link>
          <Link
          href="/admin/content/updated-listening/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-violet-700"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          새 시험 만들기
        </Link>
        </div>
      </header>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="hidden border-b bg-gray-50 px-4 py-2 text-[11px] font-medium text-gray-500 md:grid md:grid-cols-4">
          <div>ID</div><div>Label</div><div>Updated</div><div className="text-right">상태</div>
        </div>
        {tests.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-gray-500">
            아직 시험이 없습니다.{" "}
            <Link href="/admin/content/updated-listening/new" className="text-violet-600 underline">새로 만들기</Link>
          </div>
        ) : (
          <div className="divide-y">
            {tests.map((t) => (
              <div key={t.id} className="px-4 py-3 text-xs hover:bg-violet-50/30 md:grid md:grid-cols-4 md:items-center">
                <div className="font-mono text-[11px] text-gray-500">{t.id.slice(0, 8)}…</div>
                <div className="font-semibold text-gray-900">{t.label}</div>
                <div className="text-gray-500">{fmt(t.updated_at)}</div>
                <div className="flex items-center justify-end gap-2">
                  {t.is_locked && (
                    <span className="rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-medium text-white">🔒 Locked</span>
                  )}
                  <Link
                    href={`/admin/content/updated-listening/${t.id}`}
                    className="inline-flex items-center rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-[11px] font-medium text-blue-700 hover:border-blue-400 hover:bg-blue-50"
                  >
                    수정
                  </Link>
                  <Link
                    href={`/admin/content/updated-listening/${t.id}/preview`}
                    target="_blank"
                    className="inline-flex items-center rounded-lg border border-amber-200 bg-white px-2.5 py-1 text-[11px] font-medium text-amber-700 hover:border-amber-400 hover:bg-amber-50"
                  >
                    미리보기
                  </Link>
                  <TestRowActions testId={t.id} testLabel={t.label} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
