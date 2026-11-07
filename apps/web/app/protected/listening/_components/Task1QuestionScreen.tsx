"use client";

import { useState, useEffect, useRef } from "react";
import ListeningTestLayout2026, { ListeningHeaderLabel, ListeningSubHeaderLabel, useListeningTx } from "@/components/listening/ListeningTestLayout2026";
import VolumeControl from "@/components/listening/VolumeControl";
import PlaybackRateControl from "@/components/listening/PlaybackRateControl";
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
  playbackRate?: number;
  onPlaybackRateChange?: (rate: number) => void;
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
  playbackRate = 1,
  onPlaybackRateChange,
}: Task1QuestionScreenProps) {
  const isStudy = mode === "study";
  const tx = useListeningTx();
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
      audioRef.current.playbackRate = playbackRate;
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

  // 헤더에서 속도를 바꾸면 재생 중인 오디오에도 즉시 반영
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

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
          {!isStudy && onPlaybackRateChange && (
            <PlaybackRateControl rate={playbackRate} onRateChange={onPlaybackRateChange} />
          )}
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
          <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: audioHasPlayed && timeLeft <= 5 ? "#DC2626" : "#333" }}>
            {audioHasPlayed ? formatTime(timeLeft) : "--:--"}
          </span>
        ) : (
          <span style={{ fontSize: 12, color: "#444" }}>{tx("No time limit", "시간 제한 없음")}</span>
        )
      }
    >
      <h2 style={{ textAlign: "center", fontSize: 21, fontWeight: 700, color: "#222", marginBottom: 26 }}>
        {tx("Choose the best response.", "가장 알맞은 응답을 고르세요.")}
      </h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 36, alignItems: "start" }}>
        {/* 좌: 화자 이미지 */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <SpeakerVisual taskKind="choose_response" illustrationUrl={illustrationUrl} size={200} />
        </div>

        {/* 우: 선택지 (오디오가 끝나기 전에는 흐리게, 선택 불가) */}
        <div>
          {isStudy && (
            <div style={{ marginBottom: 20 }}>
              <StudyAudioPlayer audioUrl={audioUrl} transcript={transcript} scriptSegments={scriptSegments} autoPlay />
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {choices.map((choice, index) => (
              <label
                key={choice.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  cursor: isChoicesDisabled ? "default" : "pointer",
                  opacity: isChoicesDisabled ? 0.4 : 1,
                }}
              >
                <input
                  type="radio"
                  name="choice"
                  checked={selectedChoiceIndex === index}
                  onChange={() => setSelectedChoiceIndex(index)}
                  disabled={isChoicesDisabled}
                  style={{ width: 17, height: 17, marginTop: 1, accentColor: "#1E7B7D", cursor: "inherit" }}
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
