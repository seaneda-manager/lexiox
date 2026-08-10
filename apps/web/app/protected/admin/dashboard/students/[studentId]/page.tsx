import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import ProgramTabs, { type ProgramTab } from "./_client/ProgramTabs";
import WrongAnswerCard, { type WrongAnswerRow } from "@/components/admin/hi-naesin/WrongAnswerCard";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  pending: { text: "대기", cls: "bg-slate-100 text-slate-600" },
  in_progress: { text: "진행중", cls: "bg-amber-100 text-amber-700" },
  completed: { text: "완료", cls: "bg-emerald-100 text-emerald-700" },
  assigned: { text: "할당됨", cls: "bg-slate-100 text-slate-600" },
  overdue: { text: "기한만료", cls: "bg-rose-100 text-rose-700" },
};

const SECTION_LABEL_KO: Record<string, string> = {
  reading: "Reading",
  listening: "Listening",
  speaking: "Speaking",
  writing: "Writing",
};

async function resolveAcademyStudentId(
  supabase: Awaited<ReturnType<typeof getServerSupabase>>,
  authUserId: string,
): Promise<string | null> {
  for (const col of ["id", "auth_user_id", "user_id", "profile_id"] as const) {
    const { data } = await supabase.from("academy_students").select("id").eq(col, authUserId).maybeSingle();
    if (data?.id) return String(data.id);
  }
  return null;
}

type PageProps = { params: Promise<{ studentId: string }> };

