import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import DailyTaskCard from "@/components/gamification/DailyTaskCard";
import DdayCard from "@/components/student/DdayCard";
import TestProgressBar from "@/components/student/TestProgressBar";
import WeakPointsCard from "@/components/student/WeakPointsCard";
import AnnouncementBanner from "@/components/student/AnnouncementBanner";

export const dynamic = "force-dynamic";

// ── 커리큘럼 라벨 ──────────────────────────────────────────────
type CurriculumKey = "toefl" | "gap" | "lexiox_jr" | "lexiox_ms" | "lexiox_hs" | "unknown";

type CurriculumMeta = {
  key: CurriculumKey;
  label: string;
  sub: string;
  badge: string;       // Tailwind classes for the badge
  accentBg: string;    // card bg gradient
  accentText: string;  // accent text color
};

const CURRICULUM: Record<CurriculumKey, CurriculumMeta> = {
  toefl: {
    key: "toefl",
    label: "TOEFL",
    sub: "Lingo-X TOEFL Program",
    badge: "bg-sky-100 text-sky-700 ring-1 ring-sky-200",
    accentBg: "from-sky-50 to-white",
    accentText: "text-sky-700",
  },
  gap: {
    key: "gap",
    label: "GAP",
    sub: "Lingo-X GAP Program",
    badge: "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200",
    accentBg: "from-indigo-50 to-white",
    accentText: "text-indigo-700",
  },
  lexiox_jr: {
    key: "lexiox_jr",
    label: "LEXiOX 주니어",
    sub: "Lingo-X Junior Program",
    badge: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
    accentBg: "from-amber-50 to-white",
    accentText: "text-amber-700",
  },
  lexiox_ms: {
    key: "lexiox_ms",
    label: "LEXiOX 중학",
    sub: "Lingo-X 중학 Program",
    badge: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
    accentBg: "from-emerald-50 to-white",
    accentText: "text-emerald-700",
  },
  lexiox_hs: {
    key: "lexiox_hs",
    label: "LEXiOX 고등",
    sub: "Lingo-X 고등 Program",
    badge: "bg-violet-100 text-violet-700 ring-1 ring-violet-200",
    accentBg: "from-violet-50 to-white",
    accentText: "text-violet-700",
  },
  unknown: {
    key: "unknown",
    label: "Lingo-X",
    sub: "Lingo-X Learning Platform",
    badge: "bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200",
    accentBg: "from-neutral-50 to-white",
    accentText: "text-neutral-600",
  },
};

function deriveCurriculum(
  program: string | null | undefined,
  gradeBand: string | null | undefined,
): CurriculumMeta {
  const p = program?.toLowerCase() ?? "";
  if (p === "toefl") return CURRICULUM.toefl;
  if (p === "gap")   return CURRICULUM.gap;
  if (p === "lexiox") {
    const gb = gradeBand ?? "";
    if (gb === "K10_12" || gb === "POST_K12") return CURRICULUM.lexiox_hs;
    if (gb === "K7_9")                        return CURRICULUM.lexiox_ms;
    return CURRICULUM.lexiox_jr;
  }
  return CURRICULUM.unknown;
}

// ── 수준 배지 ──────────────────────────────────────────────────
function levelBadge(level: string | null | undefined) {
  switch (level) {
    case "beginner":     return { label: "초급", cls: "bg-sky-50 text-sky-600 ring-1 ring-sky-200" };
    case "intermediate": return { label: "중급", cls: "bg-amber-50 text-amber-600 ring-1 ring-amber-200" };
    case "advanced":     return { label: "고급", cls: "bg-rose-50 text-rose-600 ring-1 ring-rose-200" };
    default:             return null;
  }
}

// ── helpers ────────────────────────────────────────────────────
async function tryResolveAcademyStudentId(
  supabase: Awaited<ReturnType<typeof getServerSupabase>>,
  authUserId: string,
): Promise<string | null> {
  for (const col of ["id", "auth_user_id", "user_id", "profile_id"] as const) {
    try {
      const { data } = await supabase
        .from("academy_students")
        .select("id")
        .eq(col as string, authUserId)
        .maybeSingle();
      if (data?.id) return String(data.id);
    } catch { /* ignore */ }
  }
  return null;
}

