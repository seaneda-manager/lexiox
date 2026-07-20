"use client";

/**
 * Updated TOEFL Listening Runner — ETS UI 스펙 구현 [최종 확정]
 *
 * 세트 흐름: Listening Phase (오디오 재생) → Testing Phase (문항 풀이)
 * - 오디오 재생 중: Next 버튼 + 선지 완전 비활성화
 * - 문제 풀이: Back 버튼 영구 비활성화, 전역 타이머(기본 5분)
 * - 오디오 프로그레스바: pointer-events none (seek 금지)
 * - 다중선택 지원 (selectCount >= 2)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  LListeningTest2026Linear,
  LListeningTrack2026,
  LQuestion2026,
} from "@/models/listening";

// ── 타입 ──────────────────────────────────────────────────────────────────
type TrackPhase = "listening" | "testing";

type Props = {
  test: LListeningTest2026Linear;
  onFinish?: (result: {
    answers: Record<string, string[]>;
    correct: number;
    total: number;
  }) => void;
};

// ── 타이머 훅 ─────────────────────────────────────────────────────────────
function useCountdown(seconds: number, onExpire: () => void) {
  const [left, setLeft] = useState(seconds);
  const expiredRef = useRef(false);

  useEffect(() => {
    expiredRef.current = false;
    setLeft(seconds);
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
  }, [seconds]);

  const mins = String(Math.floor(left / 60)).padStart(2, "0");
  const secs = String(left % 60).padStart(2, "0");
  return { left, display: `${mins}:${secs}` };
}

// ── 채점 ──────────────────────────────────────────────────────────────────
function scoreAll(
  tracks: LListeningTrack2026[],
  answers: Record<string, string[]>
): { correct: number; total: number } {
  let correct = 0, total = 0;
  for (const track of tracks) {
    for (const q of track.questions) {
      total++;
      const chosen = answers[q.id] ?? [];
      const correctIds = q.correctIndices.map((i) => q.choices[i]?.id).filter(Boolean);
      const sorted = (arr: string[]) => [...arr].sort().join(",");
      if (sorted(chosen) === sorted(correctIds as string[])) correct++;
    }
  }
  return { correct, total };
}

// ── 세트 라벨 ─────────────────────────────────────────────────────────────
const TASK_LABELS: Record<string, string> = {
  conversation: "Conversation",
  academic_lecture: "Academic Lecture",
  campus_audio_log: "Campus Audio Log",
};

// ── Listening Phase ────────────────────────────────────────────────────────
function ListeningPhase({
  track,
  onAudioEnd,
}: {
  track: LListeningTrack2026;
  onAudioEnd: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0); // 0~1

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const handleTimeUpdate = () => {
      if (el.duration > 0) setProgress(el.currentTime / el.duration);
    };
    const handleEnded = () => {
      setProgress(1);
      onAudioEnd();
    };

    el.addEventListener("timeupdate", handleTimeUpdate);
    el.addEventListener("ended", handleEnded);
    el.play().catch(() => {
      // autoplay blocked — 사용자 인터랙션 없으면 onAudioEnd 지연 호출
    });

    return () => {
      el.removeEventListener("timeupdate", handleTimeUpdate);
      el.removeEventListener("ended", handleEnded);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track.id]);

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      backgroundColor: "#F4F6F9", gap: 30,
    }}>
      {/* 컨텍스트 일러스트 */}
      <div style={{
        width: 800, height: 450,
        backgroundColor: "#E8ECF0",
        borderRadius: 12, overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
        border: "1px solid #D0D5DD",
        flexShrink: 0,
      }}>
        {track.illustrationUrl ? (
          <img
            src={track.illustrationUrl}
            alt="context illustration"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ textAlign: "center", color: "#94A3B8" }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>
              {track.taskKind === "conversation" ? "💬"
                : track.taskKind === "academic_lecture" ? "🎓"
                : "📢"}
            </div>
            <p style={{ fontSize: 18, fontWeight: 600 }}>{TASK_LABELS[track.taskKind]}</p>
            {track.title && <p style={{ fontSize: 14, marginTop: 4, opacity: 0.7 }}>{track.title}</p>}
          </div>
        )}
      </div>

      {/* Status 텍스트 */}
      <p style={{ fontSize: 16, color: "#555", fontWeight: 500 }}>
        Now listening… please do not navigate away.
      </p>

      {/* 오디오 프로그레스바 (seek 금지) */}
      <div style={{ width: 500, position: "relative" }}>
        <div style={{
          width: 500, height: 6, backgroundColor: "#E0E0E0", borderRadius: 3,
          overflow: "hidden",
          pointerEvents: "none", // seek 금지
          userSelect: "none",
        }}>
          <div style={{
            height: "100%", borderRadius: 3, backgroundColor: "#0073E6",
            width: `${progress * 100}%`,
            transition: "width 0.3s linear",
          }} />
        </div>
        <div style={{
          display: "flex", justifyContent: "space-between",
          marginTop: 8, fontSize: 12, color: "#94A3B8",
        }}>
          <span>0:00</span>
          <span>{track.audioSeconds ? `${Math.floor(track.audioSeconds / 60)}:${String(track.audioSeconds % 60).padStart(2, "0")}` : "--"}</span>
        </div>
      </div>

      {/* 숨겨진 audio 엘리먼트 */}
      {track.audioUrl && (
        <audio ref={audioRef} src={track.audioUrl} preload="auto" style={{ display: "none" }} />
      )}

      {/* audioUrl 없으면 개발용 타이머 시뮬레이션 버튼 */}
      {!track.audioUrl && (
        <button
          onClick={onAudioEnd}
          style={{
            marginTop: 8, padding: "10px 24px", fontSize: 13, fontWeight: 600,
            border: "1px solid #CBD5E1", borderRadius: 6,
            backgroundColor: "#FFFFFF", cursor: "pointer", color: "#555",
          }}
        >
          [개발용] 오디오 재생 완료 →
        </button>
      )}
    </div>
  );
}

