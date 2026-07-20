"use client";

/**
 * Updated TOEFL Reading Runner — ETS UI 스펙 구현
 * - 단일 지문, 10문항, 18분 글로벌 타이머
 * - 좌: 지문 패널 (문단 하이라이트) | 우: 문제 패널
 * - Q1~9: multiple_choice | Q10: insert_sentence
 * - 전 문항 답안 전역 상태 유지 (Back/Next 자유 이동)
 */

import { useCallback, useEffect, useRef, useState } from "react";

// ── 타입 ───────────────────────────────────────────────────────��──────────
export type ReadingQuestion = {
  question_num: number;
  question_type: "multiple_choice" | "insert_sentence";
  target_paragraph_idx: number;
  question_text: string;
  options: string[];           // 4개
  correct_answer: number;      // 0-based
  insert_sentence_text?: string;
};

export type ReadingPassage = {
  passage_id: string;
  passage_title: string;
  paragraphs: string[];        // 각 인덱스 = 1 문단
  questions: ReadingQuestion[];
};

type Props = {
  passage: ReadingPassage;
  onSubmit?: (answers: (number | null)[]) => void;
};

// ── 18분 카운트다운 훅 ─────────────────────────────────────────────────────
function useCountdown(totalSeconds: number, onExpire: () => void) {
  const [left, setLeft] = useState(totalSeconds);
  const expiredRef = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      setLeft((prev) => {
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
  }, []);

  const mins = String(Math.floor(left / 60)).padStart(2, "0");
  const secs = String(left % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

// ── Insert Sentence 지문 렌더 ─────────────────────────────────────────────
function PassageParagraph({
  text,
  highlighted,
  insertMode,
  insertSentence,
  selectedInsertIdx,
  onInsertClick,
  paragraphIdx,
  targetParagraphIdx,
}: {
  text: string;
  highlighted: boolean;
  insertMode: boolean;
  insertSentence?: string;
  selectedInsertIdx: number | null;
  onInsertClick: (paraIdx: number, posIdx: number) => void;
  paragraphIdx: number;
  targetParagraphIdx: number;
}) {
  // Insert mode: 대상 문단에만 ■ 버튼 4개 삽입
  const isTargetForInsert = insertMode && paragraphIdx === targetParagraphIdx;

  if (isTargetForInsert) {
    // 문장 단위로 분리 (. ! ? 뒤 공백 기준)
    const sentences = text.match(/[^.!?]+[.!?]+\s*/g) ?? [text];
    // ■ 버튼을 문장 사이에 삽입 → 총 4개 (문장 앞/뒤 포함)
    const positions = Math.min(4, sentences.length + 1);

    return (
      <p style={{
        fontSize: 16, lineHeight: 1.6, color: "#222222", textAlign: "justify",
        marginBottom: 20,
        backgroundColor: highlighted ? "#FFFDE7" : "transparent",
        borderLeft: highlighted ? "4px solid #FBC02D" : "4px solid transparent",
        paddingLeft: highlighted ? 12 : 0,
        transition: "background-color 0.3s",
      }}>
        {Array.from({ length: positions }).map((_, pi) => (
          <span key={pi}>
            {/* ■ 삽입 버튼 */}
            {selectedInsertIdx === (paragraphIdx * 4 + pi) ? (
              // 이미 선택된 위치: 삽입된 문장 표시
              <span
                onClick={() => onInsertClick(paragraphIdx, pi)}
                style={{
                  display: "inline",
                  backgroundColor: "#E6F0FA",
                  border: "1px solid #0073E6",
                  borderRadius: 4,
                  padding: "2px 6px",
                  fontSize: 15,
                  color: "#0073E6",
                  cursor: "pointer",
                  margin: "0 4px",
                  fontStyle: "italic",
                }}
              >
                {insertSentence} ✕
              </span>
            ) : (
              <button
                onClick={() => onInsertClick(paragraphIdx, pi)}
                data-insert-idx={paragraphIdx * 4 + pi}
                style={{
                  display: "inline-block",
                  width: 24, height: 20,
                  backgroundColor: "#1A2B4C",
                  color: "#fff",
                  border: "none",
                  borderRadius: 2,
                  fontSize: 10,
                  cursor: "pointer",
                  margin: "0 4px",
                  verticalAlign: "middle",
                  lineHeight: "20px",
                }}
              >
                ■
              </button>
            )}
            {/* 문장 텍스트 */}
            {sentences[pi] ?? ""}
          </span>
        ))}
      </p>
    );
  }

  return (
    <p style={{
      fontSize: 16, lineHeight: 1.6, color: "#222222", textAlign: "justify",
      marginBottom: 20,
      backgroundColor: highlighted ? "#FFFDE7" : "transparent",
      borderLeft: highlighted ? "4px solid #FBC02D" : "4px solid transparent",
      paddingLeft: highlighted ? 12 : 0,
      transition: "background-color 0.3s, border-left 0.3s",
    }}>
      {text}
    </p>
  );
}

// ── 메인 러너 ──────────────────────────────────────────────────────────────
export default function ReadingRunnerETS({ passage, onSubmit }: Props) {
  const [qIdx, setQIdx] = useState(0);                              // 현재 문항 인덱스 (0-based)
  const [answers, setAnswers] = useState<(number | null)[]>(        // 전역 답안 배열
    Array(passage.questions.length).fill(null)
  );
  const [insertSelected, setInsertSelected] = useState<number | null>(null); // insert sentence 선택 위치
  const [submitted, setSubmitted] = useState(false);

  const passagePanelRef = useRef<HTMLDivElement>(null);

  const currentQ = passage.questions[qIdx];
  const isFirst = qIdx === 0;
  const isLast = qIdx === passage.questions.length - 1;
  const isInsert = currentQ?.question_type === "insert_sentence";

  // 문항 이동 시 지문 패널 스크롤 초기화
  const resetPassageScroll = useCallback(() => {
    passagePanelRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleNext = useCallback(() => {
    if (isLast) {
      setSubmitted(true);
      onSubmit?.(answers);
    } else {
      setQIdx((i) => i + 1);
      resetPassageScroll();
    }
  }, [isLast, answers, onSubmit, resetPassageScroll]);

  const handleBack = useCallback(() => {
    if (!isFirst) { setQIdx((i) => i - 1); resetPassageScroll(); }
  }, [isFirst, resetPassageScroll]);

  // 객관식 선택
  const handleChoiceClick = (optIdx: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[qIdx] = optIdx;
      return next;
    });
  };

  // Insert sentence 클릭
  const handleInsertClick = (paraIdx: number, posIdx: number) => {
    const key = paraIdx * 4 + posIdx;
    setInsertSelected((prev) => {
      const newVal = prev === key ? null : key;
      // answers에도 posIdx 저장 (채점용)
      setAnswers((a) => { const n = [...a]; n[qIdx] = newVal === null ? null : posIdx; return n; });
      return newVal;
    });
  };

  // 문항 바뀔 때 insert 선택 초기화
  useEffect(() => {
    if (!isInsert) setInsertSelected(null);
  }, [qIdx, isInsert]);

  const timerDisplay = useCountdown(18 * 60, () => {
    setSubmitted(true);
    onSubmit?.(answers);
  });

  if (submitted) {
    const correct = passage.questions.filter((q, i) => answers[i] === q.correct_answer).length;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6"
        style={{ backgroundColor: "#F4F6F9", fontFamily: "Arial, Helvetica, sans-serif" }}>
        <div style={{ fontSize: 64 }}>📖</div>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: "#1A2B4C" }}>Reading Section Complete!</h2>
        <p style={{ fontSize: 18, color: "#555" }}>
          Score: <strong>{correct}</strong> / {passage.questions.length} correct
        </p>
      </div>
    );
  }

  const totalQ = passage.questions.length;
  const progressPct = ((qIdx + 1) / totalQ) * 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", fontFamily: "Arial, Helvetica, sans-serif" }}>

      {/* ── Header ── */}
      <header style={{
        height: 60, backgroundColor: "#1A2B4C", display: "flex",
        alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0,
      }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>
          Updated TOEFL iBT - Reading
        </span>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={handleBack}
            disabled={isFirst}
            style={{
              width: 90, height: 36, fontSize: 13, fontWeight: 600,
              border: "1px solid #94A3B8", borderRadius: 4,
              backgroundColor: "transparent", color: isFirst ? "#64748B" : "#FFFFFF",
              cursor: isFirst ? "default" : "pointer", opacity: isFirst ? 0.4 : 1,
            }}
          >
            &lt; Back
          </button>
          <button
            onClick={handleNext}
            style={{
              width: 90, height: 36, fontSize: 13, fontWeight: 600,
              border: "none", borderRadius: 4,
              backgroundColor: "#0073E6", color: "#FFFFFF", cursor: "pointer",
            }}
          >
            {isLast ? "Submit" : "Next >"}
          </button>
        </div>
      </header>

      {/* ── Main: 좌우 분할 ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* 좌측: 지문 패널 */}
        <div
          ref={passagePanelRef}
          style={{
            width: "50%", height: "calc(100vh - 120px)",
            overflowY: "scroll", padding: 40,
            backgroundColor: "#FFFFFF",
          }}
        >
          <h1 style={{
            fontSize: 24, fontWeight: 800, color: "#111111",
            marginBottom: 24, textAlign: "center",
          }}>
            {passage.passage_title}
          </h1>
          {passage.paragraphs.map((para, pi) => (
            <PassageParagraph
              key={pi}
              text={para}
              highlighted={pi === currentQ?.target_paragraph_idx}
              insertMode={isInsert}
              insertSentence={currentQ?.insert_sentence_text}
              selectedInsertIdx={insertSelected}
              onInsertClick={handleInsertClick}
              paragraphIdx={pi}
              targetParagraphIdx={currentQ?.target_paragraph_idx ?? -1}
            />
          ))}
        </div>

        {/* 우측: 문제 패널 */}
        <div style={{
          width: "50%", height: "calc(100vh - 120px)",
          overflowY: "auto", padding: 40,
          backgroundColor: "#FFFFFF",
          borderLeft: "1px solid #E0E0E0",
        }}>

          {/* 발문 */}
          <p style={{
            fontSize: 18, fontWeight: 600, color: "#1A2B4C",
            marginBottom: 30, lineHeight: 1.6,
          }}>
            {currentQ?.question_text}
          </p>

          {/* Insert Sentence: 안내 박스 */}
          {isInsert && currentQ.insert_sentence_text && (
            <div style={{
              backgroundColor: "#F8F9FA", padding: 20, borderRadius: 6,
              marginBottom: 24, border: "1px solid #E0E0E0",
            }}>
              <p style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>
                삽입할 문장 — 좌측 지문의 ■ 버튼을 클릭해 위치를 선택하세요
              </p>
              <p style={{ fontSize: 16, color: "#1A2B4C", fontWeight: 600, lineHeight: 1.6 }}>
                "{currentQ.insert_sentence_text}"
              </p>
              {insertSelected !== null && (
                <p style={{ marginTop: 8, fontSize: 12, color: "#0073E6" }}>
                  ✓ 위치 선택됨 (위치 {(insertSelected % 4) + 1})
                </p>
              )}
            </div>
          )}

          {/* 4지선다 Options */}
          {!isInsert && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {currentQ?.options.map((opt, oi) => {
                const isSelected = answers[qIdx] === oi;
                return (
                  <button
                    key={oi}
                    onClick={() => handleChoiceClick(oi)}
                    style={{
                      width: "100%", padding: "16px 20px",
                      border: `1px solid ${isSelected ? "#0073E6" : "#E0E0E0"}`,
                      borderRadius: 6, textAlign: "left",
                      backgroundColor: isSelected ? "#E6F0FA" : "#FFFFFF",
                      fontSize: 15,
                      fontWeight: isSelected ? 600 : 400,
                      color: "#333333", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 12,
                      transition: "background-color 0.15s, border-color 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#F5F7FA";
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "#0073E6";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#FFFFFF";
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "#E0E0E0";
                      }
                    }}
                  >
                    {/* 커스텀 라디오 */}
                    <span style={{
                      width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                      border: `2px solid ${isSelected ? "#0073E6" : "#C0C8D0"}`,
                      backgroundColor: isSelected ? "#0073E6" : "#FFFFFF",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {isSelected && <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#FFFFFF" }} />}
                    </span>
                    <span style={{ fontWeight: 600, marginRight: 4, color: "#888", fontSize: 14 }}>
                      {["A", "B", "C", "D"][oi]}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <footer style={{
        height: 60, backgroundColor: "#F4F6F9",
        borderTop: "1px solid #E0E0E0",
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 15, color: "#333333" }}>
            Question {qIdx + 1} of {totalQ}
          </span>
          {/* 문항 빠른 이동 dots */}
          <div style={{ display: "flex", gap: 4 }}>
            {passage.questions.map((_, i) => (
              <button
                key={i}
                onClick={() => { setQIdx(i); resetPassageScroll(); }}
                style={{
                  width: 24, height: 8, borderRadius: 4, border: "none",
                  backgroundColor: i === qIdx ? "#0073E6"
                    : answers[i] !== null ? "#93C5FD" : "#D1D5DB",
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                }}
              />
            ))}
          </div>
        </div>
        <span style={{ fontSize: 20, fontWeight: 700, color: "#333333", fontFamily: "monospace" }}>
          Time Remaining: {timerDisplay}
        </span>
      </footer>
    </div>
  );
}
