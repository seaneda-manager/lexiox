"use client";

import { useState, useEffect } from "react";
import ListeningTestLayout2026, { ListeningHeaderLabel, ListeningSubHeaderLabel } from "@/components/listening/ListeningTestLayout2026";
import VolumeControl from "@/components/listening/VolumeControl";
import SpeakerVisual from "@/components/listening/SpeakerVisual";
import StudyAudioPlayer from "./StudyAudioPlayer";
import type { ScriptSegment } from "@/models/listening";

interface Choice {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Task2345QuestionScreenProps {
  module: 1 | 2;
  taskKind: "conversation" | "announcement" | "academic_talk";
  currentQuestion: number;
  totalQuestions: number;
  question: string;
  choices: Choice[];
  maxTime?: number; // in seconds (default: 40, spec range 35-45)
  onNext: (selectedChoiceIndex: number) => void;
  onTimeUp?: () => void;
  /** test: 문항별 카운트다운·뒤로가기 불가 / study: 타이머 없음·뒤로가기·재청취·스크립트 */
  mode?: "test" | "study";
  /** study에서 돌아왔을 때 이전 답을 복원한다. */
  initialChoiceIndex?: number | null;
  onBack?: () => void;
  audioUrl?: string;
  illustrationUrl?: string;
  transcript?: string;
  scriptSegments?: ScriptSegment[];
  volume: number;
  onVolumeChange: (volume: number) => void;
}

const nextButtonStyle: React.CSSProperties = {
  height: 32,
  padding: "0 16px",
  fontSize: 12,
  fontWeight: 700,
  border: "none",
  borderRadius: 4,
  backgroundColor: "#0073E6",
  color: "#FFFFFF",
  cursor: "pointer",
};

export default function Task2345QuestionScreen({
  module,
  taskKind,
  currentQuestion,
  totalQuestions,
  question,
  choices,
  maxTime = 40,
  onNext,
  onTimeUp,
  mode = "test",
  initialChoiceIndex = null,
  onBack,
  audioUrl,
  illustrationUrl,
  transcript,
  scriptSegments,
  volume,
  onVolumeChange,
}: Task2345QuestionScreenProps) {
  const isStudy = mode === "study";
  const [selectedChoiceIndex, setSelectedChoiceIndex] = useState<number | null>(initialChoiceIndex);
  const [timeLeft, setTimeLeft] = useState(maxTime);

  // Timer effect. 부모가 문제마다 고유 key를 넘겨 컴포넌트를 새로 마운트시키므로
  // 여기서는 그냥 maxTime에서부터 새로 시작하면 된다.
  // study 모드는 시간 제약이 없으므로 타이머를 아예 돌리지 않는다.
  useEffect(() => {
    if (isStudy) return;
    if (timeLeft <= 0) {
      onTimeUp?.();
      onNext(selectedChoiceIndex ?? -1);
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [isStudy, timeLeft, selectedChoiceIndex, onNext, onTimeUp]);

  const formatTime = (seconds: number) => {
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  };

  const handleNext = () => {
    if (selectedChoiceIndex !== null) {
      onNext(selectedChoiceIndex);
    }
  };

  const canAdvance = selectedChoiceIndex !== null;

  return (
    <ListeningTestLayout2026
      headerLeft={<ListeningHeaderLabel module={module} />}
      headerRight={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <VolumeControl volume={volume} onVolumeChange={onVolumeChange} />
          {canAdvance && (
            <button onClick={handleNext} style={nextButtonStyle}>
              Next &gt;
            </button>
          )}
        </div>
      }
      subHeaderLeft={<ListeningSubHeaderLabel questionInfo={`Question ${currentQuestion} of ${totalQuestions}`} />}
      subHeaderRight={
        !isStudy ? (
          <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "monospace", color: timeLeft <= 10 ? "#DC2626" : "#333" }}>
            {formatTime(timeLeft)}
          </span>
        ) : (
          <span style={{ fontSize: 11, fontWeight: 700, color: "#0F9D58" }}>Study — no time limit</span>
        )
      }
    >
      <div style={{ display: "flex", gap: 40, alignItems: "flex-start", height: "100%" }}>
        {/* 좌: 화자 이미지 (conversation은 2명, 그 외는 1명) — study는 재청취/스크립트로 대체 */}
        <div style={{ flexShrink: 0 }}>
          {isStudy && audioUrl ? (
            <StudyAudioPlayer audioUrl={audioUrl} transcript={transcript} scriptSegments={scriptSegments} />
          ) : (
            <SpeakerVisual taskKind={taskKind} illustrationUrl={illustrationUrl} size={200} />
          )}
        </div>

        {/* 우: 질문 + 선택지 */}
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 20, lineHeight: 1.5 }}>
            {question}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {choices.map((choice, index) => (
              <label
                key={choice.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "8px 6px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="choice"
                  checked={selectedChoiceIndex === index}
                  onChange={() => setSelectedChoiceIndex(index)}
                  style={{ width: 16, height: 16, marginTop: 2, accentColor: "#0073E6", cursor: "pointer" }}
                />
                <span style={{ fontSize: 15, lineHeight: 1.5, color: selectedChoiceIndex === index ? "#0073E6" : "#222", fontWeight: selectedChoiceIndex === index ? 600 : 400 }}>
                  {choice.text}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {onBack && isStudy && (
        <div style={{ position: "absolute", bottom: 24, left: 36 }}>
          <button
            onClick={onBack}
            style={{ height: 32, padding: "0 16px", fontSize: 12, fontWeight: 600, border: "1px solid #D0D5DD", borderRadius: 4, backgroundColor: "#FFFFFF", color: "#333", cursor: "pointer" }}
          >
            &lt; Back
          </button>
        </div>
      )}
    </ListeningTestLayout2026>
  );
}
