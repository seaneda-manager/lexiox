// apps/web/app/(protected)/listening/test/components/LAudioScreen.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { consumePlay } from '@/lib/consumePlay';
import type { Mode } from '@/lib/consumePlay';

type Props = {
  title: string;
  imageUrl?: string;
  audioUrl: string;
  onEndedAction?: () => void; // ✅ *Action 이름만 사용
  onNextAction?: () => void;  // ✅ *Action 이름만 사용
  sessionId: string;
  trackId?: string;
  mode: Mode;
};

export default function LAudioScreen({
  title,
  imageUrl,
  audioUrl,
  onEndedAction,
  onNextAction,
  sessionId,
  trackId,
  mode,
}: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const autoStartedRef = useRef(false);

  const [progress, setProgress] = useState(0);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [rate, setRate] = useState(1);
  const [playing, setPlaying] = useState(false);

  const [consumed, setConsumed] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setConsumed(false);
    setRemaining(null);
    setErr(null);
    autoStartedRef.current = false;
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
      el.load();
    }
  }, [sessionId, trackId, audioUrl]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onLoadedMeta = () => {
      setDur(el.duration || 0);
      el.playbackRate = rate;
    };
    const onTime = () => {
      setCur(el.currentTime);
      const d = el.duration || 0;
      setDur(d);
      setProgress(d ? (el.currentTime / d) * 100 : 0);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnd = () => {
      setPlaying(false);
      onEndedAction?.(); // ✅ 여기서만 호출
    };
    const onError = () => {
      setPlaying(false);
      setErr('Audio failed to load or play.');
    };

    el.addEventListener('loadedmetadata', onLoadedMeta);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('ended', onEnd);
    el.addEventListener('error', onError);
    return () => {
      el.removeEventListener('loadedmetadata', onLoadedMeta);
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('ended', onEnd);
      el.removeEventListener('error', onError);
    };
  }, [onEndedAction, rate]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate]);

  const tryPlay = async () => {
    const el = audioRef.current;
    if (!el) return;
    setErr(null);

    if (!consumed) {
      try {
        const row = await consumePlay({ sessionId, trackId, mode });
        setRemaining(row.remaining ?? null);
        setConsumed(true);
      } catch (e: any) {
        setErr(e?.message ?? String(e));
        return;
      }
    }
    el.play().catch(() => {
      setErr((prev) => prev ?? 'Tap Play to start the audio.');
    });
  };

  useEffect(() => {
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;
    void tryPlay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, trackId, audioUrl]);

  const fmt = (t: number) => {
    if (!isFinite(t) || t < 0) return '00:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) el.pause();
    else void tryPlay();
  };

  const changeRate = () => {
    const next = rate === 1 ? 1.25 : rate === 1.25 ? 1.5 : 1;
    setRate(next);
  };

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = audioRef.current;
    if (!el) return;
    const pct = Number(e.target.value);
    const d = el.duration || 0;
    el.currentTime = (pct / 100) * d;
    setProgress(pct);
  };

  return (
    <div className="mx-auto w-full max-w-4xl p-6">
      <h3 className="mb-4 text-lg font-semibold">{title}</h3>

      <div className="mb-6 flex min-h-[360px] items-center justify-center rounded-2xl border bg-white p-4">
        {imageUrl ? (
          <div className="relative h-[320px] w-full max-w-[720px]">
            <Image
              src={imageUrl}
              alt=""
              fill
              sizes="(max-width: 768px) 92vw, 720px"
              className="object-contain"
              priority
            />
          </div>
        ) : (
          <div className="text-sm text-neutral-400">No image</div>
        )}
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <div className="mb-3 flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            className="rounded-full border px-4 py-2 hover:bg-neutral-50"
          >
            {playing ? 'Pause' : 'Play'}
          </button>
          <button
            type="button"
            onClick={changeRate}
            className="rounded-full border px-3 py-2 text-sm hover:bg-neutral-50"
            aria-label="Change playback rate"
            title="Change playback rate"
          >
            {rate.toFixed(2)}x
          </button>
          <div className="ml-auto flex items-center gap-2 text-sm text-neutral-500">
            <span>{fmt(cur)}</span>
            <span> / </span>
            <span>{fmt(dur)}</span>
          </div>
        </div>

        <input
          type="range"
          min={0}
          max={100}
          value={progress}
          onChange={onSeek}
          className="w-full accent-yellow-400"
          aria-label="Seek"
          disabled={!isFinite(dur) || dur === 0}
        />

        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-neutral-500">
            {remaining !== null
              ? `Remaining plays: ${remaining}`
              : consumed
                ? 'Consumed'
                : 'Preparing...'}
          </span>
          {err && <span className="text-red-600">Consume error: {err}</span>}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className="rounded-xl border px-4 py-2 hover:bg-neutral-50"
            onClick={onNextAction} // ✅ *Action만 사용
          >
            Next
          </button>
        </div>
      </div>

      <audio ref={audioRef} src={audioUrl} className="sr-only" preload="auto" />
    </div>
  );
}


