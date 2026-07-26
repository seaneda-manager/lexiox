"use client";

import { useState, useEffect, useRef } from "react";

interface ListeningScreenProps {
  taskNumber: number;
  taskKind: "conversation" | "announcement" | "academic_talk";
  audioUrl: string;
  illustrationUrl?: string;
  title: string;
  onAudioEnd: () => void;
}

export default function ListeningScreen({
  taskNumber,
  taskKind,
  audioUrl,
  illustrationUrl,
  title,
  onAudioEnd,
}: ListeningScreenProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Auto-play audio on mount
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.play().catch((err) => {
        console.error("Audio playback error:", err);
        setIsPlaying(false);
      });
    }
  }, []);

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    setCurrentTime(e.currentTarget.currentTime);
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    setDuration(e.currentTarget.duration);
  };

  const handleAudioEnd = () => {
    setIsPlaying(false);
    onAudioEnd();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const getTaskDescription = () => {
    switch (taskKind) {
      case "conversation":
        return "Listen to a conversation between two speakers.";
      case "announcement":
        return "Listen to a campus announcement.";
      case "academic_talk":
        return "Listen to a lecture from an instructor.";
      default:
        return "Listen to the audio clip.";
    }
  };

  const getTaskIcon = () => {
    switch (taskKind) {
      case "conversation":
        return "💬";
      case "announcement":
        return "📢";
      case "academic_talk":
        return "🎓";
      default:
        return "🎧";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {getTaskIcon()} {title}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {getTaskDescription()}
            </div>
          </div>
          <div className="text-sm font-semibold px-4 py-2 bg-blue-100 text-blue-700 rounded-lg">
            🔊 Audio: On
          </div>
        </div>
      </header>

      {/* Main Content - Centered */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 py-12">
        {/* Illustration or generic audio indicator */}
        <div className="mb-12">
          {illustrationUrl ? (
            <div className="rounded-2xl overflow-hidden shadow-xl">
              <img
                src={illustrationUrl}
                alt=""
                className="w-80 h-80 object-cover bg-gray-100"
              />
            </div>
          ) : (
            <div className={`flex h-64 w-64 items-center justify-center rounded-2xl text-8xl shadow-xl ${
              isPlaying ? "bg-blue-100" : "bg-gray-100"
            }`}>
              {getTaskIcon()}
            </div>
          )}
          {isPlaying && (
            <div className="text-center mt-6">
              <div className="inline-flex items-center gap-2 text-blue-600">
                <span className="inline-block w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                <span className="text-sm font-semibold">Now playing...</span>
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar Section */}
        <div className="w-full max-w-2xl space-y-4">
          {/* Time Display */}
          <div className="flex justify-between items-center text-sm text-gray-600 px-4">
            <span className="font-mono">{formatTime(currentTime)}</span>
            <span className="font-mono">{formatTime(duration)}</span>
          </div>

          {/* Progress Bar */}
          <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden cursor-not-allowed shadow-sm">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Info Text */}
          <div className="text-center text-xs text-gray-500 px-4">
            You cannot seek the audio. Listen carefully to all the information.
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 px-8 py-6 flex justify-end gap-4">
        <button
          disabled
          className="px-8 py-3 bg-gray-300 text-gray-500 font-semibold rounded-lg cursor-not-allowed shadow-md"
        >
          Next
        </button>
      </footer>

      {/* Hidden Audio */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnd}
        onError={() => {
          console.error("Audio error");
          setIsPlaying(false);
        }}
      />
    </div>
  );
}
