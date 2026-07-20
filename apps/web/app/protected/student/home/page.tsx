import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getDrillRoute } from "@/lib/student-activities/routes";
import { markPrescriptionInProgress } from "@/lib/student-activities/prescription-actions";
import Link from "next/link";
import { PaxHomeWidget } from "@/components/avatar/PaxHomeWidget";
import type { Tribe } from "@/components/avatar/PaxAvatar";

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
  ]);

  if (activitiesError) {
    throw new Error(activitiesError.message);
  }

  if (prescriptionsError) {
    throw new Error(prescriptionsError.message);
  }

  const activityRows = (activities ?? []) as StudentActivity[];
  const prescriptionRows = (prescriptions ?? []) as StudentPrescription[];

  const unsubmittedExams = (pendingExams ?? []).filter((a: any) => !a.generated_exam_responses?.[0]?.submitted_at);

  const current = activityRows.find((a) => a.status === "in_progress") ?? null;
  const todos = activityRows.filter((a) => a.status === "todo");
  const recent = activityRows.slice(0, 5);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <PaxHomeWidget tribe={tribe} level={level} streak={streak} name={displayName} />


      {unsubmittedExams.length > 0 && (
        <Link href="/student/exams"
          className="flex items-center justify-between rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 shadow-sm hover:bg-amber-100 transition">
          <div>
            <p className="text-sm font-bold text-amber-800">📋 미제출 시험 {unsubmittedExams.length}개</p>
            <p className="text-xs text-amber-600 mt-0.5">선생님이 배정한 예상문제가 있습니다.</p>
          </div>
          <span className="rounded-full bg-amber-600 px-4 py-1.5 text-xs font-bold text-white">보기 →</span>
        </Link>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <Link
          href="/vocab/hub"
          className="group rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">
                Quick Start
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                LEXiOX-VOCA
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                단어 Drill & Practice로 바로 들어갑니다.
              </p>
            </div>
            <span className="rounded-full bg-violet-700 px-4 py-2 text-sm font-bold text-white transition group-hover:bg-violet-800">
              시작하기
            </span>
          </div>
        </Link>

        <Link
          href="/student?program=naesin"
          className="group rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
                Track
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                Lingo-X 내신
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                내신 추천 학습과 과제 흐름을 확인합니다.
              </p>
            </div>
            <span className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-bold text-white transition group-hover:bg-emerald-800">
              보기
            </span>
          </div>
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">진행 중</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {current ? 1 : 0}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">해야 할 것</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {todos.length}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">최근 활동</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {recent.length}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">추천 학습</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {prescriptionRows.length}
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">지금 하는 것</h2>
          <p className="mt-1 text-sm text-slate-500">
            현재 진행 중인 가장 최근 활동입니다.
          </p>
        </div>

        {current ? (
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${toneByStatus(
                  current.status,
                )}`}
              >
                {labelByStatus(current.status)}
              </span>

              {current.track ? (
                <span className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {current.track}
                </span>
              ) : null}

              {current.section ? (
                <span className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {current.section}
                </span>
              ) : null}
            </div>

            <h3 className="text-base font-semibold text-slate-900">
              {current.title ?? current.activity_type}
            </h3>

            {current.description ? (
              <p className="mt-2 text-sm text-slate-500">
                {current.description}
              </p>
            ) : null}

            <div className="mt-3 space-y-1 text-xs text-slate-500">
              {current.started_at ? (
                <p>시작 {formatDateTime(current.started_at)}</p>
              ) : null}
              {current.created_at ? (
                <p>생성 {formatDateTime(current.created_at)}</p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            진행 중인 활동이 없습니다.
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">추천 학습</h2>
          <p className="mt-1 text-sm text-slate-500">
            약점 분석을 바탕으로 자동 생성된 드릴입니다.
          </p>
        </div>

        {prescriptionRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            지금은 추천된 학습이 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {prescriptionRows.map((p) => {
              const href = getDrillRoute(p);

              return (
                <div
                  key={p.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${toneByStatus(
                          p.status,
                        )}`}
                      >
                        {labelByStatus(p.status)}
                      </span>

                      <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                        {p.weak_tag}
                      </span>

                      <span className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {p.prescription_type}
                      </span>
                    </div>

                    <p className="truncate text-base font-semibold text-slate-900">
                      {p.title ?? p.prescription_type}
                    </p>

                    <div className="mt-2 space-y-1 text-xs text-slate-500">
                      {p.due_at ? <p>마감 {formatDateTime(p.due_at)}</p> : null}
                      {p.created_at ? (
                        <p>생성 {formatDateTime(p.created_at)}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center">
                    <form
                      action={async () => {
                        "use server";
                        await markPrescriptionInProgress(p.id);
                        redirect(href);
                      }}
                    >
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                      >
                        시작하기
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">최근 활동</h2>
          <p className="mt-1 text-sm text-slate-500">
            가장 최근에 저장된 활동입니다.
          </p>
        </div>

        {recent.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            아직 저장된 활동이 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {recent.map((activity) => (
              <div
                key={activity.id}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${toneByStatus(
                      activity.status,
                    )}`}
                  >
                    {labelByStatus(activity.status)}
                  </span>

                  {activity.track ? (
                    <span className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {activity.track}
                    </span>
                  ) : null}

                  {activity.section ? (
                    <span className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {activity.section}
                    </span>
                  ) : null}
                </div>

                <h3 className="text-base font-semibold text-slate-900">
                  {activity.title ?? activity.activity_type}
                </h3>

                {activity.description ? (
                  <p className="mt-2 text-sm text-slate-500">
                    {activity.description}
                  </p>
                ) : null}

                <div className="mt-3 space-y-1 text-xs text-slate-500">
                  {activity.started_at ? (
                    <p>시작 {formatDateTime(activity.started_at)}</p>
                  ) : null}
                  {activity.completed_at ? (
                    <p>완료 {formatDateTime(activity.completed_at)}</p>
                  ) : null}
                  {activity.created_at ? (
                    <p>생성 {formatDateTime(activity.created_at)}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
