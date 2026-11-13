"use client";

/**
 * Updated TOEFL Writing Runner — ETS UI 스펙 [최종 확정]
 * Task 1: Build a Sentence   (10문항 Q1~Q10, 6분 50초 글로벌 타이머, Back/Next 자유 이동)
 * Task 2: Write an Email     (1문항 Q11, 7분 독립 타이머, 100~120 단어)
 * Task 3: Academic Discussion (1문항 Q12, 10분 독립 타이머, 120+ 단어)
 */

import { useState, useEffect, useRef, useCallback, useMemo, useContext } from "react";
import type {
  WWritingTest2026,
  WBuildSentenceItem,
  WBuildSentenceQuestion,
  WEmailWritingItem,
  WAcademicWritingItem,
} from "@/models/writing";
import { normalizeBuildSentenceQuestion } from "@/lib/writing/build-sentence-parser";
import Avatar from "@/components/Avatar";
import { ETSLayout, WritingStudyContext } from "./ETSLayout";
import { useStudyLang } from "@/lib/ui/studyLang";
import { loadStudy, saveStudy, clearStudy } from "@/lib/ui/studyProgress";
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
  /** "test"(기본): 실제 시험처럼 영어 고정 + 타이머. "study": 시간 제한 없음 + 한/영 전환. */
  mode?: "test" | "study";
  /** Study 이어 풀기 저장 키(시험 id) */
  storageId?: string;
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
  const isStudy = useContext(WritingStudyContext);
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
    if (isStudy) return; // Study 모드: 시간 제한 없음
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
  return { timeLeft, display: isStudy ? "No time limit" : `${mins}:${secs}` };
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
    q?.distractors?.forEach((t) => m.set(t.id, t.text));
    return m;
  }, [current, q]);

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
    // 함정 단어(distractors)도 같이 섞어 보여 준다.
    const ids = [...current.tokens, ...(q?.distractors ?? [])].map((t) => t.id).sort(() => Math.random() - 0.5);
    setShuffledMap((prev) => ({ ...prev, [qIndex]: ids }));
  }, [qIndex, current, shuffledMap]);
  const shuffled = shuffledMap[qIndex] ?? [...(current?.tokens ?? []), ...(q?.distractors ?? [])].map((t) => t.id);

  const setSelected = (updater: (prev: string[]) => string[]) => {
    setAllSelected((prev) => ({
      ...prev,
      [qIndex]: updater(prev[qIndex] ?? []),
    }));
  };

  const handleChunkClick = (tokenId: string) => {
    if (selected.includes(tokenId)) return;
    // 빈칸 수만큼만 채울 수 있다 (함정 단어가 있으면 조각 수 > 빈칸 수).
    if (selected.length >= (current?.correctOrder.length ?? 0)) return;
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
      onNext={handleNext}
    >
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "16px 24px" }}>
        <h2 style={{ textAlign: "center", fontSize: 21, fontWeight: 700, color: "#222", marginBottom: 40 }}>
          Make an appropriate sentence.
        </h2>

        {/* Turn 1: 질문/발화 */}
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 26 }}>
          <Avatar2 name="A" size={52} tone="#B07A8C" />
          <p style={{ fontSize: 14, color: "#222", margin: 0, paddingBottom: 2 }}>{q.contextLeadIn}</p>
        </div>

        {/* Turn 2: 빈칸 응답 — 칸을 누르면 단어가 빠진다 */}
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 40 }}>
          <Avatar2 name="B" size={52} tone="#4A6FA5" />
          <p style={{ fontSize: 14, color: "#222", margin: 0, lineHeight: 2.3, flex: 1 }}>
            {Array.from({ length: current?.correctOrder.length ?? 0 }).map((_, i) => {
              const tokenId = selected[i];
              const text = tokenId ? tokenById.get(tokenId) ?? "" : "";
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => tokenId && handleRemove(tokenId)}
                  style={{
                    display: "inline-block", minWidth: 108, margin: "0 4px", padding: "0 4px",
                    border: "none", borderBottom: "1px solid #333", background: "none",
                    textAlign: "center", fontSize: 14, color: "#222", cursor: tokenId ? "pointer" : "default",
                    height: 24, verticalAlign: "bottom",
                  }}
                >
                  {text || " "}
                </button>
              );
            })}
            <span>{current?.punctuation ?? ""}</span>
            <span> {q.contextLeadOut}</span>
          </p>
        </div>

        {/* Word chips — 박스 없이 글자만 */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px 26px", padding: "0 20px" }}>
          {shuffled.map((tokenId) => {
            const used = selected.includes(tokenId);
            return (
              <button
                key={tokenId}
                type="button"
                onClick={() => handleChunkClick(tokenId)}
                disabled={used}
                style={{ background: "none", border: "none", padding: "2px 0", fontSize: 14, color: "#222", cursor: used ? "default" : "pointer", visibility: used ? "hidden" : "visible" }}
              >
                {tokenById.get(tokenId) ?? ""}
              </button>
            );
          })}
        </div>
      </div>
    </ETSLayout>
  );
}


