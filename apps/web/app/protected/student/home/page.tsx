import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getDrillRoute } from "@/lib/student-activities/routes";
import { markPrescriptionInProgress } from "@/lib/student-activities/prescription-actions";
import { getStudentCurriculum, getPhaseOrder, PHASE_LABELS, PHASE_ICONS } from "@/lib/student-activities/curriculum-router";
import { PhaseCard } from "@/components/student/phases/PhaseCard";
import Link from "next/link";
import { PaxHomeWidget } from "@/components/avatar/PaxHomeWidget";
import VocabTrackSelector from "@/components/student/VocabTrackSelector";
import type { Tribe } from "@/components/avatar/PaxAvatar";
import type { Curriculum, LearningPhase } from "@/lib/types/learning-phase";

export const dynamic = "force-dynamic";

type SupabaseServerClient = Awaited<ReturnType<typeof getServerSupabase>>;

type StudentActivity = {
  id: string;
  student_id: string;
  activity_type: string;
  track: string | null;
  section: string | null;
  status: string;
  title: string | null;
  description: string | null;
  created_at: string | null;
  started_at: string | null;
  completed_at: string | null;
};

type StudentPrescription = {
  id: string;
  student_id: string;
  activity_id: string | null;
  weak_tag: string;
  prescription_type: string;
  status: string;
  title: string | null;
  payload: unknown;
  due_at: string | null;
  created_at: string | null;
};

function formatDateTime(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: value.includes("T") ? "2-digit" : undefined,
    minute: value.includes("T") ? "2-digit" : undefined,
    hour12: false,
  }).format(d);
}

function toneByStatus(status: string) {
  switch (status) {
    case "done":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "in_progress":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "todo":
      return "border-slate-200 bg-slate-50 text-slate-700";
    case "queued":
      return "border-violet-200 bg-violet-50 text-violet-700";
    default:
      return "border-slate-200 bg-white text-slate-600";
  }
}

function labelByStatus(status: string) {
  switch (status) {
    case "done":
      return "완료";
    case "in_progress":
      return "진행 중";
    case "todo":
      return "할 일";
    case "queued":
      return "대기 중";
    default:
      return status;
  }
}

async function tryResolveAcademyStudentId(
  supabase: SupabaseServerClient,
  authUserId: string,
): Promise<string | null> {
  const tries: Array<"id" | "auth_user_id" | "user_id" | "profile_id"> = [
    "id",
    "auth_user_id",
    "user_id",
    "profile_id",
  ];

  for (const col of tries) {
    try {
      const { data, error } = await supabase
        .from("academy_students")
        .select("id")
        .eq(col, authUserId)
        .maybeSingle();

      if (!error && data?.id) {
        return String(data.id);
      }
    } catch {
      // ignore
    }
  }

  return null;
}

async function resolveStudentKeys(
  supabase: SupabaseServerClient,
  authUserId: string,
): Promise<string[]> {
  const academyStudentId = await tryResolveAcademyStudentId(supabase, authUserId);
  return Array.from(
    new Set([academyStudentId, authUserId].filter(Boolean) as string[]),
  );
}

