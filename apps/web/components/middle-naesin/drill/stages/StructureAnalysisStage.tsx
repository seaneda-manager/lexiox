'use client';

import { useState } from 'react';
import type { MiddleDrillSentence, SentenceStructure } from '@/models/middle-naesin/drill';

type PartKey = keyof SentenceStructure;

const PARTS: { key: PartKey; label: string; color: string; bg: string }[] = [
  { key: 'subject',    label: 'S (주어)',   color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
  { key: 'verb',       label: 'V (동사)',   color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  { key: 'object',     label: 'O (목적어)', color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200' },
  { key: 'complement', label: 'C (보어)',   color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
];

type SentenceState = {
  answers: SentenceStructure;
  checked: boolean;
  revealed: boolean;
};

function emptyStructure(): SentenceStructure {
  return { subject: '', verb: '', object: '', complement: '' };
}

type Props = {
  sentences: MiddleDrillSentence[];
};

export default function StructureAnalysisStage({ sentences }: Props) {
  const [states, setStates] = useState<SentenceState[]>(
    sentences.map(() => ({ answers: emptyStructure(), checked: false, revealed: false })),
  );

  const update = (idx: number, patch: Partial<SentenceState>) =>
    setStates((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));

  const updateAnswer = (idx: number, key: PartKey, value: string) =>
    setStates((prev) =>
      prev.map((s, i) =>
        i === idx ? { ...s, answers: { ...s.answers, [key]: value }, checked: false } : s,
      ),
    );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white px-5 py-3 text-sm text-neutral-500">
        각 문장에서 <span className="font-semibold text-blue-600">S(주어)</span>·
        <span className="font-semibold text-emerald-600">V(동사)</span>·
        <span className="font-semibold text-amber-600">O(목적어)</span>·
        <span className="font-semibold text-violet-600">C(보어)</span>를 찾아 입력하세요.
        해당 없는 칸은 비워두세요.
      </div>

      {sentences.map((sentence, idx) => {
        const st = states[idx];
        const hasAnswer = !!sentence.structureAnswer;

        let allCorrect = false;
        if (st.checked && hasAnswer) {
          const ans = sentence.structureAnswer!;
          allCorrect = PARTS.every(
            (p) =>
              st.answers[p.key].trim().toLowerCase() ===
              (ans[p.key] ?? '').toLowerCase(),
          );
        }

        return (
          <div
            key={sentence.index}
            className={[
              'rounded-2xl border bg-white p-5 space-y-4 transition',
              st.checked && allCorrect ? 'border-emerald-200' : st.checked ? 'border-amber-100' : '',
            ].join(' ')}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-500">
                {idx + 1}
              </span>
              <p className="text-base leading-7 text-neutral-900">{sentence.en}</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {PARTS.map((p) => {
                const correctVal = sentence.structureAnswer?.[p.key] ?? '';
                const studentVal = st.answers[p.key];
                const isWrong =
                  st.checked &&
                  hasAnswer &&
                  studentVal.trim().toLowerCase() !== correctVal.toLowerCase();

                return (
                  <div key={p.key} className={['rounded-xl border p-3', p.bg].join(' ')}>
                    <label className={['mb-1 block text-[10px] font-bold uppercase tracking-wide', p.color].join(' ')}>
                      {p.label}
                    </label>
                    <input
                      type="text"
                      value={studentVal}
                      onChange={(e) => updateAnswer(idx, p.key, e.target.value)}
                      disabled={st.revealed}
                      placeholder="해당 없으면 빈칸"
                      className={[
                        'w-full rounded-lg border bg-white px-2 py-1.5 text-sm outline-none focus:ring-1',
                        isWrong ? 'border-rose-300 focus:ring-rose-200' : 'border-neutral-200 focus:ring-neutral-200',
                      ].join(' ')}
                    />
                    {(st.revealed || isWrong) && correctVal && (
                      <p className={['mt-1 text-xs font-medium', p.color].join(' ')}>
                        정답: {correctVal}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              {!st.revealed && (
                <button
                  type="button"
                  onClick={() => update(idx, { checked: true })}
                  disabled={!Object.values(st.answers).some((v) => v.trim())}
                  className="rounded-xl bg-neutral-800 px-4 py-1.5 text-xs text-white disabled:opacity-40"
                >
                  확인
                </button>
              )}
              {hasAnswer && (
                <button
                  type="button"
                  onClick={() => update(idx, { revealed: true, checked: true })}
                  className="rounded-xl border px-4 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50"
                >
                  정답 보기
                </button>
              )}
              {!hasAnswer && (
                <span className="text-xs text-neutral-300">정답 데이터 없음 (에디터에서 추가)</span>
              )}
              {st.checked && hasAnswer && (
                <span className={['text-xs font-semibold', allCorrect ? 'text-emerald-600' : 'text-amber-600'].join(' ')}>
                  {allCorrect ? '✓ 완벽해요' : '△ 다시 확인'}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
