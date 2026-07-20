'use client';

import { useState } from 'react';
import type { MiddleDrillSentence } from '@/models/middle-naesin/drill';

type Props = {
  sentences: MiddleDrillSentence[];
};

export default function ReadAloudStage({ sentences }: Props) {
  const [done, setDone] = useState<Set<number>>(new Set());
  const [current, setCurrent] = useState(0);

  const markDone = (idx: number) => {
    setDone((prev) => new Set([...prev, idx]));
    if (idx < sentences.length - 1) setCurrent(idx + 1);
  };

  const sentence = sentences[current];
  const allDone = done.size === sentences.length;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-amber-50 px-5 py-3 text-sm text-amber-700">
        소리내어 읽기 · 각 문장을 큰 소리로 읽고 완료 버튼을 누르세요.
      </div>

      {allDone && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-center text-sm font-semibold text-emerald-700">
          🎉 모든 문장 완료!
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
        {/* Sentence list */}
        <div className="rounded-2xl border bg-white p-3">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            진행
          </div>
          <div className="space-y-1">
            {sentences.map((s) => {
              const isDone = done.has(s.index);
              const isCur = s.index === current;
              return (
                <button
                  key={s.index}
                  type="button"
                  onClick={() => setCurrent(s.index)}
                  className={[
                    'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition',
                    isCur ? 'bg-amber-50 font-semibold text-amber-800' : 'text-neutral-500 hover:bg-neutral-50',
                  ].join(' ')}
                >
                  <span className={['h-2 w-2 shrink-0 rounded-full', isDone ? 'bg-emerald-400' : isCur ? 'bg-amber-400' : 'bg-neutral-200'].join(' ')} />
                  문장 {s.index + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active sentence */}
        <div className="space-y-4">
          {sentence && (
            <div className="rounded-2xl border bg-white p-6">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                문장 {current + 1} / {sentences.length}
              </div>
              <p className="text-xl font-medium leading-9 text-neutral-900">
                {sentence.en}
              </p>
              {sentence.ko && (
                <p className="mt-3 text-sm text-neutral-400">{sentence.ko}</p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => sentence && markDone(sentence.index)}
            disabled={!sentence || done.has(sentence.index)}
            className="w-full rounded-xl bg-amber-500 py-3 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-40"
          >
            {done.has(sentence?.index ?? -1) ? '✓ 완료' : '읽기 완료'}
          </button>
        </div>
      </div>
    </div>
  );
}
