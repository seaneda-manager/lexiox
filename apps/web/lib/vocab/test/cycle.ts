import type { VocabTestQuestion } from "@/models/vocab/test.types";
import { resolveAcademyStudentId } from "@/lib/vocab/academyStudent";

/** 이 난이도 이상은 틀리지 않았어도 필수 재학습에 포함한다 (words.difficulty 1~5) */
export const HARD_DIFFICULTY_MIN = 4;
/**
 * words.difficulty 가 비어 있는 단어가 대부분이라, 실제 시험 결과로도 "어려운 단어"를 판단한다.
 *  - 이 학생이 같은 단어를 2번 이상 틀림 (vocab_word_mastery.wrong_count)
 *  - 전체 응시 기록에서 최소 응답 수 이상이고 오답률이 기준 이상 (vocab_test_questions)
 */
export const REPEAT_WRONG_MIN = 2;
export const CROWD_MIN_ANSWERS = 10;
export const CROWD_WRONG_RATE_MIN = 0.5;
/** 파생어(명사형·형용사형 등) 카드 상한 */
const MAX_EXTRA_TERMS = 40;
/** 연속 정답 횟수별 다음 복습까지의 일수 */
const REVIEW_INTERVAL_DAYS = [1, 3, 7, 14, 30];

type SessionRow = {
  id: string;
  student_id: string;
  academy_student_id: string | null;
  assignment_id: string | null;
  track_id: string;
  day_number: number;
  kind: "main" | "retest";
  passed: boolean | null;
};

/** 문제 단위 결과를 단어 단위로 합친다: 그 단어의 모든 문제를 맞혀야 "맞힘" */
export function summarizeByWord(questions: Array<Pick<VocabTestQuestion, "word_id" | "is_correct">>): Map<string, boolean> {
  const byWord = new Map<string, boolean>();
  for (const q of questions) {
    const prev = byWord.get(q.word_id);
    const ok = q.is_correct === true;
    byWord.set(q.word_id, prev === undefined ? ok : prev && ok);
  }
  return byWord;
}

