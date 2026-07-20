// apps/web/app/(protected)/vocab/exam/page.tsx
"use client";

import { useMemo, useState } from "react";
import { demoVocabWords } from "@/models/vocab-demo";
import type { VocabWordCore } from "@/models/vocab";

type Phase = "review" | "exam" | "result";

type QuestionType = "WORD_TO_MEANING" | "MEANING_TO_WORD" | "SENTENCE_FILL";

type BaseQuestion = {
  id: string;
  type: QuestionType;
};

type WordToMeaningQuestion = BaseQuestion & {
  type: "WORD_TO_MEANING";
  word: VocabWordCore;
  choices: string[]; // 한국어 뜻 보기들
  correct: string;
};

type MeaningToWordQuestion = BaseQuestion & {
  type: "MEANING_TO_WORD";
  meaning: string; // 한국어 뜻
  easySyn?: string; // (괄호 안 영어 동의어)
  choices: string[]; // 영어 단어 보기들
  correct: string;
};

type SentenceFillQuestion = BaseQuestion & {
  type: "SENTENCE_FILL";
  sentenceKo: string; // 해석용 / 힌트
  sentenceEnWithBlank: string; // 빈칸 포함 문장
  answer: string; // 정답 단어
  pool: string[]; // 단어 박스에 표시될 단어들
};

type Question =
  | WordToMeaningQuestion
  | MeaningToWordQuestion
  | SentenceFillQuestion;

type UserAnswer = {
  questionId: string;
  answer: string; // 선택한 단어 or 뜻
  translationKo?: string; // 문장 해석 (SentenceFill에서만)
};

type ScoreSummary = {
  correctCount: number;
  autoGradableCount: number;
  rate: number;
};

