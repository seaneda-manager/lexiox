// 중학내신 배정(단원) → 영역별 과제 현황 항목. DB 조회는 호출하는 쪽(studentAssignmentCalendar)에서 하고,
// 여기서는 받은 행으로 항목만 만든다(순수 함수 — 테스트 가능).
import { toIsoDate, type AssignmentItem, type AssignmentStatus, type AssignmentArea } from "./types";

export type MnAssignment = { unit_id: string; due_at: string | null; assigned_at: string | null };
export type MnUnit = { id: string; publisher: string | null; lesson_number: number | null; lesson_title: string | null };
export type MnResult = { unit_id: string; drill_type: string; ref_id: string | null; score: number | null; total: number | null; completed_at: string | null };
export type MnReadiness = { unit_id: string; test_status: string };

const datePart = (v: string | null | undefined) => (v && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);
const pct = (score: number, total: number) => (total > 0 ? Math.round((score / total) * 100) : null);

/** 이 기간 안이거나, 아직 안 끝났고 최근 60일 안에 시작된 과제를 보여준다(밀린 숙제 이월). */
const CARRY_OVER_DAYS = 60;
function shiftIso(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

export function buildMiddleNaesinItems(o: {
  assignments: MnAssignment[];
  units: MnUnit[];
  grammarTotals: Record<string, number>; // unit_id → 학생에게 보이는 문법 포인트 수
  results: MnResult[];
  readiness: MnReadiness[];
  fromIso: string;
  toIso: string;
  todayIso: string;
  /** true 면 이번 기간 밖의 미완료 과제(최근 60일)도 함께 돌려준다 — 선생님 현황 화면 전용 */
  carryOver?: boolean;
}): AssignmentItem[] {
  const unitById = new Map(o.units.map((u) => [u.id, u]));
  const out: AssignmentItem[] = [];

  for (const a of o.assignments) {
    const unit = unitById.get(a.unit_id);
    const label = `${unit?.publisher ?? "중학내신"}${unit?.lesson_number != null ? ` L${unit.lesson_number}` : ""}`;
    const base = datePart(a.due_at) ?? datePart(a.assigned_at);
    if (!base) continue;
    const basis = datePart(a.due_at) ? ("due" as const) : ("assigned" as const);
    const href = "/teacher/middle-naesin-drill-results"; // 학생용 화면은 선생님이 열 수 없으므로 드릴 결과 보고 화면으로 연결
    const mine = o.results.filter((r) => r.unit_id === a.unit_id);

    const push = (kind: string, area: AssignmentArea, status: AssignmentStatus, scorePct?: number | null) => {
      const finished = status === "completed";
      const overdue = !finished && basis === "due" && base < o.todayIso;
      const inRange = base >= o.fromIso && base <= o.toIso;
      const carried = !!o.carryOver && !finished && base < o.fromIso && base >= shiftIso(o.fromIso, -CARRY_OVER_DAYS);
      if (!inRange && !carried) return;
      out.push({
        id: `${a.unit_id}:${kind}`,
        kind: "middle_naesin",
        area,
        title: `${label} · ${kind}`,
        date: base,
        dateBasis: basis,
        status: overdue ? "overdue" : status,
        scorePct,
        href,
      });
    };

    // 단어: 단어시험(영영/영한/한영)까지 봤으면 완료, 확인·깜지만 했으면 진행중
    const vocab = mine.filter((r) => r.drill_type.startsWith("vocab_"));
    const vocabTests = vocab.filter((r) => r.drill_type.startsWith("vocab_test_"));
    const vocabBest = vocabTests.reduce<number | null>((m, r) => {
      const p = pct(r.score ?? 0, r.total ?? 0);
      return p !== null && (m === null || p > m) ? p : m;
    }, null);
    push("단어", "vocab", vocabTests.length > 0 ? "completed" : vocab.length > 0 ? "in_progress" : "pending", vocabBest);

    // 해석·작문: 둘 다 하면 완료
    const hasTr = mine.some((r) => r.drill_type === "translation");
    const hasCo = mine.some((r) => r.drill_type === "composition");
    const readingPcts = mine
      .filter((r) => r.drill_type === "translation" || r.drill_type === "composition")
      .map((r) => pct(r.score ?? 0, r.total ?? 0))
      .filter((p): p is number => p !== null);
    push(
      "해석·작문",
      "reading",
      hasTr && hasCo ? "completed" : hasTr || hasCo ? "in_progress" : "pending",
      readingPcts.length ? Math.round(readingPcts.reduce((s, p) => s + p, 0) / readingPcts.length) : null,
    );

    // 문법: 학생에게 보이는 문법 포인트를 모두 풀면 완료 (문법 포인트가 없는 단원은 항목 자체를 만들지 않는다)
    const gTotal = o.grammarTotals[a.unit_id] ?? 0;
    if (gTotal > 0) {
      const gDone = new Set(mine.filter((r) => r.drill_type === "grammar_point").map((r) => r.ref_id ?? "")).size;
      push("문법", "grammar", gDone >= gTotal ? "completed" : gDone > 0 ? "in_progress" : "pending");
    }

    // 시험대비(수행→check→test): 모든 sub요소의 test 가 끝나면 완료
    const rd = o.readiness.filter((r) => r.unit_id === a.unit_id);
    const rdDone = rd.filter((r) => r.test_status === "done").length;
    const rdStarted = rd.some((r) => r.test_status !== "not_started");
    push(
      "시험대비",
      "exam",
      rd.length > 0 && rdDone === rd.length ? "completed" : rdStarted ? "in_progress" : "pending",
      rd.length > 0 ? Math.round((rdDone / rd.length) * 100) : null,
    );
  }
  return out;
}
