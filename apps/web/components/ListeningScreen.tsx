// apps/web/components/ListeningScreen.tsx
'use client';

import { useState } from 'react';

// 외부 타입 의존 없애기
type Mode = 'study' | 'test';

export default function ListeningScreen() {
  const [mode, setMode] = useState<Mode>('study');
  const [src, setSrc] = useState<string>(''); // 재생할 오디오 URL

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Listening</h1>

      {/* 모드 스위처 */}
      <div className="inline-flex rounded-xl border bg-white shadow-sm overflow-hidden">
        <button
          onClick={() => setMode('study')}
          className={`px-4 py-2 text-sm ${mode === 'study' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
          type="button"
        >
          Study
        </button>
        <button
          onClick={() => setMode('test')}
          className={`px-4 py-2 text-sm border-l ${mode === 'test' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
          type="button"
        >
          Test
        </button>
      </div>

      {/* 오디오 URL 입력 */}
      <label className="block">
        <span className="text-sm">Audio URL</span>
        <input
          className="mt-1 w-full border rounded p-2"
          value={src}
          onChange={(e) => setSrc(e.target.value)}
          placeholder="/audio/demo.mp3"
        />
      </label>

      {/* 내장 오디오 플레이어 */}
      {src ? (
        <audio key={src + mode} controls src={src} className="w-full">
          Your browser does not support the audio element.
        </audio>
      ) : (
        <div className="p-4 text-sm text-neutral-500 border rounded-lg">
          Enter an audio URL to play.
        </div>
      )}
    </div>
  );
}
