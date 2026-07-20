'use client';

import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import type { ScriptSegment, AudioWord } from '@/models/listening';

interface AudioScriptSyncProps {
  audioUrl: string;
  scriptSegments: ScriptSegment[];
  onReady?: () => void;
}

export default function AudioScriptSync({
  audioUrl,
  scriptSegments,
  onReady,
}: AudioScriptSyncProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Wavesurfer 초기화
  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#dbeafe',
      progressColor: '#3b82f6',
      cursorColor: '#1e40af',
      barWidth: 2,
      barRadius: 3,
      barHeight: 1.5,
      barGap: 2,
      height: 60,
    });

    ws.load(audioUrl);

    ws.on('ready', () => {
      setIsReady(true);
      onReady?.();
    });

    ws.on('audioprocess', () => {
      setCurrentTime(ws.getCurrentTime());
    });

    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));

    wavesurferRef.current = ws;

    return () => {
      ws.destroy();
    };
  }, [audioUrl, onReady]);

  // 타임스탬프 마커 추가
  useEffect(() => {
    if (!isReady || !wavesurferRef.current) return;

    const ws = wavesurferRef.current;

    scriptSegments.forEach((seg) => {
      const labelText = `${seg.speaker.toUpperCase()} @ ${seg.startTime.toFixed(1)}s`;
      const color =
        seg.speaker === 'professor'
          ? '#3b82f6'
          : seg.speaker === 'student'
            ? '#10b981'
            : '#f59e0b';

      ws.addMarker({
        time: seg.startTime,
        label: labelText,
        color,
      });
    });
  }, [isReady, scriptSegments]);

  const handleWordClick = (word: AudioWord) => {
    if (wavesurferRef.current) {
      const duration = wavesurferRef.current.getDuration();
      wavesurferRef.current.seekTo(word.startTime / duration);
      wavesurferRef.current.play();
    }
  };

  const handlePlayPause = () => {
    wavesurferRef.current?.playPause();
  };

  // 현재 시간에 맞는 segment 찾기
  const currentSegment = scriptSegments.find(
    (seg) => currentTime >= seg.startTime && currentTime <= seg.endTime
  );

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      {/* Wavesurfer 컨테이너 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePlayPause}
            className="rounded-full bg-indigo-600 p-2 text-white hover:bg-indigo-700"
            aria-label={isPlaying ? '일시정지' : '재생'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <span className="text-xs font-semibold text-gray-500">
            {currentTime.toFixed(1)}s / {wavesurferRef.current?.getDuration().toFixed(1) || '0'}s
          </span>
        </div>
        <div ref={containerRef} />
      </div>

      {/* 스크립트 스크롤 뷰 */}
      <div className="max-h-80 space-y-3 overflow-y-auto rounded-lg bg-gray-50 p-3">
        {scriptSegments.length === 0 ? (
          <p className="text-center text-sm text-gray-400">스크립트 없음</p>
        ) : (
          scriptSegments.map((seg) => {
            const isActive =
              currentTime >= seg.startTime && currentTime <= seg.endTime;

            return (
              <div
                key={seg.id}
                className={`rounded-lg border-l-4 p-3 transition ${
                  isActive
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-300 bg-white'
                }`}
              >
                <p className="text-xs font-semibold text-gray-600 uppercase">
                  {seg.speaker}
                  {seg.startTime && (
                    <span className="ml-2 font-normal text-gray-400">
                      ({seg.startTime.toFixed(1)}s - {seg.endTime.toFixed(1)}s)
                    </span>
                  )}
                </p>

                <p className="mt-1.5 flex flex-wrap gap-1 text-sm leading-relaxed text-gray-700">
                  {seg.words.map((word) => (
                    <button
                      key={`${seg.id}_${word.word}_${word.startTime}`}
                      onClick={() => handleWordClick(word)}
                      className={`rounded px-1 py-0.5 transition ${
                        Math.abs(currentTime - word.startTime) < 0.2
                          ? 'bg-yellow-200 font-semibold text-gray-900'
                          : 'hover:bg-yellow-100'
                      }`}
                      title={`${word.startTime.toFixed(2)}s - ${word.endTime.toFixed(2)}s`}
                    >
                      {word.word}
                    </button>
                  ))}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* 현재 재생 중인 단어 강조 */}
      {currentSegment && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
          <strong>현재 재생 중:</strong> {currentSegment.text}
        </div>
      )}
    </div>
  );
}
