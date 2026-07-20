'use client';

import { useState } from 'react';
import type { MiddleDrillSentence } from '@/models/middle-naesin/drill';

type SentenceState = {
  input: string;
  checked: boolean;
  revealed: boolean;
};

type Props = {
  sentences: MiddleDrillSentence[];
};

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/[^가-힣a-z0-9\s]/g, '').replace(/\s+/g, ' ');
}

export default function TranslationStage({ sentences }: Props) {
  const [states, setStates] = useState<SentenceState[]>(
    sentences.map(() => ({ input: '', checked: false, revealed: false })),
  );

  const update = (idx: number, patch: Partial<SentenceState>) =>
    setStates((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white px-5 py-3 text-sm text-neutral-500">
        영어 문장을 보고 한국어로 해석하세요.
      </div>

      {sentences.map((sentence, idx) => {
        const st = states[idx];
        const hasKo = !!sentence.ko;

        let isCorrect = false;
        if (st.checked && hasKo) {
          isCorrect = normalize(st.input).includes(normalize(sentence.ko!).slice(0, 8));
        }

        return (
          <div
            key={sentence.index}
            className={[
              'rounded-2xl border bg-white p-5 space-y-3 transition',
              st.checked && isCorrect ? 'border-emerald-200' : '',
            ].join(' ')}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-500">
                {idx + 1}
              </span>
              <p className="text-base leading-7 text-neutral-900">{sentence.en}</p>
            </div>

            <textarea
              value={st.input}
              onChange={(e) => update(idx, { input: e.target.value, checked: false })}
              rows={2}
              placeholder="한국어 해석을 입력하세요..."
              className="w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
            />

            <div className="flex items-center gap-2">
              {!st.revealed && (
                <button
                  type="button"
                  onClick={() => update(idx, { checked: true })}
                  disabled={!st.input.trim()}
                  className="rounded-xl bg-neutral-800 px-4 py-1.5 text-xs text-white disabled:opacity-40"
                >
                  확인
                </button>
              )}
              {hasKo && (
                <button
                  type="button"
                  onClick={() => update(idx, { revealed: true })}
                  className="rounded-xl border px-4 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50"
                >
                  정답 보기
                </button>
              )}
              {st.checked && (
                <span className={['text-xs font-semibold', isCorrect ? 'text-emerald-600' : 'text-amber-600'].join(' ')}>
                  {isCorrect ? '✓ 잘했어요' : '△ 다시 확인'}
                </span>
              )}
            </div>

            {(st.revealed || (st.checked && !isCorrect)) && sentence.ko && (
              <div className="rounded-xl bg-sky-50 px-4 py-3">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-sky-400">
                  정답
                </div>
                <p className="text-sm leading-relaxed text-sky-800">{sentence.ko}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
