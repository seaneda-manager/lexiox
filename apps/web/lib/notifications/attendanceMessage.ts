// 학부모 출결 안내 문구 (카톡/문자에 붙여 넣는 일반 텍스트). DB 접근 없는 순수 함수.
//
// 규칙
//  - 출석 '사실'만 쓴다. 학생에 대한 평가·추측·홍보 문구는 넣지 않는다(정보성 안내 유지).
//  - 사용자 입력(이름, 반 이름, 메모)은 한 줄로 정리하고 길이를 제한한다 (줄바꿈/제어문자로 문구가 변조되는 것 방지).
//  - 교사가 미리보기에서 고칠 수 있으므로 여기서는 '초안'만 만든다.

import { formatKoreanDate } from "@/lib/classes/dates";

export type AttendanceMessageKind = "absent" | "late" | "excused";

const MAX_NAME = 20;
const MAX_CLASS = 30;
const MAX_ACADEMY = 20;
const MAX_NOTE = 60;

// 제거할 문자: 제어문자(0x00-0x1F, 0x7F)와 줄/문단 구분자(0x2028, 0x2029).
// 줄 구분자는 소스에 직접 쓰면 실제 줄바꿈으로 해석되어 문법 오류가 나므로 코드 값으로 만든다.
function isStrippedChar(code: number): boolean {
  return code <= 0x1f || code === 0x7f || code === 0x2028 || code === 0x2029;
}

/** 제어문자·줄바꿈·연속 공백을 정리하고 길이를 제한한다. */
export function sanitizeInline(input: unknown, maxLen: number): string {
  let out = "";
  for (const ch of String(input ?? "")) {
    out += isStrippedChar(ch.charCodeAt(0)) ? " " : ch;
  }
  const s = out.replace(/\s+/g, " ").trim();
  return s.length > maxLen ? `${s.slice(0, maxLen - 1)}…` : s;
}

export type AttendanceMessageInput = {
  kind: AttendanceMessageKind;
  studentName: string;
  className: string;
  sessionDate: string; // 'YYYY-MM-DD'
  startTime: string; // 'HH:MM' 또는 'HH:MM:SS'
  academyName?: string | null; // 없으면 머리말 생략
  note?: string | null; // 교사 메모(선택)
};

const PREDICATE: Record<AttendanceMessageKind, string> = {
  absent: "출석하지 않았습니다.",
  late: "지각했습니다.",
  excused: "사유결석으로 처리되었습니다.",
};

export function renderAttendanceMessage(input: AttendanceMessageInput): string {
  const name = sanitizeInline(input.studentName, MAX_NAME) || "학생";
  const cls = sanitizeInline(input.className, MAX_CLASS);
  const academy = sanitizeInline(input.academyName, MAX_ACADEMY);
  const note = sanitizeInline(input.note, MAX_NOTE);
  const date = formatKoreanDate(input.sessionDate);
  const time = input.startTime.slice(0, 5);

  const head = academy ? `[${academy}] ` : "";
  const lesson = cls ? `${time} ${cls} 수업에` : `${time} 수업에`;
  const body = `${head}${name} 학생이 오늘(${date}) ${lesson} ${PREDICATE[input.kind]}`;

  const tail = input.kind === "absent" ? " 확인 부탁드립니다." : "";
  const memo = note ? ` (${note})` : "";
  return `${body}${memo}${tail}`;
}

/** 같은 수업·같은 학생·같은 종류의 안내가 두 번 초안으로 만들어지지 않게 하는 키 (outbox.dedupe_key). */
export function makeAttendanceDedupeKey(kind: AttendanceMessageKind, sessionId: string, studentId: string): string {
  return `attendance_${kind}:${sessionId}:${studentId}`;
}

/** 문자(SMS/LMS) 구분용 바이트 수: 한글 등 ASCII 밖 문자는 2바이트(EUC-KR 기준)로 센다. */
export function smsByteLength(text: string): number {
  let bytes = 0;
  for (const ch of text) bytes += ch.charCodeAt(0) <= 0x7f ? 1 : 2;
  return bytes;
}

/** 90바이트 이하면 SMS, 그보다 길면 LMS 로 나간다 (자동 발송 채널이 생길 때 비용/분할 판단용). */
export function smsKind(text: string): "SMS" | "LMS" {
  return smsByteLength(text) <= 90 ? "SMS" : "LMS";
}
