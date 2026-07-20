"use client";

/**
 * Updated TOEFL Writing Runner — ETS UI 스펙 [최종 확정]
 * Task 1: Build a Sentence   (10문항 Q1~Q10, 6분 글로벌 타이머, Back/Next 자유 이동)
 * Task 2: Write an Email     (1문항 Q11, 7분 독립 타이머, 100~120 단어)
 * Task 3: Academic Discussion (1문항 Q12, 10분 독립 타이머, 120+ 단어)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type {
  WWritingTest2026,
  WBuildSentenceItem,
  WBuildSentenceQuestion,
  WEmailWritingItem,
  WAcademicWritingItem,
} from "@/models/writing";

// ── 타입 ──────────────────────────────────────────────────────────────
type TestPhase = "task1" | "task2" | "task3" | "done";

type Props = {
  test: WWritingTest2026;
  onFinish?: (answers: {
    task1Scores: { questionId: string; correct: boolean; userSequence: string[] }[];
    task2Text: string;
    task3Text: string;
  }) => void;
};

// ── 단어 카운터 ───────────────────────────────────────────────────────
function countWords(text: string) {
  const trimmed = text.trim();
  if (trimmed === "") return 0;
  return trimmed.split(/\s+/).length;
}

// ── 글로벌 타이머 훅 ──────────────────────────────────────────────────
function useCountdown(initialSeconds: number, onExpire: () => void) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const expiredRef = useRef(false);

  useEffect(() => {
    expiredRef.current = false;
    setTimeLeft(initialSeconds);
    const id = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          if (!expiredRef.current) { expiredRef.current = true; onExpire(); }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSeconds]);

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const secs = String(timeLeft % 60).padStart(2, "0");
  return { timeLeft, display: `${mins}:${secs}` };
}

// ── ETS 공통 레이아웃 래퍼 ────────────────────────────────────────────
function ETSLayout({
  title,
  timerDisplay,
  questionLabel,
  totalQuestions,
  currentQuestion,
  onBack,
  backDisabled,
  onNext,
  nextDisabled,
  children,
}: {
  title?: string;
  timerDisplay: string;
  questionLabel?: string;
  totalQuestions?: number;
  currentQuestion?: number;
  onBack?: () => void;
  backDisabled?: boolean;
  onNext: () => void;
  nextDisabled?: boolean;
  children: React.ReactNode;
}) {
  const progressPct = totalQuestions && currentQuestion
    ? (currentQuestion / totalQuestions) * 100 : 0;

  return (
    <div className="flex flex-col" style={{ minHeight: "100vh", backgroundColor: "#F4F6F9", fontFamily: "Arial, Helvetica, sans-serif" }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 shrink-0" style={{ height: 60, backgroundColor: "#1A2B4C" }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>
          {title ?? "Updated TOEFL iBT - Writing"}
        </span>
        <div className="flex items-center" style={{ gap: 8 }}>
          {onBack && (
            <button
              onClick={onBack}
              disabled={backDisabled}
              className="rounded border border-slate-400 bg-transparent text-white disabled:opacity-30"
              style={{ width: 90, height: 36, fontSize: 13 }}
            >
              &lt; Back
            </button>
          )}
          <button
            onClick={onNext}
            disabled={nextDisabled}
            className="rounded font-semibold text-white disabled:opacity-40"
            style={{ width: 100, height: 36, fontSize: 13, backgroundColor: "#0073E6", border: "none", borderRadius: 4 }}
          >
            Next &gt;
          </button>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* Footer */}
      <footer className="flex items-center justify-between shrink-0 border-t px-6"
        style={{ height: 60, backgroundColor: "#FFFFFF", borderColor: "#E0E0E0" }}>
        <span style={{ fontSize: 15, fontWeight: 500, color: "#333333" }}>
          {questionLabel ?? ""}
        </span>
        <div className="flex items-center gap-4">
          {totalQuestions && currentQuestion ? (
            <div className="overflow-hidden rounded-full" style={{ width: 240, height: 8, backgroundColor: "#E0E0E0" }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%`, backgroundColor: "#0073E6" }} />
            </div>
          ) : null}
          <span className="font-mono font-semibold" style={{ fontSize: 15, color: "#333333" }}>
            {timerDisplay}
          </span>
        </div>
      </footer>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Task 1: Build a Sentence
// ══════════════════════════════════════════════════════════════════════
function BuildASentence({
  item,
  onComplete,
}: {
  item: WBuildSentenceItem;
  onComplete: (scores: { questionId: string; correct: boolean; userSequence: string[] }[]) => void;
}) {
  const [qIndex, setQIndex] = useState(0);

  // 전역 답안 저장: 문항 index → 선택된 청크 배열 (Back해도 유지)
  const [allSelected, setAllSelected] = useState<Record<number, string[]>>({});
  const selected = allSelected[qIndex] ?? [];

  const q = item.questions[qIndex];
  const timeLimit = item.timeLimitSeconds ?? 360;

  const finishAll = () => {
    const finalScores = item.questions.map((qq, i) => {
      const userSeq = allSelected[i] ?? [];
      return {
        questionId: qq.id,
        correct: JSON.stringify(userSeq) === JSON.stringify(qq.correctSequence),
        userSequence: userSeq,
      };
    });
    onComplete(finalScores);
  };

  const { display: timerDisplay } = useCountdown(timeLimit, () => {
    finishAll();
  });

  // 청크 셔플 (문항별 1회, 이미 셔플된 경우 재사용)
  const [shuffledMap, setShuffledMap] = useState<Record<number, string[]>>({});
  useEffect(() => {
    if (!q || shuffledMap[qIndex]) return;
    const arr = [...q.shuffledChunks].sort(() => Math.random() - 0.5);
    setShuffledMap((prev) => ({ ...prev, [qIndex]: arr }));
  }, [qIndex, q, shuffledMap]);
  const shuffled = shuffledMap[qIndex] ?? q?.shuffledChunks ?? [];

  const setSelected = (updater: (prev: string[]) => string[]) => {
    setAllSelected((prev) => ({
      ...prev,
      [qIndex]: updater(prev[qIndex] ?? []),
    }));
  };

  const handleChunkClick = (chunk: string) => {
    if (selected.includes(chunk)) return;
    setSelected((prev) => [...prev, chunk]);
  };

  const handleRemove = (chunk: string) => {
    setSelected((prev) => prev.filter((c) => c !== chunk));
  };

  const handleBack = () => {
    if (qIndex > 0) setQIndex((i) => i - 1);
  };

  const handleNext = () => {
    if (qIndex < item.questions.length - 1) {
      setQIndex((i) => i + 1);
    } else {
      finishAll();
    }
  };

  if (!q) return null;

  const questionNumber = qIndex + 1;

  return (
    <ETSLayout
      timerDisplay={timerDisplay}
      questionLabel={`Question ${questionNumber} of ${item.questions.length}`}
      totalQuestions={11}
      currentQuestion={questionNumber}
      onBack={handleBack}
      backDisabled={qIndex === 0}
      onNext={handleNext}
    >
      <div style={{ maxWidth: 1400, margin: "30px auto", padding: "0 24px", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* 지시문 + 문맥 카드 */}
        <div style={{ backgroundColor: "#FFFFFF", borderRadius: 8, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <p style={{ fontSize: 13, color: "#888", marginBottom: 12 }}>
            {item.instruction ?? "Read the context below and arrange the words to complete the response."}
          </p>
          <p style={{ fontSize: 18, color: "#333333", lineHeight: 1.7 }}>
            <span>{q.contextLeadIn} </span>
            <span style={{ display: "inline-block", minWidth: 120, borderBottom: "2px solid #0073E6", color: "#0073E6", fontStyle: "italic" }}>
              {selected.join(" ") || "___"}
            </span>
            <span> {q.contextLeadOut}</span>
          </p>
        </div>

        {/* Word Bank */}
        <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%" }}>
          <p style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>Word Bank — 클릭해서 선택하세요</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            {shuffled.map((chunk) => {
              const used = selected.includes(chunk);
              return (
                <button
                  key={chunk}
                  onClick={() => handleChunkClick(chunk)}
                  disabled={used}
                  style={{
                    height: 46,
                    padding: "0 20px",
                    border: "1px solid #C0C8D0",
                    borderRadius: 23,
                    backgroundColor: "#FFFFFF",
                    fontSize: 15,
                    color: used ? "#AAA" : "#333",
                    opacity: used ? 0.4 : 1,
                    cursor: used ? "default" : "pointer",
                    transition: "opacity 0.2s",
                  }}
                >
                  {chunk}
                </button>
              );
            })}
          </div>
        </div>

        {/* Drop Zone */}
        <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%" }}>
          <p style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>선택된 순서 — 클릭하면 제거됩니다</p>
          <div style={{
            minHeight: 100,
            padding: 20,
            border: "2px dashed #0073E6",
            backgroundColor: "#EBF3FC",
            borderRadius: 8,
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
          }}>
            {selected.length === 0 ? (
              <span style={{ color: "#9BB5D0", fontSize: 14 }}>단어 뭉치를 클릭해 여기에 배치하세요…</span>
            ) : selected.map((chunk) => (
              <button
                key={chunk}
                onClick={() => handleRemove(chunk)}
                style={{
                  height: 46,
                  padding: "0 20px",
                  border: "1px solid #0073E6",
                  borderRadius: 23,
                  backgroundColor: "#FFFFFF",
                  fontSize: 15,
                  color: "#0073E6",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {chunk} <span style={{ fontSize: 12, opacity: 0.6 }}>✕</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </ETSLayout>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Task 2: Write an Email
// ══════════════════════════════════════════════════════════════════════
function WriteAnEmail({
  item,
  onComplete,
}: {
  item: WEmailWritingItem;
  onComplete: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const timeLimit = item.recommendedTimeSeconds ?? 420;
  const { display: timerDisplay } = useCountdown(timeLimit, () => onComplete(text));
  const wordCount = countWords(text);
  const min = item.wordLimit?.min ?? 100;
  const max = item.wordLimit?.max ?? 120;

  // recipient/subject는 hints[0]/hints[1]로 임시 사용하거나 situation에서 추출
  const recipient = (item as any).recipient ?? "";
  const subjectLine = (item as any).subjectLine ?? (item as any).subject_line ?? "";

  return (
    <ETSLayout
      timerDisplay={timerDisplay}
      questionLabel="Question 11 of 12"
      totalQuestions={12}
      currentQuestion={11}
      onNext={() => onComplete(text)}
    >
      <div style={{ display: "flex", gap: 24, padding: "30px 40px", height: "100%" }}>

        {/* 좌측: Scenario Card */}
        <div style={{
          width: 650, minHeight: 800, flexShrink: 0,
          backgroundColor: "#FFFFFF", borderRadius: 8, padding: 32,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#0073E6", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Situation
          </p>
          <p style={{ fontSize: 16, color: "#333333", lineHeight: 1.8, marginBottom: 24 }}>
            {item.situation}
          </p>
          {item.hints && item.hints.length > 0 && (
            <>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#333333", marginBottom: 12 }}>
                Your email should:
              </p>
              <ul style={{ paddingLeft: 20, fontSize: 16, color: "#333333", lineHeight: 1.9 }}>
                {item.hints.map((h, i) => (
                  <li key={i} style={{ marginBottom: 8 }}>{h}</li>
                ))}
              </ul>
            </>
          )}
          <p style={{ marginTop: 24, fontSize: 13, color: "#888" }}>
            Recommended: {min}–{max} words
          </p>
        </div>

        {/* 우측: Email Editor */}
        <div style={{
          flex: 1, minHeight: 800,
          backgroundColor: "#FFFFFF", borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* To / Subject */}
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #E0E0E0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: "#888", width: 56 }}>To:</span>
              <input readOnly value={recipient} style={{ flex: 1, border: "none", fontSize: 14, color: "#333", background: "transparent", outline: "none" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 13, color: "#888", width: 56 }}>Subject:</span>
              <input readOnly value={subjectLine} style={{ flex: 1, border: "none", fontSize: 14, color: "#333", background: "transparent", outline: "none" }} />
            </div>
          </div>

          {/* Textarea */}
          <div style={{ flex: 1, position: "relative" }}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck={false}
              onCopy={(e) => e.preventDefault()}
              onPaste={(e) => e.preventDefault()}
              onCut={(e) => e.preventDefault()}
              onContextMenu={(e) => e.preventDefault()}
              placeholder="Begin writing your email here..."
              style={{
                width: "100%",
                height: "100%",
                minHeight: 550,
                padding: 20,
                border: "none",
                outline: "none",
                resize: "none",
                fontSize: 15,
                lineHeight: 1.6,
                color: "#333333",
                fontFamily: "Arial, Helvetica, sans-serif",
                backgroundColor: "transparent",
                boxSizing: "border-box",
              }}
            />
            {/* Word Count */}
            <div style={{
              position: "absolute", right: 16, bottom: 16,
              fontSize: 13, color: wordCount < min ? "#D9383A" : wordCount > max ? "#D9383A" : "#0073E6",
              fontWeight: 600,
            }}>
              Word Count: {wordCount}
              {wordCount < min && ` (min ${min})`}
              {wordCount > max && ` (max ${max})`}
            </div>
          </div>
        </div>
      </div>
    </ETSLayout>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Task 3: Academic Discussion
// ══════════════════════════════════════════════════════════════════════
function AcademicDiscussion({
  item,
  onComplete,
}: {
  item: WAcademicWritingItem;
  onComplete: (text: string) => void;
}) {
  const [text, setText] = useState("");
  // Q12, 10분(600초) 독립 타이머
  const timeLimit = item.recommendedTimeSeconds ?? 600;
  const { display: timerDisplay } = useCountdown(timeLimit, () => onComplete(text));
  const wordCount = countWords(text);
  const min = item.wordLimit?.min ?? 100;
  const max = item.wordLimit?.max ?? 200;

  const professor = (item as any).professorName ?? "Professor";
  const studentPosts = item.studentPosts ?? [];

  return (
    <ETSLayout
      timerDisplay={timerDisplay}
      questionLabel="Question 12 of 12"
      totalQuestions={12}
      currentQuestion={12}
      onNext={() => onComplete(text)}
    >
      <div style={{ maxWidth: 1600, margin: "20px auto", padding: "0 24px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* 1단: Professor */}
        <div style={{
          backgroundColor: "#E8EBF0", borderRadius: 8, padding: 20,
          display: "flex", alignItems: "flex-start", gap: 16,
        }}>
          <div style={{
            width: 50, height: 50, borderRadius: "50%",
            backgroundColor: "#1A2B4C", display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 18, fontWeight: 700, flexShrink: 0,
          }}>
            {professor.charAt(0)}
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#1A2B4C", marginBottom: 8 }}>{professor}</p>
            <p style={{ fontSize: 16, color: "#333333", lineHeight: 1.7 }}>{item.professorPrompt}</p>
          </div>
        </div>

        {/* 2단: Student Responses */}
        {studentPosts.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {studentPosts.map((s) => (
              <div key={s.id} style={{
                backgroundColor: "#FFFFFF", borderRadius: 8, padding: 20,
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    backgroundColor: "#EBF3FC", display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#0073E6", fontSize: 14, fontWeight: 700,
                  }}>
                    {s.author.charAt(0)}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#333" }}>{s.author}</span>
                </div>
                <p style={{ fontSize: 15, color: "#444", lineHeight: 1.7 }}>{s.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* 3단: User Editor */}
        <div style={{ position: "relative", backgroundColor: "#FFFFFF", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            onCopy={(e) => e.preventDefault()}
            onPaste={(e) => e.preventDefault()}
            onCut={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()}
            placeholder="Write your response to the discussion here..."
            style={{
              width: "100%",
              height: 350,
              padding: 20,
              border: "1px solid #999",
              borderRadius: 8,
              outline: "none",
              resize: "none",
              fontSize: 15,
              lineHeight: 1.6,
              color: "#333333",
              fontFamily: "Arial, Helvetica, sans-serif",
              boxSizing: "border-box",
            }}
          />
          <div style={{
            position: "absolute", right: 16, bottom: 16,
            fontSize: 13, fontWeight: 600,
            color: wordCount < min ? "#D9383A" : "#0073E6",
          }}>
            Word Count: {wordCount}
            {wordCount < min && ` (min ${min})`}
            {wordCount > max && ` (max ${max})`}
          </div>
        </div>
      </div>
    </ETSLayout>
  );
}

// ══════════════════════════════════════════════════════════════════════
// 메인 Runner
// ══════════════════════════════════════════════════════════════════════
export default function WritingRunnerETS({ test, onFinish }: Props) {
  const [phase, setPhase] = useState<TestPhase>("task1");
  const [task1Scores, setTask1Scores] = useState<{ questionId: string; correct: boolean; userSequence: string[] }[]>([]);
  const [task2Text, setTask2Text] = useState("");

  const buildItem = test.items.find((i) => i.taskKind === "build_a_sentence") as WBuildSentenceItem | undefined;
  const emailItem = test.items.find((i) => i.taskKind === "email") as WEmailWritingItem | undefined;
  const academicItem = test.items.find((i) => i.taskKind === "academic_discussion") as WAcademicWritingItem | undefined;

  const handleTask1Complete = useCallback((scores: typeof task1Scores) => {
    setTask1Scores(scores);
    setPhase(emailItem ? "task2" : academicItem ? "task3" : "done");
  }, [emailItem, academicItem]);

  const handleTask2Complete = useCallback((text: string) => {
    setTask2Text(text);
    setPhase(academicItem ? "task3" : "done");
  }, [academicItem]);

  const handleTask3Complete = useCallback((text: string) => {
    setPhase("done");
    onFinish?.({ task1Scores, task2Text, task3Text: text });
  }, [task1Scores, task2Text, onFinish]);

  if (phase === "done") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 text-center" style={{ backgroundColor: "#F4F6F9", fontFamily: "Arial, Helvetica, sans-serif" }}>
        <div style={{ fontSize: 64 }}>✍️</div>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: "#1A2B4C" }}>Writing Section Complete!</h2>
        <p style={{ fontSize: 16, color: "#666" }}>
          Task 1: {task1Scores.filter((s) => s.correct).length}/{task1Scores.length} correct
        </p>
      </div>
    );
  }

  if (phase === "task1" && buildItem) return <BuildASentence item={buildItem} onComplete={handleTask1Complete} />;
  if (phase === "task2" && emailItem) return <WriteAnEmail item={emailItem} onComplete={handleTask2Complete} />;
  if (phase === "task3" && academicItem) return <AcademicDiscussion item={academicItem} onComplete={handleTask3Complete} />;

  // fallback: 해당 task 없으면 skip
  if (phase === "task1") { setPhase(emailItem ? "task2" : "task3"); return null; }
  if (phase === "task2") { setPhase("task3"); return null; }
  return null;
}
