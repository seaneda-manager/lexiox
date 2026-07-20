'use client';

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SoundCheckPage() {
  const params = useParams();
  const router = useRouter();
  const testId = params.testId as string;

  const [phase, setPhase] = useState<'mic' | 'speaker' | 'volume' | 'ready'>('mic');
  const [micOK, setMicOK] = useState(false);
  const [speakerOK, setSpeakerOK] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(50);

  const testMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicOK(true);
      setPhase('speaker');
      stream.getTracks().forEach(t => t.stop());
    } catch {
      alert('마이크 접근 권한이 필요합니다.');
    }
  };

  const playTestAudio = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);
    gain.gain.setValueAtTime((volumeLevel / 100) * 0.3, audioContext.currentTime);
    osc.frequency.setValueAtTime(1000, audioContext.currentTime);
    osc.start();
    osc.stop(audioContext.currentTime + 1);
    setSpeakerOK(true);
    setTimeout(() => setPhase('volume'), 1000);
  };

  const startExam = () => {
    setPhase('ready');
    setTimeout(() => router.push(`/student/toefl/listening/${testId}/module1`), 1500);
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-violet-50 to-indigo-50">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-lg">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">🎧 사운드 체크</h1>
          <p className="text-sm text-gray-500">시험을 시작하기 전에 오디오를 확인합니다</p>
        </div>

        <div className="space-y-4">
          {/* 마이크 */}
          <div className={`rounded-lg p-4 ${micOK ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50 border border-gray-200'}`}>
            <h2 className="font-semibold text-gray-900 mb-2">1️⃣ 마이크</h2>
            {!micOK ? (
              <button
                onClick={testMic}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                마이크 테스트
              </button>
            ) : (
              <p className="text-sm text-emerald-700 font-medium">✓ 마이크 준비 완료</p>
            )}
          </div>

          {/* 스피커 */}
          <div className={`rounded-lg p-4 ${speakerOK ? 'bg-emerald-50 border border-emerald-200' : micOK ? 'bg-gray-50 border border-gray-200' : 'bg-gray-100 border border-gray-200 opacity-50'}`}>
            <h2 className="font-semibold text-gray-900 mb-2">2️⃣ 스피커</h2>
            {!speakerOK && micOK ? (
              <button
                onClick={playTestAudio}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                스피커 테스트 (음성 재생됨)
              </button>
            ) : speakerOK ? (
              <p className="text-sm text-emerald-700 font-medium">✓ 스피커 준비 완료</p>
            ) : (
              <p className="text-xs text-gray-500">마이크를 먼저 테스트해주세요</p>
            )}
          </div>

          {/* 볼륨 */}
          {speakerOK && phase === 'volume' && (
            <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
              <h2 className="font-semibold text-gray-900 mb-3">3️⃣ 볼륨 조절</h2>
              <input
                type="range"
                min="0"
                max="100"
                value={volumeLevel}
                onChange={(e) => setVolumeLevel(Number(e.target.value))}
                className="w-full"
              />
              <p className="mt-2 text-center text-sm text-gray-600">{volumeLevel}%</p>
            </div>
          )}

          {/* 시작 버튼 */}
          {speakerOK && phase === 'volume' && (
            <button
              onClick={startExam}
              className="w-full rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700"
            >
              🚀 시험 시작
            </button>
          )}

          {phase === 'ready' && (
            <div className="rounded-lg bg-emerald-50 p-4 text-center border border-emerald-200">
              <p className="text-sm font-semibold text-emerald-700">준비 완료! 시험을 시작합니다...</p>
            </div>
          )}
        </div>

        <div className="border-t pt-4 text-center">
          <Link href="/student/toefl/listening" className="text-xs text-gray-500 hover:text-gray-700">
            ← 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
