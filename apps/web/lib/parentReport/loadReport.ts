import { getServiceRoleClient } from "@/lib/supabase/server";
import { addDaysISO, todayKST } from "@/lib/classes/dates";
import { hashReportToken, isLinkActive, isWellFormedToken } from "./token";
import { buildReportSummary, REPORT_WINDOW_DAYS, type ReportRecord, type ReportSummary } from "./summary";

export type LoadedReport =
  | { state: "invalid" }
  | { state: "expired" }
  | { state: "ok"; studentName: string; summary: ReportSummary; generatedAt: string };

function clean(s: unknown): string {
  return String(s ?? "").trim();
}

/**
 * 공개 리포트 페이지가 쓰는 조회. 로그인이 없으므로 이 함수가 유일한 접근 통제다.
 *  - 토큰 형식이 틀리면 DB 조회 없이 invalid
 *  - 해시로만 조회 (토큰 원문은 DB 에 없다)
 *  - 폐기/만료는 expired (유효한 토큰을 가진 사람에게만 구분해서 알려준다)
 *  - 가져오는 정보는 학생 이름 + 출석 기록(상태/날짜/시간/반 이름)뿐. 이메일·전화·교사 메모는 읽지도 않는다.
 */
export async function loadReportByToken(token: unknown): Promise<LoadedReport> {
  if (!isWellFormedToken(token)) return { state: "invalid" };

  const db = getServiceRoleClient();
  const { data: link, error } = await db
    .from("parent_report_links")
    .select("id, student_id, expires_at, revoked_at, view_count")
    .eq("token_hash", hashReportToken(token))
    .maybeSingle();
  if (error || !link) return { state: "invalid" };

  const l = link as { id: string; student_id: string; expires_at: string; revoked_at: string | null; view_count: number | null };
  if (!isLinkActive(l)) return { state: "expired" };

  const today = todayKST();
  const since = addDaysISO(today, -(REPORT_WINDOW_DAYS + 1));

  const [person, att] = await Promise.all([
    db.from("profiles").select("full_name, name").eq("id", l.student_id).maybeSingle(),
    // note 는 일부러 select 하지 않는다 (교사 내부 메모는 학부모 화면에 나가지 않는다)
    db
      .from("attendance_records")
      .select("status, class_sessions!inner(session_date, start_time, academy_classes(name))")
      .eq("student_id", l.student_id)
      .gte("class_sessions.session_date", since)
      .limit(500),
  ]);
  if (att.error) return { state: "invalid" };

  const records: ReportRecord[] = ((att.data ?? []) as any[])
    .map((r) => {
      const cs = Array.isArray(r.class_sessions) ? r.class_sessions[0] : r.class_sessions;
      const c = cs?.academy_classes;
      const cls = Array.isArray(c) ? c[0] : c;
      return cs
        ? { status: r.status, session_date: cs.session_date, start_time: cs.start_time, class_name: clean(cls?.name) }
        : null;
    })
    .filter((r): r is ReportRecord => r !== null);

  // 열람 기록 (실패해도 리포트 표시에는 영향 없음)
  await db
    .from("parent_report_links")
    .update({ last_viewed_at: new Date().toISOString(), view_count: (l.view_count ?? 0) + 1 })
    .eq("id", l.id);

  const p = person.data as { full_name?: string | null; name?: string | null } | null;
  return {
    state: "ok",
    studentName: clean(p?.full_name) || clean(p?.name) || "학생",
    summary: buildReportSummary(records, today),
    generatedAt: new Date().toISOString(),
  };
}
