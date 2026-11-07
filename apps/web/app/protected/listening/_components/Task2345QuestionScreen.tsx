"use client";

import { useState, useEffect } from "react";
import ListeningTestLayout2026, { ListeningHeaderLabel, ListeningSubHeaderLabel, useListeningTx } from "@/components/listening/ListeningTestLayout2026";
import VolumeControl from "@/components/listening/VolumeControl";
import SpeakerVisual from "@/components/listening/SpeakerVisual";
import StudyAudioPlayer from "./StudyAudioPlayer";
import type { ScriptSegment } from "@/models/listening";

interface Choice {
  id: string;
  text: string;
  /** 채점은 부모(ListeningSessionContainer)가 하고, 여기선 안 읽는다 — 필드명이
   * "correct"인 실제 데이터와 호환되도록 optional로 둔다. */
  isCorrect?: boolean;
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
  /** 표(도표) 불일치 찾기 문항용 — 있으면 질문 위에 렌더링 */
  tableData?: { headers: string[]; rows: string[][] };
  volume: number;
  onVolumeChange: (volume: number) => void;
}

const nextButtonStyle: React.CSSProperties = {
  height: 36,
  padding: "0 18px",
  fontSize: 13,
  fontWeight: 700,
  border: "none",
  borderRadius: 6,
  backgroundColor: "#FFFFFF",
  color: "#1E7B7D",
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
  tableData,
  volume,
  onVolumeChange,
}: Task2345QuestionScreenProps) {
  const isStudy = mode === "study";
  const tx = useListeningTx();
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
          <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: timeLeft <= 10 ? "#DC2626" : "#333" }}>
            {formatTime(timeLeft)}
          </span>
        ) : (
          <span style={{ fontSize: 12, color: "#444" }}>{tx("No time limit", "시간 제한 없음")}</span>
        )
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 36, alignItems: "start", paddingTop: 18 }}>
        {/* 좌: 화자 이미지 (conversation은 2명, 그 외는 1명) — study는 재청취/스크립트로 대체 */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          {isStudy && audioUrl ? (
            <StudyAudioPlayer audioUrl={audioUrl} transcript={transcript} scriptSegments={scriptSegments} />
          ) : (
            <SpeakerVisual taskKind={taskKind} illustrationUrl={illustrationUrl} size={200} />
          )}
        </div>

        {/* 우: 질문 + 선택지 */}
        <div>
          {tableData && (
            <table style={{ borderCollapse: "collapse", marginBottom: 16, fontSize: 13 }}>
              <thead>
                <tr>
                  {tableData.headers.map((h, i) => (
                    <th key={i} style={{ border: "1px solid #D0D5DD", padding: "6px 10px", background: "#F5F7FA", textAlign: "left", fontWeight: 700 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} style={{ border: "1px solid #D0D5DD", padding: "6px 10px" }}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <p style={{ fontSize: 14, fontWeight: 700, color: "#222", marginBottom: 14, lineHeight: 1.4 }}>
            {question}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {choices.map((choice, index) => (
              <label key={choice.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="choice"
                  checked={selectedChoiceIndex === index}
                  onChange={() => setSelectedChoiceIndex(index)}
                  style={{ width: 17, height: 17, marginTop: 1, accentColor: "#1E7B7D", cursor: "pointer" }}
                />
                <span style={{ fontSize: 14, lineHeight: 1.4, color: "#333" }}>{choice.text}</span>
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
