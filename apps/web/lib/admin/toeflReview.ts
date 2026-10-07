// apps/web/lib/admin/toeflReview.ts
//
// Updated TOEFL(Reading/Listening/Speaking/Writing) 시험 검수 + 삭제 공용 로직.
// 검수는 두 단계: (1) 비용 0의 구조 검사(정답 개수·토큰 순서·필수 필드 등) →
// (2) AI가 정답을 모른 채 실제로 풀어보고(blind solve) 문항 결함을 지적.
import type { AssignableSection } from "@/lib/supabase/assignment-guard";

export type ToeflSection = AssignableSection;

export const SECTION_TABLE: Record<ToeflSection, string> = {
  reading: "reading_tests_2026",
  listening: "listening_tests_2026",
  speaking: "speaking_tests",
  writing: "writing_tests",
};

export function isToeflSection(v: unknown): v is ToeflSection {
  return v === "reading" || v === "listening" || v === "speaking" || v === "writing";
}

export type Severity = "error" | "warn";
export interface ReviewIssue {
  severity: Severity;
  where: string;
  message: string;
  source: "structure" | "ai";
}

// ───────────────────────── 공통 헬퍼 ─────────────────────────

const stripHtml = (s: unknown) =>
  String(s ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isCorrectChoice = (c: any) => c?.correct === true || c?.isCorrect === true || c?.is_correct === true;

/** Stage1 + Stage2 기본 + adaptive pool(hard/easy)의 모든 item/track을 평탄화 */
function collectItems(payload: any): any[] {
  const out: any[] = [];
  const pushAll = (arr: unknown) => Array.isArray(arr) && out.push(...arr);
  for (const m of payload?.modules ?? []) pushAll(m?.items);
  pushAll(payload?.stage2Pool?.hard?.items);
  pushAll(payload?.stage2Pool?.easy?.items);
  // 레거시 listening 구조
  pushAll(payload?.tracks);
  pushAll(payload?.hard?.tracks);
  pushAll(payload?.easy?.tracks);
  return out;
}

// ───────────────────────── 단위(Unit) 추출 ─────────────────────────

export interface McqQuestion {
  stem: string;
  choices: string[];
  correct: number[]; // 정답 인덱스
  selectCount: number;
  table?: { headers: string[]; rows: string[][] };
  transcript?: string; // choose_response 처럼 문항별 스크립트가 있을 때
}
export interface BlindUnit {
  id: string;
  label: string;
  context: string; // 지문 / 스크립트
  questions: McqQuestion[];
  blanks?: { order: number; answer: string }[]; // complete_words
}

function toMcq(q: any): McqQuestion {
  const choices = Array.isArray(q?.choices) ? q.choices : [];
  let correct = choices.map((c: any, i: number) => (isCorrectChoice(c) ? i : -1)).filter((i: number) => i >= 0);
  if (correct.length === 0 && Array.isArray(q?.correctIndices)) correct = q.correctIndices;
  return {
    stem: stripHtml(q?.stem),
    choices: choices.map((c: any) => stripHtml(c?.text)),
    correct,
    selectCount: Number(q?.selectCount) > 1 ? Number(q.selectCount) : 1,
    table: q?.tableData,
    transcript: q?.transcript,
  };
}

export function extractBlindUnits(section: ToeflSection, payload: any): BlindUnit[] {
  if (section !== "reading" && section !== "listening") return [];
  const units: BlindUnit[] = [];
  collectItems(payload).forEach((item, i) => {
    const kind = item?.taskKind ?? "item";
    const id = String(item?.id ?? `item-${i + 1}`);
    if (section === "reading" && kind === "complete_words") {
      units.push({
        id,
        label: `Complete the Words #${i + 1}`,
        context: stripHtml(item.paragraphHtml),
        questions: [],
        blanks: (item.blanks ?? []).map((b: any) => ({ order: b.order, answer: String(b.correctToken ?? "") })),
      });
      return;
    }
    const context =
      section === "reading"
        ? stripHtml(item.passageHtml ?? item.contentHtml)
        : String(item.transcript ?? "");
    units.push({
      id,
      label: `${kind} #${i + 1}${item.title ? ` (${item.title})` : ""}`,
      context,
      questions: (item.questions ?? []).map(toMcq),
    });
  });
  return units;
}

// ───────────────────────── 구조 검사 ─────────────────────────

export function structuralChecks(section: ToeflSection, payload: any): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const add = (severity: Severity, where: string, message: string) =>
    issues.push({ severity, where, message, source: "structure" });

  if (!payload || typeof payload !== "object") {
    add("error", "payload", "payload가 비어 있거나 객체가 아닙니다.");
    return issues;
  }

  if (section === "reading" || section === "listening") {
    const units = extractBlindUnits(section, payload);
    if (units.length === 0) add("error", "payload", "문항(item)이 하나도 없습니다.");
    const rawItems = collectItems(payload);

    units.forEach((u, ui) => {
      const raw = rawItems[ui];
      if (!u.context) {
        add(
          section === "listening" ? "warn" : "error",
          u.label,
          section === "listening" ? "transcript가 없어 AI 검수/스터디 모드가 불가합니다." : "지문이 비어 있습니다."
        );
      }
      if (section === "listening" && !raw?.audioUrl) {
        const allQHaveAudio = (raw?.questions ?? []).length > 0 && (raw.questions as any[]).every((q) => q?.audioUrl);
        if (!allQHaveAudio) add("error", u.label, "audioUrl이 없습니다 (학생이 재생할 수 없음).");
      }
      u.blanks?.forEach((b) => {
        if (!b.answer.trim()) add("error", `${u.label} / 빈칸 ${b.order}`, "정답(correctToken)이 비어 있습니다.");
      });
      if (!u.blanks && u.questions.length === 0) add("error", u.label, "문제가 없습니다.");
      u.questions.forEach((q, qi) => {
        const where = `${u.label} / Q${qi + 1}`;
        if (!q.stem) add("error", where, "문제 본문(stem)이 비어 있습니다.");
        if (q.choices.length < 2) add("error", where, `선택지가 ${q.choices.length}개뿐입니다.`);
        if (q.choices.some((c) => !c)) add("error", where, "비어 있는 선택지가 있습니다.");
        if (new Set(q.choices.map((c) => c.toLowerCase())).size < q.choices.length)
          add("warn", where, "중복된 선택지가 있습니다.");
        if (q.correct.length === 0) add("error", where, "정답이 지정되지 않았습니다.");
        else if (q.correct.length !== q.selectCount)
          add("error", where, `정답이 ${q.correct.length}개인데 선택 개수는 ${q.selectCount}개입니다.`);
        if (q.correct.some((i) => i < 0 || i >= q.choices.length))
          add("error", where, "정답 인덱스가 선택지 범위를 벗어났습니다.");
      });
    });
  }

  if (section === "writing") {
    const items: any[] = payload.items ?? [];
    if (items.length === 0) add("error", "payload", "items가 없습니다.");
    for (const it of items) {
      const w = `${it.taskKind ?? "item"} (${it.id ?? "?"})`;
      if (it.taskKind === "build_a_sentence") {
        if ((it.questions ?? []).length !== 10) add("warn", w, `문항이 ${(it.questions ?? []).length}개입니다 (기대: 10).`);
        for (const q of it.questions ?? []) {
          const ids = (q.tokens ?? []).map((t: any) => t.id);
          const order: string[] = q.correctOrder ?? [];
          const ok =
            order.length === ids.length &&
            order.every((x) => ids.includes(x)) &&
            new Set(order).size === order.length;
          if (!ok) add("error", `${w} / ${q.id}`, "correctOrder가 tokens의 id와 일치하지 않습니다.");
        }
      } else if (it.taskKind === "email") {
        for (const f of ["recipient", "subjectLine", "situation"])
          if (!String(it[f] ?? "").trim()) add("error", w, `${f}가 비어 있습니다.`);
        if ((it.hints ?? []).length !== 3) add("warn", w, `hints가 ${(it.hints ?? []).length}개입니다 (기대: 3).`);
      } else if (it.taskKind === "academic_discussion") {
        if (!String(it.professorPrompt ?? "").trim()) add("error", w, "professorPrompt가 비어 있습니다.");
        if ((it.studentPosts ?? []).length !== 2) add("warn", w, `studentPosts가 ${(it.studentPosts ?? []).length}개입니다 (기대: 2).`);
      }
    }
  }

  if (section === "speaking") {
    const tasks: any[] = payload.tasks ?? [];
    if (tasks.length === 0) add("error", "payload", "tasks가 없습니다.");
    for (const t of tasks) {
      if (t.type === "listen_repeat") {
        const n = (t.sentences ?? []).length;
        if (n !== 7) add("warn", "listen_repeat", `문장이 ${n}개입니다 (기대: 7).`);
        for (const s of t.sentences ?? [])
          if (!String(s.text ?? "").trim()) add("error", `listen_repeat / ${s.id}`, "문장이 비어 있습니다.");
      } else if (t.type === "interview") {
        const n = (t.questions ?? []).length;
        if (n !== 4) add("warn", "interview", `질문이 ${n}개입니다 (기대: 4).`);
        for (const q of t.questions ?? [])
          if (!String(q.text ?? "").trim()) add("error", `interview / ${q.id}`, "질문이 비어 있습니다.");
      }
    }
  }

  return issues;
}

