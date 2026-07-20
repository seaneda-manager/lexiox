// apps/web/components/listening/ListeningAdaptiveRunner2026.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  LListeningTest2026,
  LListeningModule,
  LBaseItem,
} from "@/models/listening";
import Timer from "@/app/protected/reading/components/Timer";

type Props = {
  test: LListeningTest2026;
  onFinish?: (result: {
    testId: string;
    stage1Correct: number;
    stage1Total: number;
    stage2Correct: number;
    stage2Total: number;
  }) => void;
};

type Phase = "intro" | "item" | "stageSummary" | "final";

export default function ListeningAdaptiveRunner2026({ test, onFinish }: Props) {
  const [currentStage, setCurrentStage] = useState<1 | 2>(1);
  const [phase, setPhase] = useState<Phase>("intro");
  const [itemIndex, setItemIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);

  // questionId -> choiceId
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const [stage1Score, setStage1Score] = useState<{ correct: number; total: number } | null>(null);
  const [stage2Score, setStage2Score] = useState<{ correct: number; total: number } | null>(null);
  const [reported, setReported] = useState(false);

  // Stage1 성적으로 확정된 Stage2 분기(hard/easy) — Reading의 ReadingAdaptiveRunner2026과 동일한 패턴
  const [stage2Module, setStage2Module] = useState<LListeningModule | null>(null);

  const resolveStage2Module = useCallback(
    (s1: { correct: number; total: number }): LListeningModule => {
      const pool = test.stage2Pool;
      if (!pool) return test.modules[1];
      const pct = s1.total > 0 ? s1.correct / s1.total : 0;
      return pct >= pool.cutScore ? pool.hard : pool.easy;
    },
    [test.stage2Pool, test.modules]
  );

  const effectiveStage2Module: LListeningModule = useMemo(
    () => stage2Module ?? resolveStage2Module(stage1Score ?? { correct: 0, total: 0 }),
    [stage2Module, stage1Score, resolveStage2Module]
  );

  const currentModule: LListeningModule = useMemo(
    () => (currentStage === 1 ? test.modules[0] : effectiveStage2Module),
    [currentStage, test.modules, effectiveStage2Module]
  );

  const items = currentModule.items;
  const currentItem: LBaseItem | null = items[itemIndex] ?? null;

  useEffect(() => {
    setItemIndex(0);
    setQuestionIndex(0);
  }, [currentModule]);

  useEffect(() => {
    setQuestionIndex(0);
  }, [itemIndex]);

  const handleChoice = useCallback((questionId: string, choiceId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: choiceId }));
  }, []);

  const computeModuleScore = useCallback(
    (module: LListeningModule) => {
      let correct = 0;
      let total = 0;
      for (const item of module.items) {
        for (const q of item.questions) {
          total += 1;
          const user = answers[q.id];
          const correctChoice = q.choices.find((c: any) => c.isCorrect === true || c.is_correct === true || c.correct === true);
          if (user && correctChoice && user === correctChoice.id) correct += 1;
        }
      }
      return { correct, total };
    },
    [answers]
  );

  const handleFinishStage = useCallback(() => {
    const score = computeModuleScore(currentModule);
    if (currentStage === 1) {
      setStage1Score(score);
      setStage2Module(resolveStage2Module(score));
    } else {
      setStage2Score(score);
    }
    setPhase("stageSummary");
  }, [computeModuleScore, currentModule, currentStage, resolveStage2Module]);

  const handleStageSummaryNext = useCallback(() => {
    if (currentStage === 1) {
      setCurrentStage(2);
      setPhase("intro");
    } else {
      setPhase("final");
    }
  }, [currentStage]);

  const handleTimeUp = useCallback(() => {
    const s1 = stage1Score ?? computeModuleScore(test.modules[0]);
    const s2 = computeModuleScore(effectiveStage2Module);
    setStage1Score(s1);
    setStage2Score(s2);
    setPhase("final");
    if (onFinish && !reported) {
      onFinish({ testId: test.meta.id, stage1Correct: s1.correct, stage1Total: s1.total, stage2Correct: s2.correct, stage2Total: s2.total });
      setReported(true);
    }
  }, [computeModuleScore, effectiveStage2Module, onFinish, reported, stage1Score, test]);

  useEffect(() => {
    if (phase !== "final" || !onFinish || reported) return;
    const s1 = stage1Score ?? computeModuleScore(test.modules[0]);
    const s2 = stage2Score ?? computeModuleScore(effectiveStage2Module);
    onFinish({ testId: test.meta.id, stage1Correct: s1.correct, stage1Total: s1.total, stage2Correct: s2.correct, stage2Total: s2.total });
    setReported(true);
  }, [phase, onFinish, reported, stage1Score, stage2Score, computeModuleScore, effectiveStage2Module, test]);

  const isLastItem = itemIndex >= items.length - 1;
  const questions = currentItem?.questions ?? [];
  const isLastQuestion = questionIndex >= questions.length - 1;

  const handleNext = useCallback(() => {
    if (!isLastQuestion) {
      setQuestionIndex((i) => i + 1);
      return;
    }
    if (!isLastItem) {
      setItemIndex((i) => i + 1);
      return;
    }
    handleFinishStage();
  }, [isLastQuestion, isLastItem, handleFinishStage]);

  return (
    <div className="flex h-full flex-col gap-4">
      {/* 상단 헤더 */}
      <header className="flex shrink-0 items-center justify-between gap-4">
        <div>
          <div className="text-xs text-violet-700">Listening · Module {currentStage} of 2</div>
          <h1 className="text-lg font-semibold">{test.meta.label ?? test.meta.id}</h1>
        </div>
        <div className="shrink-0">
          <Timer
            totalSeconds={36 * 60}
            direction="down"
            autoStart
            clampToZero
            showControls={false}
            onExpireAction={handleTimeUp}
            className="rounded-full border border-violet-300 px-4 py-1 text-sm font-medium text-violet-900 bg-violet-50/80"
          />
        </div>
      </header>

      {phase === "intro" && (
        <StageIntroCard stage={currentStage} module={currentModule} onStart={() => setPhase("item")} />
      )}

      {phase === "item" && currentItem && (
        <>
          {/* 항목 탭 */}
          {items.length > 1 && (
            <div className="shrink-0 flex flex-wrap items-center gap-1 border-b pb-2">
              {items.map((it, i) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => setItemIndex(i)}
                  className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
                    i === itemIndex ? "bg-violet-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {i + 1}. {labelForTaskKind(it.taskKind)}
                </button>
              ))}
            </div>
          )}

          <ListeningItemSplitView
            item={currentItem}
            questionIndex={questionIndex}
            onQuestionIndexChange={setQuestionIndex}
            answers={answers}
            onChoice={handleChoice}
          />

          <footer className="shrink-0 flex items-center justify-between border-t pt-3">
            <span className="text-xs text-gray-400">
              {itemIndex + 1} / {items.length} tasks · Q{questionIndex + 1} / {questions.length}
            </span>
            <button
              type="button"
              onClick={handleNext}
              className="rounded-lg border border-violet-500 bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700"
            >
              {!isLastQuestion
                ? "Next Question →"
                : !isLastItem
                ? "Next Task →"
                : currentStage === 1
                ? "Finish Module 1"
                : "Finish Listening Section"}
            </button>
          </footer>
        </>
      )}

      {phase === "stageSummary" && (
        <StageSummaryCard
          stage={currentStage}
          score={currentStage === 1 ? stage1Score ?? computeModuleScore(test.modules[0]) : stage2Score ?? computeModuleScore(effectiveStage2Module)}
          onNext={handleStageSummaryNext}
        />
      )}

      {phase === "final" && (
        <FinalSummaryCard
          stage1={stage1Score ?? computeModuleScore(test.modules[0])}
          stage2={stage2Score ?? computeModuleScore(effectiveStage2Module)}
        />
      )}
    </div>
  );
}