export default function VocabExamPage() {
  const [phase, setPhase] = useState<Phase>("review");
  const [reviewIndex, setReviewIndex] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const [isSaving, setIsSaving] = useState(false);
  const [saveDone, setSaveDone] = useState<null | "ok" | "error">(null);

  // 🔹 데모용: 오늘 단어/지난 단어 분리
  const todayWords = demoVocabWords.slice(0, 2);
  const yesterdayWords = demoVocabWords.slice(2, 3);

  // 🔹 Exam용 질문 세트 구성
  const questions: Question[] = useMemo(() => {
    const qs: Question[] = [];

    // Part A – Word -> Meaning (오늘 것)
    for (const w of todayWords) {
      const coreMeaning = w.meanings_ko[0] ?? "뜻 미정";
      const distractors = ["줄이다", "숨기다", "옮기다", "늘리다"].filter(
        (m) => m !== coreMeaning,
      );
      const choices = shuffle([coreMeaning, ...distractors.slice(0, 3)]);
      qs.push({
        id: `A-${w.id}`,
        type: "WORD_TO_MEANING",
        word: w,
        choices,
        correct: coreMeaning,
      });
    }

    // Part B – Meaning -> Word (지난 수업 것)
    for (const w of yesterdayWords) {
      const coreMeaning = w.meanings_ko[0] ?? "뜻 미정";
      const easySyn = w.meanings_en_simple[0] ?? "";

      const wordChoices = shuffle(
        [w, ...todayWords]
          .map((x) => x.text)
          .filter((v, idx, arr) => arr.indexOf(v) === idx),
      );

      qs.push({
        id: `B-${w.id}`,
        type: "MEANING_TO_WORD",
        meaning: coreMeaning,
        easySyn,
        choices: wordChoices,
        correct: w.text,
      });
    }

    // Part C – Sentence Fill (데모: 오늘+어제 섞어서 몇 개)
    const allWords = [...todayWords, ...yesterdayWords];
    const pool = allWords.map((w) => w.text);

    allWords.forEach((w, idx) => {
      const example = w.examples_easy[0] ?? `${w.text} ...`;
      const sentenceEnWithBlank = example.replace(w.text, "________");

      qs.push({
        id: `C-${w.id}-${idx}`,
        type: "SENTENCE_FILL",
        sentenceKo: "(여기에 한국어 해석 힌트를 나중에 넣을 수 있음)",
        sentenceEnWithBlank,
        answer: w.text,
        pool,
      });
    });

    return qs;
  }, [todayWords, yesterdayWords]);

  const currentQuestion = questions[currentQuestionIndex];

  // 🔹 깜빡이 – 지난 수업 단어만
  const reviewWord = yesterdayWords[reviewIndex];

  const handleReviewNext = () => {
    if (reviewIndex < yesterdayWords.length - 1) {
      setReviewIndex((i) => i + 1);
    } else {
      // 리뷰 끝 -> Exam 시작
      setPhase("exam");
    }
  };

  const handleSelectChoice = (q: Question, choice: string) => {
    if (q.type === "SENTENCE_FILL") return;

    setAnswers((prev) => {
      const filtered = prev.filter((a) => a.questionId !== q.id);
      return [...filtered, { questionId: q.id, answer: choice }];
    });

    goNextQuestion();
  };

  const handleSentenceFillAnswer = (
    q: SentenceFillQuestion,
    wordChoice: string,
    translationKo: string,
  ) => {
    setAnswers((prev) => {
      const filtered = prev.filter((a) => a.questionId !== q.id);
      return [
        ...filtered,
        { questionId: q.id, answer: wordChoice, translationKo },
      ];
    });

    goNextQuestion();
  };

  const goNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((i) => i + 1);
    } else {
      setPhase("result");
    }
  };

  // 🔹 채점
  const score: ScoreSummary | null = useMemo(() => {
    if (phase !== "result") return null;

    let correctCount = 0;
    let autoGradableCount = 0;

    for (const q of questions) {
      if (q.type === "SENTENCE_FILL") {
        autoGradableCount += 1;
        const ans = answers.find((a) => a.questionId === q.id);
        if (ans && ans.answer === q.answer) {
          correctCount += 1;
        }
      } else if (q.type === "WORD_TO_MEANING") {
        autoGradableCount += 1;
        const ans = answers.find((a) => a.questionId === q.id);
        if (ans && ans.answer === q.correct) {
          correctCount += 1;
        }
      } else if (q.type === "MEANING_TO_WORD") {
        autoGradableCount += 1;
        const ans = answers.find((a) => a.questionId === q.id);
        if (ans && ans.answer === q.correct) {
          correctCount += 1;
        }
      }
    }

    const rate =
      autoGradableCount > 0
        ? Math.round((correctCount / autoGradableCount) * 100)
        : 0;

    return {
      correctCount,
      autoGradableCount,
      rate,
    };
  }, [phase, questions, answers]);

  // 🔹 결과 저장
  const handleSaveResult = async () => {
    if (!score) return;

    setIsSaving(true);
    setSaveDone(null);

    try {
      const payload = {
        totalQuestions: score.autoGradableCount,
        correctAuto: score.correctCount,
        rateAuto: score.rate,
        mode: "core", // 나중에 boosted, grammar-only 등으로 확장
        gradeBand: null, // 나중에 세션/학생 정보에서 채움
        raw: {
          answers,
          questions: questions.map((q) => ({
            id: q.id,
            type: q.type,
          })),
        },
      };

      const res = await fetch("/api/vocab/exam-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to save");
      }

      setSaveDone("ok");
    } catch (e) {
      console.error(e);
      setSaveDone("error");
    } finally {
      setIsSaving(false);
    }
  };

  // ─────────────────────────────
  // 렌더링
  // ─────────────────────────────
  if (phase === "review" && reviewWord) {
    const mainMeaning = reviewWord.meanings_ko[0] ?? "";
    const easySyn = reviewWord.meanings_en_simple[0] ?? "";
    const example = reviewWord.examples_easy[0] ?? "";

    return (
      <main className="mx-auto space-y-6 pb-8 max-w-3xl">
        <header className="space-y-1 text-center">
          <h1 className="text-xl font-bold">지난 수업 단어 깜빡이 🔁</h1>
          <p className="text-xs text-gray-500">
            시험 전에 지난 수업 단어를 빠르게 한 번 더 보고 갈게요.
          </p>
        </header>

        <section className="flex flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-white px-6 py-8 shadow-sm">
          <div className="text-3xl font-bold tracking-tight">
            {reviewWord.text}
          </div>
          <div className="mt-2 text-sm text-gray-700">
            {mainMeaning}
            {easySyn && (
              <span className="ml-2 text-xs text-gray-500">
                ({easySyn})
              </span>
            )}
          </div>
          {example && (
            <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-2 text-xs text-emerald-900">
              <span className="font-semibold">Example</span>
              <br />
              <span className="text-[11px]">{example}</span>
            </p>
          )}

          <button
            type="button"
            onClick={handleReviewNext}
            className="mt-6 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            {reviewIndex < yesterdayWords.length - 1
              ? "다음 단어 보기 →"
              : "깜빡이 완료, 시험 시작하기 →"}
          </button>

          <p className="mt-2 text-[10px] text-gray-400">
            {reviewIndex + 1} / {yesterdayWords.length}
          </p>
        </section>
      </main>
    );
  }

  if (phase === "exam" && currentQuestion) {
    return (
      <main className="mx-auto space-y-6 pb-8 max-w-3xl">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">오늘의 단어 시험</h1>
            <p className="text-xs text-gray-500">
              문제 {currentQuestionIndex + 1} / {questions.length}
            </p>
          </div>
        </header>

        <ExamQuestionView
          question={currentQuestion}
          answers={answers}
          onSelectChoice={handleSelectChoice}
          onSentenceFillAnswer={handleSentenceFillAnswer}
        />
      </main>
    );
  }

  if (phase === "result" && score) {
    return (
      <main className="mx-auto space-y-6 pb-8 max-w-3xl">
        <header className="space-y-1">
          <h1 className="text-xl font-bold">시험 결과</h1>
          <p className="text-xs text-gray-500">
            자동 채점 기준으로 보여주는 점수예요.
          </p>
        </header>

        <section className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
          <p>
            정답:{" "}
            <span className="font-semibold">
              {score.correctCount}
            </span>{" "}
            / {score.autoGradableCount}
          </p>
          <p>
            정확도:{" "}
            <span className="text-lg font-bold">{score.rate}%</span>
          </p>
          <p className="mt-1 text-xs">
            문장 해석(한국어)은 나중에 선생님 또는 AI가 첨삭할 수 있도록
            별도 리포트 화면에서 활용할 수 있어요.
          </p>

          <div className="mt-3 flex items-center justify-between">
            <div className="text-[11px]">
              {saveDone === "ok" && (
                <span className="text-emerald-800">
                  ✅ 결과가 저장되었습니다. (teacher 리포트에서 활용 가능)
                </span>
              )}
              {saveDone === "error" && (
                <span className="text-rose-600">
                  저장 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.
                </span>
              )}
              {saveDone === null && (
                <span className="text-gray-500">
                  결과를 저장해 두면 나중에 통계/리포트에 반영할 수 있어요.
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleSaveResult}
              disabled={isSaving}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold text-white ${
                isSaving
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {isSaving ? "저장 중..." : "결과 저장하기"}
            </button>
          </div>
        </section>
      </main>
    );
  }

  // 안전 fallback
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <p className="text-sm text-gray-500">로딩 중...</p>
    </main>
  );
}