// ───────────────────────── AI 프롬프트 ─────────────────────────

const L = (i: number) => String.fromCharCode(65 + i);

/** 정답/해설을 뺀 blind 프롬프트 (units를 chunk 단위로 호출) */
export function buildBlindPrompt(section: "reading" | "listening", units: BlindUnit[]): string {
  const body = units
    .map((u) => {
      if (u.blanks) {
        return `=== UNIT id="${u.id}" (${u.label}) ===\n단락 (빈칸은 __ 로 표시, 총 ${u.blanks.length}개):\n${u.context}`;
      }
      const qs = u.questions
        .map((q, qi) => {
          const tbl = q.table ? `\n표:\n${q.table.headers.join(" | ")}\n${q.table.rows.map((r) => r.join(" | ")).join("\n")}` : "";
          const own = q.transcript ? `\n(이 문항 스크립트) ${q.transcript}` : "";
          const multi = q.selectCount > 1 ? ` (정답 ${q.selectCount}개 선택, 예: "A,C")` : "";
          return `Q${qi + 1}. ${q.stem}${multi}${own}${tbl}\n${q.choices.map((c, ci) => `${L(ci)}. ${c}`).join("\n")}`;
        })
        .join("\n\n");
      const head = section === "reading" ? "지문" : "스크립트(원래는 오디오)";
      return `=== UNIT id="${u.id}" (${u.label}) ===\n${head}:\n${u.context}\n\n${qs}`;
    })
    .join("\n\n");

  return `당신은 TOEFL iBT(2026 개정판) ${section === "reading" ? "Reading" : "Listening"} 시험을 막 치르는 상위권 수험생입니다. 정답을 모르는 상태에서 아래 문제를 실제로 풀고, 동시에 까다로운 검수자로서 문항 자체의 결함을 찾으세요.

결함 기준:
- 정답이 2개 이상 그럴듯하거나, 정답이 하나도 없는 문제
- 지문/스크립트에 근거가 없는 내용을 묻는 문제
- 문법·어휘가 부자연스러운 영어
- complete_words: 문맥만으로 단어를 확정할 수 없는 빈칸
- 표 문항: 표와 스크립트 불일치가 정확히 1곳이 아닌 경우

${body}

각 UNIT에 대해: 일반 문제는 choiceAnswers(문제 순서대로 "A" 또는 "A,C"), complete_words는 blankGuesses(빈칸 순서대로 완성한 단어)를 채우세요. 결함이 있으면 problems에 한국어로 "Q번호: 이유" 형식으로 짧게 적고, 없으면 빈 배열.

반드시 아래 JSON만 응답하세요(코드블록·설명 금지):
{"units":[{"unitId":"...","choiceAnswers":[],"blankGuesses":[],"problems":[]}],"overallProblems":[]}`;
}

