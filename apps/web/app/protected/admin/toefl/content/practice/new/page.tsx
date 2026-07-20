"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SKILLS = ["reading", "listening", "speaking", "writing"] as const;
const LEVELS = [
  { key: "basic",        label: "기본",   desc: "100~150 words" },
  { key: "intermediate", label: "중급",   desc: "200~250 words" },
  { key: "advanced",     label: "고급",   desc: "300+ words" },
] as const;

const FOCUS_BY_SKILL: Record<string, string[]> = {
  reading:   ["main_idea","detail","negative_detail","vocab","inference","rhetorical_purpose","insertion","paraphrasing","summary"],
  listening: ["main_idea","detail","function","attitude","inference","organization","connecting_content"],
  speaking:  ["independent","integrated_read_listen","integrated_listen"],
  writing:   ["integrated","academic_discussion","independent"],
};

type Choice = { text: string; is_correct: boolean; explanation: string };
type Question = { stem: string; choices: Choice[]; explanation: string };

function emptyQuestion(): Question {
  return {
    stem: "",
    explanation: "",
    choices: [
      { text: "", is_correct: false, explanation: "" },
      { text: "", is_correct: false, explanation: "" },
      { text: "", is_correct: false, explanation: "" },
      { text: "", is_correct: false, explanation: "" },
    ],
  };
}

