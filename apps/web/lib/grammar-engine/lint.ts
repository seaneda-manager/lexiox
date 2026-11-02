import type { GrammarLesson } from "@/models/middle-naesin/grammar-lesson";

// 확정 전 자동 점검. error 는 확정을 막고, warn 은 눈으로 확인할 것을 알린다.
// 규칙의 근거: docs/GRAMMAR_STYLE_GUIDE.md, docs/GRAMMAR_BOOK_PRODUCTION_PLAN.md (can/may 파일럿에서 나온 오류들)

export type LintIssue = { level: "error" | "warn"; where: string; msg: string };

const MD = /(^|\n)\s{0,3}#{1,6}\s|\*\*|__|`|(^|\n)\s*[-*•·]\s+\S/;
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export function lintLesson(lesson: GrammarLesson): LintIssue[] {
  const out: LintIssue[] = [];
  const add = (level: LintIssue["level"], where: string, msg: string) => out.push({ level, where, msg });

  // 1) 마크다운·목록 기호 흔적 (모든 문자열)
  const walk = (v: unknown, path: string) => {
    if (typeof v === "string") {
      if (MD.test(v.replace(/_{3,}/g, " "))) add("error", path, "마크다운/목록 기호(##, **, `, 줄머리 - * •)가 남아 있습니다.");
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) if (k !== "status" && k !== "version") walk(x, path ? `${path}.${k}` : k);
  };
  walk(lesson, "");

  // 2) 예문: 번역 누락, 번역 칸에 설명 섞임, 중복
  const seen = new Map<string, string>();
  (lesson.exampleGroups ?? []).forEach((g, gi) =>
    g.examples.forEach((e, ei) => {
      const w = `exampleGroups[${gi}].examples[${ei}]`;
      if (!e.ko?.trim()) add("warn", w, "번역(ko)이 없습니다.");
      else if (/→/.test(e.ko)) add("warn", w, "ko 칸에 번역이 아닌 설명(→)이 섞여 있습니다. 설명은 note 로 옮기세요.");
      const k = norm(e.en);
      if (seen.has(k)) add("warn", w, `다른 예문(${seen.get(k)})과 문장이 같습니다.`);
      else seen.set(k, w);
    }),
  );

  // 3) 설명 빈칸: 힌트에 정답이 드러남
  lesson.blanks.forEach((b, i) => {
    if (b.hint && b.answer && norm(b.hint).includes(norm(b.answer))) add("error", `blanks[${i}]`, "힌트에 정답이 그대로 들어 있습니다.");
  });

  // 4) Drill 빈칸
  const fillIdx: number[] = [];
  const fillSeen = new Set<string>();
  lesson.drillFill.forEach((f, i) => {
    const w = `drillFill[${i}]`;
    if (f.choices) {
      const idx = f.choices.findIndex((c) => norm(c) === norm(f.answer));
      if (idx < 0) add("error", w, "정답이 보기(choices)에 없습니다.");
      else fillIdx.push(idx);
      if (new Set(f.choices.map(norm)).size !== f.choices.length) add("error", w, "보기에 같은 항목이 있습니다.");
    }
    if (f.hint && norm(f.hint).includes(norm(f.answer))) add("error", w, "힌트에 정답이 그대로 들어 있습니다.");
    const k = norm(f.sentence);
    if (fillSeen.has(k)) add("warn", w, "같은 문장의 Drill 빈칸이 또 있습니다.");
    fillSeen.add(k);
  });
  if (fillIdx.length >= 4) {
    const top = Math.max(...[0, 1, 2, 3].map((n) => fillIdx.filter((x) => x === n).length));
    if (top === fillIdx.length) add("error", "drillFill", `정답 위치가 모두 같은 자리(${fillIdx[0] + 1}번째)입니다. 보기 순서를 섞으세요.`);
    else if (top / fillIdx.length > 0.6) add("warn", "drillFill", `정답 위치가 한 자리에 ${top}/${fillIdx.length}개 몰려 있습니다.`);
  }

  // 5) Drill 고치기
  lesson.drillFix.forEach((f, i) => {
    const w = `drillFix[${i}]`;
    if (f.ko && /→/.test(f.ko)) add("warn", w, "ko 칸에 번역이 아닌 설명(→)이 섞여 있습니다.");
    if (new Set(f.reasonChoices.map(norm)).size !== f.reasonChoices.length) add("error", w, "이유 보기에 같은 항목이 있습니다.");
  });
  const rIdx = lesson.drillFix.map((f) => f.reasonIndex);
  if (rIdx.length >= 3 && new Set(rIdx).size === 1) add("warn", "drillFix", `이유 정답 위치가 모두 ${rIdx[0] + 1}번째입니다.`);

  // 6) 문제
  const qIdx: number[] = [];
  const stems = new Set<string>();
  lesson.questions.forEach((q, i) => {
    const w = `questions[${i}]`;
    const ens = q.choices.map((c) => norm(c.en));
    if (new Set(ens).size !== ens.length) add("error", w, "보기에 같은 항목이 있습니다.");
    if (q.kind === "count_wrong") {
      const lines = q.stem.split("\n").filter((l) => /^\s*([①-⑩]|\(?\d+[.)])/.test(l));
      if (lines.length < 3) add("error", w, "틀린 문장 개수 문제인데 문제(stem)에 판단할 문장(①②③…)이 3개 이상 없습니다.");
    } else qIdx.push(q.answerIndex);

    q.choices.forEach((c, j) => {
      if (c.ko && /\((정답|오답|틀림|맞음|추측|허락|가능|불가능|능력)[^)]*\)|틀림\)|정답/.test(c.ko)) add("error", `${w}.choices[${j}]`, "보기 해석(ko)에 정답을 알려 주는 표시가 있습니다.");
      if (q.kind === "count_wrong" && c.ko && /[가-힣].*\(/.test(c.ko)) add("error", `${w}.choices[${j}]`, "개수 세기 보기에 괄호 설명이 있습니다(정답 노출 가능).");
    });
    if (/밑줄|굵게/.test(q.stem + (q.stemKo ?? "")) && !/\[b\]/.test(JSON.stringify(q.choices) + q.stem)) add("warn", w, "밑줄/굵게 표시를 말하지만 [b]…[/b] 표시가 어디에도 없습니다.");
    if (!q.explanationKo?.trim()) add("error", w, "해설이 없습니다.");
    const k = norm(q.stem);
    if (stems.has(k)) add("warn", w, "같은 문제(stem)가 또 있습니다.");
    stems.add(k);
  });
  if (qIdx.length >= 5) {
    const count = [0, 1, 2, 3].map((n) => qIdx.filter((x) => x === n).length);
    const top = Math.max(...count);
    const dist = count.map((c, n) => `${"ABCD"[n]} ${c}`).join(" · ");
    if (top / qIdx.length >= 0.7) add("error", "questions", `정답 위치가 한쪽으로 쏠려 있습니다 (${dist}).`);
    else if (top / qIdx.length > 0.5 || (qIdx.length >= 8 && count.some((c) => c === 0))) add("warn", "questions", `정답 위치가 고르지 않습니다 (${dist}).`);
  }

  // 7) 분량
  if (lesson.explanation.rules.length < 3) add("warn", "explanation.rules", "규칙이 3개 미만입니다.");
  if (lesson.drillFill.length < 5) add("warn", "drillFill", "Drill 빈칸이 5개 미만입니다.");
  if (lesson.questions.length < 6) add("warn", "questions", "문제가 6개 미만입니다.");

  return out;
}