// ─────────────────────────────
// Exam 개별 문항 렌더링 컴포넌트
// ─────────────────────────────

type ExamViewProps = {
  question: Question;
  answers: UserAnswer[];
  onSelectChoice: (q: Question, choice: string) => void;
  onSentenceFillAnswer: (
    q: SentenceFillQuestion,
    word: string,
    translationKo: string,
  ) => void;
};

function ExamQuestionView({
  question,
  answers,
  onSelectChoice,
  onSentenceFillAnswer,
}: ExamViewProps) {
  const existing = answers.find((a) => a.questionId === question.id);

  if (question.type === "WORD_TO_MEANING") {
    return (
      <WordToMeaningView
        question={question}
        existing={existing}
        onSelectChoice={onSelectChoice}
      />
    );
  }

  if (question.type === "MEANING_TO_WORD") {
    return (
      <MeaningToWordView
        question={question}
        existing={existing}
        onSelectChoice={onSelectChoice}
      />
    );
  }

  if (question.type === "SENTENCE_FILL") {
    return (
      <SentenceFillView
        question={question}
        existing={existing}
        onSubmit={onSentenceFillAnswer}
      />
    );
  }

  return null;
}

// ─────────────────────────────
// 문항 타입별 서브 뷰
// ─────────────────────────────

