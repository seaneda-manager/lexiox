import { generateSessions, sessionKey, type MeetingTemplate } from "./generateSessions";
import { addDaysISO, todayKST } from "./dates";

type Db = {
  from: (table: string) => any;
};

/**
 * 활성 반들의 주간 시간표로 오늘(한국 시간)부터 N일치 수업 회차를 만든다.
 * 여러 번 실행해도 중복 생성되지 않는다(이미 있는 회차 제외 + DB unique 제약).
 * 관리자 화면 버튼과 매일 크론이 같은 함수를 쓴다.
 */
export async function syncUpcomingSessions(
  db: Db,
  opts: { days?: number; from?: string } = {}
): Promise<{ created: number; classes: number }> {
  const days = Math.min(Math.max(Math.floor(opts.days ?? 14), 1), 60);

  const { data: classes, error: cErr } = await db.from("academy_classes").select("id").eq("is_active", true);
  if (cErr) throw new Error(cErr.message);
  const classIds = ((classes ?? []) as { id: string }[]).map((c) => c.id);
  if (classIds.length === 0) return { created: 0, classes: 0 };

  const { data: meetings, error: mErr } = await db
    .from("academy_class_meetings")
    .select("id, class_id, weekday, start_time, duration_min, effective_from, effective_to")
    .in("class_id", classIds);
  if (mErr) throw new Error(mErr.message);

  const from = opts.from ?? todayKST();
  const to = addDaysISO(from, days - 1);

  const { data: existing, error: eErr } = await db
    .from("class_sessions")
    .select("class_id, session_date, start_time")
    .in("class_id", classIds)
    .gte("session_date", from)
    .lte("session_date", to);
  if (eErr) throw new Error(eErr.message);

  const rows = generateSessions({
    meetings: (meetings ?? []) as MeetingTemplate[],
    fromDate: from,
    toDate: to,
    existing: ((existing ?? []) as { class_id: string; session_date: string; start_time: string }[]).map((r) => sessionKey(r)),
  });
  if (rows.length === 0) return { created: 0, classes: classIds.length };

  const { error: iErr } = await db
    .from("class_sessions")
    .upsert(rows, { onConflict: "class_id,session_date,start_time", ignoreDuplicates: true });
  if (iErr) throw new Error(iErr.message);

  return { created: rows.length, classes: classIds.length };
}
