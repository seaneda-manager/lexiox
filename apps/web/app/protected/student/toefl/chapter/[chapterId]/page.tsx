import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const LEVEL_LABEL: Record<string, string> = { basic: "기본", intermediate: "중급", advanced: "고급" };
const STEP_CONFIG = [
  { key: "lecture",  label: "강좌",      emoji: "🎬", desc: "배경 지식 & 문제 유형 설명", doneKey: "lecture_done" },
  { key: "practice", label: "Practices", emoji: "✏️",  desc: "짧은 지문으로 집중 훈련",    doneKey: "practice_done" },
  { key: "test",     label: "Test",      emoji: "📋", desc: "챕터 미니 테스트",            doneKey: "test_done" },
  { key: "review",   label: "Review",    emoji: "🔍", desc: "근거 표시 & 오답 분석",       doneKey: "review_done" },
  { key: "drill",    label: "Drills",    emoji: "🎯", desc: "Sniper / Speed / Clone",    doneKey: "drill_done" },
] as const;

export default async function ChapterLandingPage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const { chapterId } = await params;
  const supabase = await getServerSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  // 챕터 정보
  const { data: chapter } = await supabase
    .from("toefl_chapters")
    .select("id, skill, order_num, title, focus_type, description")
    .eq("id", chapterId)
    .maybeSingle();

  if (!chapter) notFound();

  // 학생 레벨
  const { data: studentLevel } = await supabase
    .from("toefl_student_level")
    .select("current_level")
    .eq("student_id", user.id)
    .eq("skill", chapter.skill)
    .maybeSingle();

  const level = studentLevel?.current_level ?? "basic";

  // 진행 상태
  const { data: progress } = await supabase
    .from("toefl_student_progress")
    .select("lecture_done, practice_done, test_done, review_done, drill_done")
    .eq("student_id", user.id)
    .eq("chapter_id", chapterId)
    .eq("level", level)
    .maybeSingle();

  // 콘텐츠 유무
  const { data: contents } = await supabase
    .from("toefl_chapter_content")
    .select("content_type")
    .eq("chapter_id", chapterId)
    .eq("level", level);

  const hasContent = new Set((contents ?? []).map((c) => c.content_type));

  // Practice 지문 수
  const { count: practiceCount } = await supabase
    .from("toefl_practice_passages")
    .select("id", { count: "exact", head: true })
    .eq("skill", chapter.skill as any)
    .eq("level", level as any)
    .eq("focus_type", chapter.focus_type ?? "")
    .eq("is_published", true);

  const SKILL_COLOR: Record<string, string> = {
    reading: "from-sky-50 to-white border-sky-200",
    listening: "from-violet-50 to-white border-violet-200",
    speaking: "from-amber-50 to-white border-amber-200",
    writing: "from-emerald-50 to-white border-emerald-200",
  };

  const ACTIVE_COLOR: Record<string, string> = {
    reading: "bg-sky-500", listening: "bg-violet-500",
    speaking: "bg-amber-500", writing: "bg-emerald-500",
  };

  const activeColor = ACTIVE_COLOR[chapter.skill] ?? "bg-neutral-900";

  // 첫 번째 미완료 단계 찾기
  const firstPending = STEP_CONFIG.find((s) => !progress?.[s.doneKey]);

  return (
    <main className="mx-auto max-w-2xl space-y-6 pb-12 px-4">
      {/* 헤더 */}
      <header className={`rounded-3xl border bg-gradient-to-br p-6 ${SKILL_COLOR[chapter.skill] ?? ""}`}>
        <p className="text-xs text-neutral-400 mb-1 uppercase tracking-wide">
          {chapter.skill} · Chapter {chapter.order_num} · {LEVEL_LABEL[level]}
        </p>
        <h1 className="text-2xl font-bold">{chapter.title}</h1>
        {chapter.description && (
          <p className="text-sm text-neutral-500 mt-1">{chapter.description}</p>
        )}
      </header>

      {/* 5단계 */}
      <section className="space-y-2">
        {STEP_CONFIG.map((step, i) => {
          const done = !!progress?.[step.doneKey];
          const isNext = step === firstPending;
          const locked = !done && !isNext && !!firstPending && STEP_CONFIG.indexOf(firstPending) < i;

          let href: string | null = null;
          if (step.key === "practice" && !locked) {
            href = `/student/toefl/chapter/${chapterId}/practice`;
          } else if (step.key === "lecture" && !locked) {
            href = `/student/lectures`; // 기존 강의 페이지 (추후 챕터 연결)
          }

          const card = (
            <div className={[
              "flex items-center gap-4 rounded-2xl border p-4 transition",
              done       ? "border-neutral-200 bg-neutral-50 opacity-70" :
              isNext     ? `border-2 ${activeColor.replace("bg-", "border-")} bg-white shadow-sm` :
              locked     ? "border-neutral-100 bg-neutral-50 opacity-40" :
                           "border-neutral-200 bg-white",
            ].join(" ")}>
              <div className={[
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg",
                done   ? "bg-emerald-100" :
                isNext ? `${activeColor} text-white` :
                         "bg-neutral-100",
              ].join(" ")}>
                {done ? "✓" : step.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{step.label}</p>
                <p className="text-xs text-neutral-400 mt-0.5">{step.desc}</p>
                {step.key === "practice" && practiceCount != null && practiceCount > 0 && (
                  <p className="text-xs text-neutral-400 mt-0.5">지문 {practiceCount}개</p>
                )}
              </div>
              {done && <span className="text-xs text-emerald-600 font-medium shrink-0">완료</span>}
              {isNext && href && (
                <span className={`shrink-0 rounded-xl px-4 py-1.5 text-xs font-semibold text-white ${activeColor}`}>
                  시작
                </span>
              )}
              {locked && <span className="text-xs text-neutral-300 shrink-0">🔒</span>}
            </div>
          );

          return href && !done && !locked ? (
            <Link key={step.key} href={href}>{card}</Link>
          ) : (
            <div key={step.key}>{card}</div>
          );
        })}
      </section>

      <Link href="/student" className="block text-center text-xs text-neutral-400 hover:text-neutral-600">
        ← 대시보드로
      </Link>
    </main>
  );
}