// ── Page ───────────────────────────────────────────────────────
export default async function StudentPage() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── 1. 프로필 ────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, program, full_name, name, grade")
    .eq("id", user.id)
    .maybeSingle();

  // ── 2. 학원 학생 레코드 ──────────────────────────────────────
  const academyStudentId = await tryResolveAcademyStudentId(supabase, user.id);

  let acdStudent: {
    display_name: string | null;
    grade_band: string | null;
    level: string | null;
  } | null = null;

  if (academyStudentId) {
    const { data } = await supabase
      .from("academy_students")
      .select("display_name, grade_band, level")
      .eq("id", academyStudentId)
      .maybeSingle();
    acdStudent = data ?? null;
  }

  const program   = (profile as any)?.program as string | null ?? null;
  const gradeBand = acdStudent?.grade_band ?? null;
  const curriculum = deriveCurriculum(program, gradeBand);

  const studentName =
    acdStudent?.display_name ??
    (profile as any)?.full_name ??
    (profile as any)?.name ??
    user.email?.split("@")[0] ??
    "학생";

  const lvBadge = levelBadge(acdStudent?.level ?? null);

  const isToefl = program === 'toefl' || program === 'gap';

  // ── 3. TOEFL 전용 데이터 ─────────────────────────────────────
  let pendingLectures = 0;
  let pendingTests = 0;
  let examList: { id: string; title: string; assignedAt: string | null; submittedAt: string | null }[] = [];
  let firstChapterBySkill: Record<string, string> = {}; // skill → chapterId

  if (isToefl) {
    const [{ data: lectureAssignments }, { data: lectureCompletions }, { data: examAssignments }] =
      await Promise.all([
        supabase.from("lecture_assignments").select("lecture_id").eq("student_id", user.id),
        supabase.from("lecture_completions").select("lecture_id").eq("student_id", user.id),
        supabase
          .from("generated_exam_assignments")
          .select("id, assigned_at, generated_exams(title), generated_exam_responses(submitted_at)")
          .eq("student_id", user.id)
          .order("assigned_at", { ascending: false }),
      ]);

    const completedLectureIds = new Set((lectureCompletions ?? []).map((c: any) => c.lecture_id as string));
    pendingLectures = (lectureAssignments ?? []).filter((a: any) => !completedLectureIds.has(a.lecture_id)).length;

    examList = (examAssignments ?? []).map((a: any) => ({
      id: a.id as string,
      title: (a.generated_exams as any)?.title ?? '모의고사',
      assignedAt: a.assigned_at ?? null,
      submittedAt: a.generated_exam_responses?.[0]?.submitted_at ?? null,
    }));
    pendingTests = examList.filter((e) => !e.submittedAt).length;

    // 스킬별 첫 챕터 ID (대시보드 링크용)
    const { data: firstChapters } = await supabase
      .from("toefl_chapters")
      .select("id, skill")
      .order("order_num")
      .limit(4);

    const seen = new Set<string>();
    for (const ch of (firstChapters ?? []) as any[]) {
      if (!seen.has(ch.skill)) {
        firstChapterBySkill[ch.skill] = ch.id;
        seen.add(ch.skill);
      }
    }
  }

  // ── 3b. 내신 통계 (non-TOEFL) ────────────────────────────────
  let assignedPassageIds: string[] = [];
  let naesinDonePassages = 0;

  if (!isToefl) {
    const { data: naesinAssignments } = await supabase
      .from("hi_naesin_assignments")
      .select("passage_id")
      .eq("student_id", user.id);

    assignedPassageIds = [
      ...new Set((naesinAssignments ?? []).map((a: any) => a.passage_id as string)),
    ];

    if (assignedPassageIds.length > 0) {
      const { data: doneSessions } = await supabase
        .from("hi_naesin_sessions")
        .select("passage_id")
        .eq("student_id", user.id)
        .eq("status", "submitted")
        .in("passage_id", assignedPassageIds);

      naesinDonePassages = new Set(
        (doneSessions ?? []).map((s: any) => s.passage_id as string),
      ).size;
    }
  }

  // ── 4. 어휘 통계 ──────────────────────────────────────────────
  // student_vocab_plans (active)
  let vocaPlanCount = 0;
  let vocaTodayCount = 0;

  if (academyStudentId) {
    const todayISO = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    })();

    const { data: vocaPlans } = await supabase
      .from("student_vocab_plans")
      .select("id, track_id, is_paused")
      .eq("student_id", academyStudentId)
      .eq("is_enabled", true);

    vocaPlanCount = (vocaPlans ?? []).length;

    if (vocaPlanCount > 0) {
      const trackIds = (vocaPlans ?? []).map((p: any) => p.track_id as string);
      const { data: todayAsg } = await supabase
        .from("student_vocab_assignments")
        .select("id")
        .eq("student_id", academyStudentId)
        .in("track_id", trackIds)
        .lte("available_at", todayISO)
        .is("completed_at", null);
      vocaTodayCount = (todayAsg ?? []).length;
    }
  }

  // ── 5. 스킬 통계 ──────────────────────────────────────────────
  const [
    { data: readingResults },
    { data: listeningResults },
    { data: speakingResults },
    { data: writingResults },
  ] = await Promise.all([
    supabase.from("reading_results_2026").select("id").eq("user_id", user.id),
    supabase.from("listening_2026_results" as any).select("id").eq("user_id", user.id),
    supabase.from("speaking_results_2026").select("id").eq("user_id", user.id),
    supabase.from("writing_2026_sessions").select("id").eq("user_id", user.id),
  ]);

  const readingDone   = (readingResults   ?? []).length;
  const listeningDone = (listeningResults ?? []).length;
  const speakingDone  = (speakingResults  ?? []).length;
  const writingDone   = (writingResults   ?? []).length;

  // ── 6. 게임화 상태 ────────────────────────────────────────────
  const { data: gamification } = await supabase
    .from('student_gamification')
    .select('total_points, level, current_streak, longest_streak')
    .eq('student_id', user.id)
    .maybeSingle();

  // ── 7. 시험 일정 & 약점 & 공지 (Phase 1 카드용) ─────────────────
  let nextExamDate: string | null = null;
  let weakPoints: Array<{ category: string; issue: string; type: "skill" | "content" }> = [];
  let announcements: Array<{ id: string; type: "academy" | "contest" | "exam" | "system"; title: string; date: string; icon: string }> = [];

  // Exam schedule 조회
  if (academyStudentId) {
    const { data: examData } = await supabase
      .from('test_assignments')
      .select('exam_date')
      .eq('student_id', academyStudentId)
      .gte('exam_date', new Date().toISOString().split('T')[0])
      .order('exam_date', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (examData?.exam_date) {
      nextExamDate = examData.exam_date;
    }
  }

  // Weak points 조회 (학생 분석 데이터)
  if (academyStudentId) {
    const { data: weakData } = await supabase
      .from('student_analytics')
      .select('weak_categories')
      .eq('student_id', academyStudentId)
      .maybeSingle();
    if (weakData?.weak_categories && Array.isArray(weakData.weak_categories)) {
      weakPoints = weakData.weak_categories.slice(0, 3);
    }
  }

  // Announcements 조회
  const { data: announcementsData } = await supabase
    .from('announcements')
    .select('id, type, title, created_at')
    .order('created_at', { ascending: false })
    .limit(3);

  if (announcementsData) {
    announcements = announcementsData.map((a: any) => ({
      id: a.id,
      type: a.type || 'system',
      title: a.title,
      date: a.created_at,
      icon: '',
    }));
  }

  // ── 8. 모듈 진도 (시험 준비 %) ─────────────────────────────────
  // Reading, Listening, Speaking, Writing 완료율 계산
  const moduleProgress = [
    { name: 'Speaking', progress: speakingDone > 0 ? 60 : 0, color: 'rose' },
    { name: 'Listening', progress: listeningDone > 0 ? 45 : 0, color: 'sky' },
    { name: 'Writing', progress: writingDone > 0 ? 30 : 0, color: 'amber' },
    { name: 'Grammar', progress: 0, color: 'emerald' },
  ];

  // ── 9. 오늘의 데일리 태스크 ───────────────────────────────────
  const todayStr = new Date().toISOString().split('T')[0];
  const { data: dailyTask } = await supabase
    .from('daily_tasks')
    .select('id, task_type, prompt, completed_at, points_earned')
    .eq('student_id', user.id)
    .eq('task_date', todayStr)
    .maybeSingle();

  // 오늘 요일 라벨
  const todayDow   = new Date().getDay();
  const DOW_KO     = ['일', '월', '화', '수', '목', '금', '토'];
  const isClassDay = (acdStudent as any)?.class_days?.some((d: string) => {
    const MAP: Record<string, number> = {
      sun:0,mon:1,tue:2,wed:3,thu:4,fri:5,sat:6,
      일:0,월:1,화:2,수:3,목:4,금:5,토:6,
      '0':0,'1':1,'2':2,'3':3,'4':4,'5':5,'6':6,
    };
    return MAP[d.toLowerCase()] === todayDow;
  }) ?? false;

  if (isToefl) {
    return (
      <ToeflDashboard
        studentName={studentName}
        curriculum={curriculum}
        lvBadge={lvBadge}
        gamification={gamification ?? null}
        vocaTodayCount={vocaTodayCount}
        vocaPlanCount={vocaPlanCount}
        pendingLectures={pendingLectures}
        pendingTests={pendingTests}
        examList={examList}
        firstChapterBySkill={firstChapterBySkill}
        readingDone={readingDone}
        listeningDone={listeningDone}
        speakingDone={speakingDone}
        writingDone={writingDone}
      />
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 pb-12">

      {/* ── 오늘 수업 CTA ─────────────────────────────────────── */}
      <Link
        href="/student/session"
        className={[
          "block rounded-3xl border p-5 transition hover:-translate-y-0.5 hover:shadow-md",
          isClassDay
            ? "border-sky-200 bg-gradient-to-br from-sky-50 to-white"
            : "border-neutral-200 bg-gradient-to-br from-neutral-50 to-white",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-neutral-400 mb-0.5">
              {DOW_KO[todayDow]}요일{isClassDay ? " · 수업 있는 날 🎯" : ""}
            </p>
            <p className="text-lg font-bold text-neutral-900">
              {isClassDay ? "오늘 수업 시작하기" : "자율 학습 모드"}
            </p>
            <p className="text-xs text-neutral-500 mt-0.5">
              숙제 채점 → 단어 → 리딩 → 그래머 → …
            </p>
          </div>
          <span className={[
            "shrink-0 rounded-2xl px-5 py-2.5 text-sm font-bold text-white",
            isClassDay ? "bg-sky-600" : "bg-neutral-700",
          ].join(" ")}>
            입장 →
          </span>
        </div>
      </Link>

      {/* ── 포인트 / 레벨 ────────────────────────────────────── */}
      {gamification && (
        <div className="grid grid-cols-3 gap-3">
          <StatPill label="포인트" value={`${gamification.total_points.toLocaleString()} P`} color="amber" />
          <StatPill label="레벨" value={`Lv ${gamification.level}`} color="indigo" />
          <StatPill label="연속 학습" value={`${gamification.current_streak}일`} color="emerald" />
        </div>
      )}

      {/* ── 데일리 태스크 ────────────────────────────────────── */}
      <DailyTaskCard task={dailyTask ?? null} />

      {/* ── Phase 1 카드: D-day ────────────────────────────────── */}
      {nextExamDate && <DdayCard nextExamDate={nextExamDate} examTitle="다음 시험" />}

      {/* ── Phase 1 카드: 시험 준비 진도 ──────────────────────── */}
      <TestProgressBar sections={moduleProgress} />

      {/* ── Phase 1 카드: 약점 ───────────────────────────────── */}
      <WeakPointsCard weakPoints={weakPoints} />

      {/* ── Phase 1 카드: 공지 배너 ───────────────────────────── */}
      {announcements.length > 0 && <AnnouncementBanner announcements={announcements} />}

      {/* ── 커리큘럼 헤더 ─────────────────────────────────────── */}
      <header
        className={[
          "rounded-3xl border border-neutral-200 bg-gradient-to-br p-6 shadow-sm",
          curriculum.accentBg,
        ].join(" ")}
      >
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${curriculum.badge}`}>
            {curriculum.label}
          </span>
          {lvBadge && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${lvBadge.cls}`}>
              {lvBadge.label}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-neutral-900 leading-tight">
          {studentName}
        </h1>
        <p className={`text-sm mt-0.5 ${curriculum.accentText}`}>
          {curriculum.sub}
        </p>
      </header>

      {/* ── 내신 ─────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500">
            내신
          </h2>
          {assignedPassageIds.length > 0 && (
            <Link
              href="/hi-naesin"
              className="text-xs text-emerald-600 hover:underline"
            >
              내신 드릴 →
            </Link>
          )}
        </div>

        {assignedPassageIds.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-6 flex items-center justify-between">
            <p className="text-sm text-neutral-400">배정된 내신 지문이 없습니다.</p>
            <Link
              href="/hi-naesin"
              className="text-xs text-neutral-500 hover:underline"
            >
              드릴 목록 →
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-emerald-200 bg-white p-5 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <NaesinStat
                label="배정 지문"
                value={`${assignedPassageIds.length}개`}
              />
              <NaesinStat
                label="학습 완료"
                value={`${naesinDonePassages}개`}
                sub={
                  assignedPassageIds.length > 0
                    ? `${Math.round((naesinDonePassages / assignedPassageIds.length) * 100)}%`
                    : undefined
                }
              />
              <NaesinStat
                label="남은 지문"
                value={`${assignedPassageIds.length - naesinDonePassages}개`}
                warn={assignedPassageIds.length - naesinDonePassages > 0}
              />
            </div>

            {/* 진행 바 */}
            {assignedPassageIds.length > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>전체 진도</span>
                  <span>
                    {Math.round((naesinDonePassages / assignedPassageIds.length) * 100)}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-neutral-100">
                  <div
                    className="h-2 rounded-full bg-emerald-400 transition-all"
                    style={{
                      width: `${Math.round(
                        (naesinDonePassages / assignedPassageIds.length) * 100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                href="/hi-naesin"
                className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                내신 드릴 시작
              </Link>
              <Link
                href="/hi-naesin/stats"
                className="inline-flex items-center rounded-xl border border-neutral-200 px-4 py-2 text-xs text-neutral-600 hover:bg-neutral-50"
              >
                학습 현황
              </Link>
              <Link
                href="/hi-naesin/vocab"
                className="inline-flex items-center rounded-xl border border-neutral-200 px-4 py-2 text-xs text-neutral-600 hover:bg-neutral-50"
              >
                내신 단어
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* ── 정규 ─────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500">
            정규
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {/* Reading */}
          <SkillCard
            href="/updated-reading/study"
            label="Reading"
            emoji="📖"
            detail={readingDone > 0 ? `완료 ${readingDone}회` : "학습 시작하기"}
            color="sky"
          />

          {/* Grammar */}
          <SkillCard
            href="/grammar-2026"
            label="LEXiOX-Gram"
            emoji="📝"
            detail="학습 시작하기"
            color="indigo"
          />

          {/* Listening */}
          <SkillCard
            href="/updated-listening/study"
            label="Listening"
            emoji="🎧"
            detail="학습 시작하기"
            color="indigo"
          />

          {/* Writing */}
          <SkillCard
            href="/writing-2026/study"
            label="Writing"
            emoji="✍️"
            detail="학습 시작하기"
            color="amber"
          />

          {/* Speaking */}
          <SkillCard
            href="/speaking-2026/study"
            label="Speaking"
            emoji="🎤"
            detail="학습 시작하기"
            color="rose"
          />

          {/* Voca */}
          <SkillCard
            href="/vocab"
            label="Voca"
            emoji="📚"
            detail={
              vocaPlanCount === 0
                ? "배정 없음"
                : vocaTodayCount > 0
                ? `오늘 ${vocaTodayCount}개`
                : `플랜 ${vocaPlanCount}개`
            }
            color={vocaTodayCount > 0 ? "emerald" : "neutral"}
            highlight={vocaTodayCount > 0}
          />
        </div>
      </section>
    </main>
  );
}

// ── TOEFL Dashboard ─────────────────────────────────────────────

// ── Section step types ───────────────────────────────────────────
type StepStatus = 'done' | 'active' | 'locked';

type SectionStep = {
  key: 'lecture' | 'practices' | 'tests' | 'review' | 'drills';
  label: string;
  status: StepStatus;
  detail?: string;
};

type SectionConfig = {
  key: string;
  label: string;
  color: string;        // Tailwind border/text accent
  activeBg: string;
  href: string;
  steps: SectionStep[];
  done: number;
};

function deriveSteps(lecturesDone: boolean, practiceDone: number, testsDone: boolean): SectionStep[] {
  const l: StepStatus = lecturesDone ? 'done' : 'active';
  const p: StepStatus = !lecturesDone ? 'locked' : practiceDone > 0 ? 'done' : 'active';
  const t: StepStatus = practiceDone === 0 ? 'locked' : testsDone ? 'done' : 'active';
  const r: StepStatus = !testsDone ? 'locked' : 'active';
  const d: StepStatus = 'locked';
  return [
    { key: 'lecture',   label: '강좌',      status: l, detail: lecturesDone ? '완료' : undefined },
    { key: 'practices', label: 'Practices', status: p, detail: practiceDone > 0 ? `${practiceDone}회` : undefined },
    { key: 'tests',     label: 'Tests',     status: t, detail: testsDone ? '완료' : undefined },
    { key: 'review',    label: 'Review',    status: r },
    { key: 'drills',    label: 'Drills',    status: d },
  ];
}

function ToeflDashboard({
  studentName,
  curriculum,
  lvBadge,
  gamification,
  vocaTodayCount,
  vocaPlanCount,
  pendingLectures,
  pendingTests,
  examList,
  firstChapterBySkill,
  readingDone,
  listeningDone,
  speakingDone,
  writingDone,
}: {
  studentName: string;
  curriculum: CurriculumMeta;
  lvBadge: { label: string; cls: string } | null;
  gamification: { total_points: number; level: number; current_streak: number } | null;
  vocaTodayCount: number;
  vocaPlanCount: number;
  pendingLectures: number;
  pendingTests: number;
  examList: { id: string; title: string; assignedAt: string | null; submittedAt: string | null }[];
  firstChapterBySkill: Record<string, string>;
  readingDone: number;
  listeningDone: number;
  speakingDone: number;
  writingDone: number;
}) {
  const lecturesDone = pendingLectures === 0;
  const testsDone    = pendingTests === 0;

  const sections: SectionConfig[] = [
    {
      key: 'reading', label: 'Reading',
      color: 'border-sky-200 text-sky-700', activeBg: 'bg-sky-500',
      href: firstChapterBySkill['reading'] ? `/student/toefl/chapter/${firstChapterBySkill['reading']}` : '/updated-reading/study',
      done: readingDone,
      steps: deriveSteps(lecturesDone, readingDone, testsDone),
    },
    {
      key: 'listening', label: 'Listening',
      color: 'border-violet-200 text-violet-700', activeBg: 'bg-violet-500',
      href: firstChapterBySkill['listening'] ? `/student/toefl/chapter/${firstChapterBySkill['listening']}` : '/updated-listening/study',
      done: listeningDone,
      steps: deriveSteps(lecturesDone, listeningDone, testsDone),
    },
    {
      key: 'speaking', label: 'Speaking',
      color: 'border-amber-200 text-amber-700', activeBg: 'bg-amber-500',
      href: firstChapterBySkill['speaking'] ? `/student/toefl/chapter/${firstChapterBySkill['speaking']}` : '/speaking-2026/study',
      done: speakingDone,
      steps: deriveSteps(lecturesDone, speakingDone, testsDone),
    },
    {
      key: 'writing', label: 'Writing',
      color: 'border-emerald-200 text-emerald-700', activeBg: 'bg-emerald-500',
      href: firstChapterBySkill['writing'] ? `/student/toefl/chapter/${firstChapterBySkill['writing']}` : '/updated-writing/test',
      done: writingDone,
      steps: deriveSteps(lecturesDone, writingDone, testsDone),
    },
  ];

  const vocaDone = vocaTodayCount === 0 && vocaPlanCount > 0;

  return (
    <main className="mx-auto max-w-3xl space-y-6 pb-12">

      {/* ── 헤더 ──────────────────────────────────────────────── */}
      <header className={`rounded-3xl border border-neutral-200 bg-gradient-to-br p-6 shadow-sm ${curriculum.accentBg}`}>
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${curriculum.badge}`}>
            {curriculum.label}
          </span>
          {lvBadge && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${lvBadge.cls}`}>
              {lvBadge.label}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-neutral-900 leading-tight">{studentName}</h1>
        <p className={`text-sm mt-0.5 ${curriculum.accentText}`}>{curriculum.sub}</p>
      </header>

      {/* ── 게임화 ────────────────────────────────────────────── */}
      {gamification && (
        <div className="grid grid-cols-3 gap-3">
          <StatPill label="포인트" value={`${gamification.total_points.toLocaleString()} P`} color="amber" />
          <StatPill label="레벨"   value={`Lv ${gamification.level}`}                        color="indigo" />
          <StatPill label="연속 학습" value={`${gamification.current_streak}일`}             color="emerald" />
        </div>
      )}

      {/* ── 별도 트랙: Vocab · Grammar ───────────────────────── */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-3">별도 트랙</p>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/vocab/session"
            className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 transition hover:bg-neutral-50"
          >
            <span className="text-xl">📚</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Vocab</p>
              <p className={`text-xs mt-0.5 ${vocaTodayCount > 0 ? 'text-amber-600 font-medium' : 'text-neutral-400'}`}>
                {vocaTodayCount > 0 ? `오늘 ${vocaTodayCount}개 남음` : vocaDone ? '오늘 완료' : '단어장 없음'}
              </p>
            </div>
            {vocaTodayCount > 0 && (
              <span className="shrink-0 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white">학습</span>
            )}
          </Link>
          <Link
            href="/grammar-2026"
            className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 transition hover:bg-neutral-50"
          >
            <span className="text-xl">📝</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Grammar</p>
              <p className="text-xs text-neutral-400 mt-0.5">LEXiOX-Gram</p>
            </div>
          </Link>
        </div>
      </section>

      {/* ── 섹션별 학습 플로우 ────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">학습 모드</p>
        {sections.map((sec) => {
          const activeStep = sec.steps.find((s) => s.status === 'active');
          const doneCount  = sec.steps.filter((s) => s.status === 'done').length;
          const pct = Math.round((doneCount / sec.steps.length) * 100);

          return (
            <div key={sec.key} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
              {/* 섹션 헤더 */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                <div className="flex items-center gap-3">
                  <div className={`h-2.5 w-2.5 rounded-full ${sec.activeBg}`} />
                  <span className="font-semibold text-sm">{sec.label}</span>
                  {activeStep && (
                    <span className="text-xs text-neutral-400">{activeStep.label} 진행 중</span>
                  )}
                  {doneCount === sec.steps.length && (
                    <span className="text-xs text-emerald-600 font-medium">완료</span>
                  )}
                </div>
                <Link
                  href={activeStep ? sec.href : sec.href}
                  className={`rounded-xl px-4 py-1.5 text-xs font-semibold text-white transition ${sec.activeBg} opacity-90 hover:opacity-100`}
                >
                  {doneCount === 0 ? '시작하기' : '이어하기'}
                </Link>
              </div>

              {/* 5단계 스텝 */}
              <div className="flex items-center px-5 py-4 gap-1">
                {sec.steps.map((step, i) => (
                  <div key={step.key} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div className={[
                        'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
                        step.status === 'done'   ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300' :
                        step.status === 'active' ? `${sec.activeBg} text-white` :
                                                   'bg-neutral-100 text-neutral-300',
                      ].join(' ')}>
                        {step.status === 'done' ? '✓' : i + 1}
                      </div>
                      <p className={[
                        'mt-1.5 text-center text-[10px] leading-tight',
                        step.status === 'done'   ? 'text-emerald-600 font-medium' :
                        step.status === 'active' ? 'text-neutral-800 font-semibold' :
                                                   'text-neutral-300',
                      ].join(' ')}>
                        {step.label}
                      </p>
                      {step.detail && (
                        <p className="text-[10px] text-neutral-400 text-center">{step.detail}</p>
                      )}
                    </div>
                    {i < sec.steps.length - 1 && (
                      <div className={[
                        'h-px flex-1 mx-1 mb-5',
                        step.status === 'done' ? 'bg-emerald-200' : 'bg-neutral-100',
                      ].join(' ')} />
                    )}
                  </div>
                ))}
              </div>

              {/* 진행 바 */}
              <div className="h-1 w-full bg-neutral-100">
                <div className={`h-1 ${sec.activeBg} opacity-60 transition-all`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </section>

      {/* ── 모의고사 (테스트 모드) ───────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            테스트 모드 · 모의고사
          </p>
          {pendingTests > 0 && (
            <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-600">
              미완료 {pendingTests}개
            </span>
          )}
        </div>

        {examList.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 bg-white px-5 py-6 text-center text-sm text-neutral-400">
            배정된 모의고사가 없습니다
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white divide-y divide-neutral-100">
            {examList.map((exam) => {
              const done = !!exam.submittedAt;
              const dateLabel = exam.assignedAt
                ? new Date(exam.assignedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
                : '';
              return (
                <Link
                  key={exam.id}
                  href={`/student/exams/${exam.id}`}
                  className={[
                    'flex items-center gap-4 px-5 py-4 transition',
                    done ? 'opacity-60 hover:opacity-80' : 'hover:bg-neutral-50',
                  ].join(' ')}
                >
                  <div className={[
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm',
                    done ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600',
                  ].join(' ')}>
                    {done ? '✓' : '📋'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-800 truncate">{exam.title}</p>
                    {dateLabel && (
                      <p className="text-xs text-neutral-400 mt-0.5">배정일 {dateLabel}</p>
                    )}
                  </div>
                  {done ? (
                    <span className="shrink-0 text-xs text-emerald-600 font-medium">완료</span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white">
                      응시하기
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>

    </main>
  );
}

// ── Sub-components ──────────────────────────────────────────────

type PillColor = 'amber' | 'indigo' | 'emerald';
const PILL_COLOR: Record<PillColor, string> = {
  amber:   'bg-amber-50 border-amber-200 text-amber-800',
  indigo:  'bg-indigo-50 border-indigo-200 text-indigo-800',
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
};

function StatPill({ label, value, color }: { label: string; value: string; color: PillColor }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 text-center ${PILL_COLOR[color]}`}>
      <p className="text-xs opacity-70">{label}</p>
      <p className="text-base font-bold mt-0.5">{value}</p>
    </div>
  );
}


function NaesinStat({
  label,
  value,
  sub,
  warn,
}: {
  label: string;
  value: string;
  sub?: string;
  warn?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-neutral-400">{label}</p>
      <p
        className={[
          "mt-0.5 text-xl font-bold",
          warn ? "text-amber-600" : "text-neutral-900",
        ].join(" ")}
      >
        {value}
      </p>
      {sub && <p className="text-[11px] text-neutral-400">{sub}</p>}
    </div>
  );
}

type SkillColor = "sky" | "violet" | "amber" | "rose" | "emerald" | "neutral" | "indigo";

const COLOR_MAP: Record<
  SkillColor,
  { border: string; bg: string; hoverBg: string; label: string; detail: string }
> = {
  sky:     { border: "border-sky-200",     bg: "bg-sky-50",     hoverBg: "hover:bg-sky-50",     label: "text-sky-800",     detail: "text-sky-600"     },
  violet:  { border: "border-violet-200",  bg: "bg-violet-50",  hoverBg: "hover:bg-violet-50",  label: "text-violet-800",  detail: "text-violet-600"  },
  amber:   { border: "border-amber-200",   bg: "bg-amber-50",   hoverBg: "hover:bg-amber-50",   label: "text-amber-800",   detail: "text-amber-600"   },
  rose:    { border: "border-rose-200",    bg: "bg-rose-50",    hoverBg: "hover:bg-rose-50",    label: "text-rose-800",    detail: "text-rose-600"    },
  emerald: { border: "border-emerald-200", bg: "bg-emerald-50", hoverBg: "hover:bg-emerald-50", label: "text-emerald-800", detail: "text-emerald-600" },
  neutral: { border: "border-neutral-200", bg: "bg-neutral-50", hoverBg: "hover:bg-neutral-50", label: "text-neutral-700", detail: "text-neutral-400" },
  indigo:  { border: "border-indigo-200",  bg: "bg-indigo-50",  hoverBg: "hover:bg-indigo-50",  label: "text-indigo-800",  detail: "text-indigo-600"  },
};

function SkillCard({
  href,
  label,
  emoji,
  detail,
  color,
  disabled,
  highlight,
}: {
  href: string;
  label: string;
  emoji: string;
  detail: string;
  color: SkillColor;
  disabled?: boolean;
  highlight?: boolean;
}) {
  const c = COLOR_MAP[color];

  if (disabled) {
    return (
      <div
        className={[
          "rounded-2xl border p-4 opacity-50",
          c.border,
          c.bg,
        ].join(" ")}
      >
        <span className="text-xl">{emoji}</span>
        <p className={`mt-2 text-sm font-semibold ${c.label}`}>{label}</p>
        <p className={`text-xs mt-0.5 ${c.detail}`}>{detail}</p>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={[
        "group block rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md",
        c.border,
        highlight ? c.bg : `bg-white ${c.hoverBg}`,
      ].join(" ")}
    >
      <span className="text-xl">{emoji}</span>
      <p className={`mt-2 text-sm font-semibold ${c.label}`}>{label}</p>
      <p className={`text-xs mt-0.5 ${c.detail}`}>{detail}</p>
    </Link>
  );
}
