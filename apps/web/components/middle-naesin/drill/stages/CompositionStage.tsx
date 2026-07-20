'use client';

import { useState } from 'react';
import type { MiddleDrillSentence } from '@/models/middle-naesin/drill';

type ItemState = {
  input: string;
  revealed: boolean;
};

type Props = {
  sentences: MiddleDrillSentence[];
};

function roughMatch(input: string, reference: string): boolean {
  const norm = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().split(/\s+/).join(' ');
  const a = norm(input);
  const b = norm(reference);
  // Count common words
  const aWords = new Set(a.split(' '));
  const bWords = b.split(' ');
  const overlap = bWords.filter((w) => aWords.has(w) && w.length > 2).length;
  return overlap / Math.max(bWords.length, 1) >= 0.6;
}

export default function CompositionStage({ sentences }: Props) {
  const drillable = sentences.filter((s) => s.ko);
  const [states, setStates] = useState<ItemState[]>(
    drillable.map(() => ({ input: '', revealed: false })),
  );
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const update = (idx: number, patch: Partial<ItemState>) =>
    setStates((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));

  const check = (idx: number) =>
    setChecked((prev) => new Set([...prev, idx]));

  if (drillable.length === 0) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center text-sm text-neutral-400">
        해석 데이터가 없습니다. 단원 에디터에서 한국어 해석을 추가해주세요.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white px-5 py-3 text-sm text-neutral-500">
        한국어를 보고 영어 문장을 작문하세요.
      </div>

      {drillable.map((sentence, idx) => {
        const st = states[idx];
        const isChecked = checked.has(idx);
        const isCorrect = isChecked && roughMatch(st.input, sentence.en);

        return (
          <div
            key={sentence.index}
            className={[
              'rounded-2xl border bg-white p-5 space-y-3 transition',
              isChecked && isCorrect ? 'border-emerald-200' : isChecked ? 'border-amber-100' : '',
            ].join(' ')}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-500">
                {idx + 1}
              </span>
              <p className="text-base leading-7 text-neutral-800">{sentence.ko}</p>
            </div>

            <textarea
              value={st.input}
              onChange={(e) => update(idx, { input: e.target.value })}
              rows={2}
              placeholder="영어로 작문하세요..."
              disabled={st.revealed}
              className="w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200 disabled:bg-neutral-50 font-mono"
            />

            <div className="flex flex-wrap items-center gap-2">
              {!st.revealed && (
                <button
                  type="button"
                  onClick={() => check(idx)}
                  disabled={!st.input.trim()}
                  className="rounded-xl bg-neutral-800 px-4 py-1.5 text-xs text-white disabled:opacity-40"
                >
                  확인
                </button>
              )}
              <button
                type="button"
                onClick={() => { update(idx, { revealed: true }); check(idx); }}
                className="rounded-xl border px-4 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50"
              >
                모범 답안
              </button>
              {isChecked && (
                <span className={['text-xs font-semibold', isCorrect ? 'text-emerald-600' : 'text-amber-600'].join(' ')}>
                  {isCorrect ? '✓ 잘했어요' : '△ 다시 확인'}
                </span>
              )}
            </div>

            {(st.revealed || (isChecked && !isCorrect)) && (
              <div className="rounded-xl bg-emerald-50 px-4 py-3">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                  모범 답안
                </div>
                <p className="text-sm leading-relaxed text-emerald-900 font-mono">{sentence.en}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
