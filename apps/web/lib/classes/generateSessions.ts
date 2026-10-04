// 주간 시간표 템플릿(academy_class_meetings) -> 날짜가 있는 수업 회차(class_sessions) 계산.
// DB 접근 없는 순수 함수. 같은 입력이면 같은 결과, `existing` 로 이미 있는 회차를 빼서 멱등하게 만든다.
//
// 요일 규칙: 프로젝트 공통(lib/planner, lib/homework)과 같게 JS Date.getDay() 기준 0=일 ... 6=토.
// 날짜 계산은 전부 UTC 로 해서 서버/로컬 시간대(KST 등)에 따라 하루 밀리는 문제를 피한다.

export type MeetingTemplate = {
  id: string;
  class_id: string;
  weekday: number; // 0=일 .. 6=토
  start_time: string; // 'HH:MM' 또는 'HH:MM:SS'
  duration_min: number;
  effective_from?: string | null; // 'YYYY-MM-DD' (포함)
  effective_to?: string | null; // 'YYYY-MM-DD' (포함)
};

export type SessionRow = {
  class_id: string;
  session_date: string; // 'YYYY-MM-DD'
  start_time: string; // 'HH:MM:SS'
  duration_min: number;
  meeting_id: string;
  kind: "regular";
};

const MAX_RANGE_DAYS = 366;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** 'HH:MM' -> 'HH:MM:SS'. 형식이 틀리면 null. */
export function normalizeTime(t: string): string | null {
  const m = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(t.trim());
  if (!m) return null;
  const [h, min, s] = [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)];
  if (h > 23 || min > 59 || s > 59) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(min)}:${pad(s)}`;
}

/** DB unique(class_id, session_date, start_time) 와 같은 기준의 키. */
export function sessionKey(r: { class_id: string; session_date: string; start_time: string }): string {
  return `${r.class_id}|${r.session_date}|${normalizeTime(r.start_time) ?? r.start_time}`;
}

function parseISO(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function toISO(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

const DAY_MS = 86_400_000;

export function generateSessions(args: {
  meetings: MeetingTemplate[];
  fromDate: string; // 포함
  toDate: string; // 포함
  existing?: Iterable<string>; // sessionKey() 값들
}): SessionRow[] {
  const { meetings, fromDate, toDate } = args;
  if (!ISO_DATE.test(fromDate) || !ISO_DATE.test(toDate)) return [];

  const start = parseISO(fromDate);
  const end = parseISO(toDate);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return [];
  const days = Math.min(Math.round((end - start) / DAY_MS) + 1, MAX_RANGE_DAYS);

  const seen = new Set<string>(args.existing ?? []);
  const out: SessionRow[] = [];

  for (let i = 0; i < days; i++) {
    const ms = start + i * DAY_MS;
    const date = toISO(ms);
    const dow = new Date(ms).getUTCDay();

    for (const m of meetings) {
      if (m.weekday !== dow) continue;
      if (m.effective_from && date < m.effective_from) continue;
      if (m.effective_to && date > m.effective_to) continue;
      const time = normalizeTime(m.start_time);
      if (!time) continue;
      if (!(m.duration_min > 0)) continue;

      const row: SessionRow = {
        class_id: m.class_id,
        session_date: date,
        start_time: time,
        duration_min: m.duration_min,
        meeting_id: m.id,
        kind: "regular",
      };
      const key = sessionKey(row);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(row);
    }
  }

  return out;
}
