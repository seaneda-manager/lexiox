'use client';

import { useRef, useState } from 'react';
import type { MiddleDrillSentence } from '@/models/middle-naesin/drill';

type ItemState = {
  input: string;
  revealed: boolean;
  retype: string;
  retypeChecked: boolean;
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

// 모범 답안 재입력 확인용: 대소문자/구두점 무시하고 정확히 일치하는지 검사
function normalizeExact(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

export default function CompositionStage({ sentences }: Props) {
  const drillable = sentences.filter((s) => s.ko);
  const [states, setStates] = useState<ItemState[]>(
    drillable.map(() => ({ input: '', revealed: false, retype: '', retypeChecked: false })),
  );
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const inputRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  const update = (idx: number, patch: Partial<ItemState>) =>
    setStates((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));

  const focusNext = (idx: number) => {
    requestAnimationFrame(() => {
      cardRefs.current[idx + 1]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      inputRefs.current[idx + 1]?.focus();
    });
  };

  const check = (idx: number) => {
    setChecked((prev) => new Set([...prev, idx]));
    if (roughMatch(states[idx].input, drillable[idx].en)) {
      focusNext(idx);
    }
  };

  const checkRetype = (idx: number) => {
    update(idx, { retypeChecked: true });
    if (normalizeExact(states[idx].retype) === normalizeExact(drillable[idx].en)) {
      focusNext(idx);
    }
  };

  if (drillable.length === 0) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center text-sm text-neutral-400">
        해석 데이터가 없습니다. 단원 에디터에서 한국어 해석을 추가해주세요.
      </div>
    );
  }

  const isFirstTryCorrect = (idx: number) =>
    checked.has(idx) && roughMatch(states[idx].input, drillable[idx].en);

  const isPassed = (idx: number) => {
    const st = states[idx];
    return (
      isFirstTryCorrect(idx) ||
      (st.retypeChecked && normalizeExact(st.retype) === normalizeExact(drillable[idx].en))
    );
  };

  const passedCount = drillable.filter((_, idx) => isPassed(idx)).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border bg-white px-5 py-3 text-sm text-neutral-500">
        <span>한국어를 보고 영어 문장을 작문하세요. 틀리면 모범 답안을 그대로 다시 입력해야 다음 문장으로 넘어갑니다.</span>
        <span className="shrink-0 font-semibold text-neutral-700">{passedCount}/{drillable.length}</span>
      </div>

      {drillable.map((sentence, idx) => {
        const st = states[idx];
        const isChecked = checked.has(idx);
        const firstTryCorrect = isFirstTryCorrect(idx);
        const passed = isPassed(idx);
        const locked = idx > 0 && Array.from({ length: idx }, (_, j) => j).some((j) => !isPassed(j));

        if (locked) {
          return (
            <div
              key={sentence.index}
              ref={(el) => { cardRefs.current[idx] = el; }}
              className="rounded-2xl border border-dashed bg-neutral-50 p-5 text-sm text-neutral-400"
            >
              <span className="mr-2 shrink-0 rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-bold text-neutral-500">
                {idx + 1}
              </span>
              🔒 이전 문장을 먼저 완료하세요.
            </div>
          );
        }

        const needsRetype = (st.revealed || (isChecked && !firstTryCorrect)) && !passed;

        return (
          <div
            key={sentence.index}
            ref={(el) => { cardRefs.current[idx] = el; }}
            className={[
              'rounded-2xl border bg-white p-5 space-y-3 transition',
              passed ? 'border-emerald-200' : isChecked ? 'border-amber-100' : '',
            ].join(' ')}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-500">
                {idx + 1}
              </span>
              <p className="text-base leading-7 text-neutral-800">{sentence.ko}</p>
            </div>

            <textarea
              ref={(el) => { inputRefs.current[idx] = el; }}
              value={st.input}
              onChange={(e) => update(idx, { input: e.target.value })}
              rows={2}
              placeholder="영어로 작문하세요..."
              disabled={st.revealed || passed}
              className="w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200 disabled:bg-neutral-50 font-mono"
            />

            <div className="flex flex-wrap items-center gap-2">
              {!st.revealed && !passed && (
                <button
                  type="button"
                  onClick={() => check(idx)}
                  disabled={!st.input.trim()}
                  className="rounded-xl bg-neutral-800 px-4 py-1.5 text-xs text-white disabled:opacity-40"
                >
                  확인
                </button>
              )}
              {!passed && (
                <button
                  type="button"
                  onClick={() => update(idx, { revealed: true })}
                  className="rounded-xl border px-4 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50"
                >
                  모범 답안
                </button>
              )}
              {isChecked && !passed && (
                <span className="text-xs font-semibold text-amber-600">△ 다시 확인</span>
              )}
              {passed && (
                <span className="text-xs font-semibold text-emerald-600">✓ 완료</span>
              )}
            </div>

            {(st.revealed || (isChecked && !firstTryCorrect) || passed) && (
              <div className="rounded-xl bg-emerald-50 px-4 py-3">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                  모범 답안
                </div>
                <p className="text-sm leading-relaxed text-emerald-900 font-mono">{sentence.en}</p>
              </div>
            )}

            {needsRetype && (
              <div className="space-y-2 rounded-xl border border-emerald-200 bg-white p-3">
                <div className="text-xs font-semibold text-neutral-600">
                  위 모범 답안을 그대로 다시 입력하세요
                </div>
                <textarea
                  value={st.retype}
                  onChange={(e) => update(idx, { retype: e.target.value, retypeChecked: false })}
                  rows={2}
                  placeholder="모범 답안을 그대로 입력하세요..."
                  className="w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200 font-mono"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => checkRetype(idx)}
                    disabled={!st.retype.trim()}
                    className="rounded-xl bg-emerald-700 px-4 py-1.5 text-xs text-white disabled:opacity-40"
                  >
                    재입력 확인
                  </button>
                  {st.retypeChecked && (
                    <span className="text-xs font-semibold text-amber-600">
                      △ 모범 답안과 일치하지 않아요. 다시 입력하세요.
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