export default async function StudentDetailDashboard({ params }: PageProps) {
  const { studentId } = await params;
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get student name
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const student = authUsers?.users.find((u) => u.id === studentId);
  const studentName =
    student?.user_metadata?.name ||
    student?.user_metadata?.full_name ||
    student?.email ||
    "Unknown Student";

  // Get Reading results
  const { data: readingResults } = await supabase
    .from("reading_results_2026")
    .select("id, test_id, finished_at, correct_count, total_questions")
    .eq("user_id", studentId)
    .order("finished_at", { ascending: false });

  // Get Listening results
  const { data: listeningResults } = await supabase
    .from("listening_results_2026")
    .select("id, test_id, module, finished_at, correct_count, total_questions")
    .eq("user_id", studentId)
    .order("finished_at", { ascending: false });

  // Get Speaking results
  const { data: speakingResults } = await supabase
    .from("speaking_results_2026")
    .select("id, test_id, finished_at, score")
    .eq("user_id", studentId)
    .order("finished_at", { ascending: false });

  // Get Writing results
  const { data: writingResults } = await supabase
    .from("writing_2026_sessions")
    .select("id, test_id, finished_at, score")
    .eq("user_id", studentId)
    .order("finished_at", { ascending: false });

  // ── 배정 현황 (지금 뭐가 배정돼 있는지 — 완료된 결과와는 별개) ──────────
  const service = getServiceSupabase();

  const { data: groups } = await service
    .from("test_assignment_groups")
    .select("id, kind, status, due_date, created_at")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  const groupIds = (groups ?? []).map((g) => g.id);
  const { data: groupMembers } =
    groupIds.length > 0
      ? await service
          .from("test_assignments")
          .select("id, group_id, group_sequence, sections, status")
          .in("group_id", groupIds)
          .order("group_sequence", { ascending: true })
      : { data: [] as any[] };

  const { data: soloAssignments } = await service
    .from("test_assignments")
    .select("id, sections, status, due_date, assigned_at")
    .eq("student_id", studentId)
    .is("group_id", null)
    .order("assigned_at", { ascending: false });

  const { data: dailyTests } = await service
    .from("daily_tests")
    .select("id, task_type, difficulty, status, due_date, created_at")
    .eq("student_id", studentId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  // ── Hi-내신 (hi_naesin_*.student_id는 auth id를 그대로 쓴다 — academy_students.id 아님) ──
  const { data: hiNaesinAllSessions } = await service
    .from("hi_naesin_sessions")
    .select("id, passage_id, assignment_id, status, submitted_at, score_percent")
    .eq("student_id", studentId)
    .eq("session_type", "drill")
    .order("submitted_at", { ascending: false });

  const hiNaesinSessionIds = (hiNaesinAllSessions ?? []).map((s) => s.id);
  const hiNaesinPassageIds = [...new Set((hiNaesinAllSessions ?? []).map((s) => s.passage_id).filter(Boolean))];
  const hiNaesinAssignmentIds = [...new Set((hiNaesinAllSessions ?? []).map((s) => s.assignment_id).filter(Boolean))];

  const { data: hiNaesinPassages } =
    hiNaesinPassageIds.length > 0
      ? await service.from("hi_naesin_passages").select("id, title").in("id", hiNaesinPassageIds)
      : { data: [] as { id: string; title: string | null }[] };
  const hiNaesinPassageTitleById = new Map((hiNaesinPassages ?? []).map((p) => [p.id, p.title]));

  const { data: hiNaesinAssignmentRows } =
    hiNaesinAssignmentIds.length > 0
      ? await service.from("hi_naesin_assignments").select("id, enabled_drill_types").in("id", hiNaesinAssignmentIds)
      : { data: [] as { id: string; enabled_drill_types: string[] | null }[] };
  const drillTypesByAssignmentId = new Map(
    (hiNaesinAssignmentRows ?? []).map((a) => [a.id, a.enabled_drill_types])
  );

  const hiNaesinSessions = (hiNaesinAllSessions ?? [])
    .filter((s) => s.status === "submitted")
    .map((s) => ({
      ...s,
      passageTitle: (s.passage_id && hiNaesinPassageTitleById.get(s.passage_id)) || null,
      // enabled_drill_types가 없으면(null) 전체 유형(어휘/문법/번역/독해/작문/토론)을 다 배정한 것이다.
      drillTypes: (s.assignment_id && drillTypesByAssignmentId.get(s.assignment_id)) || null,
    }));

  // 이 학생의 미확인 오답 (선생님이 "확인함"을 누르면 reviewed_at이 채워져 목록에서 빠진다)
  const sessionPassageById = new Map((hiNaesinAllSessions ?? []).map((s) => [s.id, s.passage_id]));
  const { data: wrongAnswerRows } =
    hiNaesinSessionIds.length > 0
      ? await service
          .from("hi_naesin_drill_responses")
          .select("id, drill_id, session_id, response_text, response_choice, score_pct, feedback_text, created_at")
          .in("session_id", hiNaesinSessionIds)
          .eq("is_correct", false)
          .is("reviewed_at", null)
          .order("created_at", { ascending: false })
      : { data: [] as any[] };

  const wrongDrillIds = [...new Set((wrongAnswerRows ?? []).map((r) => r.drill_id).filter(Boolean))];
  const { data: wrongDrills } =
    wrongDrillIds.length > 0
      ? await service.from("hi_naesin_drills").select("id, drill_type, payload").in("id", wrongDrillIds)
      : { data: [] as { id: string; drill_type: string; payload: Record<string, unknown> }[] };
  const drillById = new Map((wrongDrills ?? []).map((d) => [d.id, d]));

  const wrongAnswers: WrongAnswerRow[] = (wrongAnswerRows ?? []).flatMap((r) => {
    const drill = drillById.get(r.drill_id);
    if (!drill) return [];
    const passageId = sessionPassageById.get(r.session_id);
    return [{
      id: r.id,
      response_text: r.response_text,
      response_choice: r.response_choice,
      score_pct: r.score_pct,
      feedback_text: r.feedback_text,
      created_at: r.created_at,
      drillType: drill.drill_type,
      payload: drill.payload,
      passageTitle: (passageId && hiNaesinPassageTitleById.get(passageId)) || null,
    }];
  });

  const academyStudentId = await resolveAcademyStudentId(supabase, studentId);
  let vocabPlans: { trackTitle: string; cursorDayIndex: number; totalDays: number; isEnabled: boolean; isPaused: boolean }[] = [];
  // Junior 커리큘럼 활동 신호. 아직 jr_reading_sessions 외 테이블은 실제 DB에 없어 이것만 확인한다.
  let jrReadingSessionCount = 0;
  if (academyStudentId) {
    const { data: plans } = await service
      .from("student_vocab_plans")
      .select("track_id, cursor_day_index, is_enabled, is_paused")
      .eq("student_id", academyStudentId);

    if (plans && plans.length > 0) {
      const trackIds = plans.map((p) => p.track_id);
      const { data: tracks } = await service
        .from("vocab_tracks")
        .select("id, title, total_days")
        .in("id", trackIds);
      const trackById = new Map((tracks ?? []).map((t) => [t.id, t]));

      vocabPlans = plans.map((p) => ({
        trackTitle: trackById.get(p.track_id)?.title ?? "알 수 없는 트랙",
        cursorDayIndex: p.cursor_day_index ?? 1,
        totalDays: trackById.get(p.track_id)?.total_days ?? 0,
        isEnabled: !!p.is_enabled,
        isPaused: !!p.is_paused,
      }));
    }

    const { count } = await service
      .from("jr_reading_sessions")
      .select("id", { count: "exact", head: true })
      .eq("student_id", academyStudentId);
    jrReadingSessionCount = count ?? 0;
  }

  const groupMembersByGroup = new Map<string, any[]>();
  for (const m of groupMembers ?? []) {
    const list = groupMembersByGroup.get(m.group_id) ?? [];
    list.push(m);
    groupMembersByGroup.set(m.group_id, list);
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getScore = (result: any) => {
    if (result.correct_count !== undefined) {
      return Math.round((result.correct_count / result.total_questions) * 100);
    }
    return result.score;
  };

  const revalidateTargetPath = `/admin/dashboard/students/${studentId}`;

  // ── TOEFL 탭 ──────────────────────────────────────────────
  const hasToeflActivity =
    (groups ?? []).length > 0 ||
    (soloAssignments ?? []).length > 0 ||
    (dailyTests ?? []).length > 0 ||
    !!readingResults?.length ||
    !!listeningResults?.length ||
    !!speakingResults?.length ||
    !!writingResults?.length;

  const toeflContent = (
    <div className="space-y-6">
      {((groups ?? []).length > 0 || (soloAssignments ?? []).length > 0 || (dailyTests ?? []).length > 0) && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">📋 배정 현황</h3>

          {(groups ?? []).length > 0 && (
            <div className="rounded-lg border bg-white shadow-sm p-4 space-y-3">
              <h4 className="text-sm font-semibold text-gray-700">Full / Half Test</h4>
              {(groups ?? []).map((g) => {
                const members = groupMembersByGroup.get(g.id) ?? [];
                const gStatus = STATUS_LABEL[g.status] ?? STATUS_LABEL.pending;
                return (
                  <div key={g.id} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">
                        {g.kind === "full" ? "Full Test" : "Half Test"}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${gStatus.cls}`}>
                        {gStatus.text}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {members.map((m) => {
                        const mStatus = STATUS_LABEL[m.status] ?? STATUS_LABEL.pending;
                        const section = (m.sections as string[])?.[0];
                        return (
                          <span key={m.id} className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${mStatus.cls}`}>
                            {SECTION_LABEL_KO[section] ?? section}
                          </span>
                        );
                      })}
                    </div>
                    <p className="mt-1 text-[11px] text-gray-400">
                      배정 {formatDate(g.created_at)}
                      {g.due_date ? ` · 마감 ${formatDate(g.due_date)}` : ""}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {(soloAssignments ?? []).length > 0 && (
            <div className="rounded-lg border bg-white shadow-sm p-4">
              <h4 className="mb-3 text-sm font-semibold text-gray-700">개별 영역 배정</h4>
              <div className="space-y-2">
                {(soloAssignments ?? []).map((a) => {
                  const aStatus = STATUS_LABEL[a.status] ?? STATUS_LABEL.pending;
                  const section = (a.sections as string[])?.[0];
                  return (
                    <div key={a.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                      <span className="text-sm text-gray-800">{SECTION_LABEL_KO[section] ?? section}</span>
                      <div className="flex items-center gap-2">
                        {a.due_date && <span className="text-[11px] text-gray-400">마감 {formatDate(a.due_date)}</span>}
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${aStatus.cls}`}>
                          {aStatus.text}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(dailyTests ?? []).length > 0 && (
            <div className="rounded-lg border bg-white shadow-sm p-4">
              <h4 className="mb-3 text-sm font-semibold text-gray-700">Daily Tests</h4>
              <div className="space-y-2">
                {(dailyTests ?? []).map((t) => {
                  const tStatus = STATUS_LABEL[t.status] ?? STATUS_LABEL.pending;
                  return (
                    <Link
                      key={t.id}
                      href={t.status === "completed" ? `/admin/daily-tests/${t.id}` : "/admin/daily-tests"}
                      className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 hover:border-blue-300 hover:bg-blue-50 transition"
                    >
                      <span className="text-sm text-gray-800">{t.task_type} · {t.difficulty}</span>
                      <div className="flex items-center gap-2">
                        {t.due_date && <span className="text-[11px] text-gray-400">마감 {formatDate(t.due_date)}</span>}
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tStatus.cls}`}>
                          {tStatus.text}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard
          icon="📖"
          label="Reading"
          count={readingResults?.length || 0}
          avgScore={
            readingResults?.length
              ? Math.round(
                  readingResults.reduce((sum, r: any) => {
                    const score = Math.round((r.correct_count / r.total_questions) * 100);
                    return sum + score;
                  }, 0) / readingResults.length
                )
              : 0
          }
        />
        <StatCard
          icon="🎧"
          label="Listening"
          count={listeningResults?.length || 0}
          avgScore={
            listeningResults?.length
              ? Math.round(
                  listeningResults.reduce((sum, r: any) => {
                    const score = Math.round((r.correct_count / r.total_questions) * 100);
                    return sum + score;
                  }, 0) / listeningResults.length
                )
              : 0
          }
        />
        <StatCard
          icon="🎤"
          label="Speaking"
          count={speakingResults?.length || 0}
          avgScore={
            speakingResults?.length
              ? Math.round(speakingResults.reduce((sum, r: any) => sum + r.score, 0) / speakingResults.length)
              : 0
          }
        />
        <StatCard
          icon="✍️"
          label="Writing"
          count={writingResults?.length || 0}
          avgScore={
            writingResults?.length
              ? Math.round(writingResults.reduce((sum, r: any) => sum + r.score, 0) / writingResults.length)
              : 0
          }
        />
      </div>

      <div className="space-y-6">
        {readingResults && readingResults.length > 0 && (
          <ResultSection title="📖 Reading">
            <div className="space-y-2">
              {readingResults.map((result: any, idx: number) => (
                <ResultRow
                  key={result.id}
                  number={idx + 1}
                  score={getScore(result)}
                  date={formatDate(result.finished_at)}
                  href={`/student/review/reading/${result.id}`}
                />
              ))}
            </div>
          </ResultSection>
        )}

        {listeningResults && listeningResults.length > 0 && (
          <ResultSection title="🎧 Listening">
            <div className="space-y-2">
              {listeningResults.map((result: any, idx: number) => (
                <ResultRow
                  key={result.id}
                  number={idx + 1}
                  score={getScore(result)}
                  date={formatDate(result.finished_at)}
                  subtitle={`Module ${result.module}`}
                  href={`/student/review/listening/${result.id}`}
                />
              ))}
            </div>
          </ResultSection>
        )}

        {speakingResults && speakingResults.length > 0 && (
          <ResultSection title="🎤 Speaking">
            <div className="space-y-2">
              {speakingResults.map((result: any, idx: number) => (
                <ResultRow
                  key={result.id}
                  number={idx + 1}
                  score={result.score}
                  date={formatDate(result.finished_at)}
                  href={`/student/review/speaking/${result.id}`}
                />
              ))}
            </div>
          </ResultSection>
        )}

        {writingResults && writingResults.length > 0 && (
          <ResultSection title="✍️ Writing">
            <div className="space-y-2">
              {writingResults.map((result: any, idx: number) => (
                <ResultRow
                  key={result.id}
                  number={idx + 1}
                  score={result.score}
                  date={formatDate(result.finished_at)}
                  href={`/student/review/writing/${result.id}`}
                />
              ))}
            </div>
          </ResultSection>
        )}
      </div>
    </div>
  );

  // ── 내신(Hi-내신) 탭 ──────────────────────────────────────
  const hasNaesinActivity = hiNaesinSessions.length > 0 || wrongAnswers.length > 0;

  const naesinContent = (
    <div className="space-y-6">
      {wrongAnswers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">
            🔴 오답 검토 <span className="font-normal text-gray-400">({wrongAnswers.length}건 미확인)</span>
          </h3>
          <div className="space-y-2">
            {wrongAnswers.map((row) => (
              <WrongAnswerCard key={row.id} row={row} revalidateTargetPath={revalidateTargetPath} />
            ))}
          </div>
        </div>
      )}

      {hiNaesinSessions.length > 0 && (
        <div className="rounded-lg border bg-white shadow-sm p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Hi-내신 드릴 결과</h3>
          <div className="space-y-2">
            {hiNaesinSessions.map((sess) => {
              const score = sess.score_percent ?? 0;
              const scoreCls =
                score >= 80
                  ? "bg-emerald-50 text-emerald-700"
                  : score >= 60
                  ? "bg-amber-50 text-amber-700"
                  : "bg-rose-50 text-rose-700";
              return (
                <div
                  key={sess.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-gray-800">
                      {sess.passageTitle ?? `지문 ${sess.passage_id ? String(sess.passage_id).slice(0, 8) : "-"}…`}
                    </p>
                    <span className="text-[10px] text-gray-400">
                      {sess.drillTypes ? sess.drillTypes.join(" · ") : "전체 유형"}
                    </span>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <span className="text-[11px] text-gray-400">{formatDate(sess.submitted_at)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${scoreCls}`}>
                      {score}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // ── Junior 탭 ─────────────────────────────────────────────
  const hasJuniorActivity = jrReadingSessionCount > 0;
  const juniorContent = (
    <div className="rounded-lg border bg-white shadow-sm p-4">
      <h3 className="mb-1 text-sm font-semibold text-gray-700">Junior Reading</h3>
      <p className="text-sm text-gray-600">진행한 세션 {jrReadingSessionCount}개</p>
    </div>
  );

  // ── Voca 탭 ───────────────────────────────────────────────
  const hasVocaActivity = vocabPlans.length > 0;
  const vocaContent = (
    <div className="rounded-lg border bg-white shadow-sm p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">Vocabulary</h3>
      <div className="space-y-2">
        {vocabPlans.map((p, idx) => (
          <div key={idx} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
            <span className="text-sm text-gray-800">{p.trackTitle}</span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-500">
                Day {p.cursorDayIndex}{p.totalDays ? ` / ${p.totalDays}` : ""}
              </span>
              {!p.isEnabled && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500">비활성</span>
              )}
              {p.isPaused && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">일시정지</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const tabs: (ProgramTab | null)[] = [
    hasToeflActivity ? { id: "toefl", label: "🎯 TOEFL", content: toeflContent } : null,
    hasNaesinActivity
      ? {
          id: "naesin",
          label: "📘 내신",
          badge: wrongAnswers.length || undefined,
          content: naesinContent,
        }
      : null,
    hasJuniorActivity ? { id: "junior", label: "🧒 Junior", content: juniorContent } : null,
    hasVocaActivity ? { id: "voca", label: "🔤 Voca", content: vocaContent } : null,
  ];
  const activeTabs: ProgramTab[] = tabs.filter((t): t is ProgramTab => t !== null);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      {/* Back Button & Header */}
      <div className="space-y-4">
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          돌아가기
        </Link>

        <div>
          <h1 className="text-3xl font-bold text-gray-900">{studentName}의 학습 현황</h1>
          <p className="text-sm text-gray-600 mt-1">
            Student ID: {studentId.slice(0, 8)}…
          </p>
        </div>
      </div>

      {activeTabs.length > 0 ? (
        <ProgramTabs tabs={activeTabs} />
      ) : (
        <div className="rounded-lg border border-dashed bg-gray-50 p-12 text-center">
          <p className="text-gray-500">배정된 내용이 없습니다.</p>
        </div>
      )}
    </main>
  );
}

function StatCard({
  icon,
  label,
  count,
  avgScore,
}: {
  icon: string;
  label: string;
  count: number;
  avgScore: number;
}) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{icon} {label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{count}</p>
        </div>
        {count > 0 && (
          <div className="text-right">
            <p className="text-xs text-gray-500">평균</p>
            <p className="text-lg font-semibold text-blue-600">{avgScore}%</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <div className="rounded-lg border bg-white shadow-sm p-4">{children}</div>
    </div>
  );
}

function ResultRow({
  number,
  score,
  date,
  subtitle,
  href,
}: {
  number: number;
  score: number;
  date: string;
  subtitle?: string;
  href: string;
}) {
  const scoreColor =
    score >= 70 ? "text-emerald-700" : score >= 50 ? "text-amber-700" : "text-rose-700";

  return (
    <Link
      href={href}
      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition group"
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">
            #{number} {subtitle && `(${subtitle})`}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">{date}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className={`text-xl font-bold ${scoreColor}`}>{score}%</p>
        </div>
        <ExternalLink className="h-4 w-4 text-gray-300 group-hover:text-blue-600" />
      </div>
    </Link>
  );
}
