/**
 * 단어 복습 항목 (vocab_review_items)
 *
 * 정책 (2026-11-04):
 *  - Day 학습에서 prescreen "모름" + speed 오답인 단어는 무조건 복습 대상.
 *  - 복습 1회차(학습 다음 날)·2회차는 의무. 3회차는 1·2회차에서 틀린 단어만. 다 맞으면 졸업.
 *  - 3회차에서도 틀리면 복습은 끝내고(lapsed) 총 시험에서 약점으로 다시 다룬다.
 *  - 회차는 "날짜"가 아니라 "완료한 복습 횟수"로 넘어간다 (하루 빼먹어도 그대로 남고, 다음 날 이어서).
 *
 * 모든 함수는 service role 클라이언트(client)를 받는다. 테이블이 아직 없거나 오류가 나도
 * 학습/시험 흐름이 깨지지 않도록 예외를 던지지 않고 빈 값/실패 결과를 돌려준다.
 */

export type ReviewClient = any;

/** KST 기준 오늘 (YYYY-MM-DD) */
export function kstToday(now: Date = new Date()): string {
  const k = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return k.toISOString().slice(0, 10);
}

export function addDays(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Day 학습 완료 시 호출: 그 Day 의 약점 단어(know 모름 + speed 오답, 각 단계 가장 최근 시도)를 복습 대상으로 등록.
 * 이미 복습 중인 단어도 다시 약점이면 1회차부터 다시 시작한다.
 */
export async function registerReviewItemsForDay(
  client: ReviewClient,
  input: { studentId: string; trackId: string | null; setId: string },
): Promise<{ ok: boolean; registered: number; error?: string }> {
  try {
    const { studentId, trackId, setId } = input;

    const { data: attempts, error: aErr } = await client
      .from("vocab_learning_attempts")
      .select("stage, wrong_word_ids, attempted_at")
      .eq("student_id", studentId)
      .eq("set_id", setId)
      .in("stage", ["know", "speed"])
      .order("attempted_at", { ascending: false });
    if (aErr) return { ok: false, registered: 0, error: String(aErr.message ?? aErr) };

    const seen = new Set<string>();
    const weak = new Set<string>();
    for (const r of (attempts as any[]) ?? []) {
      if (seen.has(r.stage)) continue;
      seen.add(r.stage);
      for (const id of Array.isArray(r.wrong_word_ids) ? r.wrong_word_ids : []) weak.add(String(id));
    }
    if (weak.size === 0) return { ok: true, registered: 0 };

    // 이 Day(set)에 속한 단어만
    const { data: items } = await client.from("vocab_set_items").select("word_id").eq("set_id", setId);
    const inSet = new Set(((items as any[]) ?? []).map((i) => String(i.word_id)));
    const wordIds = [...weak].filter((id) => inSet.has(id));
    if (wordIds.length === 0) return { ok: true, registered: 0 };

    const today = kstToday();
    const rows = wordIds.map((wordId) => ({
      student_id: studentId,
      word_id: wordId,
      track_id: trackId,
      set_id: setId,
      learned_on: today,
      stage: 1,
      due_on: addDays(today, 1),
      status: "open",
      r1_ok: null,
      r2_ok: null,
      r3_ok: null,
      last_reviewed_on: null,
      updated_at: new Date().toISOString(),
    }));

    const { error: uErr } = await client
      .from("vocab_review_items")
      .upsert(rows, { onConflict: "student_id,word_id" });
    if (uErr) return { ok: false, registered: 0, error: String(uErr.message ?? uErr) };

    return { ok: true, registered: rows.length };
  } catch (e: any) {
    return { ok: false, registered: 0, error: String(e?.message ?? e) };
  }
}

/** 오늘(이전 포함) 복습할 단어 목록 — 교재(track)별로 가져온다. */
export async function getDueReviewItems(
  client: ReviewClient,
  input: { studentId: string; trackId?: string | null; today?: string },
): Promise<{ wordId: string; stage: number; setId: string | null }[]> {
  try {
    const today = input.today ?? kstToday();
    let q = client
      .from("vocab_review_items")
      .select("word_id, stage, set_id")
      .eq("student_id", input.studentId)
      .eq("status", "open")
      .lte("due_on", today);
    if (input.trackId) q = q.eq("track_id", input.trackId);
    const { data, error } = await q;
    if (error) return [];
    return ((data as any[]) ?? []).map((r) => ({
      wordId: String(r.word_id),
      stage: Number(r.stage) || 1,
      setId: r.set_id ? String(r.set_id) : null,
    }));
  } catch {
    return [];
  }
}

/** 교재별 오늘 복습할 단어 수 (시험 페이지 카드·사이드바 배지용) */
export async function countDueReviewByTrack(
  client: ReviewClient,
  input: { studentId: string; today?: string },
): Promise<Record<string, number>> {
  try {
    const today = input.today ?? kstToday();
    const { data, error } = await client
      .from("vocab_review_items")
      .select("track_id")
      .eq("student_id", input.studentId)
      .eq("status", "open")
      .lte("due_on", today);
    if (error) return {};
    const out: Record<string, number> = {};
    for (const r of (data as any[]) ?? []) {
      const k = r.track_id ? String(r.track_id) : "none";
      out[k] = (out[k] ?? 0) + 1;
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * 복습 시험 결과 반영. 단어별 정답 여부로 회차/다음 복습일/졸업 여부를 갱신한다.
 *  1회차 → 2회차(다음 날)
 *  2회차 → 1·2회차 모두 맞으면 졸업, 하나라도 틀렸으면 3회차(다음 날)
 *  3회차 → 맞으면 졸업, 틀리면 lapsed(복습 종료, 총 시험에서 다시 다룸)
 */
export async function applyReviewResults(
  client: ReviewClient,
  input: { studentId: string; results: { wordId: string; correct: boolean }[]; today?: string },
): Promise<{ ok: boolean; updated: number; graduated: number; error?: string }> {
  try {
    const today = input.today ?? kstToday();
    const ids = input.results.map((r) => r.wordId);
    if (ids.length === 0) return { ok: true, updated: 0, graduated: 0 };

    const { data: items, error } = await client
      .from("vocab_review_items")
      .select("id, word_id, stage, r1_ok, r2_ok, status")
      .eq("student_id", input.studentId)
      .eq("status", "open")
      .in("word_id", ids);
    if (error) return { ok: false, updated: 0, graduated: 0, error: String(error.message ?? error) };

    const byWord = new Map<string, boolean>(input.results.map((r) => [r.wordId, r.correct]));
    let updated = 0;
    let graduated = 0;

    for (const it of (items as any[]) ?? []) {
      const correct = byWord.get(String(it.word_id));
      if (correct === undefined) continue;

      const patch: Record<string, any> = { last_reviewed_on: today, updated_at: new Date().toISOString() };

      if (it.stage === 1) {
        patch.r1_ok = correct;
        patch.stage = 2;
        patch.due_on = addDays(today, 1);
      } else if (it.stage === 2) {
        patch.r2_ok = correct;
        const bothOk = it.r1_ok !== false && correct;
        if (bothOk) {
          patch.status = "graduated";
          graduated++;
        } else {
          patch.stage = 3;
          patch.due_on = addDays(today, 1);
        }
      } else {
        patch.r3_ok = correct;
        patch.status = correct ? "graduated" : "lapsed";
        if (correct) graduated++;
      }

      const { error: uErr } = await client.from("vocab_review_items").update(patch).eq("id", it.id);
      if (!uErr) updated++;
    }

    return { ok: true, updated, graduated };
  } catch (e: any) {
    return { ok: false, updated: 0, graduated: 0, error: String(e?.message ?? e) };
  }
}