export default async function StudentPage() {
  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const studentKeys = await resolveStudentKeys(supabase, user.id);

  // 프로필 + 게임화 상태
  const [{ data: profile }, { data: gamification }] = await Promise.all([
    supabase.from("profiles").select("full_name, tribe").eq("id", user.id).maybeSingle(),
    supabase.from("student_gamification").select("level, streak_days").eq("student_id", user.id).maybeSingle(),
  ]);

  const tribe = (profile?.tribe ?? null) as Tribe | null;
  const level = gamification?.level ?? 1;
  const streak = gamification?.streak_days ?? 0;
  const displayName = (profile?.full_name as string | null) ?? null;

  const [
    { data: activities, error: activitiesError },
    { data: prescriptions, error: prescriptionsError },
    { data: pendingExams },
    { data: vocabAssignments },
  ] = await Promise.all([
    supabase
      .from("student_activities")
      .select(
        "id, student_id, activity_type, track, section, status, title, description, created_at, started_at, completed_at",
      )
      .in("student_id", studentKeys)
      .order("created_at", { ascending: false })
      .limit(50),

    supabase
      .from("student_prescriptions")
      .select(
        "id, student_id, activity_id, weak_tag, prescription_type, status, title, payload, due_at, created_at",
      )
      .in("student_id", studentKeys)
      .in("status", ["queued", "in_progress"])
      .order("status", { ascending: true })
      .order("due_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(10),

    supabase
      .from("generated_exam_assignments")
      .select("id, generated_exam_responses(submitted_at)")
      .eq("student_id", user.id),

    // Vocabulary Day 진행 상황
    supabase
      .from("student_vocab_assignments")
      .select("id, set_id, track_id, day_index, completed_at")
      .in("student_id", studentKeys)
      .is("canceled_at", null)
      .order("day_index", { ascending: true })
      .limit(1000),
  ]);

  if (activitiesError) {
    throw new Error(activitiesError.message);
  }

  if (prescriptionsError) {
    throw new Error(prescriptionsError.message);
  }

  const activityRows = (activities ?? []) as StudentActivity[];
  const prescriptionRows = (prescriptions ?? []) as StudentPrescription[];
  const vocabAssignmentRows = (vocabAssignments ?? []) as Array<{ id: string; set_id: string; track_id: string; day_index: number; completed_at: string | null }>;

  // 학생의 커리큘럼 조회
  const academyStudentId = studentKeys[0];
  const curriculum: Curriculum = academyStudentId
    ? await getStudentCurriculum(supabase, academyStudentId)
    : 'lexiox_jr';

  // Phase 순서
  const phaseOrder = getPhaseOrder(curriculum);

  // Phase 상태 결정 (간단한 버전: 모두 upcoming, 첫 번째는 in_progress)
  const phaseStatuses = new Map<LearningPhase, { completed: boolean; progress: number }>(
    phaseOrder.map((phase, idx) => [
      phase,
      {
        completed: false,
        progress: idx === 0 ? 45 : 0,
      },
    ])
  );

  const unsubmittedExams = (pendingExams ?? []).filter((a: any) => !a.generated_exam_responses?.[0]?.submitted_at);
  const current = activityRows.find((a) => a.status === "in_progress") ?? null;
  const todos = activityRows.filter((a) => a.status === "todo");
  const recent = activityRows.slice(0, 5);

  // Vocabulary Day 진행 상황
  const completedDayCount = vocabAssignmentRows.filter((a) => a.completed_at).length;
  const nextIncompleteDay = vocabAssignmentRows.find((a) => !a.completed_at);
  const totalDayCount = vocabAssignmentRows.length;
  const vocabProgress = totalDayCount > 0 ? Math.round((completedDayCount / totalDayCount) * 100) : 0;

  // Phase 진행률 계산
  const completedPhaseCount = Array.from(phaseStatuses.values()).filter(s => s.completed).length;
  const overallProgress = Math.round((completedPhaseCount / phaseOrder.length) * 100);

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <PaxHomeWidget tribe={tribe} level={level} streak={streak} name={displayName} />
        </div>
      </header>

      {/* 3-Column Layout */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr_320px]">
          {/* Left Sidebar - Navigation */}
          <aside className="space-y-4">
            {/* Phase Navigation */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">
                학습 경로
              </h3>
              <div className="space-y-2">
                {phaseOrder.map((phase, idx) => {
                  const status = phaseStatuses.get(phase);
                  const isCompleted = status?.completed ?? false;
                  const isCurrentPhase = idx === 0 && !isCompleted;

                  return (
                    <Link
                      key={phase}
                      href={`/student/phases/${phase}`}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                        isCurrentPhase
                          ? 'bg-indigo-600 text-white'
                          : isCompleted
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span>{PHASE_ICONS[phase]}</span>
                      <span className="truncate">{PHASE_LABELS[phase]}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Progress Card */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">
                진행률
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-2xl font-bold text-indigo-600">{overallProgress}%</p>
                  <p className="mt-1 text-xs text-slate-500">전체 진행률</p>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full bg-indigo-600 transition-all"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="space-y-6">
            {/* Today's Tasks */}
            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-slate-900">📚 오늘의 학습</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {curriculum === 'toefl' ? 'TOEFL 2026 시험 대비' : `${curriculum.toUpperCase()} 커리큘럼`}
                </p>
              </div>

              {/* Phase Timeline */}
              <div className="space-y-3">
                {phaseOrder.map((phase, idx) => {
                  const status = phaseStatuses.get(phase);
                  const isCompleted = status?.completed ?? false;
                  const isCurrentPhase = idx === 0 && !isCompleted;
                  const phaseStatus = isCompleted
                    ? 'completed'
                    : isCurrentPhase
                      ? 'in_progress'
                      : 'upcoming';

                  return (
                    <Link
                      key={phase}
                      href={`/student/phases/${phase}`}
                      className="block"
                    >
                      <PhaseCard
                        phase={phase}
                        status={phaseStatus}
                        order={idx + 1}
                        progress={status?.progress ?? 0}
                      />
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* Alerts */}
            {unsubmittedExams.length > 0 && (
              <Link
                href="/student/exams"
                className="flex items-center justify-between rounded-lg border-2 border-amber-300 bg-amber-50 px-5 py-4 hover:bg-amber-100"
              >
                <div>
                  <p className="text-sm font-bold text-amber-900">📋 미제출 시험</p>
                  <p className="mt-0.5 text-xs text-amber-700">{unsubmittedExams.length}개 있습니다</p>
                </div>
                <span className="text-sm font-semibold text-amber-600">→</span>
              </Link>
            )}

            {/* Vocab Track */}
            {totalDayCount > 0 && (
              <VocabTrackSelector
                assignments={vocabAssignmentRows}
                totalDayCount={totalDayCount}
                vocabProgress={vocabProgress}
                nextIncompleteDay={nextIncompleteDay}
              />
            )}
          </main>

          {/* Right Sidebar */}
          <aside className="space-y-4">
            {/* Calendar */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">
                📅 이번 주
              </h3>
              <div className="grid grid-cols-7 gap-1 text-center">
                {['월', '화', '수', '목', '금', '토', '일'].map(day => (
                  <div key={day} className="py-1 text-xs font-semibold text-slate-600">
                    {day}
                  </div>
                ))}
                {[1, 2, 3, 4, 5, 6, 7].map(day => (
                  <div
                    key={day}
                    className={`rounded py-2 text-xs font-medium ${
                      day === 4
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-3">
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="mb-1 text-xs font-semibold text-slate-500">진행 중</p>
                <p className="text-2xl font-bold text-slate-900">{current ? 1 : 0}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="mb-1 text-xs font-semibold text-slate-500">할 일</p>
                <p className="text-2xl font-bold text-slate-900">{todos.length}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="mb-1 text-xs font-semibold text-slate-500">완료</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {activityRows.filter(a => a.status === 'done').length}
                </p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">
                📋 최근
              </h3>
              <div className="space-y-2 text-xs">
                {recent.slice(0, 3).map(activity => (
                  <div key={activity.id} className="border-l-2 border-slate-300 py-1 pl-2">
                    <p className="truncate font-medium text-slate-700">
                      {activity.title ?? activity.activity_type}
                    </p>
                    <p className="text-slate-500">
                      {activity.completed_at
                        ? '완료'
                        : activity.started_at
                          ? '진행중'
                          : '대기'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
