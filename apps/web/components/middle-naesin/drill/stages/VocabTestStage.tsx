'use client';

import { useMemo, useState } from 'react';
import type { MiddleDrillVocabItem } from '@/models/middle-naesin/drill';

type Props = {
  vocab: MiddleDrillVocabItem[];
};

type TestMode = 'en_to_ko' | 'ko_to_en';

type ItemState = {
  input: string;
  checked: boolean;
  revealed: boolean;
};

function normalizeEn(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function normalizeKo(s: string): string {
  return s.replace(/\s+/g, '').trim();
}

function isKoAnswerCorrect(input: string, gloss: string): boolean {
  const norm = normalizeKo(input);
  if (!norm) return false;
  const alts = gloss
    .split(/[,/]/)
    .map((s) => normalizeKo(s))
    .filter(Boolean);
  return alts.some((alt) => alt === norm || alt.includes(norm) || norm.includes(alt));
}

// 셔플: 단원마다 같은 순서로 나오지 않도록 고정 시드로 섞기
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default function VocabTestStage({ vocab }: Props) {
  const testable = useMemo(() => vocab.filter((v) => !!v.koGloss), [vocab]);
  const [mode, setMode] = useState<TestMode>('en_to_ko');
  const [order, setOrder] = useState<number[]>(() => shuffle(testable.map((_, i) => i)));
  const [states, setStates] = useState<Record<number, ItemState>>({});

  const items = order.map((i) => testable[i]).filter(Boolean);

  const update = (idx: number, patch: Partial<ItemState>) =>
    setStates((prev) => ({
      ...prev,
      [idx]: { input: '', checked: false, revealed: false, ...prev[idx], ...patch },
    }));

  const reset = () => {
    setOrder(shuffle(testable.map((_, i) => i)));
    setStates({});
  };

  const checkedCount = order.filter((i) => states[i]?.checked).length;
  const correctCount = order.filter((i) => {
    const st = states[i];
    if (!st?.checked) return false;
    const item = testable[i];
    return mode === 'en_to_ko'
      ? isKoAnswerCorrect(st.input, item.koGloss!)
      : normalizeEn(st.input) === normalizeEn(item.word);
  }).length;

  if (testable.length === 0) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center text-sm text-neutral-400">
        시험용 한글 뜻이 있는 단어가 없습니다. "단어 (한글 뜻)" 콘텐츠를 추가하거나, 영영 단어 입력 시
        괄호 안에 "설명 / 한글 뜻" 형식으로 뜻을 넣어주세요.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white px-5 py-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setMode('en_to_ko'); reset(); }}
            className={[
              'rounded-xl px-4 py-2 text-sm font-medium transition',
              mode === 'en_to_ko' ? 'bg-neutral-900 text-white' : 'border text-neutral-500 hover:bg-neutral-50',
            ].join(' ')}
          >
            영한 시험
          </button>
          <button
            type="button"
            onClick={() => { setMode('ko_to_en'); reset(); }}
            className={[
              'rounded-xl px-4 py-2 text-sm font-medium transition',
              mode === 'ko_to_en' ? 'bg-neutral-900 text-white' : 'border text-neutral-500 hover:bg-neutral-50',
            ].join(' ')}
          >
            한영 시험
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-neutral-500">
            {checkedCount}/{items.length}개 확인 · {correctCount}개 정답
          </span>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50"
          >
            다시 풀기
          </button>
        </div>
      </div>

      {items.map((item, i) => {
        const idx = order[i];
        const st = states[idx] ?? { input: '', checked: false, revealed: false };
        const prompt = mode === 'en_to_ko' ? item.word : item.koGloss!;
        const answer = mode === 'en_to_ko' ? item.koGloss! : item.word;
        const isCorrect =
          st.checked &&
          (mode === 'en_to_ko'
            ? isKoAnswerCorrect(st.input, item.koGloss!)
            : normalizeEn(st.input) === normalizeEn(item.word));

        return (
          <div
            key={idx}
            className={[
              'rounded-2xl border bg-white p-5 space-y-3 transition',
              st.checked && isCorrect ? 'border-emerald-200' : st.checked ? 'border-amber-100' : '',
            ].join(' ')}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-500">
                {i + 1}
              </span>
              <p className="text-lg font-semibold text-neutral-900">{prompt}</p>
            </div>

            <input
              value={st.input}
              onChange={(e) => update(idx, { input: e.target.value, checked: false })}
              placeholder={mode === 'en_to_ko' ? '한글 뜻을 입력하세요...' : '영어 단어를 입력하세요...'}
              disabled={st.revealed}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200 disabled:bg-neutral-50 font-mono"
            />

            <div className="flex flex-wrap items-center gap-2">
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
              <button
                type="button"
                onClick={() => update(idx, { revealed: true, checked: true })}
                className="rounded-xl border px-4 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50"
              >
                정답 보기
              </button>
              {st.checked && (
                <span className={['text-xs font-semibold', isCorrect ? 'text-emerald-600' : 'text-amber-600'].join(' ')}>
                  {isCorrect ? '✓ 정답' : '△ 오답'}
                </span>
              )}
            </div>

            {(st.revealed || (st.checked && !isCorrect)) && (
              <div className="rounded-xl bg-sky-50 px-4 py-3">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-sky-400">정답</div>
                <p className="text-sm leading-relaxed text-sky-800">{answer}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
