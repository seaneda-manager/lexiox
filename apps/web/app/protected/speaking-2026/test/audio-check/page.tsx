'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSpeakingSession } from '../../_hooks/useSpeakingSession';

export default function AudioCheckPage() {
  const router = useRouter();
  const { setState } = useSpeakingSession();
  const [micVolume, setMicVolume] = useState(50);
  const [speakerVolume, setSpeakerVolume] = useState(50);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [micLevel, setMicLevel] = useState(0);

  const startMicTest = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const analyser = audioContextRef.current.createAnalyser();
      analyserRef.current = analyser;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyser);

      setIsRecording(true);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        if (isRecording) {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setMicLevel(Math.min(100, average / 2.55));
          requestAnimationFrame(updateLevel);
        }
      };
      updateLevel();
    } catch (err) {
      alert('마이크 권한이 필요합니다.');
    }
  };

  const stopMicTest = () => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
      analyserRef.current = null;
    }
    setIsRecording(false);
    setMicLevel(0);
  };

  const playTestSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    gainNode.gain.value = speakerVolume / 100;
    oscillator.frequency.value = 440;

    oscillator.start();
    setTimeout(() => oscillator.stop(), 500);
  };

  const handleContinue = () => {
    stopMicTest();
    setState('T_ABOUT_TO_BEGIN');
    router.push('/speaking-2026/test/about-to-begin');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-8">
          Audio & Device Check
        </h1>

        <div className="space-y-8">
          {/* 마이크 테스트 */}
          <div className="border border-gray-300 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">🎤 Microphone Check</h2>

            <div className="space-y-4">
              <p className="text-gray-600 text-sm">
                마이크 테스트를 시작하고 몇 초 동안 말씀해주세요.
              </p>

              {!isRecording ? (
                <button
                  onClick={startMicTest}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
                >
                  마이크 테스트 시작
                </button>
              ) : (
                <button
                  onClick={stopMicTest}
                  className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition"
                >
                  마이크 테스트 중지
                </button>
              )}

              {isRecording && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">마이크 레벨: {Math.round(micLevel)}%</p>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-green-500 h-3 rounded-full transition-all"
                      style={{ width: `${micLevel}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 헤드폰/스피커 테스트 */}
          <div className="border border-gray-300 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">🔊 Speaker & Headphone Check</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  스피커/헤드폰 볼륨: {speakerVolume}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={speakerVolume}
                  onChange={(e) => setSpeakerVolume(Number(e.target.value))}
                  className="w-full mt-2"
                />
              </div>

              <button
                onClick={playTestSound}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
              >
                테스트 음성 재생 (440Hz)
              </button>

              <p className="text-xs text-gray-500">
                👂 음성이 들리는지 확인해주세요. 크기가 적절하면 진행하세요.
              </p>
            </div>
          </div>

          {/* 진행 버튼 */}
          <button
            onClick={handleContinue}
            className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-lg transition"
          >
            계속하기 →
          </button>
        </div>
      </div>
    </div>
  );
}
