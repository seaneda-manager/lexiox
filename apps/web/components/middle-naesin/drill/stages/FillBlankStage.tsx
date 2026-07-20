'use client';

import { useState } from 'react';
import type { MiddleDrillSentence } from '@/models/middle-naesin/drill';

type ItemState = {
  input: string;
  checked: boolean;
  revealed: boolean;
};

type Props = {
  sentences: MiddleDrillSentence[];
};

export default function FillBlankStage({ sentences }: Props) {
  const drillable = sentences.filter((s) => s.fillBlankWord);
  const [states, setStates] = useState<ItemState[]>(
    drillable.map(() => ({ input: '', checked: false, revealed: false })),
  );

  const update = (idx: number, patch: Partial<ItemState>) =>
    setStates((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));

  if (drillable.length === 0) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center text-sm text-neutral-400">
        빈칸 생성에 적합한 문장이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white px-5 py-3 text-sm text-neutral-500">
        빈칸에 알맞은 단어를 영어로 입력하세요.
      </div>

      {drillable.map((sentence, idx) => {
        const st = states[idx];
        const isCorrect =
          st.checked &&
          st.input.trim().toLowerCase() === sentence.fillBlankWord.toLowerCase();

        return (
          <div
            key={sentence.index}
            className={[
              'rounded-2xl border bg-white p-5 space-y-3 transition',
              isCorrect ? 'border-emerald-200' : st.checked ? 'border-amber-100' : '',
            ].join(' ')}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-500">
                {idx + 1}
              </span>
              <p className="text-base leading-7 text-neutral-800 font-mono">
                {sentence.fillBlankTemplate}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={st.input}
                onChange={(e) => update(idx, { input: e.target.value, checked: false })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') update(idx, { checked: true });
                }}
                placeholder="정답 입력..."
                disabled={st.revealed}
                className="w-40 rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200 disabled:bg-neutral-50"
              />
              <button
                type="button"
                onClick={() => update(idx, { checked: true })}
                disabled={!st.input.trim() || st.revealed}
                className="rounded-xl bg-neutral-800 px-4 py-2 text-xs text-white disabled:opacity-40"
              >
                확인
              </button>
              <button
                type="button"
                onClick={() => update(idx, { revealed: true, input: sentence.fillBlankWord })}
                className="rounded-xl border px-4 py-2 text-xs text-neutral-500 hover:bg-neutral-50"
              >
                정답
              </button>
              {st.checked && (
                <span className={['text-xs font-semibold', isCorrect ? 'text-emerald-600' : 'text-rose-600'].join(' ')}>
                  {isCorrect ? '✓ 정답' : `✗ 정답: ${sentence.fillBlankWord}`}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
