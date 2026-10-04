// 학원 수업 날짜는 한국 시간(Asia/Seoul, UTC+9, 서머타임 없음) 기준이다.
// 서버(Vercel)는 UTC 라서 `new Date().toISOString()` 로 "오늘"을 만들면
// 한국 새벽 0~9시에는 어제 날짜가 나온다. 학원별 시간대 커스터마이즈가 필요해지면 이 파일만 바꾸면 된다.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 한국 시간 기준 'YYYY-MM-DD'. 테스트에서 시각을 주입할 수 있다. */
export function todayKST(now: number = Date.now()): string {
  return new Date(now + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** 'YYYY-MM-DD' 에 일수를 더한다 (UTC 계산, 시간대 영향 없음). */
export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + days * 86_400_000).toISOString().slice(0, 10);
}

export function isISODate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
}

/** 'HH:MM:SS' 또는 'HH:MM' 에 분을 더한 'HH:MM' (자정을 넘으면 24시간 기준으로 돌려 표시) */
export function addMinutesHHMM(time: string, minutes: number): string {
  const m = /^(\d{2}):(\d{2})/.exec(time);
  if (!m) return time;
  const total = (Number(m[1]) * 60 + Number(m[2]) + minutes) % (24 * 60);
  const t = (total + 24 * 60) % (24 * 60);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/** '16:00:00', 90 -> '16:00–17:30' */
export function timeRange(start: string, durationMin: number): string {
  return `${start.slice(0, 5)}–${addMinutesHHMM(start, durationMin)}`;
}

const WEEKDAY_KO =["일", "월", "화", "수", "목", "금", "토"];

/** '2026-10-05' -> '10월 5일 (월)' */
export function formatKoreanDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${m}월 ${d}일 (${WEEKDAY_KO[dow]})`;
}
