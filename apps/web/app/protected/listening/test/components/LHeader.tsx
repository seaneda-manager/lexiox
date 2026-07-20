'use client';
import { useState, useEffect } from 'react';

function LTimer({
  seconds = 600, hidden = false,
}: { seconds?: number; hidden?: boolean }) {
  const [remain, setRemain] = useState(seconds);
  useEffect(() => {
    const t = setInterval(() => setRemain((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const mm = String(Math.floor(remain / 60)).padStart(2, '0');
  const ss = String(remain % 60).padStart(2, '0');
  return <span className="min-w-[54px] text-right tabular-nums">{hidden ? '' : `${mm}:${ss}`}</span>;
}

export default function LHeader({
  titleCenter, onHome, onPause, onPrev, onNext,
  canPrev = true, canNext = true, showTimer = true,
}: {
  titleCenter: string;
  onHome?: () => void; onPause?: () => void;
  onPrev?: () => void; onNext?: () => void;
  canPrev?: boolean; canNext?: boolean; showTimer?: boolean;
}) {
  const [hideTime, setHideTime] = useState(false);
  return (
    <header className="sticky top-0 z-10 border-b border-neutral-200">
      <div className="bg-gradient-to-r from-violet-700 to-pink-600 text-white">
        <div className="flex items-center justify-between px-4 py-2">
          {/* 醫뚯륫 踰꾪듉 */}
          <div className="flex items-center gap-3">
            <button className="rounded-md bg-white/10 px-3 py-1 hover:bg-white/20" onClick={onHome}>Home</button>
            <button className="rounded-md bg-white/10 px-3 py-1 hover:bg-white/20" onClick={onPause}>Pause</button>
            <button className="rounded-md bg-white/10 px-3 py-1 hover:bg-white/20 disabled:opacity-40" onClick={onPrev} disabled={!canPrev}>Prev</button>
            <button className="rounded-md bg-white/10 px-3 py-1 hover:bg-white/20 disabled:opacity-40" onClick={onNext} disabled={!canNext}>Next</button>
          </div>

          {/* 以묒븰 ?쒕ぉ */}
          <div className="text-base font-semibold">{titleCenter}</div>

          {/* ?곗륫 而⑦듃濡?*/}
          <div className="flex items-center gap-3">
            <button className="rounded-full bg-white/10 px-3 py-1 text-sm hover:bg-white/20">VOLUME</button>
            <button className="rounded-full bg-white/10 px-3 py-1 text-sm hover:bg-white/20">report</button>
            <button className="rounded-full bg-white/10 px-3 py-1 text-sm hover:bg-white/20">script</button>
            <button className="rounded-full bg-white/10 px-3 py-1 text-sm hover:bg-white/20">explain</button>
            <button className="rounded-md bg-black/40 px-2 py-1 text-xs hover:bg-black/50" onClick={() => setHideTime(!hideTime)}>
              {hideTime ? 'SHOW TIME' : 'HIDE TIME'}
            </button>
            {showTimer && <LTimer hidden={hideTime} seconds={600} />}
          </div>
        </div>
      </div>
    </header>
  );
}