/* ----------------------
 *  좌: 사진/오디오/스크립트 | 우: 문제 1개씩 네비게이션
 * --------------------*/
function ListeningItemSplitView({
  item,
  questionIndex,
  onQuestionIndexChange,
  answers,
  onChoice,
}: {
  item: LBaseItem;
  questionIndex: number;
  onQuestionIndexChange: (i: number) => void;
  answers: Record<string, string>;
  onChoice: (questionId: string, choiceId: string) => void;
}) {
  const q = item.questions[questionIndex];
  const answered = q ? answers[q.id] : undefined;

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* ── 좌: 사진 + 오디오 + (연습용) 스크립트 ── */}
      <div className="w-1/2 h-full overflow-y-auto border-r bg-white p-4">
        {item.illustrationUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.illustrationUrl} alt="" className="mb-3 w-full rounded-lg border object-cover" />
        ) : (
          <div className="mb-3 flex aspect-video w-full items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-400">
            No illustration
          </div>
        )}

        <div className="mb-3 rounded-lg border border-violet-100 bg-violet-50/60 p-3">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-violet-600">Audio</p>
          {item.audioUrl ? (
            <audio controls className="w-full">
              <source src={item.audioUrl} />
            </audio>
          ) : (
            <p className="text-[11px] text-violet-700/70">오디오 미등록 — 아래 스크립트로 연습하세요.</p>
          )}
        </div>

        {item.transcript && (
          <details className="text-xs text-gray-600" open={!item.audioUrl}>
            <summary className="cursor-pointer text-[11px] font-medium text-gray-500">스크립트 (연습용)</summary>
            <p className="mt-1 whitespace-pre-wrap leading-relaxed">{item.transcript}</p>
          </details>
        )}
      </div>

      {/* ── 우: 문제 ── */}
      <div className="w-1/2 h-full flex flex-col bg-gray-50">
        {item.questions.length > 1 && (
          <div className="shrink-0 flex flex-wrap gap-1 border-b bg-white px-4 py-2">
            {item.questions.map((qq, i) => {
              const done = !!answers[qq.id];
              return (
                <button
                  key={qq.id}
                  type="button"
                  onClick={() => onQuestionIndexChange(i)}
                  className={`h-7 w-7 rounded text-xs font-medium transition ${
                    i === questionIndex
                      ? "bg-violet-600 text-white"
                      : done
                      ? "bg-violet-100 text-violet-800"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {qq.number ?? i + 1}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5">
          {q && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-gray-900 leading-snug">{q.stem}</p>
              <div className="space-y-2">
                {q.choices.map((c: any) => {
                  const selected = answered === c.id;
                  return (
                    <label
                      key={c.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${
                        selected ? "border-violet-500 bg-violet-50 text-violet-900" : "border-gray-200 bg-white text-gray-700 hover:border-violet-300 hover:bg-violet-50/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        checked={selected}
                        onChange={() => onChoice(q.id, c.id)}
                        className="mt-0.5 shrink-0 accent-violet-600"
                      />
                      <span>{c.text}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ----------------------
 *  UX 카드들
 * --------------------*/

function StageIntroCard({ stage, module, onStart }: { stage: 1 | 2; module: LListeningModule; onStart: () => void }) {
  const itemCount = module.items.length;
  const qCount = module.items.reduce((n, it) => n + it.questions.length, 0);
  return (
    <section className="rounded-xl border border-violet-200 bg-violet-50/70 p-4 text-sm text-violet-950">
      <h2 className="mb-1 text-sm font-semibold">
        Stage {stage} Overview ({itemCount} tasks · {qCount} questions)
      </h2>
      <p className="mb-2 text-xs">
        {stage === 1
          ? "You will hear short responses, conversations, announcements, and an academic talk. Focus on the main idea and key details."
          : "This stage continues with similar task types. Use your experience from Stage 1 to manage your time and attention."}
      </p>
      <button
        type="button"
        onClick={onStart}
        className="rounded-lg border border-violet-500 bg-white px-4 py-1.5 text-xs font-medium text-violet-800 shadow-sm hover:bg-violet-50"
      >
        Start Module {stage}
      </button>
    </section>
  );
}

function StageSummaryCard({ stage, score, onNext }: { stage: 1 | 2; score: { correct: number; total: number }; onNext: () => void }) {
  const pct = score.total ? Math.round((score.correct / score.total) * 100) : 0;
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
      <h2 className="mb-1 text-sm font-semibold text-slate-900">Stage {stage} Summary</h2>
      <p className="mb-2 text-xs text-slate-600">
        You answered <strong>{score.correct}</strong> out of <strong>{score.total}</strong> questions correctly (<strong>{pct}%</strong>).
      </p>
      <button
        type="button"
        onClick={onNext}
        className="rounded-lg border border-violet-500 bg-violet-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-violet-700"
      >
        {stage === 1 ? "Go to Module 2" : "View Final Summary"}
      </button>
    </section>
  );
}

function FinalSummaryCard({ stage1, stage2 }: { stage1: { correct: number; total: number }; stage2: { correct: number; total: number } }) {
  const totalCorrect = stage1.correct + stage2.correct;
  const totalQ = stage1.total + stage2.total;
  const pct = totalQ ? Math.round((totalCorrect / totalQ) * 100) : 0;

  return (
    <section className="rounded-xl border border-violet-300 bg-white p-4 text-sm shadow-sm">
      <h2 className="mb-2 text-sm font-semibold text-violet-900">Listening Section Summary</h2>
      <div className="mb-3 grid gap-3 text-xs md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-1 text-[11px] font-semibold text-slate-500">Stage 1</div>
          <div className="text-sm font-semibold text-slate-900">{stage1.correct} / {stage1.total}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-1 text-[11px] font-semibold text-slate-500">Stage 2</div>
          <div className="text-sm font-semibold text-slate-900">{stage2.correct} / {stage2.total}</div>
        </div>
        <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
          <div className="mb-1 text-[11px] font-semibold text-violet-700">Overall</div>
          <div className="text-sm font-semibold text-violet-900">{totalCorrect} / {totalQ} ({pct}%)</div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------
 *  Helpers
 * --------------------*/

function labelForTaskKind(kind: LBaseItem["taskKind"]): string {
  switch (kind) {
    case "short_response":
    case "choose_best_response":
      return "Choose the Best Response";
    case "conversation":
      return "Conversation";
    case "announcement":
    case "campus_audio_log":
      return "Announcement";
    case "academic_talk":
    case "academic_lecture":
      return "Academic Lecture";
    default:
      return kind;
  }
}