/** Speaking / Writing 은 정답이 없으므로 규격 준수·자연스러움·난이도 검수 */
export function buildContentReviewPrompt(section: "speaking" | "writing", payload: any): string {
  const spec =
    section === "speaking"
      ? `Updated TOEFL Speaking 규격: Listen & Repeat 문장 7개(1-2번 9-11음절 쉬움, 3-5번 14-16음절 보통, 6-7번 19-23음절 어려움, 상황에 맞는 자연스러운 구어체), Interview 질문 4개(경험→선호→일반/비교→사회적 의견 순으로 깊어짐).`
      : `Updated TOEFL Writing 규격: Build a Sentence 10문항(앞 3개 쉬움/중간 4개/뒤 3개 어려움, 토큰을 correctOrder대로 배열하면 contextLeadIn/Out과 자연스럽게 이어지는 문법적으로 올바른 하나의 문장이 되어야 하며, 다른 배열도 정답이 될 수 있으면 결함), Email(100-120단어, hints 3개), Academic Discussion(교수 질문 + 상반된 학생 글 2개).`;
  const compact = JSON.stringify(payload, (k, v) => (k === "audioUrl" || k === "illustrationUrl" ? undefined : v));
  return `당신은 TOEFL 출제 검수자입니다. 아래 시험 JSON을 검수하세요.
${spec}

검수 항목: 규격 위반, 부자연스럽거나 문법적으로 틀린 영어, 난이도 배치 오류, 모호하거나 정답이 둘 이상인 문항, 학생에게 부적절한 내용.
Writing build_a_sentence는 각 문항의 correctOrder 순서로 토큰을 이어 붙였을 때 실제로 올바른 문장이 되는지 직접 확인하세요.

시험 JSON:
${compact}

반드시 아래 JSON만 응답하세요(코드블록·설명 금지). 문제 없으면 빈 배열:
{"issues":[{"severity":"error|warn","where":"위치(예: q3, interview/q9)","message":"한국어로 짧게"}]}`;
}

