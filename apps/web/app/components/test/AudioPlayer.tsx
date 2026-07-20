'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';

type Props = { src?: string; oneShot?: boolean; className?: string };

export default function TestAudioPlayer(props: Props) {
  return <Inner key={props.src ?? 'none'} {...props} />;
}

function Inner({ src, oneShot = false, className = '' }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [started, setStarted] = useState(false);
  const [canPlay, setCanPlay] = useState(false);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onCanPlay = () => setCanPlay(true);
    const onEnded = () => { setEnded(true); setStarted(false); };
    el.addEventListener('canplay', onCanPlay);
    el.addEventListener('ended', onEnded);
    return () => {
      el.removeEventListener('canplay', onCanPlay);
      el.removeEventListener('ended', onEnded);
    };
  }, []);

  const disabled = !src || src.trim().length === 0;
  const computedCanPlay = useMemo(() => {
    if (disabled) return false;
    if (oneShot && ended) return false;
    return canPlay;
  }, [disabled, oneShot, ended, canPlay]);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el || !computedCanPlay) return;
    if (started) { el.pause(); setStarted(false); }
    else { if (oneShot && ended) return; void el.play(); setStarted(true); }
  }, [computedCanPlay, started, oneShot, ended]);

  const reset = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    el.pause();
    el.currentTime = 0;
    setStarted(false);
    setEnded(false);
  }, []);

  return (
    <div className={`p-4 flex items-center gap-4 ${className}`}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        type="button"
        className="rounded border px-3 py-2 text-sm disabled:opacity-50"
        onClick={toggle}
        disabled={!computedCanPlay}
      >
        {started ? 'Pause' : 'Start'}
      </button>
      <button type="button" className="rounded border px-3 py-2 text-sm" onClick={reset}>
        Reset
      </button>
      {!src ? (
        <span className="text-xs text-neutral-500">No audio source</span>
      ) : oneShot && ended ? (
        <span className="text-xs text-neutral-500">Playback finished</span>
      ) : null}
    </div>
  );
}
