'use client';

import { useState } from 'react';
import type { MiddleDrillVocabItem } from '@/models/middle-naesin/drill';

type Props = {
  vocab: MiddleDrillVocabItem[];
};

export default function VocabStage({ vocab }: Props) {
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  if (vocab.length === 0) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center text-sm text-neutral-400">
        등록된 단어가 없습니다. 단원 에디터에서 영영 단어를 추가해주세요.
      </div>
    );
  }

  const toggle = (idx: number) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });

  const revealAll = () => setRevealed(new Set(vocab.map((v) => v.index)));
  const hideAll = () => setRevealed(new Set());
  const allRevealed = revealed.size === vocab.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border bg-white px-5 py-3">
        <span className="text-sm font-semibold text-neutral-700">
          단어 확인 · {vocab.length}개
        </span>
        <button
          type="button"
          onClick={allRevealed ? hideAll : revealAll}
          className="rounded-lg border px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50"
        >
          {allRevealed ? '전체 숨기기' : '전체 보기'}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {vocab.map((item) => {
          const isOpen = revealed.has(item.index);
          return (
            <button
              key={item.index}
              type="button"
              onClick={() => toggle(item.index)}
              className={[
                'rounded-2xl border p-4 text-left transition-all',
                isOpen
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-neutral-200 bg-white hover:bg-neutral-50',
              ].join(' ')}
            >
              <div className="text-base font-semibold text-neutral-900">
                {item.word}
              </div>
              {isOpen ? (
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-neutral-700">{item.definition}</p>
                  {item.example && (
                    <p className="text-xs italic text-neutral-400">{item.example}</p>
                  )}
                </div>
              ) : (
                <div className="mt-2 h-4 w-24 rounded bg-neutral-100" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
