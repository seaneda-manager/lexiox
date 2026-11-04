/**
 * 총 시험(누적 시험) — 정책 (2026-11-04):
 *  - 기본 30일(한 달)마다, 설정으로 2주 등으로 바꿀 수 있다. (전역/반별/학생별)
 *  - 기준일: 마지막 총 시험을 본 날. 한 번도 안 봤다면 그 교재를 처음 학습한 날.
 *  - 출제: 그 기간에 학습한 단어 + 복습에서 끝내 못 맞힌 단어(lapsed) + 아직 복습 중인 단어.
 *    약점(lapsed → 복습 중 → 나머지) 순으로 채우고, 기본 50단어까지(설정의 출제 단어 수가 있으면 그 값).
 */

import { addDays, kstToday, type ReviewClient } from "./reviewItems";

export const DEFAULT_TOTAL_EXAM_WORDS = 50;

export type TotalExamStatus = {
  /** 지금 총 시험을 볼 시기인가 */
  due: boolean;
  intervalDays: number;
  /** 마지막 총 시험 날짜 (없으면 null) */
  lastTotalOn: string | null;
  /** 이 교재를 처음 학습 완료한 날 (없으면 null) */
  firstLearnedOn: string | null;
  /** 다음(또는 이번) 총 시험 시기 */
  nextDueOn: string | null;
};

/** 시기 판단 (순수 함수) */
export function computeTotalExamStatus(input: {
  today: string;
  intervalDays: number;
  lastTotalOn: string | null;
  firstLearnedOn: string | null;
}): TotalExamStatus {
  const { today, intervalDays, lastTotalOn, firstLearnedOn } = input;
  const base = lastTotalOn ?? firstLearnedOn;
  if (!base) {
    return { due: false, intervalDays, lastTotalOn, firstLearnedOn, nextDueOn: null };
  }
  const nextDueOn = addDays(base, intervalDays);
  return { due: today >= nextDueOn, intervalDays, lastTotalOn, firstLearnedOn, nextDueOn };
}

/** 총 시험 단어 선정 (순수 함수): lapsed → 복습 중 → 기간 내 나머지 순으로 cap 개까지 */
export function selectTotalExamWords(input: {
  periodWordIds: string[];
  lapsedIds: string[];
  openIds: string[];
  cap: number;
  /** 0~1 난수 (테스트에서 고정 가능) */
  rand?: () => number;
}): string[] {
  const rand = input.rand ?? Math.random;
  const shuffle = <T,>(arr: T[]): T[] => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const picked: string[] = [];
  const seen = new Set<string>();
  const push = (ids: string[]) => {
    for (const id of ids) {
      if (picked.length >= input.cap) return;
      if (seen.has(id)) continue;
      seen.add(id);
      picked.push(id);
    }
  };
  push(shuffle(input.lapsedIds));
  push(shuffle(input.openIds));
  push(shuffle(input.periodWordIds));
  return picked;
}

const toKstDate = (iso: string | null | undefined): string | null => (iso ? kstToday(new Date(iso)) : null);

/**
 * 교재(track)별 총 시험 상태 + (필요하면) 출제 후보 단어들.
 * studentId = academy_students.id (학습/복습 기록), authUserId = auth uid (시험 세션 student_id)
 */
export async function getTotalExamStatus(
  client: ReviewClient,
  input: { studentId: string; authUserId: string; trackId: string; intervalDays: number; today?: string },
): Promise<TotalExamStatus> {
  const today = input.today ?? kstToday();
  try {
    const [{ data: lastRows }, { data: firstRows }] = await Promise.all([
      client
        .from("vocab_test_sessions")
        .select("submitted_at")
        .eq("student_id", input.authUserId)
        .eq("track_id", input.trackId)
        .eq("mode", "total")
        .eq("status", "graded")
        .order("submitted_at", { ascending: false })
        .limit(1),
      client
        .from("student_vocab_assignments")
        .select("completed_at")
        .eq("student_id", input.studentId)
        .eq("track_id", input.trackId)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: true })
        .limit(1),
    ]);
    return computeTotalExamStatus({
      today,
      intervalDays: input.intervalDays,
      lastTotalOn: toKstDate((lastRows as any[])?.[0]?.submitted_at),
      firstLearnedOn: toKstDate((firstRows as any[])?.[0]?.completed_at),
    });
  } catch {
    return { due: false, intervalDays: input.intervalDays, lastTotalOn: null, firstLearnedOn: null, nextDueOn: null };
  }
}

/** 총 시험에 쓸 단어 후보를 모아서 선정까지 한다. */
export async function pickTotalExamWordIds(
  client: ReviewClient,
  input: { studentId: string; trackId: string; sinceISO: string | null; cap: number },
): Promise<string[]> {
  // 기간 내에 학습 완료한 Day 의 단어
  let aq = client
    .from("student_vocab_assignments")
    .select("set_id, completed_at")
    .eq("student_id", input.studentId)
    .eq("track_id", input.trackId)
    .not("completed_at", "is", null);
  if (input.sinceISO) aq = aq.gt("completed_at", input.sinceISO);
  const { data: assigns } = await aq;
  const setIds = [...new Set(((assigns as any[]) ?? []).map((a) => String(a.set_id)))];

  let periodWordIds: string[] = [];
  if (setIds.length > 0) {
    const { data: items } = await client.from("vocab_set_items").select("word_id").in("set_id", setIds);
    periodWordIds = [...new Set(((items as any[]) ?? []).map((i) => String(i.word_id)))];
  }

  // 복습에서 끝내 못 맞힌 단어 / 아직 복습 중인 단어 (이 교재)
  const { data: review } = await client
    .from("vocab_review_items")
    .select("word_id, status")
    .eq("student_id", input.studentId)
    .eq("track_id", input.trackId)
    .in("status", ["lapsed", "open"]);
  const lapsedIds = ((review as any[]) ?? []).filter((r) => r.status === "lapsed").map((r) => String(r.word_id));
  const openIds = ((review as any[]) ?? []).filter((r) => r.status === "open").map((r) => String(r.word_id));

  return selectTotalExamWords({ periodWordIds, lapsedIds, openIds, cap: input.cap });
}

/** 총 시험 결과 반영: 복습에서 못 맞혀 종료(lapsed)됐던 단어를 이번에 맞혔다면 졸업 처리 */
export async function applyTotalExamResults(
  client: ReviewClient,
  input: { studentId: string; results: { wordId: string; correct: boolean }[]; today?: string },
): Promise<{ ok: boolean; graduated: number }> {
  try {
    const today = input.today ?? kstToday();
    const correctIds = input.results.filter((r) => r.correct).map((r) => r.wordId);
    if (correctIds.length === 0) return { ok: true, graduated: 0 };
    const { data } = await client
      .from("vocab_review_items")
      .select("id")
      .eq("student_id", input.studentId)
      .eq("status", "lapsed")
      .in("word_id", correctIds);
    let graduated = 0;
    for (const it of (data as any[]) ?? []) {
      const { error } = await client
        .from("vocab_review_items")
        .update({ status: "graduated", last_reviewed_on: today, updated_at: new Date().toISOString() })
        .eq("id", it.id);
      if (!error) graduated++;
    }
    return { ok: true, graduated };
  } catch {
    return { ok: false, graduated: 0 };
  }
}
