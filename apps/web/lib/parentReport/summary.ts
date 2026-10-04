// 학부모 리포트용 요약 (DB 접근 없는 순수 함수).
//
// 개인정보 규칙: 입력 타입에 교사 메모(note)가 아예 없다. 호출하는 쪽이 메모를 넘길 수 없으므로
// 학부모 화면에 교사 내부 메모가 섞이는 사고가 구조적으로 불가능하다. 리포트에는 출석 사실만 담는다.

import { addDaysISO } from "@/lib/classes/dates";
import { attendanceRate, type AttendanceStatus } from "@/lib/classes/sessionBoard";

export type ReportRecord = {
  status: AttendanceStatus;
  session_date: string; // 'YYYY-MM-DD'
  start_time: string; // 'HH:MM:SS'
  class_name: string;
};

export type ReportSummary = {
  from: string;
  to: string;
  total: number; // 기간 내 기록된 수업 수
  present: number;
  late: number;
  absent: number;
  excused: number;
  rate: number | null; // 출석률(%): (출석+지각)/(출석+지각+결석), 사유결석 제외. 센 수업이 없으면 null
  recent: ReportRecord[]; // 최신순
};

export const REPORT_WINDOW_DAYS = 28;
const RECENT_LIMIT = 12;

/** 오늘(포함) 기준 최근 windowDays 일 안의 기록만으로 요약한다. */
export function buildReportSummary(
  records: ReportRecord[],
  today: string,
  windowDays: number = REPORT_WINDOW_DAYS
): ReportSummary {
  const from = addDaysISO(today, -(windowDays - 1));
  const inWindow = records.filter((r) => r.session_date >= from && r.session_date <= today);

  const counts = { present: 0, late: 0, absent: 0, excused: 0 };
  for (const r of inWindow) counts[r.status] += 1;

  // 허용된 필드만 골라 새 객체로 복사한다. 타입이 막아 주지 못하는 런타임 입력(any 로 넘어온 note 등)이
  // 원본 객체를 통해 그대로 흘러나가지 않게 하기 위함.
  const recent: ReportRecord[] = [...inWindow]
    .sort((a, b) => `${b.session_date} ${b.start_time}`.localeCompare(`${a.session_date} ${a.start_time}`))
    .slice(0, RECENT_LIMIT)
    .map((r) => ({ status: r.status, session_date: r.session_date, start_time: r.start_time, class_name: r.class_name }));

  return {
    from,
    to: today,
    total: inWindow.length,
    ...counts,
    rate: attendanceRate(inWindow).rate,
    recent,
  };
}