// ── ETS 에디터: Cut / Paste / Undo / Redo + Hide Word Count (사진 기준) ───────────
const ETS_TEAL = "#1E7B7D";

function EtsEditor({
  text, onTextChange, minHeight = 300, placeholder,
}: { text: string; onTextChange: (t: string) => void; minHeight?: number; placeholder?: string }) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const clipRef = useRef("");
  const undoRef = useRef<string[]>([]);
  const redoRef = useRef<string[]>([]);
  const [hideCount, setHideCount] = useState(false);
  const wc = countWords(text);

  const commit = (next: string) => {
    undoRef.current.push(text);
    redoRef.current = [];
    onTextChange(next);
  };
  const sel = () => {
    const el = taRef.current;
    return { a: el?.selectionStart ?? 0, b: el?.selectionEnd ?? 0 };
  };
  const cut = () => {
    const { a, b } = sel();
    if (a === b) return;
    clipRef.current = text.slice(a, b);
    commit(text.slice(0, a) + text.slice(b));
  };
  const paste = () => {
    if (!clipRef.current) return; // 시험 중에는 외부 클립보드를 쓰지 못한다(앱 안에서 자른 글만 붙여넣기)
    const { a, b } = sel();
    commit(text.slice(0, a) + clipRef.current + text.slice(b));
  };
  const undo = () => {
    const prev = undoRef.current.pop();
    if (prev === undefined) return;
    redoRef.current.push(text);
    onTextChange(prev);
  };
  const redo = () => {
    const nxt = redoRef.current.pop();
    if (nxt === undefined) return;
    undoRef.current.push(text);
    onTextChange(nxt);
  };

  const btn = (label: string, onClick: () => void, primary?: boolean) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      style={{
        height: 30, padding: "0 14px", fontSize: 12, fontWeight: 600, border: "none", borderRadius: 4, cursor: "pointer",
        backgroundColor: primary ? ETS_TEAL : "#E9ECEF", color: primary ? "#FFFFFF" : "#555",
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 4px" }}>
        {btn("Cut", cut, true)}
        {btn("Paste", paste)}
        {btn("Undo", undo)}
        {btn("Redo", redo)}
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 10, fontSize: 12, color: "#555" }}>
          <button type="button" onClick={() => setHideCount((v) => !v)} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 12 }}>
            {hideCount ? "Show Word Count" : "Hide Word Count"}
          </button>
          {!hideCount && <span style={{ fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{wc}</span>}
        </span>
      </div>
      <textarea
        ref={taRef}
        value={text}
        onChange={(e) => { undoRef.current.push(text); redoRef.current = []; onTextChange(e.target.value); }}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        onCopy={(e) => e.preventDefault()}
        onPaste={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
        placeholder={placeholder}
        style={{
          flex: 1, minHeight, width: "100%", padding: 14, border: "none", outline: "none", resize: "none",
          fontSize: 14, lineHeight: 1.6, color: "#222", fontFamily: "Arial, Helvetica, sans-serif",
          backgroundColor: "#FFFFFF", boxSizing: "border-box",
        }}
      />
    </div>
  );
}

function Avatar2({ name, size = 56, tone = "#8B9DC3" }: { name: string; size?: number; tone?: string }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", backgroundColor: tone, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.4, flexShrink: 0, border: "2px solid #E4E7EB" }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

const leftPanel: React.CSSProperties = { overflowY: "auto", padding: "14px 16px", fontSize: 14, lineHeight: 1.45, color: "#222", border: "1px solid #E4E7EB", borderRadius: 6, backgroundColor: "#FAFBFC" };
const rightPanel: React.CSSProperties = { display: "flex", flexDirection: "column", minHeight: 0, padding: "0 4px", overflowY: "auto" };

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
      questionLabel="Question 1 of 2"
      totalQuestions={12}
      currentQuestion={11}
      onNext={() => onComplete(text)}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.25fr", gap: 14, padding: "14px 22px", height: "100%", boxSizing: "border-box" }}>
        <div style={leftPanel}>
          <p style={{ marginBottom: 12 }}>{item.situation}</p>
          <p style={{ fontWeight: 700, marginBottom: 8 }}>In your email, do the following.</p>
          {item.hints && item.hints.length > 0 && (
            <ul style={{ margin: "0 0 14px 6px", paddingLeft: 18 }}>
              {item.hints.map((h, i) => (<li key={i} style={{ marginBottom: 6 }}>{h}</li>))}
            </ul>
          )}
          <p>Write as much as you can and in complete sentences.</p>
        </div>
        <div style={rightPanel}>
          <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Your Response:</p>
          {(recipient || subjectLine) && (
            <div style={{ fontSize: 13, marginBottom: 6, lineHeight: 1.5 }}>
              {recipient && <div><strong>To:</strong> {recipient}</div>}
              {subjectLine && <div><strong>Subject:</strong> {subjectLine}</div>}
            </div>
          )}
          <EtsEditor text={text} onTextChange={onTextChange} minHeight={260} />
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
      questionLabel="Question 2 of 2"
      totalQuestions={12}
      currentQuestion={12}
      onNext={() => onComplete(text)}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.25fr", gap: 14, padding: "14px 22px", height: "100%", boxSizing: "border-box" }}>
        <div style={leftPanel}>
          <p style={{ marginBottom: 12 }}>Your professor is teaching a class. Write a post responding to the professor&apos;s question.</p>
          <p style={{ fontWeight: 700, marginBottom: 8 }}>In your response, you should do the following.</p>
          <ul style={{ margin: "0 0 12px 6px", paddingLeft: 18 }}>
            <li style={{ marginBottom: 6 }}>Express and support your opinion.</li>
            <li style={{ marginBottom: 6 }}>Make a contribution to the discussion in your own words.</li>
          </ul>
          <p style={{ marginBottom: 14 }}>An effective response will contain at least {min} words.</p>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
            <Avatar2 name={professor} size={92} tone="#6B7C93" />
          </div>
          <p>{item.professorPrompt}</p>
        </div>
        <div style={rightPanel}>
          {studentPosts.map((s2, idx) => (
            <div key={s2.id} style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 14 }}>
              <Avatar2 name={s2.author} size={52} tone={idx % 2 === 0 ? "#B07A8C" : "#4A8F8C"} />
              <p style={{ fontSize: 13, lineHeight: 1.45, color: "#222", textAlign: "justify", margin: 0 }}>{s2.content}</p>
            </div>
          ))}
          <EtsEditor text={text} onTextChange={onTextChange} minHeight={200} />
        </div>
      </div>
    </ETSLayout>
  );
}