export function parseJsonLoose(raw: string): any {
  const s = raw.indexOf("{");
  const e = raw.lastIndexOf("}");
  if (s === -1 || e === -1) throw new Error("AI 응답에서 JSON을 찾을 수 없습니다.");
  return JSON.parse(raw.slice(s, e + 1));
}

/** blind 풀이 결과를 정답표와 대조 */
export function scoreBlind(units: BlindUnit[], modelUnits: any[]) {
  const issues: ReviewIssue[] = [];
  let total = 0;
  let correct = 0;
  for (const u of units) {
    const m = modelUnits.find((x) => x?.unitId === u.id) ?? {};
    for (const p of Array.isArray(m.problems) ? m.problems : [])
      issues.push({ severity: "warn", where: u.label, message: String(p), source: "ai" });

    if (u.blanks) {
      const guesses: string[] = Array.isArray(m.blankGuesses) ? m.blankGuesses : [];
      u.blanks.forEach((b, i) => {
        total++;
        const ok = String(guesses[i] ?? "").trim().toLowerCase() === b.answer.trim().toLowerCase();
        if (ok) correct++;
        else
          issues.push({
            severity: "warn",
            where: `${u.label} / 빈칸 ${b.order}`,
            message: `AI 응시자가 "${guesses[i] ?? "(무응답)"}"로 답함 (정답: ${b.answer}) — 정답이 유일한지 확인`,
            source: "ai",
          });
      });
      continue;
    }

    const answers: string[] = Array.isArray(m.choiceAnswers) ? m.choiceAnswers : [];
    u.questions.forEach((q, qi) => {
      total++;
      const picked = String(answers[qi] ?? "")
        .toUpperCase()
        .split(/[^A-Z]+/)
        .filter(Boolean)
        .map((c) => c.charCodeAt(0) - 65)
        .sort();
      const key = [...q.correct].sort();
      const ok = picked.length === key.length && picked.every((v, i) => v === key[i]);
      if (ok) correct++;
      else
        issues.push({
          severity: "warn",
          where: `${u.label} / Q${qi + 1}`,
          message: `AI 응시자 답: ${answers[qi] ?? "(무응답)"} / 정답키: ${key.map(L).join(",") || "?"} — 정답키 오류 또는 모호한 문항일 수 있음`,
          source: "ai",
        });
    });
  }
  return { issues, total, correct };
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