type BaseViewProps<Q> = {
  question: Q;
  existing?: UserAnswer;
};

type ChoiceViewProps<Q> = BaseViewProps<Q> & {
  onSelectChoice: (q: Question, choice: string) => void;
};

function WordToMeaningView({
  question,
  existing,
  onSelectChoice,
}: ChoiceViewProps<WordToMeaningQuestion>) {
  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white px-4 py-4">
      <p className="text-xs font-semibold text-emerald-700">
        Part A – 단어 → 뜻 (오늘 단어)
      </p>
      <p className="text-lg font-bold">{question.word.text}</p>

      <div className="space-y-2">
        {question.choices.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onSelectChoice(question, c)}
            className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${
              existing?.answer === c
                ? "border-emerald-500 bg-emerald-50"
                : "border-gray-200 bg-gray-50 hover:border-emerald-400 hover:bg-emerald-50"
            }`}
          >
            <span>{c}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function MeaningToWordView({
  question,
  existing,
  onSelectChoice,
}: ChoiceViewProps<MeaningToWordQuestion>) {
  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white px-4 py-4">
      <p className="text-xs font-semibold text-blue-700">
        Part B – 뜻 → 단어 (지난 수업 단어)
      </p>
      <p className="text-sm text-gray-800">
        {question.meaning}
        {question.easySyn && (
          <span className="ml-2 text-xs text-gray-500">
            ({question.easySyn})
          </span>
        )}
      </p>

      <div className="space-y-2">
        {question.choices.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => onSelectChoice(question, w)}
            className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${
              existing?.answer === w
                ? "border-emerald-500 bg-emerald-50"
                : "border-gray-200 bg-gray-50 hover:border-emerald-400 hover:bg-emerald-50"
            }`}
          >
            <span>{w}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

type SentenceFillViewProps = BaseViewProps<SentenceFillQuestion> & {
  onSubmit: (
    q: SentenceFillQuestion,
    word: string,
    translationKo: string,
  ) => void;
};

function SentenceFillView({
  question,
  existing,
  onSubmit,
}: SentenceFillViewProps) {
  const [selectedWord, setSelectedWord] = useState(existing?.answer ?? "");
  const [translationKo, setTranslationKo] = useState(
    existing?.translationKo ?? "",
  );

  const handleSubmit = () => {
    if (!selectedWord) return;
    onSubmit(question, selectedWord, translationKo);
  };

  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white px-4 py-4">
      <p className="text-xs font-semibold text-purple-700">
        Part C – 문장 빈칸 채우기 + 해석
      </p>

      <div className="space-y-2 text-sm">
        <p className="font-semibold">
          문장:
          <br />
          <span className="font-mono">
            {question.sentenceEnWithBlank}
          </span>
        </p>
        <p className="text-[11px] text-gray-500">
          힌트: {question.sentenceKo}
        </p>
      </div>

      {/* 단어 박스 */}
      <div className="space-y-2">
        <p className="text-xs text-gray-600">단어 박스에서 골라 보세요.</p>
        <div className="flex flex-wrap gap-2">
          {question.pool.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setSelectedWord(w)}
              className={`rounded-full px-3 py-1 text-xs ${
                selectedWord === w
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-800 hover:bg-emerald-100 hover:text-emerald-800"
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      {/* 해석 입력 */}
      <div className="space-y-1">
        <p className="text-xs text-gray-600">한국어 해석 써 보기</p>
        <textarea
          value={translationKo}
          onChange={(e) => setTranslationKo(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-gray-200 px-2 py-1 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          placeholder="문장의 뜻을 한국어로 적어 보세요."
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
        >
          이 문항 완료 → 다음
        </button>
      </div>
    </section>
  );
}

// ─────────────────────────────
// 유틸: 간단 셔플
// ─────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}
