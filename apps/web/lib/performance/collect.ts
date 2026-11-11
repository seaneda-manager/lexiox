import "server-only";
// 학생 1명의 분야별 수행 기록을 한 모양(SectionData)으로 모은다.
// 기존 결과 테이블을 읽기만 한다 (스키마 변경 없음). 테이블이 없거나 컬럼이 달라도
// 해당 분야만 비우고 리포트는 계속 그리도록 분야별로 try/catch 한다.
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceSupabase } from "@/lib/supabase/service";
import { resolveWeaknessCategory } from "@/lib/hi-naesin/weaknessCategories";
import { classifyMcq, classifyTyped } from "./analyze";
import type {
  AttemptRecord,
  FeedbackRow,
  PerformanceReportData,
  SectionData,
  SectionKey,
  Severity,
  SessionRecord,
} from "./types";

const MAX_SESSIONS = 60;

/* ─────────── 공통 헬퍼 ─────────── */

type Row = Record<string, any>;

function clip(s: unknown, n = 160): string {
  const t = String(s ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

function pct(correct: number, total: number): number | null {
  return total > 0 ? Math.round((correct / total) * 100) : null;
}

function atOf(r: Row): string {
  return String(r.finished_at ?? r.submitted_at ?? r.created_at ?? new Date(0).toISOString());
}

/** 답안을 {questionId: 값} 맵으로 정규화 (배열형·맵형 모두 지원) */
function normalizeAnswers(raw: unknown): Record<string, string> {
  const flat = (v: unknown) => (Array.isArray(v) ? v.map(String).sort().join(",") : String(v ?? ""));
  const map: Record<string, string> = {};
  if (Array.isArray(raw)) {
    for (const e of raw as Row[]) {
      const id = e?.questionId ?? e?.question_id;
      if (id) map[id] = flat(e?.chosenChoiceId ?? e?.answer ?? e?.value);
    }
  } else if (raw && typeof raw === "object") {
    for (const [k, v] of Object.entries(raw as Row)) map[k] = flat(v);
  }
  return map;
}

function choiceCorrect(c: Row): boolean {
  return c?.isCorrect === true || c?.is_correct === true || c?.correct === true;
}

const READING_TYPE_LABEL: Record<string, string> = {
  vocab: "어휘",
  detail: "세부 정보",
  negative_detail: "부정 세부 정보",
  paraphrasing: "문장 바꿔쓰기",
  inference: "추론",
  purpose: "저자 의도",
  pronoun_ref: "지시어",
  insertion: "문장 삽입",
  summary: "요약",
  organization: "구조 파악",
  complete_words: "단어 채우기",
  daily_life: "일상 읽기",
  academic_passage: "학술 지문",
};

const LISTENING_TYPE_LABEL: Record<string, string> = {
  conversation: "대화",
  academic_lecture: "학술 강의",
  academic_talk: "학술 토크",
  campus_audio_log: "캠퍼스 안내",
  announcement: "공지",
  choose_response: "응답 고르기",
  choose_best_response: "응답 고르기",
  listening: "리스닝",
};

/** 시험 payload에서 모든 item을 평탄화 (modules / items / stage2Pool 구조를 모두 처리) */
function collectItems(payload: any): Row[] {
  if (!payload) return [];
  const out: Row[] = [];
  const pushModule = (m: any) => Array.isArray(m?.items) && out.push(...m.items);
  if (Array.isArray(payload.items)) out.push(...payload.items);
  if (Array.isArray(payload.modules)) payload.modules.forEach(pushModule);
  if (payload.stage2Pool) {
    pushModule(payload.stage2Pool.hard);
    pushModule(payload.stage2Pool.easy);
  }
  return out;
}

async function loadTests(
  svc: SupabaseClient,
  table: string,
  ids: string[],
): Promise<Map<string, any>> {
  const map = new Map<string, any>();
  if (!ids.length) return map;
  const { data } = await svc.from(table).select("id, payload").in("id", ids);
  for (const r of (data ?? []) as Row[]) map.set(String(r.id), r.payload);
  return map;
}

/* ─────────── Reading ─────────── */

async function collectReading(svc: SupabaseClient, studentId: string): Promise<SectionData> {
  const { data } = await svc
    .from("reading_results_2026")
    .select("*")
    .eq("user_id", studentId)
    .order("created_at", { ascending: false })
    .limit(MAX_SESSIONS);
  const results = (data ?? []) as Row[];
  const tests = await loadTests(svc, "reading_tests_2026", [...new Set(results.map((r) => String(r.test_id)))]);

  const sessions: SessionRecord[] = [];
  const attempts: AttemptRecord[] = [];

  for (const r of results) {
    const payload = tests.get(String(r.test_id));
    const items = collectItems(payload);
    let answers = normalizeAnswers(r.answers ?? r.raw_result);
    // Complete Words 키(cw__item__blank)는 blank id만 남긴다
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(answers)) {
      const p = k.split("__");
      cleaned[k.startsWith("cw__") && p.length === 3 ? p[2] : k] = v;
    }
    answers = cleaned;
    const at = atOf(r);
    let total = 0;
    let correct = 0;

    for (const item of items) {
      if (item.taskKind === "complete_words") {
        for (const b of item.blanks ?? []) {
          const user = answers[b.id] ?? null;
          const ok = !!user && user.trim().toLowerCase() === String(b.correctToken).toLowerCase();
          total++;
          if (ok) correct++;
          attempts.push({
            key: `${r.id}:${b.id}`,
            sessionId: String(r.id),
            at,
            subsection: "complete_words",
            subsectionLabel: READING_TYPE_LABEL.complete_words,
            stem: clip(b.stem || `빈칸 ${b.id}`),
            userAnswer: user,
            correctAnswer: b.correctToken ?? null,
            correct: ok,
            severity: ok ? undefined : classifyTyped(user, b.correctToken ?? null),
          });
        }
      } else {
        for (const q of item.questions ?? []) {
          const choices: Row[] = q.choices ?? [];
          const right = choices.find(choiceCorrect);
          const user = answers[q.id] || null;
          const chosen = choices.find((c) => c.id === user);
          const ok = !!right && user === right.id;
          const qType = String(q.type ?? item.taskKind ?? "unknown");
          total++;
          if (ok) correct++;
          attempts.push({
            key: `${r.id}:${q.id}`,
            sessionId: String(r.id),
            at,
            subsection: qType,
            subsectionLabel: READING_TYPE_LABEL[qType] ?? qType,
            stem: clip(q.stem),
            userAnswer: chosen ? clip(chosen.text, 100) : user ? "(선택지 정보 없음)" : null,
            correctAnswer: right ? clip(right.text, 100) : null,
            correct: ok,
            severity: ok ? undefined : classifyMcq(user, chosen?.trapType),
          });
        }
      }
    }
    if (!total) total = Number(r.total_questions ?? 0);
    sessions.push({
      id: String(r.id),
      at,
      label: String(r.label ?? payload?.meta?.label ?? "Reading"),
      pct: pct(correct, total),
      correct,
      total,
    });
  }
  return { section: "reading", sessions, attempts };
}

/* ─────────── Listening ─────────── */

async function collectListening(svc: SupabaseClient, studentId: string): Promise<SectionData> {
  const { data } = await svc
    .from("listening_results_2026")
    .select("*")
    .eq("user_id", studentId)
    .order("created_at", { ascending: false })
    .limit(MAX_SESSIONS);
  const results = (data ?? []) as Row[];
  const tests = await loadTests(svc, "listening_tests_2026", [...new Set(results.map((r) => String(r.test_id)))]);

  const sessions: SessionRecord[] = [];
  const attempts: AttemptRecord[] = [];

  for (const r of results) {
    const payload = tests.get(String(r.test_id));
    const items = collectItems(payload);
    const at = atOf(r);
    // 저장된 [{questionId, isCorrect}]가 있으면 그것을 우선 신뢰한다
    const stored = new Map<string, Row>();
    if (Array.isArray(r.answers)) for (const e of r.answers as Row[]) if (e?.questionId) stored.set(String(e.questionId), e);
    const userMap = normalizeAnswers(r.answers);

    let total = 0;
    let correct = 0;
    const seen = new Set<string>();

    for (const item of items) {
      for (const q of item.questions ?? []) {
        const choices: Row[] = q.choices ?? [];
        const right = choices.find(choiceCorrect);
        const entry = stored.get(String(q.id));
        const user = userMap[q.id] || null;
        const chosen = choices.find((c) => c.id === user) ?? (entry?.choiceIndex != null ? choices[Number(entry.choiceIndex)] : undefined);
        const ok = typeof entry?.isCorrect === "boolean" ? entry.isCorrect : !!right && user === right.id;
        const qType = String(q.type ?? item.taskKind ?? "listening");
        seen.add(String(q.id));
        total++;
        if (ok) correct++;
        attempts.push({
          key: `${r.id}:${q.id}`,
          sessionId: String(r.id),
          at,
          subsection: String(item.taskKind ?? qType),
          subsectionLabel: LISTENING_TYPE_LABEL[String(item.taskKind ?? qType)] ?? String(item.taskKind ?? qType),
          stem: clip(q.stem || q.question || item.title),
          userAnswer: chosen ? clip(chosen.text, 100) : entry || user ? "(선택지 정보 없음)" : null,
          correctAnswer: right ? clip(right.text, 100) : null,
          correct: ok,
          severity: ok ? undefined : classifyMcq(user ?? (entry ? "x" : null), chosen?.trapType),
        });
      }
    }
    if (!total) {
      total = Number(r.total_questions ?? 0);
      correct = Number(r.correct_count ?? 0);
    }
    sessions.push({
      id: String(r.id),
      at,
      label: `Listening${r.module ? ` M${r.module}` : ""}${r.difficulty ? ` (${r.difficulty})` : ""}`,
      pct: pct(correct, total),
      correct,
      total,
    });
  }
  return { section: "listening", sessions, attempts };
}

/* ─────────── Speaking / Writing (점수형) ─────────── */

/** 스케일이 제각각(0~4 / 0~6 밴드 / 0~30 / 0~100)이라 최댓값 기준으로 0~100 환산한다 */
function normalizeScore(v: number): number {
  if (v <= 4) return Math.round((v / 4) * 100);
  if (v <= 6) return Math.round((v / 6) * 100);
  if (v <= 30) return Math.round((v / 30) * 100);
  return Math.round(Math.min(v, 100));
}

function scoreOf(r: Row): number | null {
  const parts = [r.score, r.band_score, r.total_score].find((v) => typeof v === "number");
  if (typeof parts === "number") return parts;
  const subs = [r.fluency_score, r.content_score, r.language_score, r.pronunciation_score].filter(
    (v): v is number => typeof v === "number",
  );
  return subs.length ? subs.reduce((a, b) => a + b, 0) / subs.length : null;
}

async function collectScored(
  svc: SupabaseClient,
  studentId: string,
  section: "speaking" | "writing",
): Promise<SectionData> {
  const table = section === "speaking" ? "speaking_results_2026" : "writing_2026_sessions";
  const { data } = await svc
    .from(table)
    .select("*")
    .eq("user_id", studentId)
    .order("created_at", { ascending: false })
    .limit(MAX_SESSIONS);
  const sessions: SessionRecord[] = ((data ?? []) as Row[]).map((r) => {
    const s = scoreOf(r);
    return {
      id: String(r.id),
      at: atOf(r),
      label: String(r.task_id ?? r.label ?? (section === "speaking" ? "Speaking" : "Writing")),
      pct: s === null ? null : normalizeScore(s),
      scoreText: s === null ? undefined : String(Math.round(s * 10) / 10),
    };
  });
  return { section, sessions, attempts: [] };
}

/* ─────────── 단어 ─────────── */

async function collectVocab(svc: SupabaseClient, studentId: string): Promise<SectionData> {
  const sessions: SessionRecord[] = [];
  const attempts: AttemptRecord[] = [];

  const { data: tests } = await svc
    .from("vocab_test_sessions")
    .select("id, day_number, score, correct_count, total_count, submitted_at, created_at, status")
    .eq("student_id", studentId)
    .in("status", ["submitted", "graded"])
    .order("created_at", { ascending: false })
    .limit(MAX_SESSIONS);
  const testRows = (tests ?? []) as Row[];

  for (const t of testRows) {
    const total = Number(t.total_count ?? 0);
    const correct = Number(t.correct_count ?? 0);
    sessions.push({
      id: String(t.id),
      at: atOf(t),
      label: `단어 시험 Day ${t.day_number ?? "?"}`,
      pct: typeof t.score === "number" ? t.score : pct(correct, total),
      correct,
      total,
    });
  }

  if (testRows.length) {
    const atById = new Map(testRows.map((t) => [String(t.id), atOf(t)]));
    const { data: qs } = await svc
      .from("vocab_test_questions")
      .select("session_id, question_number, word_text, question_type, options, correct_answer, student_answer, is_correct")
      .in("session_id", testRows.map((t) => String(t.id)))
      .not("is_correct", "is", null);
    const TYPE_LABEL: Record<string, string> = {
      word_to_meaning: "단어 → 뜻",
      meaning_to_word: "뜻 → 단어(철자)",
      synonym: "동의어",
      listening: "듣고 고르기",
    };
    for (const q of (qs ?? []) as Row[]) {
      const opts: Row[] = Array.isArray(q.options) ? q.options : [];
      const optText = (id: unknown) => {
        const o = opts.find((x) => String(x.id) === String(id));
        return o?.text ? String(o.text) : null;
      };
      const typed = q.question_type === "meaning_to_word";
      const user = q.student_answer ? (optText(q.student_answer) ?? String(q.student_answer)) : null;
      const right = optText(q.correct_answer) ?? String(q.correct_answer ?? "");
      const ok = q.is_correct === true;
      attempts.push({
        key: `${q.session_id}:${q.question_number}`,
        sessionId: String(q.session_id),
        at: atById.get(String(q.session_id)) ?? "",
        subsection: String(q.question_type),
        subsectionLabel: TYPE_LABEL[String(q.question_type)] ?? String(q.question_type),
        stem: clip(q.word_text),
        userAnswer: user,
        correctAnswer: right || null,
        correct: ok,
        severity: ok ? undefined : typed ? classifyTyped(user, right) : classifyMcq(user),
      });
    }
  }

  // 학습 단계(know/spelling/speed) 시도 — 추이에만 반영한다 (오답은 word id만 저장돼 있음)
  const { data: learn } = await svc
    .from("vocab_learning_attempts")
    .select("id, stage, accuracy, attempted_at")
    .eq("student_id", studentId)
    .order("attempted_at", { ascending: false })
    .limit(MAX_SESSIONS);
  const STAGE: Record<string, string> = { know: "아는 단어 체크", spelling: "스펠링", speed: "스피드" };
  for (const l of (learn ?? []) as Row[]) {
    const acc = typeof l.accuracy === "number" ? l.accuracy : null;
    sessions.push({
      id: String(l.id),
      at: String(l.attempted_at),
      label: `단어 학습 · ${STAGE[l.stage] ?? l.stage}`,
      pct: acc === null ? null : Math.round(acc <= 1 ? acc * 100 : acc),
    });
  }

  return { section: "vocab", sessions, attempts };
}

/* ─────────── 문법·내신 (Hi-내신 드릴) ─────────── */

/** 드릴 응답이 JSON(구간/분류 선택)이면 읽기 좋은 문장으로 바꾼다 */
function prettyAnswer(raw: unknown): string | null {
  if (!raw) return null;
  const t = String(raw);
  if (t.startsWith("{") || t.startsWith("[")) {
    try {
      const j = JSON.parse(t);
      if (Array.isArray(j)) return clip(j.join(" / "), 100);
      const parts: string[] = [];
      if (Array.isArray(j.spans) && j.spans.length) parts.push(`구간: ${j.spans.join(", ")}`);
      if (Array.isArray(j.cats) && j.cats.length) parts.push(`분류: ${j.cats.join(", ")}`);
      if (parts.length) return clip(parts.join(" · "), 100);
    } catch {
      /* 원문 사용 */
    }
  }
  return clip(t, 100);
}

function drillStem(payload: Row): string {
  for (const k of ["question", "prompt", "sentence", "stem", "korean", "ko", "text", "word"]) {
    if (typeof payload?.[k] === "string" && payload[k].trim()) return clip(payload[k]);
  }
  return "(문제 내용 없음)";
}

async function collectGrammar(svc: SupabaseClient, studentId: string): Promise<SectionData> {
  const { data: ss } = await svc
    .from("hi_naesin_sessions")
    .select("id, status, submitted_at, score_percent, created_at")
    .eq("student_id", studentId)
    .eq("session_type", "drill")
    .order("created_at", { ascending: false })
    .limit(MAX_SESSIONS);
  const rows = (ss ?? []) as Row[];
  const submitted = rows.filter((s) => s.status === "submitted");
  const sessions: SessionRecord[] = submitted.map((s) => ({
    id: String(s.id),
    at: atOf(s),
    label: "Hi-내신 드릴",
    pct: typeof s.score_percent === "number" ? Math.round(s.score_percent) : null,
  }));

  const attempts: AttemptRecord[] = [];
  if (rows.length) {
    const atById = new Map(rows.map((s) => [String(s.id), atOf(s)]));
    const { data: resp } = await svc
      .from("hi_naesin_drill_responses")
      .select("id, drill_id, session_id, response_text, response_choice, is_correct, score_pct, created_at")
      .in("session_id", rows.map((s) => String(s.id)));
    const respRows = ((resp ?? []) as Row[]).filter((r) => r.is_correct !== null);
    const drillIds = [...new Set(respRows.map((r) => r.drill_id).filter(Boolean))];
    const { data: drills } = drillIds.length
      ? await svc.from("hi_naesin_drills").select("id, drill_type, payload").in("id", drillIds)
      : { data: [] as Row[] };
    const drillById = new Map(((drills ?? []) as Row[]).map((d) => [String(d.id), d]));
    for (const r of respRows) {
      const d = drillById.get(String(r.drill_id));
      if (!d) continue;
      const category = resolveWeaknessCategory(d.drill_type, d.payload ?? {});
      const ok = r.is_correct === true;
      let severity: Severity | undefined;
      if (!ok) {
        const sp = typeof r.score_pct === "number" ? r.score_pct : 0;
        severity = sp >= 70 ? "slight" : sp >= 40 ? "partial" : "complete";
      }
      attempts.push({
        key: `${r.session_id}:${r.id}`,
        sessionId: String(r.session_id),
        at: String(r.created_at ?? atById.get(String(r.session_id)) ?? ""),
        subsection: category,
        subsectionLabel: category,
        stem: drillStem(d.payload ?? {}),
        userAnswer: prettyAnswer(r.response_text) ?? prettyAnswer(r.response_choice),
        correctAnswer: null,
        correct: ok,
        severity,
      });
    }
  }
  // 세션 점수가 비어 있으면 응답 정오답으로 계산한다
  for (const ses of sessions) {
    if (ses.pct === null) {
      const mine = attempts.filter((a) => a.sessionId === ses.id);
      ses.correct = mine.filter((a) => a.correct).length;
      ses.total = mine.length;
      ses.pct = pct(ses.correct, ses.total);
    }
  }
  return { section: "grammar", sessions, attempts };
}

/* ─────────── 진입점 ─────────── */

export async function collectPerformance(studentId: string): Promise<PerformanceReportData> {
  const svc = getServiceSupabase();

  const jobs: [SectionKey, () => Promise<SectionData>][] = [
    ["reading", () => collectReading(svc, studentId)],
    ["listening", () => collectListening(svc, studentId)],
    ["speaking", () => collectScored(svc, studentId, "speaking")],
    ["writing", () => collectScored(svc, studentId, "writing")],
    ["vocab", () => collectVocab(svc, studentId)],
    ["grammar", () => collectGrammar(svc, studentId)],
  ];

  const sections = await Promise.all(
    jobs.map(async ([key, run]) => {
      try {
        return await run();
      } catch (e) {
        console.error(`[performance] ${key} collect failed:`, e);
        return { section: key, sessions: [], attempts: [] } as SectionData;
      }
    }),
  );

  let feedback: FeedbackRow[] = [];
  try {
    const { data } = await svc
      .from("student_performance_feedback")
      .select("id, section, subsection, question_key, body, updated_at")
      .eq("student_id", studentId);
    feedback = (data ?? []) as FeedbackRow[];
  } catch {
    /* 마이그레이션 적용 전이면 피드백 없이 표시 */
  }

  let studentName = "학생";
  try {
    const { data } = await svc.auth.admin.getUserById(studentId);
    const u = data?.user;
    studentName = u?.user_metadata?.name || u?.user_metadata?.full_name || u?.email || studentName;
  } catch {
    /* ignore */
  }

  return { studentId, studentName, generatedAt: new Date().toISOString(), sections, feedback };
}
