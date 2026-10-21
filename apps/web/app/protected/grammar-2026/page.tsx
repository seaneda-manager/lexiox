import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { MOCK_GRAMMAR_UNITS_LIST } from "@/models/grammar/mock";
import SectionGuide from "@/app/components/SectionGuide";
import { todayKst } from "@/lib/grammar/planSchedule";

const LEVEL_LABEL: Record<string, string> = {
  all: "전체", ms: "중등", hs: "고등", toefl: "TOEFL",
};

export const dynamic = "force-dynamic";

export default async function Grammar2026Page() {
  // grammar-2026(LEXiOX-Gram / AI 강의 카탈로그)는 TOEFL·GAP 학생 전용.
  // LEXiOX 학생의 문법은 JR 문법(배정 기반)으로 제공 → /jr 로 보냄.
  {
    const authClient = await getServerSupabase();
    const { data: { user: authUser } } = await authClient.auth.getUser();
    if (authUser) {
      const { data: prof } = await authClient
        .from("profiles")
        .select("program")
        .eq("id", authUser.id)
        .maybeSingle();
      if (prof?.program === "lexiox") redirect("/jr");
    }
  }

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

  // 선생님이 잡아 준 스케줄(날짜 ↔ 챕터). 테이블이 없거나 플랜이 없으면 조용히 건너뛴다.
  const today = todayKst();
  let scheduled: { unit_id: string; scheduled_date: string; seq: number }[] = [];
  let schedulePaused = false;
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const [{ data: sched }, { data: plan }] = await Promise.all([
        supabase.from("student_grammar_assignments").select("unit_id, scheduled_date, seq").eq("student_id", user.id).order("scheduled_date").order("seq"),
        supabase.from("student_grammar_plans").select("is_paused").eq("student_id", user.id).maybeSingle(),
      ]);
      scheduled = (sched ?? []) as typeof scheduled;
      schedulePaused = !!plan?.is_paused;
    }
  } catch {}

  const unitById = new Map(units.map((u) => [u.id, u]));
  const scheduleDateOf = new Map(scheduled.map((a) => [a.unit_id, a.scheduled_date]));
  const openSched = scheduled.filter((a) => !completedUnitIds.has(a.unit_id));
  const overdueSched = openSched.filter((a) => a.scheduled_date < today);
  const todaySched = openSched.filter((a) => a.scheduled_date === today);
  const upcomingSched = openSched.filter((a) => a.scheduled_date > today).slice(0, 4);
  const fmtDate = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
  // 밀린 것 → 오늘 순서로 이어하기 대상을 정한다 (공개된 챕터만)
  const nextScheduled = [...overdueSched, ...todaySched].find((a) => unitById.get(a.unit_id)?.status === "published");

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
          if (nextScheduled) {
            const u = unitById.get(nextScheduled.unit_id)!;
            return { label: `${u.label_ko} 이어하기`, href: `/grammar-2026/${u.id}` };
          }
          const next = units.find((u) => u.status === 'published' && !completedUnitIds.has(u.id));
          return next ? { label: `${next.label_ko} 이어하기`, href: `/grammar-2026/${next.id}` } : undefined;
        })()}
      />



      {scheduled.length > 0 && (
        <div className="mb-6 rounded-2xl border border-indigo-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500 mb-2">오늘의 문법</p>
          {schedulePaused && (
            <p className="mb-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">스케줄이 잠시 멈춰 있어요. 선생님이 다시 시작하면 일정이 새로 잡혀요.</p>
          )}
          {overdueSched.length === 0 && todaySched.length === 0 && (
            <p className="text-sm text-gray-500">오늘 할 문법 챕터가 없어요. {upcomingSched[0] ? `다음 수업은 ${fmtDate(upcomingSched[0].scheduled_date)} 이에요.` : "스케줄을 모두 끝냈어요! 🎉"}</p>
          )}
          <ul className="space-y-1.5">
            {[...overdueSched.map((a) => ({ a, tag: "밀림" })), ...todaySched.map((a) => ({ a, tag: "오늘" }))].map(({ a, tag }) => {
              const u = unitById.get(a.unit_id);
              if (!u) return null;
              const ready = u.status === "published";
              const body = (
                <span className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm ${tag === "밀림" ? "border-rose-200 bg-rose-50" : "border-indigo-200 bg-indigo-50"}`}>
                  <span className="font-medium text-gray-900">{u.label_ko}</span>
                  <span className="flex items-center gap-2 text-[11px]">
                    {tag === "밀림" && <span className="text-rose-600">{fmtDate(a.scheduled_date)} 예정</span>}
                    <span className={tag === "밀림" ? "rounded-full bg-rose-100 px-2 py-0.5 font-semibold text-rose-700" : "rounded-full bg-indigo-100 px-2 py-0.5 font-semibold text-indigo-700"}>
                      {ready ? tag : "준비중"}
                    </span>
                  </span>
                </span>
              );
              return <li key={a.unit_id}>{ready ? <Link href={`/grammar-2026/${u.id}`}>{body}</Link> : body}</li>;
            })}
          </ul>
          {upcomingSched.length > 0 && (overdueSched.length > 0 || todaySched.length > 0) && (
            <p className="mt-3 text-xs text-gray-400">
              다음 일정: {upcomingSched.slice(0, 3).map((a) => `${fmtDate(a.scheduled_date)} ${unitById.get(a.unit_id)?.label_ko ?? ""}`).join(" · ")}
            </p>
          )}
        </div>
      )}

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
                {scheduleDateOf.has(unit.id) && !isDone && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${scheduleDateOf.get(unit.id)! < today ? "bg-rose-100 text-rose-700" : scheduleDateOf.get(unit.id) === today ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-500"}`}>
                    {scheduleDateOf.get(unit.id) === today ? "오늘" : scheduleDateOf.get(unit.id)! < today ? "밀림" : fmtDate(scheduleDateOf.get(unit.id)!)}
                  </span>
                )}
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