// ══════════════════════════════════════════════════════════════════════
// 메인 Runner
// ══════════════════════════════════════════════════════════════════════
export default function WritingRunnerETS({ test, mode = "test", storageId, onFinish }: Props) {
  const isStudy = mode === "study";
  return (
    <WritingStudyContext.Provider value={isStudy}>
      <WritingRunnerETSInner test={test} onFinish={onFinish} storageId={storageId} />
    </WritingStudyContext.Provider>
  );
}

function WritingRunnerETSInner({ test, onFinish, storageId }: Omit<Props, "mode">) {
  const isStudy = useContext(WritingStudyContext);
  const { t } = useStudyLang();
  const tx = (en: string, ko: string) => (isStudy ? t(en, ko) : en);
  const [phase, setPhase] = useState<TestPhase>("intro");
  const [task1Scores, setTask1Scores] = useState<{ questionId: string; correct: boolean; userSequence: string[] }[]>([]);
  const [task2Text, setTask2Text] = useState("");
  const [task3Text, setTask3Text] = useState("");

  // ── Study 이어 풀기: 과제 위치와 이메일·토론 초안을 저장 (Build a Sentence 진행은 과제 처음부터) ──
  type WritingSaved = { phase: TestPhase; task2Text: string; task3Text: string };
  const sid = storageId ?? (test as any)?.meta?.id ?? "writing";
  const [resumeOffer, setResumeOffer] = useState<{ data: WritingSaved; savedAt: string } | null>(null);
  const [resumeChecked, setResumeChecked] = useState(false);
  useEffect(() => {
    if (!isStudy) return;
    setResumeOffer(loadStudy<WritingSaved>("writing", sid));
    setResumeChecked(true);
  }, [isStudy, sid]);
  useEffect(() => {
    if (!isStudy || !resumeChecked || resumeOffer || phase === "intro" || phase === "done") return;
    saveStudy<WritingSaved>("writing", sid, { phase, task2Text, task3Text });
  }, [isStudy, resumeChecked, resumeOffer, phase, task2Text, task3Text, sid]);
  useEffect(() => {
    if (isStudy && phase === "done") clearStudy("writing", sid);
  }, [isStudy, phase, sid]);

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

  if (isStudy && resumeOffer && phase === "intro") {
    const d = resumeOffer.data;
    return (
      <ETSLayout hideFooter onNext={() => {
        setTask2Text(d.task2Text ?? "");
        setTask3Text(d.task3Text ?? "");
        // Build a Sentence 중이었다면 그 과제 처음부터
        setPhase(d.phase === "task1" ? "task1_begin" : d.phase);
        setResumeOffer(null);
      }} nextLabel={tx("Resume >", "이어서 하기 >")}>
        <div style={{ padding: "6px 36px", backgroundColor: "#FFFFFF", minHeight: "100%" }}>
          <div style={{ maxWidth: 620, margin: "0 auto" }}>
            <h1 style={{ fontSize: 22, fontWeight: 400, color: "#333", borderBottom: "1px solid #DDD", paddingBottom: 8, marginBottom: 20 }}>
              {tx("Resume your study session?", "이어서 학습할까요?")}
            </h1>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "#444", marginBottom: 6 }}>
              {tx("Your drafts are saved. Build a Sentence restarts from the first question.", "작성한 초안이 저장되어 있습니다. Build a Sentence는 첫 문항부터 다시 시작합니다.")}
            </p>
            <p style={{ fontSize: 12, color: "#888", marginBottom: 22 }}>{tx("Last saved: ", "마지막 저장: ")}{new Date(resumeOffer.savedAt).toLocaleString()}</p>
            <button
              type="button"
              onClick={() => { clearStudy("writing", sid); setResumeOffer(null); }}
              style={{ height: 36, padding: "0 18px", fontSize: 13, fontWeight: 700, borderRadius: 6, backgroundColor: "#FFFFFF", color: "#1E7B7D", border: "1px solid #1E7B7D", cursor: "pointer" }}
            >
              {tx("Start over", "처음부터")}
            </button>
          </div>
        </div>
      </ETSLayout>
    );
  }

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
      buildItem && { title: "Build a Sentence", description: tx("Create a grammatical sentence.", "단어를 배열해 문법에 맞는 문장을 만듭니다.") },
      emailItem && { title: "Write an Email", description: tx("Write an email using information provided.", "주어진 정보를 사용해 이메일을 씁니다.") },
      academicItem && { title: "Write for an Academic Discussion", description: tx("Participate in an online discussion.", "온라인 토론에 참여해 글을 씁니다.") },
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
        body={tx("Move the words in the boxes to create grammatical sentences. In an actual test, a clock will show you how much time you have to complete this task.", "상자 속 단어를 움직여 문법에 맞는 문장을 만드세요. 실제 시험에서는 이 과제를 끝낼 수 있는 남은 시간이 시계로 표시됩니다.")}
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
        body={tx(`You will read some information and use the information to write an email. You will have ${minutes} minutes to write the email.`, `제시된 정보를 읽고 그 정보를 사용해 이메일을 쓰세요. 이메일을 쓸 시간은 ${minutes}분입니다.`)}
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
        body={tx(`A professor has posted a question about a topic and students have responded with their thoughts and ideas. Make a contribution to the discussion. You will have ${minutes} minutes to write.`, `교수가 어떤 주제에 대해 질문을 올렸고 학생들이 자신의 생각을 답했습니다. 토론에 의견을 보태세요. 글을 쓸 시간은 ${minutes}분입니다.`)}
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
