"use client";

import { useState, useEffect, useRef } from "react";
import ListeningTestLayout2026, { ListeningHeaderLabel, ListeningSubHeaderLabel } from "@/components/listening/ListeningTestLayout2026";
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

interface Task1QuestionScreenProps {
  module: 1 | 2;
  currentQuestion: number;
  totalQuestions: number;
  audioUrl: string;
  illustrationUrl?: string;
  choices: Choice[];
  maxTime?: number; // in seconds (default: 20, spec range 15-30)
  onNext: (selectedChoiceIndex: number) => void;
  onTimeUp?: () => void;
  /** test: 1회 자동재생·카운트다운 / study: 반복 재생·스크립트·뒤로가기 */
  mode?: "test" | "study";
  initialChoiceIndex?: number | null;
  onBack?: () => void;
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

export default function Task1QuestionScreen({
  module,
  currentQuestion,
  totalQuestions,
  audioUrl,
  illustrationUrl,
  choices,
  maxTime = 20,
  onNext,
  onTimeUp,
  mode = "test",
  initialChoiceIndex = null,
  onBack,
  transcript,
  scriptSegments,
  volume,
  onVolumeChange,
}: Task1QuestionScreenProps) {
  const isStudy = mode === "study";
  const [selectedChoiceIndex, setSelectedChoiceIndex] = useState<number | null>(initialChoiceIndex);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(maxTime);
  const [audioHasPlayed, setAudioHasPlayed] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // 타이머: 오디오가 끝나기 전까지는 카운트다운하지 않는다 (스펙: 재생 중엔 타이머 정지)
  // study 모드는 시간 제약이 없으므로 아예 돌리지 않는다.
  useEffect(() => {
    if (isStudy) return;
    if (!audioHasPlayed) return;

    if (timeLeft <= 0) {
      onTimeUp?.();
      onNext(selectedChoiceIndex ?? -1);
      return;
    }

    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [isStudy, audioHasPlayed, timeLeft, selectedChoiceIndex, onNext, onTimeUp]);

  // Auto-play audio on mount (test 모드 전용 — study는 StudyAudioPlayer가 담당)
  useEffect(() => {
    if (isStudy) return;
    if (audioRef.current && !audioHasPlayed) {
      audioRef.current.volume = volume / 100;
      audioRef.current.play().catch((err) => {
        console.error("Audio playback error:", err);
        setIsAudioPlaying(false);
      });
      setIsAudioPlaying(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStudy]);

  // 헤더에서 볼륨을 바꾸면 재생 중인 오디오에도 즉시 반영
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);

  const formatTime = (seconds: number) => {
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  };

  const handleAudioEnd = () => {
    setIsAudioPlaying(false);
    setAudioHasPlayed(true);
  };

  const handleNext = () => {
    if (selectedChoiceIndex !== null) {
      onNext(selectedChoiceIndex);
    }
  };

  // study에서는 언제든 답을 고치고 다시 들을 수 있어야 한다.
  const isChoicesDisabled = isStudy ? false : isAudioPlaying || !audioHasPlayed;
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
          <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "monospace", color: audioHasPlayed && timeLeft <= 5 ? "#DC2626" : "#333" }}>
            {audioHasPlayed ? formatTime(timeLeft) : "--:--"}
          </span>
        ) : (
          <span style={{ fontSize: 11, fontWeight: 700, color: "#0F9D58" }}>Study — no time limit</span>
        )
      }
    >
      <div style={{ display: "flex", gap: 40, alignItems: "center", height: "100%" }}>
        {/* 좌: 화자 이미지 */}
        <div style={{ flexShrink: 0 }}>
          <SpeakerVisual taskKind="choose_response" illustrationUrl={illustrationUrl} size={200} />
          {!isStudy && (
            <div style={{ textAlign: "center", marginTop: 10, fontSize: 12, color: isAudioPlaying ? "#0073E6" : "#666" }}>
              {isAudioPlaying ? "🔊 Now playing..." : audioHasPlayed ? "✓ Audio played" : "Ready to listen"}
            </div>
          )}
        </div>

        {/* 우: 질문 + 선택지 */}
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111", marginBottom: 20 }}>
            Choose the best response.
          </h2>

          {isStudy && (
            <div style={{ marginBottom: 20 }}>
              <StudyAudioPlayer audioUrl={audioUrl} transcript={transcript} scriptSegments={scriptSegments} autoPlay />
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {choices.map((choice, index) => (
              <label
                key={choice.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "8px 6px",
                  cursor: isChoicesDisabled ? "not-allowed" : "pointer",
                  opacity: isChoicesDisabled ? 0.55 : 1,
                }}
              >
                <input
                  type="radio"
                  name="choice"
                  checked={selectedChoiceIndex === index}
                  onChange={() => setSelectedChoiceIndex(index)}
                  disabled={isChoicesDisabled}
                  style={{ width: 16, height: 16, marginTop: 2, accentColor: "#0073E6", cursor: "inherit" }}
                />
                <span style={{ fontSize: 15, lineHeight: 1.5, color: selectedChoiceIndex === index ? "#0073E6" : "#222", fontWeight: selectedChoiceIndex === index ? 600 : 400 }}>
                  {choice.text}
                </span>
              </label>
            ))}
          </div>

          {!isStudy && isAudioPlaying && (
            <p style={{ marginTop: 16, fontSize: 12, color: "#92600A" }}>
              Listen to the audio. You can select your answer after it finishes playing.
            </p>
          )}
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

      {/* Hidden Audio (test 모드 전용) */}
      {!isStudy && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={handleAudioEnd}
          onError={() => {
            console.error("Audio error");
            setIsAudioPlaying(false);
            setAudioHasPlayed(true);
          }}
        />
      )}
    </ListeningTestLayout2026>
  );
}
