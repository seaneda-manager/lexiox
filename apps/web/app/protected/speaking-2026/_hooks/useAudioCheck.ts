'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Audio Check Store
 * - 마이크 레벨 측정
 * - 임계값(-20dB) 달성 시 Next 활성화
 */

export function useAudioCheck() {
  const [micLevel, setMicLevel] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gainLevel, setGainLevel] = useState(1); // 1 = 100% (0.5 ~ 1.5)
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const isReadyRef = useRef(false);

  const startAudioCheck = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Resume if suspended
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const gainNode = audioContext.createGain();
      gainNode.gain.value = gainLevel;
      gainNodeRef.current = gainNode;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;

      source.connect(gainNode);
      gainNode.connect(analyser);

      let readyFrameCount = 0;

      const updateLevel = () => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const normalizedLevel = Math.min(100, (average / 255) * 100);
        setMicLevel(normalizedLevel);

        // 한 번 ready가 되면 계속 ready 유지
        if (!isReadyRef.current && normalizedLevel >= 15) {
          readyFrameCount++;
          if (readyFrameCount >= 5) {
            isReadyRef.current = true;
            setIsReady(true);
          }
        }

        animationRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Microphone access denied');
    }
  }, []);

  const stopAudioCheck = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }

    isReadyRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      stopAudioCheck();
    };
  }, [stopAudioCheck]);

  // Update gain when gainLevel changes
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = gainLevel;
    }
  }, [gainLevel]);

  return {
    micLevel,
    isReady,
    error,
    gainLevel,
    setGainLevel,
    startAudioCheck,
    stopAudioCheck,
  };
}
