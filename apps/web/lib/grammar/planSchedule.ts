// LEXiOX-Gram 챕터를 학생별 페이스(시작일 · 요일 · 회당 챕터 수)에 맞춰 날짜에 매칭한다.
// DB 접근 없이 계산만 하는 순수 함수 — 서버 동기화(syncGrammarPlan)와 테스트가 함께 쓴다.

export type PlanUnit = { id: string; order_index: number; level: string; status: string };

export type PlanSettings = {
  start_date: string; // YYYY-MM-DD
  weekdays: number[]; // 0=일 … 6=토 (student_vocab_plans / student_homework_plans 와 같은 컨벤션)
  units_per_session: number;
  level: string; // 'all' | 'ms' | 'hs' | 'toefl'
  start_unit_id: string | null;
};

export type ExistingAssignment = { unit_id: string; scheduled_date: string; seq: number };
export type NewAssignment = { unit_id: string; scheduled_date: string; seq: number };

/** 학원 기준(한국 시간) 오늘 날짜. 서버가 UTC 여도 새벽에 날짜가 하루 어긋나지 않게 한다. */
export function todayKst(now: Date = new Date()): string {
  return now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
}

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** startDateStr 부터 지정 요일에 해당하는 날짜를 count 개 돌려준다. weekdays 가 비어 있으면 매일로 본다. */
export function occurrenceDates(startDateStr: string, weekdays: number[], count: number): string[] {
  const set = new Set(weekdays.length > 0 ? weekdays : [0, 1, 2, 3, 4, 5, 6]);
  const cur = new Date(`${startDateStr}T00:00:00`);
  const out: string[] = [];
  for (let guard = 0; out.length < count && guard < 3650; guard++) {
    if (set.has(cur.getDay())) out.push(iso(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/** 이 학생 트랙에 해당하는 챕터를 순서대로 (레벨 필터 + 시작 챕터 이후). */
export function eligibleUnits(units: PlanUnit[], plan: Pick<PlanSettings, 'level' | 'start_unit_id'>): PlanUnit[] {
  const sorted = [...units].sort((a, b) => a.order_index - b.order_index);
  const byLevel = plan.level === 'all' ? sorted : sorted.filter((u) => u.level === plan.level || u.level === 'all');
  if (!plan.start_unit_id) return byLevel;
  const startIdx = byLevel.findIndex((u) => u.id === plan.start_unit_id);
  return startIdx >= 0 ? byLevel.slice(startIdx) : byLevel;
}

/**
 * 아직 날짜가 없는 챕터에 날짜를 붙인다 (여러 번 불러도 같은 결과 — 이미 있는 배정은 건드리지 않는다).
 *  - 이미 끝낸 챕터와 이미 배정된 챕터는 건너뛴다.
 *  - 내용이 아직 없는(draft) 챕터도 일정에는 넣는다: 선생님이 내용을 채울 시점을 알 수 있다.
 *  - 새 배정은 오늘 이후 날짜에만 만든다 (시작일이 과거여도 지난 날짜에 몰아서 "기한초과"를 만들지 않는다).
 *  - 같은 날짜에 이미 배정된 챕터가 있으면 회당 챕터 수를 넘지 않도록 남은 자리만 채운다.
 */
export function planGrammarSchedule(o: {
  units: PlanUnit[];
  plan: PlanSettings;
  completedIds: Set<string>;
  existing: ExistingAssignment[];
  todayIso: string;
}): NewAssignment[] {
  const perSession = Math.max(1, o.plan.units_per_session || 1);
  const assigned = new Set(o.existing.map((e) => e.unit_id));
  const pending = eligibleUnits(o.units, o.plan).filter((u) => !o.completedIds.has(u.id) && !assigned.has(u.id));
  if (pending.length === 0) return [];

  const usedOnDate = new Map<string, number>();
  for (const e of o.existing) usedOnDate.set(e.scheduled_date, (usedOnDate.get(e.scheduled_date) ?? 0) + 1);

  const base = o.plan.start_date > o.todayIso ? o.plan.start_date : o.todayIso;
  // 필요한 날짜 수의 상한: 전부 새 날짜라고 가정 + 이미 찬 날짜 수
  const dates = occurrenceDates(base, o.plan.weekdays, pending.length + usedOnDate.size);

  let seq = o.existing.reduce((m, e) => Math.max(m, e.seq), 0);
  const out: NewAssignment[] = [];
  let i = 0;
  for (const d of dates) {
    let room = perSession - (usedOnDate.get(d) ?? 0);
    while (room > 0 && i < pending.length) {
      out.push({ unit_id: pending[i].id, scheduled_date: d, seq: ++seq });
      i++;
      room--;
    }
    if (i >= pending.length) break;
  }
  return out;
}

export type PlanSummary = {
  total: number;
  done: number;
  overdue: number;
  todayUnitIds: string[];
  nextDate: string | null; // 오늘 이후 가장 가까운 배정일
  lastDate: string | null; // 마지막 배정일 = 예상 완료일
};

export function summarizePlan(assignments: ExistingAssignment[], completedIds: Set<string>, todayIso: string): PlanSummary {
  const done = assignments.filter((a) => completedIds.has(a.unit_id)).length;
  const open = assignments.filter((a) => !completedIds.has(a.unit_id));
  const future = open.filter((a) => a.scheduled_date > todayIso).map((a) => a.scheduled_date).sort();
  const dates = assignments.map((a) => a.scheduled_date).sort();
  return {
    total: assignments.length,
    done,
    overdue: open.filter((a) => a.scheduled_date < todayIso).length,
    todayUnitIds: open.filter((a) => a.scheduled_date === todayIso).sort((a, b) => a.seq - b.seq).map((a) => a.unit_id),
    nextDate: future[0] ?? null,
    lastDate: dates[dates.length - 1] ?? null,
  };
}