// ── Testing Phase ──────────────────────────────────────────────────────────
function TestingPhase({
  track,
  trackIndex,
  totalTracks,
  answers,
  onAnswer,
  onNext,
  onTimeExpire,
}: {
  track: LListeningTrack2026;
  trackIndex: number;
  totalTracks: number;
  answers: Record<string, string[]>;
  onAnswer: (qId: string, choiceIds: string[]) => void;
  onNext: () => void;
  onTimeExpire: () => void;
}) {
  const [qIdx, setQIdx] = useState(0);
  const testingSeconds = track.testingSeconds ?? 300;
  const { display: timerDisplay, left } = useCountdown(testingSeconds, onTimeExpire);
  const isWarning = left <= 60;

  const q = track.questions[qIdx];
  const isLast = qIdx >= track.questions.length - 1;
  const chosen = answers[q?.id ?? ""] ?? [];
  const selectCount = q?.selectCount ?? 1;
  const isMulti = selectCount > 1;

  const handleChoiceClick = (choiceId: string) => {
    if (!q) return;
    if (isMulti) {
      const current = answers[q.id] ?? [];
      const next = current.includes(choiceId)
        ? current.filter((id) => id !== choiceId)
        : current.length < selectCount
          ? [...current, choiceId]
          : current;
      onAnswer(q.id, next);
    } else {
      onAnswer(q.id, [choiceId]);
    }
  };

  const handleNext = () => {
    if (isLast) {
      onNext();
    } else {
      setQIdx((i) => i + 1);
    }
  };

  if (!q) return null;

  return (
    <div style={{
      flex: 1, overflowY: "auto", backgroundColor: "#F4F6F9",
      display: "flex", flexDirection: "column",
    }}>
      {/* Sub-header: 세트 정보 + 타이머 */}
      <div style={{
        backgroundColor: "#F0F4F8", borderBottom: "1px solid #E0E0E0",
        padding: "12px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            backgroundColor: "#1A2B4C", color: "#fff",
            fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
            letterSpacing: 0.5,
          }}>
            {TASK_LABELS[track.taskKind]}
          </span>
          <span style={{ fontSize: 13, color: "#555" }}>
            Set {trackIndex + 1} of {totalTracks}
          </span>
          <span style={{ fontSize: 13, color: "#888" }}>
            · Question {qIdx + 1} of {track.questions.length}
          </span>
        </div>
        <span style={{
          fontFamily: "monospace", fontSize: 16, fontWeight: 700,
          color: isWarning ? "#DC2626" : "#333",
          padding: "4px 12px",
          backgroundColor: isWarning ? "#FEF2F2" : "#FFFFFF",
          borderRadius: 6,
          border: `1px solid ${isWarning ? "#FCA5A5" : "#E0E0E0"}`,
        }}>
          {timerDisplay}
        </span>
      </div>

      {/* Question + Options */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "50px 24px 40px" }}>

        {/* 발문 */}
        <div style={{
          width: "100%", maxWidth: 1200,
          marginBottom: 32,
        }}>
          {isMulti && (
            <p style={{ fontSize: 13, color: "#0073E6", fontWeight: 600, marginBottom: 8 }}>
              Choose {selectCount} answers.
            </p>
          )}
          <p style={{
            fontSize: 22, fontWeight: 700, color: "#1A2B4C", lineHeight: 1.5,
          }}>
            {q.stem}
          </p>
        </div>

        {/* 선지 목록 */}
        <div style={{
          width: "100%", maxWidth: 1200,
          display: "flex", flexDirection: "column", gap: 20,
        }}>
          {q.choices.map((choice, ci) => {
            const letter = ["A", "B", "C", "D", "E", "F"][ci];
            const isSelected = chosen.includes(choice.id);
            return (
              <button
                key={choice.id}
                onClick={() => handleChoiceClick(choice.id)}
                style={{
                  width: "100%", padding: "20px 24px",
                  border: `1px solid ${isSelected ? "#0073E6" : "#E0E0E0"}`,
                  borderRadius: 8,
                  backgroundColor: isSelected ? "#E6F0FA" : "#FFFFFF",
                  cursor: "pointer", textAlign: "left",
                  display: "flex", alignItems: "flex-start", gap: 16,
                  transition: "background-color 0.15s, border-color 0.15s",
                  fontSize: 17, color: isSelected ? "#1A2B4C" : "#333",
                  fontWeight: isSelected ? 600 : 400,
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "#0073E6";
                    (e.currentTarget as HTMLButtonElement).style.cursor = "pointer";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "#E0E0E0";
                  }
                }}
              >
                {/* 라디오/체크박스 커스텀 */}
                <span style={{
                  flexShrink: 0, marginTop: 2,
                  width: 20, height: 20,
                  borderRadius: isMulti ? 4 : "50%",
                  border: `2px solid ${isSelected ? "#0073E6" : "#C0C8D0"}`,
                  backgroundColor: isSelected ? "#0073E6" : "#FFFFFF",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {isSelected && <span style={{ color: "#fff", fontSize: isMulti ? 13 : 10, lineHeight: 1 }}>
                    {isMulti ? "✓" : "●"}
                  </span>}
                </span>
                <span style={{ fontWeight: 700, color: "#888", fontSize: 15, marginRight: 4 }}>{letter}.</span>
                <span style={{ lineHeight: 1.5 }}>{choice.text}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 하단 네비게이션 */}
      <div style={{
        padding: "16px 32px",
        borderTop: "1px solid #E0E0E0",
        backgroundColor: "#FFFFFF",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        {/* Back — 영구 비활성화 */}
        <button
          disabled
          style={{
            height: 36, padding: "0 18px", fontSize: 13, fontWeight: 600,
            border: "1px solid #E0E0E0", borderRadius: 4,
            backgroundColor: "#F8F9FA", color: "#C0C8D0", cursor: "not-allowed",
          }}
        >
          &lt; Back
        </button>

        <button
          onClick={handleNext}
          style={{
            height: 36, padding: "0 24px", fontSize: 13, fontWeight: 700,
            border: "none", borderRadius: 4,
            backgroundColor: "#0073E6", color: "#FFFFFF", cursor: "pointer",
          }}
        >
          {isLast ? "Next Set >" : "Next >"}
        </button>
      </div>
    </div>
  );
}

// ── 메인 러너 ──────────────────────────────────────────────────────────────
export default function ListeningRunnerETS({ test, onFinish }: Props) {
  const [trackIdx, setTrackIdx] = useState(0);
  const [phase, setPhase] = useState<TrackPhase>("listening");
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [done, setDone] = useState(false);

  const tracks = test.tracks;
  const currentTrack = tracks[trackIdx];

  const handleAudioEnd = useCallback(() => {
    setPhase("testing");
  }, []);

  const handleAnswer = useCallback((qId: string, choiceIds: string[]) => {
    setAnswers((prev) => ({ ...prev, [qId]: choiceIds }));
  }, []);

  const advanceTrack = useCallback(() => {
    if (trackIdx < tracks.length - 1) {
      setTrackIdx((i) => i + 1);
      setPhase("listening");
    } else {
      const { correct, total } = scoreAll(tracks, answers);
      setDone(true);
      onFinish?.({ answers, correct, total });
    }
  }, [trackIdx, tracks, answers, onFinish]);

  if (done) {
    const { correct, total } = scoreAll(tracks, answers);
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    return (
      <div style={{
        display: "flex", flexDirection: "column", minHeight: "100vh",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}>
        <header style={{ height: 60, backgroundColor: "#1A2B4C", display: "flex", alignItems: "center", padding: "0 24px" }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>Updated TOEFL iBT - Listening</span>
        </header>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, backgroundColor: "#F4F6F9" }}>
          <div style={{ fontSize: 64 }}>🎧</div>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: "#1A2B4C" }}>Listening Section Complete!</h2>
          <p style={{ fontSize: 20, color: "#555" }}>
            Score: <strong>{correct}</strong> / {total}
            <span style={{ marginLeft: 12, color: "#0073E6", fontWeight: 700 }}>{pct}%</span>
          </p>
        </div>
      </div>
    );
  }

  if (!currentTrack) return null;

  // 전체 문항 진행률 계산
  const globalTotal = tracks.reduce((s, t) => s + t.questions.length, 0);
  const globalAnswered = tracks.slice(0, trackIdx).reduce((s, t) => s + t.questions.length, 0)
    + Object.keys(answers).filter((id) => currentTrack.questions.some((q) => q.id === id)).length;

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      fontFamily: "Arial, Helvetica, sans-serif",
    }}>
      {/* ── ETS Header ── */}
      <header style={{
        height: 60, backgroundColor: "#1A2B4C", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px",
      }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>
          Updated TOEFL iBT - Listening
        </span>
        {/* 우상단 진행 상태 */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
            {phase === "listening" ? "🔊 Playing audio…" : `${globalAnswered} / ${globalTotal} answered`}
          </span>
          {/* 트랙 dots */}
          <div style={{ display: "flex", gap: 6 }}>
            {tracks.map((_, i) => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: "50%",
                backgroundColor: i < trackIdx ? "#22C55E"
                  : i === trackIdx ? "#FFFFFF" : "rgba(255,255,255,0.3)",
              }} />
            ))}
          </div>
        </div>
      </header>

      {/* ── Phase 분기 ── */}
      {phase === "listening" ? (
        <ListeningPhase track={currentTrack} onAudioEnd={handleAudioEnd} />
      ) : (
        <TestingPhase
          track={currentTrack}
          trackIndex={trackIdx}
          totalTracks={tracks.length}
          answers={answers}
          onAnswer={handleAnswer}
          onNext={advanceTrack}
          onTimeExpire={advanceTrack}
        />
      )}

      {/* ── ETS Footer ── */}
      <footer style={{
        height: 60, backgroundColor: "#F4F6F9", flexShrink: 0,
        borderTop: "1px solid #E0E0E0",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px",
      }}>
        <span style={{ fontSize: 14, color: "#555" }}>
          {TASK_LABELS[currentTrack.taskKind]} — Set {trackIdx + 1} of {tracks.length}
        </span>
        <span style={{ fontSize: 13, color: "#888" }}>
          {phase === "listening" ? "Audio playing — please wait" : "No backtracking allowed"}
        </span>
      </footer>
    </div>
  );
}
