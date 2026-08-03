import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { MOCK_GRAMMAR_UNITS_LIST } from "@/models/grammar/mock";
import SectionGuide from "@/app/components/SectionGuide";

const LEVEL_LABEL: Record<string, string> = {
  all: "전체", ms: "중등", hs: "고등", toefl: "TOEFL",
};

export const dynamic = "force-dynamic";

export default async function Grammar2026Page() {
  let units: { id: string; label_ko: string; label_en: string; level: string; order_index: number; status: string }[] = MOCK_GRAMMAR_UNITS_LIST;
  let completedUnitIds: Set<string> = new Set();

  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    const [unitsRes, completionsRes] = await Promise.all([
      supabase.from("grammar_2026_units").select("id, label_ko, label_en, level, order_index, status").order("order_index"),
      user ? supabase.from("grammar_2026_unit_completions").select("unit_id").eq("student_id", user.id) : Promise.resolve({ data: [] }),
    ]);

    if (!unitsRes.error && unitsRes.data && unitsRes.data.length > 0) units = unitsRes.data;
    completedUnitIds = new Set((completionsRes.data ?? []).map((r: any) => r.unit_id));
  } catch {}

  const publishedCount = units.filter((u) => u.status === "published").length;
  const completedCount = units.filter((u) => completedUnitIds.has(u.id)).length;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-1">LEXiOX-Gram</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">문법 챕터</h1>
      </div>

      <SectionGuide
        storageKey="guide-seen-grammar-2026"
        color="indigo"
        icon="✍️"
        title="문법"
        tagline="개념 영상 → 빈칸 드릴 순서로 챕터를 완성합니다."
        outcomes={[
          '영어 문장의 구조(주어·동사·목적어·수식어)를 직관적으로 분석할 수 있다',
          '시제·관계절·조동사 등 핵심 규칙을 실제 문장 속에서 바로 적용할 수 있다',
          '내신·TOEFL·수능에 자주 출제되는 문법 포인트를 정확히 구분할 수 있다',
        ]}
        steps={[
          { icon: '🎬', title: '설명 영상', desc: '핵심 규칙을 애니메이션으로 설명합니다. 멈추고 돌려보며 이해를 확인하세요.' },
          { icon: '✏️', title: '빈칸 드릴', desc: '문장 속 빈칸을 채우며 규칙을 직접 적용합니다. 정답과 문장 성분 레이블을 함께 확인하세요.' },
          { icon: '🔢', title: '순서대로', desc: '1번부터 순서대로 완료하면 규칙이 자연스럽게 쌓입니다.' },
        ]}
        progress={publishedCount > 0 ? { done: completedCount, total: publishedCount, unit: '챕터' } : undefined}
        nextAction={(() => {
          const next = units.find((u) => u.status === 'published' && !completedUnitIds.has(u.id));
          return next ? { label: `${next.label_ko} 이어하기`, href: `/grammar-2026/${next.id}` } : undefined;
        })()}
      />



      <div className="mb-6 p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-indigo-700">내 진행률</p>
          <p className="text-xs text-indigo-400">{completedCount} / {publishedCount} 챕터 완료</p>
        </div>
        <div className="w-full bg-indigo-100 rounded-full h-1.5">
          <div className="bg-indigo-500 h-1.5 rounded-full transition-all"
            style={{ width: publishedCount > 0 ? `${(completedCount / publishedCount) * 100}%` : "0%" }} />
        </div>
      </div>

      <div className="space-y-2.5">
        {units.map((unit, i) => {
          const isPublished = unit.status === "published";
          const isDone = completedUnitIds.has(unit.id);
          return (
            <Link key={unit.id}
              href={isPublished ? `/grammar-2026/${unit.id}` : "#"}
              className={`flex items-center gap-4 p-4 rounded-2xl border transition group
                ${isDone
                  ? "border-green-200 bg-green-50 hover:border-green-300 hover:shadow-md cursor-pointer"
                  : isPublished
                  ? "border-gray-200 bg-white hover:border-indigo-300 hover:shadow-md cursor-pointer"
                  : "border-gray-100 bg-gray-50 cursor-not-allowed opacity-60"}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm transition
                ${isDone
                  ? "bg-green-500 text-white"
                  : isPublished
                  ? "bg-indigo-100 text-indigo-700 group-hover:bg-indigo-500 group-hover:text-white"
                  : "bg-gray-200 text-gray-400"}`}>
                {isDone ? "✓" : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900">{unit.label_ko}</p>
                <p className="text-xs text-gray-400 mt-0.5">{unit.label_en}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {LEVEL_LABEL[unit.level] ?? unit.level}
                </span>
                {!isPublished && (
                  <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">준비중</span>
                )}
                {isPublished && !isDone && (
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
