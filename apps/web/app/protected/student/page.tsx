import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { DashboardLayout } from "@/app/protected/student/_components/DashboardLayout";

export const dynamic = "force-dynamic";

// ── 커리큘럼 라벨 ──────────────────────────────────────────────
type CurriculumKey = "toefl" | "gap" | "lexiox_jr" | "lexiox_ms" | "lexiox_hs" | "unknown";

type CurriculumMeta = {
  key: CurriculumKey;
  label: string;
  sub: string;
  badge: string;
  accentBg: string;
  accentText: string;
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
  if (p === "gap") return CURRICULUM.gap;
  if (p === "lexiox") {
    const gb = gradeBand ?? "";
    if (gb === "K10_12" || gb === "POST_K12") return CURRICULUM.lexiox_hs;
    if (gb === "K7_9") return CURRICULUM.lexiox_ms;
    return CURRICULUM.lexiox_jr;
  }
  return CURRICULUM.unknown;
}

function levelBadge(level: string | null | undefined) {
  switch (level) {
    case "beginner": return { label: "초급", cls: "bg-sky-50 text-sky-600 ring-1 ring-sky-200" };
    case "intermediate": return { label: "중급", cls: "bg-amber-50 text-amber-600 ring-1 ring-amber-200" };
    case "advanced": return { label: "고급", cls: "bg-rose-50 text-rose-600 ring-1 ring-rose-200" };
    default: return null;
  }
}

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

export default async function StudentPage() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── 프로필 조회 ────────────────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, program, full_name, name, grade")
    .eq("id", user.id)
    .maybeSingle();

  const academyStudentId = await tryResolveAcademyStudentId(supabase, user.id);

  let acdStudent: any = null;
  if (academyStudentId) {
    const { data } = await supabase
      .from("academy_students")
      .select("display_name, grade_band, level, class_days")
      .eq("id", academyStudentId)
      .maybeSingle();
    acdStudent = data ?? null;
  }

  const program = (profile as any)?.program as string | null ?? null;
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

  // ── TOEFL 데이터 ───────────────────────────────────────────
  let pendingLectures = 0;
  let pendingTests = 0;
  let examList: any[] = [];
  let firstChapterBySkill: Record<string, string> = {};

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

    const completedLectureIds = new Set((lectureCompletions ?? []).map((c: any) => c.lecture_id));
    pendingLectures = (lectureAssignments ?? []).filter((a: any) => !completedLectureIds.has(a.lecture_id)).length;

    examList = (examAssignments ?? []).map((a: any) => ({
      id: a.id,
      title: (a.generated_exams as any)?.title ?? '모의고사',
      assignedAt: a.assigned_at ?? null,
      submittedAt: a.generated_exam_responses?.[0]?.submitted_at ?? null,
    }));
    pendingTests = examList.filter((e) => !e.submittedAt).length;

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

  // ── 어휘 데이터 ────────────────────────────────────────────
  let vocaTodayCount = 0;
  let vocaPlanCount = 0;

  if (academyStudentId) {
    const todayISO = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();

    const { data: vocaPlans } = await supabase
      .from("student_vocab_plans")
      .select("id, track_id, is_paused")
      .eq("student_id", academyStudentId)
      .eq("is_enabled", true);

    vocaPlanCount = (vocaPlans ?? []).length;

    if (vocaPlanCount > 0) {
      const trackIds = (vocaPlans ?? []).map((p: any) => p.track_id);
      const { data: todayAsg } = await supabase
        .from("student_vocab_assignments")
        .select("id, track_id, day_index, completed_at, stage")
        .eq("student_id", academyStudentId)
        .in("track_id", trackIds)
        .lte("available_at", todayISO)
        .is("completed_at", null);
      vocaTodayCount = (todayAsg ?? []).length;
    }
  }

  // ── 스킬 통계 ───────────────────────────────────────────────
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

  const readingDone = (readingResults ?? []).length;
  const listeningDone = (listeningResults ?? []).length;
  const speakingDone = (speakingResults ?? []).length;
  const writingDone = (writingResults ?? []).length;

  // ── 게임화 & 시험 일정 ──────────────────────────────────────
  const { data: gamification } = await supabase
    .from('student_gamification')
    .select('total_points, level, current_streak, longest_streak')
    .eq('student_id', user.id)
    .maybeSingle();

  let nextExamDate: string | null = null;
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

  const todayDow = new Date().getDay();
  const isClassDay = (acdStudent as any)?.class_days?.some((d: string) => {
    const MAP: Record<string, number> = {
      sun:0,mon:1,tue:2,wed:3,thu:4,fri:5,sat:6,
      일:0,월:1,화:2,수:3,목:4,금:5,토:6,
      '0':0,'1':1,'2':2,'3':3,'4':4,'5':5,'6':6,
    };
    return MAP[d.toLowerCase()] === todayDow;
  }) ?? false;

  const moduleProgress = [
    { name: 'Speaking', progress: speakingDone > 0 ? 60 : 0, color: 'rose' },
    { name: 'Listening', progress: listeningDone > 0 ? 45 : 0, color: 'sky' },
    { name: 'Writing', progress: writingDone > 0 ? 30 : 0, color: 'amber' },
    { name: 'Grammar', progress: 0, color: 'emerald' },
  ];

  return (
    <DashboardLayout
      userId={user.id}
      studentName={studentName}
      curriculum={curriculum}
      lvBadge={lvBadge}
      program={program}
      academyStudentId={academyStudentId}
      gamification={gamification}
      vocaTodayCount={vocaTodayCount}
      vocaPlanCount={vocaPlanCount}
      isToefl={isToefl}
      readingDone={readingDone}
      listeningDone={listeningDone}
      speakingDone={speakingDone}
      writingDone={writingDone}
      pendingLectures={pendingLectures}
      pendingTests={pendingTests}
      examList={examList}
      firstChapterBySkill={firstChapterBySkill}
      nextExamDate={nextExamDate}
      isClassDay={isClassDay}
      dayOfWeek={todayDow}
      assignedPassageIds={[]}
      naesinDonePassages={0}
      homeworkItems={[]}
      moduleProgress={moduleProgress}
    />
  );
}
