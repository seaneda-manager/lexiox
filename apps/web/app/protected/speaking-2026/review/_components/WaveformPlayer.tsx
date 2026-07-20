'use client';

import React, { useEffect, useRef, useState } from 'react';

interface WaveformPlayerProps {
  audioBlob: Blob;
  duration: number;
}

/**
 * Waveform Player 컴포넌트
 * - 음성 파형 시각화
 * - 재생/일시정지 컨트롤
 * - 시간 표시
 */
export function WaveformPlayer({ audioBlob, duration }: WaveformPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string>('');

  useEffect(() => {
    const url = URL.createObjectURL(audioBlob);
    setAudioUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [audioBlob]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const progressPercent = (currentTime / duration) * 100;

  return (
    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
      <h3 className="font-bold text-gray-900 mb-4">Waveform Sync</h3>

      <audio
        ref={audioRef}
        src={audioUrl}
        style={{ display: 'none' }}
      />

      {/* 재생 컨트롤 */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={handlePlayPause}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
        >
          <span className="text-lg">{isPlaying ? '⏸' : '▶'}</span>
          <span>{isPlaying ? 'Pause' : 'Play'}</span>
        </button>

        <div className="text-sm text-gray-600">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      {/* 파형 시뮬레이션 */}
      <div className="bg-gray-900 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-center gap-0.5 h-20">
          {Array.from({ length: 60 }).map((_, i) => {
            const isPlayed = (i / 60) * 100 < progressPercent;
            return (
              <div
                key={i}
                className={`flex-1 rounded-sm transition-all ${
                  isPlayed ? 'bg-blue-500' : 'bg-gray-700'
                }`}
                style={{
                  height: `${30 + Math.random() * 70}%`,
                  alignSelf: 'center',
                }}
              />
            );
          })}
        </div>
      </div>

      {/* 프로그레스 바 */}
      <div className="w-full h-2 bg-gray-300 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