function addDays(base: Date, days: number): string {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * 시험이 채점 확정된 직후 호출: 단어별 숙달 기록 갱신 + (불합격이면) 필수 재학습 배정 생성.
 * 부가 작업이라 실패해도 시험 결과에는 영향이 없도록 호출하는 쪽에서 try/catch 한다.
 */
export async function applyTestOutcome(admin: any, session: SessionRow, questions: VocabTestQuestion[]): Promise<void> {
  const academyId = session.academy_student_id ?? (await resolveAcademyStudentId(admin, session.student_id));
  if (!academyId) return; // 학원 학생 레코드가 없으면 기록 대상 아님 (FK)

  const byWord = summarizeByWord(questions);
  await updateMastery(admin, academyId, byWord);

  if (session.passed === false) {
    const wrongIds = [...byWord.entries()].filter(([, ok]) => !ok).map(([id]) => id);
    await createRemedialTask(admin, session, academyId, wrongIds);
  }
}

async function updateMastery(admin: any, academyId: string, byWord: Map<string, boolean>) {
  const wordIds = [...byWord.keys()];
  if (wordIds.length === 0) return;

  const { data: existing } = await admin
    .from("vocab_word_mastery")
    .select("word_id, correct_streak, wrong_count, seen_count")
    .eq("student_id", academyId)
    .in("word_id", wordIds);
  const prev = new Map<string, any>((existing ?? []).map((r: any) => [r.word_id, r]));

  const now = new Date();
  const rows = wordIds.map((wordId) => {
    const ok = byWord.get(wordId) === true;
    const p = prev.get(wordId);
    const streak = ok ? (p?.correct_streak ?? 0) + 1 : 0;
    const intervalDays = ok ? REVIEW_INTERVAL_DAYS[Math.min(streak, REVIEW_INTERVAL_DAYS.length) - 1] : 1;
    return {
      student_id: academyId,
      word_id: wordId,
      last_result: ok,
      correct_streak: streak,
      wrong_count: (p?.wrong_count ?? 0) + (ok ? 0 : 1),
      seen_count: (p?.seen_count ?? 0) + 1,
      last_tested_at: now.toISOString(),
      next_review_at: addDays(now, intervalDays),
      updated_at: now.toISOString(),
    };
  });

  const { error } = await admin.from("vocab_word_mastery").upsert(rows, { onConflict: "student_id,word_id" });
  if (error) console.warn("[vocab cycle] mastery upsert failed:", error.message);
}

/**
 * 필수 재학습 단어 선정:
 *  - 시험에서 틀린 단어
 *  - (본시험만) 그 Day의 고난도 단어 (difficulty >= HARD_DIFFICULTY_MIN)
 *  - 위 단어들의 파생어(words.derived_terms) → 문자열 카드로 따로 담는다
 */
export async function createRemedialTask(admin: any, session: SessionRow, academyId: string, wrongWordIds: string[]) {
  const reasons: Record<string, "wrong" | "hard"> = {};
  for (const id of wrongWordIds) reasons[id] = "wrong";

  let dayWordTexts = new Set<string>();
  let dayIds: string[] = [];
  if (session.kind === "main" && session.assignment_id) {
    const { data: asg } = await admin
      .from("student_vocab_assignments")
      .select("set_id")
      .eq("id", session.assignment_id)
      .maybeSingle();
    if (asg?.set_id) {
      const { data: items } = await admin.from("vocab_set_items").select("word_id").eq("set_id", asg.set_id);
      dayIds = (items ?? []).map((i: any) => i.word_id);
      if (dayIds.length > 0) {
        const { data: dayWords } = await admin.from("words").select("id, text, difficulty").in("id", dayIds);
        for (const w of dayWords ?? []) {
          dayWordTexts.add(String(w.text).toLowerCase());
          if (typeof w.difficulty === "number" && w.difficulty >= HARD_DIFFICULTY_MIN && !reasons[w.id]) {
            reasons[w.id] = "hard";
          }
        }
      }
    }
  }

  // 난이도 데이터가 없어도 동작하도록: 반복해서 틀리는 단어 / 다들 많이 틀리는 단어를 어려운 단어로 본다
  if (dayIds.length > 0) {
    for (const id of await findHardWordIds(admin, academyId, dayIds)) {
      if (!reasons[id]) reasons[id] = "hard";
    }
  }

  const coreIds = Object.keys(reasons);
  if (coreIds.length === 0) return;

  const { data: coreWords } = await admin.from("words").select("id, text, derived_terms").in("id", coreIds);
  const coreTexts = new Set<string>((coreWords ?? []).map((w: any) => String(w.text).toLowerCase()));
  const seen = new Set<string>();
  const extraTerms: string[] = [];
  for (const w of coreWords ?? []) {
    for (const raw of w.derived_terms ?? []) {
      const term = String(raw).trim();
      const key = term.toLowerCase();
      if (!term || seen.has(key) || coreTexts.has(key) || dayWordTexts.has(key)) continue;
      seen.add(key);
      extraTerms.push(term);
      if (extraTerms.length >= MAX_EXTRA_TERMS) break;
    }
    if (extraTerms.length >= MAX_EXTRA_TERMS) break;
  }

  const { error } = await admin.from("vocab_remedial_tasks").upsert(
    {
      student_id: academyId,
      track_id: session.track_id,
      day_index: session.day_number,
      source_session_id: session.id,
      status: "open",
      word_ids: coreIds,
      extra_terms: extraTerms,
      reasons,
    },
    { onConflict: "source_session_id", ignoreDuplicates: true }
  );
  if (error) console.warn("[vocab cycle] remedial task insert failed:", error.message);
}

async function findHardWordIds(admin: any, academyId: string, dayIds: string[]): Promise<string[]> {
  const hard = new Set<string>();

  const { data: mastery } = await admin
    .from("vocab_word_mastery")
    .select("word_id, wrong_count")
    .eq("student_id", academyId)
    .in("word_id", dayIds);
  for (const m of mastery ?? []) {
    if ((m.wrong_count ?? 0) >= REPEAT_WRONG_MIN) hard.add(m.word_id);
  }

  const { data: answers } = await admin
    .from("vocab_test_questions")
    .select("word_id, is_correct")
    .in("word_id", dayIds)
    .limit(20000);
  const stat = new Map<string, { total: number; wrong: number }>();
  for (const a of answers ?? []) {
    if (a.is_correct === null || a.is_correct === undefined) continue;
    const st = stat.get(a.word_id) ?? { total: 0, wrong: 0 };
    st.total += 1;
    if (a.is_correct === false) st.wrong += 1;
    stat.set(a.word_id, st);
  }
  for (const [id, st] of stat) {
    if (st.total >= CROWD_MIN_ANSWERS && st.wrong / st.total >= CROWD_WRONG_RATE_MIN) hard.add(id);
  }
  return [...hard];
}
