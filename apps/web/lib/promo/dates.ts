// 날짜는 모두 한국 시간 기준 'YYYY-MM-DD' 문자열로 다룬다 (서버는 UTC로 돈다).

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function todayKST(): string {
  return new Date(Date.now() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

export function addDays(ymd: string, n: number): string {
  const d = new Date(ymd + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function weekday(ymd: string): number {
  return new Date(ymd + "T00:00:00Z").getUTCDay();
}

export function monthStart(ymd: string): string {
  return ymd.slice(0, 7) + "-01";
}

export function addMonths(monthFirst: string, n: number): string {
  const d = new Date(monthFirst + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + n, 1);
  return d.toISOString().slice(0, 10);
}

export function monthOf(ymd: string): number {
  return Number(ymd.slice(5, 7));
}

const WD = ["일", "월", "화", "수", "목", "금", "토"];
export function fmtShort(ymd: string | null | undefined): string {
  if (!ymd) return "";
  return `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8, 10))}(${WD[weekday(ymd)]})`;
}

/** KST 날짜 경계를 UTC ISO 타임스탬프로 (timestamptz 비교용) */
export function kstDayStartIso(ymd: string): string {
  return new Date(new Date(ymd + "T00:00:00Z").getTime() - KST_OFFSET_MS).toISOString();
}
