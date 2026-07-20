// apps/web/app/(protected)/admin/students/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

function fmt(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function fmtDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

// 주 단위 버킷 레이블 (YYYY-WW)
function weekKey(dateStr: string): string {
  const d = new Date(dateStr);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function weekLabel(key: string): string {
  const [year, w] = key.split("-W");
  return `${year}년 ${w}주`;
}

// 단순 수평 바 (CSS)
function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-xs font-semibold text-slate-600">{pct}%</span>
    </div>
  );
}

export default async function StudentAnalyticsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  // 학생 정보 (academy_students)
  const { data: student, error: studentErr } = await supabase
    .from("academy_students")
    .select("id, full_name, display_name, email, login_id, grade, grade_band, level, auth_user_id, is_active")
    .eq("id", id)
    .single();

  if (studentErr || !student) return notFound();

  const authUserId = student.auth_user_id as string | null;

  // 클래스 멤버십
  const { data: classMemberships } = authUserId
    ? await supabase
        .from("academy_class_students")
        .select("class_id, academy_classes(id, name)")
        .eq("student_id", authUserId)
    : { data: [] };

  const classes = (classMemberships ?? []).map((m) => {
    const cls = Array.isArray(m.academy_classes) ? m.academy_classes[0] : m.academy_classes;
    return {
      id: m.class_id,
      name: (cls as { name?: string } | null)?.name ?? m.class_id,
    };
  });

  // 독해 세션 전체
  const { data: sessions } = authUserId
    ? await supabase
        .from("reading_sessions")
        .select(
          "id, mode, band_score, legacy_score, started_at, finished_at, reading_passages(id, title)"
        )
        .eq("user_id", authUserId)
        .order("started_at", { ascending: false })
        .limit(200)
    : { data: [] };

  const doneSessions = (sessions ?? []).filter((s) => !!s.finished_at);
  const totalSessions = (sessions ?? []).length;
  const completedCount = doneSessions.length;

  // 점수 평균
  const scores = doneSessions
    .map((s) => s.band_score ?? s.legacy_score)
    .filter((v): v is number => v != null);
  const avgScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;

  // 최근 8주 세션 수 집계
  const now = new Date();
  const eightWeeksAgo = new Date(now.getTime() - 56 * 86400000);
  const recentSessions = (sessions ?? []).filter(
    (s) => s.started_at && new Date(s.started_at) >= eightWeeksAgo
  );

  const weeklyMap = new Map<string, number>();
  for (const s of recentSessions) {
    if (!s.started_at) continue;
    const key = weekKey(s.started_at);
    weeklyMap.set(key, (weeklyMap.get(key) ?? 0) + 1);
  }
  const weeklyEntries = Array.from(weeklyMap.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );
  const maxWeeklyCount = Math.max(...weeklyEntries.map(([, v]) => v), 1);

  // 문항별 정오답 분석
  const sessionIds = doneSessions.map((s) => s.id);

  const { data: answers } = sessionIds.length > 0
    ? await supabase
        .from("reading_answers")
        .select("question_id, choice_id, reading_questions(type, number), reading_choices(is_correct)")
        .in("session_id", sessionIds)
    : { data: [] };

  // 문제 유형별 정답률
  const typeStats = new Map<string, { correct: number; total: number }>();
  for (const a of answers ?? []) {
    const q = Array.isArray(a.reading_questions) ? a.reading_questions[0] : a.reading_questions;
    const c = Array.isArray(a.reading_choices) ? a.reading_choices[0] : a.reading_choices;
    const type = (q as { type?: string } | null)?.type ?? "unknown";
    const isCorrect = (c as { is_correct?: boolean } | null)?.is_correct ?? false;
    const prev = typeStats.get(type) ?? { correct: 0, total: 0 };
    typeStats.set(type, {
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    });
  }
  const typeEntries = Array.from(typeStats.entries()).sort((a, b) => b[1].total - a[1].total);

  const totalAnswered = (answers ?? []).length;
  const totalCorrect = (answers ?? []).filter((a) => {
    const c = Array.isArray(a.reading_choices) ? a.reading_choices[0] : a.reading_choices;
    return (c as { is_correct?: boolean } | null)?.is_correct === true;
  }).length;
  const overallAccuracy =
    totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : null;

  // 클래스 동료 평균 (같은 클래스 학생들의 평균 점수)
  let classPeerAvg: number | null = null;
  if (authUserId && classes.length > 0) {
    const { data: peerMemberships } = await supabase
      .from("academy_class_students")
      .select("student_id")
      .in("class_id", classes.map((c) => c.id))
      .neq("student_id", authUserId);

    const peerIds = Array.from(
      new Set((peerMemberships ?? []).map((p) => p.student_id))
    );

    if (peerIds.length > 0) {
      const { data: peerSessions } = await supabase
        .from("reading_sessions")
        .select("band_score, legacy_score")
        .in("user_id", peerIds)
        .not("finished_at", "is", null);

      const peerScores = (peerSessions ?? [])
        .map((s) => s.band_score ?? s.legacy_score)
        .filter((v): v is number => v != null);

      if (peerScores.length > 0) {
        classPeerAvg = Math.round(
          peerScores.reduce((a, b) => a + b, 0) / peerScores.length
        );
      }
    }
  }

  const studentLabel =
    student.full_name ||
    student.display_name ||
    student.email ||
    student.login_id ||
    `학생 ${id.slice(0, 8)}`;

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      {/* 헤더 */}
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Admin / Students / 분석
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {studentLabel}
          </h1>
          <p className="text-sm text-slate-500">
            {[student.grade, student.grade_band, student.level]
              .filter(Boolean)
              .join(" · ") || "학생 정보"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/admin/students?edit=${encodeURIComponent(id)}`}
            className="self-start rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Edit
          </Link>
          <Link
            href="/admin/students"
            className="self-start rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            ← 목록
          </Link>
        </div>
      </header>

      {/* 학생 기본 정보 */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">
            기본 정보
          </h2>
          <dl className="space-y-2 text-sm">
            {student.email && (
              <div className="flex justify-between">
                <dt className="text-slate-500">이메일</dt>
                <dd className="font-medium text-slate-800">{student.email}</dd>
              </div>
            )}
            {student.login_id && (
              <div className="flex justify-between">
                <dt className="text-slate-500">로그인 ID</dt>
                <dd className="font-medium text-slate-800">{student.login_id}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-slate-500">레벨</dt>
              <dd className="font-medium text-slate-800">{student.level ?? "-"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">상태</dt>
              <dd>
                {student.is_active !== false ? (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    active
                  </span>
                ) : (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-500">
                    inactive
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">
            클래스
          </h2>
          {classes.length === 0 ? (
            <p className="text-sm text-slate-400">등록된 클래스 없음</p>
          ) : (
            <ul className="space-y-1.5">
              {classes.map((cls) => (
                <li key={cls.id}>
                  <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                    {cls.name}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 핵심 지표 */}
      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">전체 세션</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{totalSessions}</p>
          <p className="mt-1 text-xs text-slate-400">완료 {completedCount}회</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">평균 점수</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {avgScore != null ? avgScore : "-"}
          </p>
          {classPeerAvg != null && (
            <p className="mt-1 text-xs text-slate-400">클래스 평균 {classPeerAvg}</p>
          )}
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">전체 정답률</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {overallAccuracy != null ? `${overallAccuracy}%` : "-"}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {totalCorrect}/{totalAnswered}문항
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">최근 8주 활동</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{recentSessions.length}</p>
          <p className="mt-1 text-xs text-slate-400">세션</p>
        </div>
      </section>

      {/* 기간별 활동 (주간) */}
      {weeklyEntries.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-slate-900">주간 학습량 (최근 8주)</h2>
          <div className="space-y-2">
            {weeklyEntries.map(([key, count]) => (
              <div key={key} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-xs text-slate-500">{weekLabel(key)}</span>
                <MiniBar value={count} max={maxWeeklyCount} color="bg-violet-400" />
                <span className="w-6 text-right text-xs font-semibold text-slate-700">{count}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 문제 유형별 정답률 */}
      {typeEntries.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-slate-900">문제 유형별 정답률</h2>
          <div className="space-y-3">
            {typeEntries.map(([type, stat]) => {
              const acc = Math.round((stat.correct / stat.total) * 100);
              return (
                <div key={type}>
                  <div className="mb-1 flex justify-between text-xs text-slate-500">
                    <span className="font-medium">{type}</span>
                    <span>
                      {stat.correct}/{stat.total}문항
                    </span>
                  </div>
                  <MiniBar
                    value={stat.correct}
                    max={stat.total}
                    color={acc >= 70 ? "bg-emerald-400" : acc >= 50 ? "bg-amber-400" : "bg-rose-400"}
                  />
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-slate-400">
            빨강 &lt;50% · 노랑 50–69% · 초록 ≥70%
          </p>
        </section>
      )}

      {/* 클래스 평균 비교 */}
      {classPeerAvg != null && avgScore != null && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-slate-900">클래스 평균 비교</h2>
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex justify-between text-xs text-slate-500">
                <span>{studentLabel}</span>
                <span>{avgScore}점</span>
              </div>
              <MiniBar value={avgScore} max={Math.max(avgScore, classPeerAvg, 100)} color="bg-sky-500" />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs text-slate-500">
                <span>클래스 평균</span>
                <span>{classPeerAvg}점</span>
              </div>
              <MiniBar value={classPeerAvg} max={Math.max(avgScore, classPeerAvg, 100)} color="bg-slate-300" />
            </div>
          </div>
        </section>
      )}

      {/* 최근 세션 이력 */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">세션 이력</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr className="[&>th]:px-4 [&>th]:py-3">
                <th>지문</th>
                <th>모드</th>
                <th>점수</th>
                <th>시작</th>
                <th>완료</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(sessions ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    세션 기록이 없습니다.
                  </td>
                </tr>
              ) : (
                (sessions ?? []).map((s) => {
                  const passage = Array.isArray(s.reading_passages)
                    ? s.reading_passages[0]
                    : s.reading_passages;
                  const score = s.band_score ?? s.legacy_score;
                  return (
                    <tr
                      key={s.id}
                      className="border-t border-slate-100 hover:bg-slate-50 [&>td]:px-4 [&>td]:py-3"
                    >
                      <td className="max-w-[200px] truncate text-slate-700">
                        {(passage as { title?: string } | null)?.title ?? "-"}
                      </td>
                      <td className="text-slate-500">{s.mode}</td>
                      <td className="font-semibold text-slate-900">
                        {score != null ? score : "-"}
                      </td>
                      <td className="text-slate-500">{fmtDateTime(s.started_at)}</td>
                      <td className="text-slate-500">{fmtDateTime(s.finished_at)}</td>
                      <td>
                        <Link
                          href={`/admin/results/${s.id}`}
                          className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          상세
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
