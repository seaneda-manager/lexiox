"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Choice = { text: string; is_correct: boolean; explanation: string };
type Question = { id: string; order_num: number; stem: string; choices: Choice[]; explanation: string | null };
type Passage = { id: string; title: string | null; body: string; toefl_practice_questions: Question[] };

type Props = {
  chapterId: string;
  chapterTitle: string;
  skill: string;
  level: string;
  passages: Passage[];
};

const SKILL_ACCENT: Record<string, string> = {
  reading:   "bg-sky-500 border-sky-500",
  listening: "bg-violet-500 border-violet-500",
  speaking:  "bg-amber-500 border-amber-500",
  writing:   "bg-emerald-500 border-emerald-500",
};

const LEVEL_LABEL: Record<string, string> = { basic: "기본", intermediate: "중급", advanced: "고급" };

export default function PracticeSession({ chapterId, chapterTitle, skill, level, passages }: Props) {
  const router = useRouter();
  const accentCls = SKILL_ACCENT[skill] ?? "bg-neutral-900";

  // 현재 지문 인덱스
  const [passageIdx, setPassageIdx] = useState(0);
  // 문제별 선택한 답 {questionId: choiceIndex}
  const [answers, setAnswers] = useState<Record<string, number>>({});
  // 제출 여부 (지문당)
  const [submitted, setSubmitted] = useState(false);
  // 완료
  const [allDone, setAllDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const passage = passages[passageIdx];
  const questions = passage?.toefl_practice_questions ?? [];
  const totalPassages = passages.length;

  const answeredAll = questions.every((q) => answers[q.id] !== undefined);

  function selectAnswer(qId: string, ci: number) {
    if (submitted) return;
    setAnswers((a) => ({ ...a, [qId]: ci }));
  }

  function handleSubmit() {
    if (!answeredAll) return;
    setSubmitted(true);
  }

  async function handleNext() {
    if (passageIdx < totalPassages - 1) {
      setPassageIdx((i) => i + 1);
      setAnswers({});
      setSubmitted(false);
    } else {
      // 마지막 지문 완료 → 진행상태 저장
      setSaving(true);
      try {
        await fetch("/api/student/toefl/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chapterId, level, step: "practice" }),
        });
      } finally {
        setSaving(false);
      }
      setAllDone(true);
    }
  }

  // 점수 계산 (제출 후)
  const correctCount = submitted
    ? questions.filter((q) => {
        const chosen = answers[q.id];
        return chosen !== undefined && q.choices[chosen]?.is_correct;
      }).length
    : 0;

  // ── 완료 화면 ────────────────────────────────────────────────
  if (allDone) {
    const totalQ = passages.reduce((s, p) => s + p.toefl_practice_questions.length, 0);
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center space-y-6">
        <div className="text-5xl">🎉</div>
        <h1 className="text-2xl font-bold">Practice 완료!</h1>
        <p className="text-neutral-500">
          {totalPassages}개 지문 · {totalQ}개 문제를 모두 풀었어요.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => router.push(`/student/toefl/chapter/${chapterId}`)}
            className={`rounded-xl px-6 py-3 text-sm font-semibold text-white ${accentCls.split(" ")[0]}`}
          >
            챕터로 돌아가기
          </button>
          <button
            onClick={() => router.push("/student")}
            className="rounded-xl border border-neutral-200 px-6 py-3 text-sm hover:bg-neutral-50"
          >
            대시보드
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-0 pb-12">
      {/* 상단 진행바 */}
      <div className="sticky top-0 z-10 bg-white border-b border-neutral-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.push(`/student/toefl/chapter/${chapterId}`)}
          className="text-neutral-400 hover:text-neutral-700 text-sm">←</button>
        <div className="flex-1">
          <p className="text-xs text-neutral-400">{chapterTitle} · {LEVEL_LABEL[level]} · Practice</p>
          <div className="mt-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${accentCls.split(" ")[0]}`}
              style={{ width: `${((passageIdx + (submitted ? 1 : 0)) / totalPassages) * 100}%` }}
            />
          </div>
        </div>
        <span className="text-xs text-neutral-400 shrink-0">{passageIdx + 1} / {totalPassages}</span>
      </div>

      <div className="px-4 pt-6 space-y-6">
        {/* 지문 */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          {passage.title && (
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-3">
              {passage.title}
            </p>
          )}
          <p className="text-sm leading-7 text-neutral-800 font-serif whitespace-pre-wrap">
            {passage.body}
          </p>
        </div>

        {/* 문제들 */}
        <div className="space-y-6">
          {questions.map((q, qi) => {
            const chosen = answers[q.id];
            const correct = q.choices.findIndex((c) => c.is_correct);

            return (
              <div key={q.id} className="space-y-3">
                <p className="text-sm font-semibold leading-snug">
                  <span className="text-neutral-400 mr-2">{qi + 1}.</span>
                  {q.stem}
                </p>
                <div className="space-y-2">
                  {q.choices.map((choice, ci) => {
                    let cls = "border-neutral-200 bg-white hover:bg-neutral-50";
                    if (submitted) {
                      if (ci === correct) cls = "border-emerald-400 bg-emerald-50";
                      else if (ci === chosen && ci !== correct) cls = "border-red-300 bg-red-50";
                      else cls = "border-neutral-100 bg-neutral-50 opacity-60";
                    } else if (chosen === ci) {
                      cls = `border-2 ${accentCls.replace("bg-", "border-")} bg-white`;
                    }

                    return (
                      <button
                        key={ci}
                        type="button"
                        onClick={() => selectAnswer(q.id, ci)}
                        disabled={submitted}
                        className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition ${cls}`}
                      >
                        <span className="font-medium text-neutral-400 mr-2">
                          {String.fromCharCode(65 + ci)}.
                        </span>
                        {choice.text}
                        {/* 제출 후 이유 표시 */}
                        {submitted && (ci === correct || ci === chosen) && choice.explanation && (
                          <p className={`mt-1.5 text-xs ${ci === correct ? "text-emerald-700" : "text-red-500"}`}>
                            {ci === correct ? "✓ " : "✗ "}{choice.explanation}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* 전체 해설 */}
                {submitted && q.explanation && (
                  <div className="rounded-xl bg-neutral-50 border border-neutral-200 px-4 py-3 text-xs text-neutral-600 leading-relaxed">
                    💡 {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 제출 / 다음 버튼 */}
        <div className="pt-2 pb-8">
          {!submitted ? (
            <div className="space-y-2">
              {!answeredAll && (
                <p className="text-center text-xs text-neutral-400">
                  모든 문제에 답을 선택해주세요 ({Object.keys(answers).length}/{questions.length})
                </p>
              )}
              <button
                onClick={handleSubmit}
                disabled={!answeredAll}
                className={`w-full rounded-2xl py-4 text-sm font-bold text-white transition ${
                  answeredAll ? `${accentCls.split(" ")[0]} hover:opacity-90` : "bg-neutral-200 cursor-not-allowed"
                }`}
              >
                정답 확인
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* 결과 요약 */}
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-neutral-600">이번 지문 결과</span>
                <span className="font-bold">
                  {correctCount} / {questions.length} 정답
                </span>
              </div>
              <button
                onClick={handleNext}
                disabled={saving}
                className={`w-full rounded-2xl py-4 text-sm font-bold text-white ${accentCls.split(" ")[0]} hover:opacity-90 transition`}
              >
                {saving ? "저장 중..." : passageIdx < totalPassages - 1 ? "다음 지문 →" : "Practice 완료 🎉"}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
