'use client';

import { useEffect, useRef, useState } from 'react';
import type { MiddleDrillSentence } from '@/models/middle-naesin/drill';

type Props = {
  sentences: MiddleDrillSentence[];
};

export default function ReadingStage({ sentences }: Props) {
  const [current, setCurrent] = useState(0);
  const [showKo, setShowKo] = useState(false);
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setShowKo(false);
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [current]);

  const sentence = sentences[current];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.8fr]">
      {/* Left: sentence list */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-400">
          문장 목록
        </div>
        <div className="space-y-1.5">
          {sentences.map((s) => {
            const isCurrent = s.index === current;
            return (
              <button
                key={s.index}
                ref={isCurrent ? activeRef : undefined}
                type="button"
                onClick={() => setCurrent(s.index)}
                className={[
                  'block w-full rounded-xl border px-3 py-2 text-left text-sm transition',
                  isCurrent
                    ? 'border-sky-300 bg-sky-50 font-medium text-sky-900'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50',
                ].join(' ')}
              >
                <span className="mr-2 text-[10px] font-bold text-neutral-400">
                  {s.index + 1}
                </span>
                {s.en.length > 60 ? s.en.slice(0, 60) + '…' : s.en}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: active sentence */}
      <div className="space-y-4">
        <div className="rounded-2xl border bg-white p-6">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            문장 {current + 1} / {sentences.length}
          </div>
          <p className="text-lg font-medium leading-8 text-neutral-900">
            {sentence?.en}
          </p>

          {sentence?.ko && (
            <div className="mt-4">
              {showKo ? (
                <div className="rounded-xl bg-sky-50 px-4 py-3">
                  <p className="text-sm leading-relaxed text-sky-800">{sentence.ko}</p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowKo(true)}
                  className="rounded-xl border border-dashed px-4 py-2 text-sm text-neutral-400 hover:bg-neutral-50"
                >
                  해석 보기
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCurrent((v) => Math.max(0, v - 1))}
            disabled={current <= 0}
            className="flex-1 rounded-xl border py-2.5 text-sm disabled:opacity-40"
          >
            ← 이전 문장
          </button>
          <button
            type="button"
            onClick={() => setCurrent((v) => Math.min(sentences.length - 1, v + 1))}
            disabled={current >= sentences.length - 1}
            className="flex-1 rounded-xl border bg-neutral-800 py-2.5 text-sm text-white disabled:opacity-40"
          >
            다음 문장 →
          </button>
        </div>
      </div>
    </div>
  );
}
