/**
 * 수업일 판정. academy_students.class_days 를 쓴다 (teacher/session-report 와 같은 기준).
 * 값은 'mon' / '월' / '1' 등 여러 표기가 섞여 있어 모두 받아 준다.
 * class_days 가 비어 있으면 스케줄 미설정으로 보고 수업일로 취급한다 (기존 리포트와 동일).
 */
const DAY_MAP: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
  일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6,
  "0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6,
};

/** 한국 시간 기준 요일 (0=일) */
export function kstWeekday(now: Date = new Date()): number {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).getUTCDay();
}

/** 한국 시간 기준 YYYY-MM-DD */
export function kstDateString(now: Date = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function isClassDay(classDays: string[] | null | undefined, now: Date = new Date()): boolean {
  if (!classDays || classDays.length === 0) return true;
  const today = kstWeekday(now);
  return classDays.some((d) => DAY_MAP[String(d).trim().toLowerCase()] === today);
}
