"use client";

/**
 * Updated TOEFL Writing Runner — ETS UI 스펙 [최종 확정]
 * Task 1: Build a Sentence   (10문항 Q1~Q10, 6분 50초 글로벌 타이머, Back/Next 자유 이동)
 * Task 2: Write an Email     (1문항 Q11, 7분 독립 타이머, 100~120 단어)
 * Task 3: Academic Discussion (1문항 Q12, 10분 독립 타이머, 120+ 단어)
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type {
  WWritingTest2026,
  WBuildSentenceItem,
  WBuildSentenceQuestion,
  WEmailWritingItem,
  WAcademicWritingItem,
} from "@/models/writing";
import { normalizeBuildSentenceQuestion } from "@/lib/writing/build-sentence-parser";
import Avatar from "@/components/Avatar";
import { ETSLayout } from "./ETSLayout";
import { WritingIntroScreen, TaskBeginScreen, LeaveConfirmScreen } from "./WritingInterstitials";

// ── 타입 ──────────────────────────────────────────────────────────────
type TestPhase =
  | "intro"
  | "task1_begin" | "task1" | "leave_task1"
  | "task2_begin" | "task2" | "leave_task2"
  | "task3_begin" | "task3"
  | "done";

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

  // onExpire는 매 렌더마다 새로 만들어지는 클로저(현재 입력 중인 text/state를 캡처)이므로
  // ref에 최신 값을 담아두고 interval은 ref를 통해 호출한다.
  // 그렇지 않으면 아래 effect가 [initialSeconds]에만 의존하기 때문에, 타이머가 만료될 때
  // 항상 "최초 렌더 시점의" onExpire(빈 문자열/빈 상태)를 호출해 학생이 입력한 답이 유실된다.
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    expiredRef.current = false;
    setTimeLeft(initialSeconds);
    const id = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          if (!expiredRef.current) { expiredRef.current = true; onExpireRef.current(); }
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

// ETSLayout은 components/writing/ETSLayout.tsx로 분리됨 (WritingInterstitials와 공유, 순환 참조 방지)

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

  // 전역 답안 저장: 문항 index → 선택된 토큰 **id** 배열 (Back해도 유지).
  // 텍스트로 담으면 "the"가 두 번 나오는 문장에서 두 번째를 못 고른다.
  const [allSelected, setAllSelected] = useState<Record<number, string[]>>({});
  const selected = allSelected[qIndex] ?? [];

  const q = item.questions[qIndex];
  const timeLimit = item.timeLimitSeconds ?? 410; // ETS 기준 6분 50초

  // 문항별 정규화 (신규 tokens / 레거시 shuffledChunks 모두 처리)
  const normalized = useMemo(
    () => item.questions.map((qq) => normalizeBuildSentenceQuestion(qq)),
    [item.questions],
  );
  const current = normalized[qIndex];
  const tokenById = useMemo(() => {
    const m = new Map<string, string>();
    current?.tokens.forEach((t) => m.set(t.id, t.text));
    return m;
  }, [current]);

  const finishAll = () => {
    const finalScores = item.questions.map((qq, i) => {
      const norm = normalized[i];
      const userIds = allSelected[i] ?? [];
      const userTexts = userIds.map((id) => norm.tokens.find((t) => t.id === id)?.text ?? "");
      const correctTexts = norm.correctOrder.map(
        (id) => norm.tokens.find((t) => t.id === id)?.text ?? "",
      );
      return {
        questionId: qq.id,
        // 같은 텍스트의 조각이 여럿일 수 있으므로 id가 아니라 **텍스트 순서**로 채점한다.
        // 그래야 동일 단어를 어느 조각으로 채웠든 정답으로 인정된다.
        correct: JSON.stringify(userTexts) === JSON.stringify(correctTexts),
        userSequence: userTexts,
      };
    });
    onComplete(finalScores);
  };

  const { display: timerDisplay } = useCountdown(timeLimit, () => {
    finishAll();
  });

  // 조각 셔플 (문항별 1회, 이미 셔플된 경우 재사용) — id 배열로 관리
  const [shuffledMap, setShuffledMap] = useState<Record<number, string[]>>({});
  useEffect(() => {
    if (!current || shuffledMap[qIndex]) return;
    const ids = current.tokens.map((t) => t.id).sort(() => Math.random() - 0.5);
    setShuffledMap((prev) => ({ ...prev, [qIndex]: ids }));
  }, [qIndex, current, shuffledMap]);
  const shuffled = shuffledMap[qIndex] ?? current?.tokens.map((t) => t.id) ?? [];

  const setSelected = (updater: (prev: string[]) => string[]) => {
    setAllSelected((prev) => ({
      ...prev,
      [qIndex]: updater(prev[qIndex] ?? []),
    }));
  };

  const handleChunkClick = (tokenId: string) => {
    if (selected.includes(tokenId)) return;
    setSelected((prev) => [...prev, tokenId]);
  };

  const handleRemove = (tokenId: string) => {
    setSelected((prev) => prev.filter((id) => id !== tokenId));
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
      totalQuestions={12}
      currentQuestion={questionNumber}
      onBack={handleBack}
      backDisabled={qIndex === 0}
      onNext={handleNext}
    >
      <div style={{ maxWidth: 1200, margin: "24px auto", padding: "0 24px", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* 지시문 + 문맥 카드 */}
        <div style={{ backgroundColor: "#FFFFFF", borderRadius: 8, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <p style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>
            {item.instruction ?? "Read the context below and arrange the words to complete the response."}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Turn 1: 질문/발화 */}
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <Avatar name="A" size="md" />
              <p style={{ fontSize: 18, color: "#333333", lineHeight: 1.7, margin: 0, paddingTop: 6 }}>
                {q.contextLeadIn}
              </p>
            </div>

            {/* Turn 2: 조각별 빈칸 응답 */}
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <Avatar name="B" size="md" />
              <p style={{ fontSize: 18, color: "#333333", lineHeight: 1.7, margin: 0, paddingTop: 6 }}>
                {Array.from({ length: current?.correctOrder.length ?? 0 }).map((_, i) => {
                  const tokenId = selected[i];
                  const text = tokenId ? tokenById.get(tokenId) ?? "" : "";
                  return (
                    <span
                      key={i}
                      style={{
                        display: "inline-block",
                        minWidth: 48,
                        margin: "0 4px",
                        borderBottom: "2px solid #0073E6",
                        color: "#0073E6",
                        fontStyle: "italic",
                        textAlign: "center",
                      }}
                    >
                      {text || " "}
                    </span>
                  );
                })}
                <span>{current?.punctuation ?? ""}</span>
                <span> {q.contextLeadOut}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Word Bank */}
        <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%" }}>
          <p style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>Word Bank — 클릭해서 선택하세요</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            {shuffled.map((tokenId) => {
              const used = selected.includes(tokenId);
              const text = tokenById.get(tokenId) ?? "";
              return (
                <button
                  key={tokenId}
                  onClick={() => handleChunkClick(tokenId)}
                  disabled={used}
                  style={{
                    // 단어("you")와 구절("to the airport")의 길이가 다르므로
                    // 고정 폭이 아니라 내용에 맞춘다.
                    width: "fit-content",
                    minHeight: 46,
                    padding: "8px 16px",
                    border: "1px solid #C0C8D0",
                    borderRadius: 23,
                    backgroundColor: "#FFFFFF",
                    fontSize: 15,
                    lineHeight: 1.6,
                    whiteSpace: "nowrap",
                    color: used ? "#AAA" : "#333",
                    opacity: used ? 0.4 : 1,
                    cursor: used ? "default" : "pointer",
                    transition: "opacity 0.2s",
                  }}
                >
                  {text}
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
              <span style={{ color: "#9BB5D0", fontSize: 14 }}>조각을 클릭해 여기에 배치하세요…</span>
            ) : selected.map((tokenId) => (
              <button
                key={tokenId}
                onClick={() => handleRemove(tokenId)}
                style={{
                  width: "fit-content",
                  minHeight: 46,
                  padding: "8px 16px",
                  border: "1px solid #0073E6",
                  borderRadius: 23,
                  backgroundColor: "#FFFFFF",
                  fontSize: 15,
                  lineHeight: 1.6,
                  whiteSpace: "nowrap",
                  color: "#0073E6",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {tokenById.get(tokenId) ?? ""} <span style={{ fontSize: 12, opacity: 0.6 }}>✕</span>
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
  text,
  onTextChange,
  onComplete,
}: {
  item: WEmailWritingItem;
  text: string;
  onTextChange: (text: string) => void;
  onComplete: (text: string) => void;
}) {
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
      {/* 좁은 화면(사이드바 있는 창 등)에서는 에디터가 아래로 내려오도록 wrap.
          이전에는 좌측 650px 고정 + wrap 없음이라 에디터가 화면 밖으로 밀려 안 보였다. */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, maxWidth: 1200, margin: "0 auto", padding: "24px 40px", height: "100%", boxSizing: "border-box" }}>

        {/* 좌측: Scenario Card */}
        <div style={{
          flex: "1 1 460px", maxWidth: 650, minWidth: 0,
          backgroundColor: "#FFFFFF", borderRadius: 8, padding: 32,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          alignSelf: "flex-start",
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
          flex: "1 1 460px", minWidth: 0, minHeight: 700,
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
              onChange={(e) => onTextChange(e.target.value)}
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
  text,
  onTextChange,
  onComplete,
}: {
  item: WAcademicWritingItem;
  text: string;
  onTextChange: (text: string) => void;
  onComplete: (text: string) => void;
}) {
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
      <div style={{ maxWidth: 1200, margin: "24px auto", padding: "0 24px", display: "flex", flexDirection: "column", gap: 20 }}>

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
            onChange={(e) => onTextChange(e.target.value)}
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
  const [phase, setPhase] = useState<TestPhase>("intro");
  const [task1Scores, setTask1Scores] = useState<{ questionId: string; correct: boolean; userSequence: string[] }[]>([]);
  const [task2Text, setTask2Text] = useState("");
  const [task3Text, setTask3Text] = useState("");

  const buildItem = test.items.find((i) => i.taskKind === "build_a_sentence") as WBuildSentenceItem | undefined;
  const emailItem = test.items.find((i) => i.taskKind === "email") as WEmailWritingItem | undefined;
  const academicItem = test.items.find((i) => i.taskKind === "academic_discussion") as WAcademicWritingItem | undefined;

  // intro 다음에 실제로 존재하는 첫 Task의 "_begin" 화면으로 간다.
  const firstBeginPhase: TestPhase = buildItem ? "task1_begin" : emailItem ? "task2_begin" : academicItem ? "task3_begin" : "done";

  const handleTask1Complete = useCallback((scores: typeof task1Scores) => {
    setTask1Scores(scores);
    // 다음 Task가 있을 때만 "Time Remaining" 이탈 확인 화면을 보여준다.
    setPhase(emailItem || academicItem ? "leave_task1" : "done");
  }, [emailItem, academicItem]);

  const handleTask2Complete = useCallback((text: string) => {
    setTask2Text(text);
    setPhase(academicItem ? "leave_task2" : "done");
  }, [academicItem]);

  // phase가 done이 되면 onFinish 호출 (Task 3이 없는 경우)
  useEffect(() => {
    if (phase === "done" && !academicItem && task1Scores.length > 0) {
      onFinish?.({ task1Scores, task2Text, task3Text: "" });
    }
  }, [phase, academicItem, task1Scores, task2Text, onFinish]);

  const handleTask3Complete = useCallback((text: string) => {
    setTask3Text(text);
    setPhase("done");
    onFinish?.({ task1Scores, task2Text, task3Text: text });
  }, [task1Scores, task2Text, onFinish]);

  if (phase === "done") {
    return (
      <div className="flex flex-col items-center justify-center gap-6 text-center" style={{ height: "100%", backgroundColor: "#F4F6F9", fontFamily: "Arial, Helvetica, sans-serif" }}>
        <div style={{ fontSize: 64 }}>✍️</div>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: "#1A2B4C" }}>Writing Section Complete!</h2>
        <p style={{ fontSize: 16, color: "#666" }}>
          Task 1: {task1Scores.filter((s) => s.correct).length}/{task1Scores.length} correct
        </p>
      </div>
    );
  }

  if (phase === "intro") {
    const totalQuestions = (buildItem?.questions.length ?? 0) + (emailItem ? 1 : 0) + (academicItem ? 1 : 0);
    const taskTypes = [
      buildItem && { title: "Build a Sentence", description: "Create a grammatical sentence." },
      emailItem && { title: "Write an Email", description: "Write an email using information provided." },
      academicItem && { title: "Write for an Academic Discussion", description: "Participate in an online discussion." },
    ].filter((t): t is { title: string; description: string } => Boolean(t));

    return (
      <WritingIntroScreen
        totalQuestions={totalQuestions}
        taskTypes={taskTypes}
        onContinue={() => setPhase(firstBeginPhase)}
      />
    );
  }

  if (phase === "task1_begin") {
    if (!buildItem) { setPhase(emailItem ? "task2_begin" : academicItem ? "task3_begin" : "done"); return null; }
    return (
      <TaskBeginScreen
        title="Build a Sentence"
        body="Move the words in the boxes to create grammatical sentences. In an actual test, a clock will show you how much time you have to complete this task."
        onBegin={() => setPhase("task1")}
      />
    );
  }
  if (phase === "task1" && buildItem) return <BuildASentence item={buildItem} onComplete={handleTask1Complete} />;
  if (phase === "leave_task1") {
    return (
      <LeaveConfirmScreen
        onBack={() => setPhase("task1")}
        onContinue={() => setPhase(emailItem ? "task2_begin" : "task3_begin")}
      />
    );
  }

  if (phase === "task2_begin") {
    if (!emailItem) { setPhase(academicItem ? "task3_begin" : "done"); return null; }
    const minutes = Math.round((emailItem.recommendedTimeSeconds ?? 420) / 60);
    return (
      <TaskBeginScreen
        title="Write an Email"
        body={`You will read some information and use the information to write an email. You will have ${minutes} minutes to write the email.`}
        onBegin={() => setPhase("task2")}
      />
    );
  }
  if (phase === "task2" && emailItem) {
    return <WriteAnEmail item={emailItem} text={task2Text} onTextChange={setTask2Text} onComplete={handleTask2Complete} />;
  }
  if (phase === "leave_task2") {
    return (
      <LeaveConfirmScreen
        onBack={() => setPhase("task2")}
        onContinue={() => setPhase("task3_begin")}
      />
    );
  }

  if (phase === "task3_begin") {
    if (!academicItem) { setPhase("done"); return null; }
    const minutes = Math.round((academicItem.recommendedTimeSeconds ?? 600) / 60);
    return (
      <TaskBeginScreen
        title="Write for an Academic Discussion"
        body={`A professor has posted a question about a topic and students have responded with their thoughts and ideas. Make a contribution to the discussion. You will have ${minutes} minutes to write.`}
        onBegin={() => setPhase("task3")}
      />
    );
  }
  if (phase === "task3" && academicItem) {
    return <AcademicDiscussion item={academicItem} text={task3Text} onTextChange={setTask3Text} onComplete={handleTask3Complete} />;
  }

  // fallback: 해당 task 없으면 skip
  if (phase === "task1") { setPhase(emailItem ? "task2_begin" : academicItem ? "task3_begin" : "done"); return null; }
  if (phase === "task2") { setPhase(academicItem ? "task3_begin" : "done"); return null; }
  return null;
}