export default function NewPracticePage() {
  const router = useRouter();

  // 메타데이터
  const [skill, setSkill]       = useState<typeof SKILLS[number]>("reading");
  const [level, setLevel]       = useState("basic");
  const [focusType, setFocus]   = useState("");
  const [title, setTitle]       = useState("");
  const [sourceNotes, setNotes] = useState("");

  // 지문
  const [body, setBody] = useState("");

  // 문제 목록
  const [questions, setQuestions] = useState<Question[]>([emptyQuestion()]);

  const [saving, setSaving]     = useState(false);
  const [publishing, setPub]    = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;

  // ── 문제 조작 ─────────────────────────────────────────────────
  function updateQuestion(qi: number, patch: Partial<Question>) {
    setQuestions((qs) => qs.map((q, i) => (i === qi ? { ...q, ...patch } : q)));
  }
  function updateChoice(qi: number, ci: number, patch: Partial<Choice>) {
    setQuestions((qs) =>
      qs.map((q, i) =>
        i !== qi ? q : { ...q, choices: q.choices.map((c, j) => (j === ci ? { ...c, ...patch } : c)) }
      )
    );
  }
  function setCorrect(qi: number, ci: number) {
    setQuestions((qs) =>
      qs.map((q, i) =>
        i !== qi ? q : {
          ...q,
          choices: q.choices.map((c, j) => ({ ...c, is_correct: j === ci })),
        }
      )
    );
  }
  function addQuestion() {
    setQuestions((qs) => [...qs, emptyQuestion()]);
  }
  function removeQuestion(qi: number) {
    setQuestions((qs) => qs.filter((_, i) => i !== qi));
  }

  // ── 저장 ──────────────────────────────────────────────────────
  async function save(publish: boolean) {
    setError(null);
    publish ? setPub(true) : setSaving(true);
    try {
      const res = await fetch("/api/admin/toefl/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skill, level,
          focus_type: focusType || null,
          title: title || null,
          body,
          source_notes: sourceNotes || null,
          is_published: publish,
          questions,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { id } = await res.json();
      router.push(`/admin/toefl/content/practice/${id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
      setPub(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-8">
      <header className="space-y-1">
        <div className="text-xs uppercase tracking-widest text-neutral-400">
          Admin / TOEFL / Practice / 새 지문
        </div>
        <h1 className="text-2xl font-semibold">Practice 지문 작성</h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">

        {/* ── 왼쪽: 지문 ─────────────────────────────────────── */}
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1">지문 제목 (선택)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. The Migration of Monarch Butterflies"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium">지문 본문</label>
              <span className={`text-xs ${wordCount < 80 ? "text-amber-500" : "text-neutral-400"}`}>
                {wordCount} words
              </span>
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              placeholder="지문을 여기에 입력하세요..."
              className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-neutral-900 resize-none font-serif"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">출처/제작 메모</label>
            <input
              type="text"
              value={sourceNotes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. 자체 제작, 기본 레벨용"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          {/* ── 문제 섹션 ──────────────────────────────────── */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">문제 ({questions.length}개)</h2>
              <button
                type="button"
                onClick={addQuestion}
                className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs hover:bg-neutral-50 transition"
              >
                + 문제 추가
              </button>
            </div>

            {questions.map((q, qi) => (
              <div key={qi} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-500">Q{qi + 1}</span>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuestion(qi)}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      삭제
                    </button>
                  )}
                </div>

                {/* 문제 본문 */}
                <textarea
                  value={q.stem}
                  onChange={(e) => updateQuestion(qi, { stem: e.target.value })}
                  rows={2}
                  placeholder="What is the main idea of the passage?"
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 resize-none"
                />

                {/* 선택지 */}
                <div className="space-y-2">
                  {q.choices.map((c, ci) => (
                    <div key={ci} className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() => setCorrect(qi, ci)}
                        className={[
                          "mt-2 h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition",
                          c.is_correct
                            ? "border-emerald-500 bg-emerald-500"
                            : "border-neutral-300 hover:border-neutral-500",
                        ].join(" ")}
                      >
                        {c.is_correct && <span className="text-white text-[10px]">✓</span>}
                      </button>
                      <div className="flex-1 space-y-1">
                        <input
                          type="text"
                          value={c.text}
                          onChange={(e) => updateChoice(qi, ci, { text: e.target.value })}
                          placeholder={`선택지 ${String.fromCharCode(65 + ci)}`}
                          className={[
                            "w-full rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900",
                            c.is_correct ? "border-emerald-200 bg-emerald-50" : "border-neutral-200 bg-white",
                          ].join(" ")}
                        />
                        <input
                          type="text"
                          value={c.explanation}
                          onChange={(e) => updateChoice(qi, ci, { explanation: e.target.value })}
                          placeholder={c.is_correct ? "정답 이유..." : "오답 이유..."}
                          className="w-full rounded-lg border border-neutral-100 bg-white px-3 py-1 text-xs text-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-300"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* 전체 해설 */}
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">전체 해설 (선택)</label>
                  <textarea
                    value={q.explanation}
                    onChange={(e) => updateQuestion(qi, { explanation: e.target.value })}
                    rows={2}
                    placeholder="이 문제의 핵심 포인트..."
                    className="w-full rounded-lg border border-neutral-100 bg-white px-3 py-2 text-xs text-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-300 resize-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 오른쪽: 메타데이터 ─────────────────────────── */}
        <div className="space-y-5 lg:sticky lg:top-6">
          {/* 스킬 */}
          <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
            <h3 className="text-sm font-semibold">스킬</h3>
            <div className="grid grid-cols-2 gap-1.5">
              {SKILLS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setSkill(s); setFocus(""); }}
                  className={[
                    "rounded-lg border py-2 text-xs font-medium transition capitalize",
                    skill === s
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 hover:bg-neutral-50",
                  ].join(" ")}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* 레벨 */}
          <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
            <h3 className="text-sm font-semibold">레벨</h3>
            <div className="space-y-1.5">
              {LEVELS.map((lv) => (
                <button
                  key={lv.key}
                  type="button"
                  onClick={() => setLevel(lv.key)}
                  className={[
                    "w-full flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition",
                    level === lv.key
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 hover:bg-neutral-50",
                  ].join(" ")}
                >
                  <span className="font-medium">{lv.label}</span>
                  <span className={`text-xs ${level === lv.key ? "text-neutral-300" : "text-neutral-400"}`}>
                    {lv.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Focus Type */}
          <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
            <h3 className="text-sm font-semibold">문제 유형 (Focus)</h3>
            <div className="flex flex-wrap gap-1.5">
              {(FOCUS_BY_SKILL[skill] ?? []).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFocus(f === focusType ? "" : f)}
                  className={[
                    "rounded-full border px-3 py-1 text-xs transition",
                    focusType === f
                      ? "border-sky-500 bg-sky-500 text-white"
                      : "border-neutral-200 hover:bg-neutral-50",
                  ].join(" ")}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* 저장 버튼 */}
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => save(true)}
              disabled={!body.trim() || publishing || saving}
              className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-40 transition"
            >
              {publishing ? "게시 중..." : "저장 및 게시"}
            </button>
            <button
              type="button"
              onClick={() => save(false)}
              disabled={!body.trim() || saving || publishing}
              className="w-full rounded-xl border border-neutral-200 py-3 text-sm hover:bg-neutral-50 disabled:opacity-40 transition"
            >
              {saving ? "저장 중..." : "임시 저장"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
