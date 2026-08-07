"use client";

import { useState, useEffect, useRef } from "react";
import ListeningTestLayout2026, { ListeningHeaderLabel, ListeningSubHeaderLabel } from "@/components/listening/ListeningTestLayout2026";
import VolumeControl from "@/components/listening/VolumeControl";
import SpeakerVisual from "@/components/listening/SpeakerVisual";
import StudyAudioPlayer from "./StudyAudioPlayer";
import type { ScriptSegment } from "@/models/listening";

interface ListeningScreenProps {
  module: 1 | 2;
  taskKind: "conversation" | "announcement" | "academic_talk";
  audioUrl: string;
  illustrationUrl?: string;
  title: string;
  onAudioEnd: () => void;
  /** test: 자동재생·컨트롤 없음·끝나면 자동 진행 / study: 컨트롤·스크립트·수동 진행 */
  mode?: "test" | "study";
  transcript?: string;
  scriptSegments?: ScriptSegment[];
  /** study에서 이전 단계로 돌아가기. 첫 단계면 undefined. */
  onBack?: () => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
}

function getHeading(taskKind: ListeningScreenProps["taskKind"], title: string) {
  if (title) return title;
  switch (taskKind) {
    case "conversation":
      return "Listen to a conversation.";
    case "announcement":
      return "Listen to an announcement.";
    case "academic_talk":
      return "Listen to a talk.";
    default:
      return "Listen to the audio.";
  }
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

export default function ListeningScreen({
  module,
  taskKind,
  audioUrl,
  illustrationUrl,
  title,
  onAudioEnd,
  mode = "test",
  transcript,
  scriptSegments,
  onBack,
  volume,
  onVolumeChange,
}: ListeningScreenProps) {
  const isStudy = mode === "study";
  const [isPlaying, setIsPlaying] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Auto-play audio on mount (test 모드 전용 — study는 StudyAudioPlayer가 담당)
  useEffect(() => {
    if (isStudy) return;
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
      audioRef.current.play().catch((err) => {
        console.error("Audio playback error:", err);
        setIsPlaying(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStudy]);

  // 헤더에서 볼륨을 바꾸면 재생 중인 오디오에도 즉시 반영
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);

  const handleAudioEnd = () => {
    setIsPlaying(false);
    onAudioEnd();
  };

  return (
    <ListeningTestLayout2026
      headerLeft={<ListeningHeaderLabel module={module} />}
      headerRight={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <VolumeControl volume={volume} onVolumeChange={onVolumeChange} />
          {isStudy && (
            <button onClick={onAudioEnd} style={nextButtonStyle}>
              Next &gt;
            </button>
          )}
        </div>
      }
      subHeaderLeft={<ListeningSubHeaderLabel />}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111", textAlign: "center" }}>
          {getHeading(taskKind, title)}
        </h2>

        <SpeakerVisual taskKind={taskKind} illustrationUrl={illustrationUrl} size={220} />

        {isStudy ? (
          <StudyAudioPlayer
            audioUrl={audioUrl}
            transcript={transcript}
            scriptSegments={scriptSegments}
            autoPlay
          />
        ) : (
          isPlaying && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#0073E6" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#DC2626" }} className="animate-pulse" />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Now playing...</span>
            </div>
          )
        )}
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
            setIsPlaying(false);
          }}
        />
      )}
    </ListeningTestLayout2026>
  );
}
