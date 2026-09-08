import "server-only";
import { PRESETS, type PresetKey } from "@/lib/planner/presets";

// ── 날짜 유틸 (UTC 기준, YYYY-MM-DD 문자열) ─────────────────────────────
function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(iso: string, n: number): string {
  const d = parseIso(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toIso(d);
}
function weekdayOf(iso: string): number {
  return parseIso(iso).getUTCDay(); // 0=일 .. 6=토
}
function diffDays(fromIso: string, toIso_: string): number {
  return Math.round((parseIso(toIso_).getTime() - parseIso(fromIso).getTime()) / 86_400_000);
}

// ── 입력 타입 ────────────────────────────────────────────────────────
export type ExamInput = {
  id: string;
  student_id: string;
  title: string;
  subjects: string[];
  start_date: string;   // 시험 시작 (YYYY-MM-DD)
  end_date: string;     // 시험 끝
  prep_start_date: string;
};

export type RoutineSlot = {
  zone: "school" | "home";
  weekday: number;
  start_time: string; // "HH:MM" or "HH:MM:SS"
  end_time: string;
  kind: string;
};

export type GeneratedBlock = {
  student_id: string;
  block_date: string;
  zone: "school" | "home";
  start_time: string | null;
  end_time: string | null;
  kind: string;
  subject: string;
  exam_id: string;
  title: string;
  note: string | null;
  source: "preset";
};

function hm(t: string): string {
  return t.slice(0, 5);
}
function minutesBetween(a: string, b: string): number {
  const [ah, am] = hm(a).split(":").map(Number);
  const [bh, bm] = hm(b).split(":").map(Number);
  return bh * 60 + bm - (ah * 60 + am);
}
function addMinutes(t: string, mins: number): string {
  const [h, m] = hm(t).split(":").map(Number);
  const total = h * 60 + m + mins;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/**
 * 시험 1개에 대한 공부 스케줄(day block 배열)을 생성한다.
 * - 준비기간 = [prep_start_date, start_date - 1]
 * - 프리셋의 phase 들을 준비기간에 weight 비례로 연속 배분
 * - 각 학습일에 과목을 로테이션하며 블록 생성 (하루 maxBlocksPerDay 상한)
 * - 그 요일 routine slot 이 있으면 그 시간대에 배치(학교 자습/쉬는시간 우선, 없으면 집)
 * - restWeekday 요일은 건너뜀
 * - 시험기간(start~end) 각 날: "마무리 점검" 블록 1개
 */
export function generateExamPrep(
  exam: ExamInput,
  presetKey: PresetKey,
  routineSlots: RoutineSlot[],
): GeneratedBlock[] {
  const preset = PRESETS[presetKey];
  const subjects = exam.subjects.filter((s) => s.trim().length > 0);
  if (subjects.length === 0) return [];

  const prepEnd = addDays(exam.start_date, -1);
  if (diffDays(exam.prep_start_date, prepEnd) < 0) {
    // 준비기간이 없음 — 시험기간 마무리 블록만
    return examWeekBlocks(exam, subjects, preset.sessionMinutes);
  }

  // 학습 가능일 목록
  const studyDates: string[] = [];
  for (let iso = exam.prep_start_date; iso <= prepEnd; iso = addDays(iso, 1)) {
    if (preset.restWeekday !== null && weekdayOf(iso) === preset.restWeekday) continue;
    studyDates.push(iso);
  }
  if (studyDates.length === 0) return examWeekBlocks(exam, subjects, preset.sessionMinutes);

  // phase 별 날짜 구간 분할 (weight 비례)
  const totalWeight = preset.phases.reduce((s, p) => s + p.weight, 0);
  const phaseRanges: { phaseIdx: number; dates: string[] }[] = [];
  let cursor = 0;
  preset.phases.forEach((p, idx) => {
    const isLast = idx === preset.phases.length - 1;
    const count = isLast
      ? studyDates.length - cursor
      : Math.max(1, Math.round((p.weight / totalWeight) * studyDates.length));
    const slice = studyDates.slice(cursor, cursor + count);
    cursor += count;
    if (slice.length > 0) phaseRanges.push({ phaseIdx: idx, dates: slice });
  });

  // routine slot 을 weekday 로 인덱싱 (학교 먼저, 그다음 집)
  const slotsByWeekday = new Map<number, RoutineSlot[]>();
  for (const s of routineSlots) {
    const list = slotsByWeekday.get(s.weekday) ?? [];
    list.push(s);
    slotsByWeekday.set(s.weekday, list);
  }
  for (const list of slotsByWeekday.values()) {
    list.sort((a, b) => {
      if (a.zone !== b.zone) return a.zone === "school" ? -1 : 1;
      return a.start_time.localeCompare(b.start_time);
    });
  }

  const blocks: GeneratedBlock[] = [];
  let subjectRot = 0;

  for (const { phaseIdx, dates } of phaseRanges) {
    const phase = preset.phases[phaseIdx];
    const phaseTag = `${phaseIdx + 1}/${preset.phases.length}`;
    for (const date of dates) {
      const wd = weekdayOf(date);
      const daySlots = (slotsByWeekday.get(wd) ?? []).slice();
      const perDay = Math.min(preset.maxBlocksPerDay, Math.max(1, subjects.length));

      for (let i = 0; i < perDay; i++) {
        const subject = subjects[subjectRot % subjects.length];
        subjectRot++;

        const slot = daySlots.shift();
        let zone: "school" | "home" = "home";
        let start: string | null = null;
        let end: string | null = null;
        if (slot) {
          zone = slot.zone;
          const avail = minutesBetween(slot.start_time, slot.end_time);
          const len = Math.min(avail, preset.sessionMinutes);
          start = hm(slot.start_time);
          end = addMinutes(slot.start_time, len);
        }

        blocks.push({
          student_id: exam.student_id,
          block_date: date,
          zone,
          start_time: start,
          end_time: end,
          kind: phase.kind,
          subject,
          exam_id: exam.id,
          title: `${subject} · ${phase.label}`,
          note: `${exam.title} 대비 · ${phaseTag}단계`,
          source: "preset",
        });
      }
    }
  }

  blocks.push(...examWeekBlocks(exam, subjects, preset.sessionMinutes));
  return blocks;
}

// 시험기간 각 날짜: 마무리 점검 1블록 (집)
function examWeekBlocks(
  exam: ExamInput,
  subjects: string[],
  sessionMinutes: number,
): GeneratedBlock[] {
  const out: GeneratedBlock[] = [];
  let rot = 0;
  for (let iso = exam.start_date; iso <= exam.end_date; iso = addDays(iso, 1)) {
    const subject = subjects[rot % subjects.length];
    rot++;
    out.push({
      student_id: exam.student_id,
      block_date: iso,
      zone: "home",
      start_time: null,
      end_time: null,
      kind: "test_prep",
      subject,
      exam_id: exam.id,
      title: `${subject} · 시험 직전 마무리`,
      note: `${exam.title} · 오답노트·핵심 요약 훑기 (${sessionMinutes}분)`,
      source: "preset",
    });
  }
  return out;
}
