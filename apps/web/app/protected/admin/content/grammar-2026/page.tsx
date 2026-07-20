import Link from "next/link";
import { PlusCircle, BookOpen } from "lucide-react";
import { getServerSupabase } from "@/lib/supabase/server";
import { MOCK_GRAMMAR_UNITS_LIST } from "@/models/grammar/mock";

export const dynamic = "force-dynamic";

export default async function GrammarAdminListPage() {
  let units: any[] = [];
  let loadError: string | null = null;

  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from("grammar_2026_units")
      .select("id, label_ko, label_en, level, order_index, status")
      .order("order_index");
    if (error) {
      loadError = error.message;
      units = MOCK_GRAMMAR_UNITS_LIST; // fallback
    } else {
      units = data && data.length > 0 ? data : MOCK_GRAMMAR_UNITS_LIST;
    }
  } catch (e: any) {
    loadError = e.message;
    units = MOCK_GRAMMAR_UNITS_LIST;
  }

  const publishedCount = units.filter((u) => u.status === "published").length;

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <header className="space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-medium text-indigo-700">
              <BookOpen className="h-3.5 w-3.5" />
              Admin · LEXiOX-Gram
            </div>
            <h1 className="mt-2 text-xl font-bold tracking-tight text-gray-900">LEXiOX-Gram — 유닛 관리</h1>
            <p className="mt-1 text-xs text-gray-500">Grammar 챕터(유닛) 별 설명·드릴·Stylistic 문제를 편집합니다.</p>
          </div>
          <Link href="/admin/content/grammar-2026/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700">
            <PlusCircle className="h-3.5 w-3.5" />
            새 유닛 만들기
          </Link>
        </div>

        {loadError && (
          <div className="rounded-md bg-rose-50 px-3 py-2 text-[11px] text-rose-900">
            <p className="font-semibold">DB 오류 (목업 데이터 표시 중)</p>
            <p className="mt-0.5">{loadError}</p>
          </div>
        )}

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border bg-white p-3 shadow-sm">
            <p className="text-[11px] font-medium text-gray-500">전체 유닛</p>
            <p className="mt-2 text-xl font-bold text-gray-900">{units.length}</p>
          </div>
          <div className="rounded-xl border bg-white p-3 shadow-sm">
            <p className="text-[11px] font-medium text-gray-500">Published</p>
            <p className="mt-2 text-xl font-bold text-indigo-600">{publishedCount}</p>
          </div>
          <div className="rounded-xl border bg-white p-3 shadow-sm">
            <p className="text-[11px] font-medium text-gray-500">Draft</p>
            <p className="mt-2 text-xl font-bold text-gray-400">{units.length - publishedCount}</p>
          </div>
        </section>
      </header>

      <section>
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="hidden border-b bg-gray-50 px-4 py-2 text-[11px] font-medium text-gray-500 md:grid md:grid-cols-6">
            <div>순서</div>
            <div className="col-span-2">유닛명</div>
            <div>레벨</div>
            <div>상태</div>
            <div className="text-right">편집</div>
          </div>

          {units.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-gray-400">
              아직 유닛이 없습니다.
              <br />
              <Link href="/admin/content/grammar-2026/new"
                className="mt-2 inline-flex items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100">
                새 유닛을 만들어보세요.
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {units.map((unit) => (
                <div key={unit.id}
                  className="px-3 py-3 text-xs hover:bg-indigo-50/30 md:grid md:grid-cols-6 md:items-center md:px-4">
                  <div className="font-mono text-gray-400">{unit.order_index}</div>
                  <div className="col-span-2">
                    <p className="font-semibold text-gray-900">{unit.label_ko}</p>
                    <p className="text-[11px] text-gray-400">{unit.label_en ?? unit.id}</p>
                  </div>
                  <div>
                    <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                      {unit.level}
                    </span>
                  </div>
                  <div>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium
                      ${unit.status === "published" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {unit.status === "published" ? "Published" : "Draft"}
                    </span>
                  </div>
                  <div className="flex justify-end">
                    <Link href={`/admin/content/grammar-2026/${unit.id}`}
                      className="inline-flex items-center rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-indigo-700 hover:border-indigo-400 hover:bg-indigo-50">
                      편집
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
