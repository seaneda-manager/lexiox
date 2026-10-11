'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MiddleDrillSentence } from '@/models/middle-naesin/drill';
import SaveResultButton from '@/components/middle-naesin/drill/SaveResultButton';
import type { MiddleNaesinDrillDetailItem } from '@/lib/middle-naesin/drill-results';

type Props = {
  sentences: MiddleDrillSentence[];
  unitId?: string;
  refId?: string;
};

const SIZES = [4, 5, 6, 8];

// 본문/대화문 전체를 한 번에 섞으면 너무 어려우므로 연속된 N문장씩 한 라운드로 나눈다.
// 마지막 조각이 3문장보다 적으면 앞 라운드에 붙인다(2문장짜리 라운드는 의미가 없다).
function makeRounds(total: number, size: number): number[][] {
  const rounds: number[][] = [];
  for (let i = 0; i < total; i += size) {
    rounds.push(Array.from({ length: Math.min(size, total - i) }, (_, k) => i + k));
  }
  if (rounds.length > 1 && rounds[rounds.length - 1].length < 3) {
    const last = rounds.pop()!;
    rounds[rounds.length - 1].push(...last);
  }
  return rounds;
}

// 섞은 결과가 원래 순서와 같으면 다시 섞는다.
function shuffled(items: number[]): number[] {
  if (items.length < 2) return items;
  let out = items;
  for (let attempt = 0; attempt < 10; attempt++) {
    out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    if (out.some((v, i) => v !== items[i])) return out;
  }
  return out;
}

type RoundState = {
  pool: number[]; // 아직 놓지 않은 문장 (섞인 순서)
  placed: number[]; // 학생이 놓은 순서
  checked: boolean;
  revealed: boolean;
};

export default function SentenceOrderStage({ sentences, unitId, refId }: Props) {
  const [size, setSize] = useState(5);
  const rounds = useMemo(() => makeRounds(sentences.length, size), [sentences.length, size]);
  // 하이드레이션 불일치를 피하려고 섞기는 마운트 후에 한다.
  const [states, setStates] = useState<RoundState[] | null>(null);

  const reset = useCallback(() => {
    setStates(rounds.map((r) => ({ pool: shuffled(r), placed: [], checked: false, revealed: false })));
  }, [rounds]);

  useEffect(() => {
    reset();
  }, [reset]);

  if (sentences.length < 2) {
    return <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-neutral-400">문장이 2개 이상 있어야 순서 배열을 할 수 있어요.</div>;
  }
  if (!states) return null;

  const update = (ri: number, patch: Partial<RoundState>) =>
    setStates((prev) => prev && prev.map((s, i) => (i === ri ? { ...s, ...patch } : s)));

  const place = (ri: number, si: number) => {
    const st = states[ri];
    if (st.checked) return;
    update(ri, { pool: st.pool.filter((x) => x !== si), placed: [...st.placed, si] });
  };
  // 놓은 문장을 누르면 그 문장부터 뒤쪽을 모두 되돌린다(순서가 꼬이지 않게)
  const unplace = (ri: number, pos: number) => {
    const st = states[ri];
    if (st.checked) return;
    update(ri, { pool: [...st.pool, ...st.placed.slice(pos)], placed: st.placed.slice(0, pos) });
  };
  const retry = (ri: number) =>
    update(ri, { pool: shuffled(rounds[ri]), placed: [], checked: false, revealed: false });

  const isRoundCorrect = (ri: number) =>
    states[ri].placed.length === rounds[ri].length && states[ri].placed.every((si, pos) => si === rounds[ri][pos]);

  const checkedRounds = states.map((_, i) => i).filter((i) => states[i].checked);
  const score = checkedRounds.filter(isRoundCorrect).length;
  const detail: MiddleNaesinDrillDetailItem[] = checkedRounds.map((ri) => ({
    prompt: `문장 순서 배열 ${ri + 1} (${rounds[ri].length}문장)`,
    yourAnswer: states[ri].placed.map((si) => sentences[si].en).join('\n'),
    correctAnswer: rounds[ri].map((si) => sentences[si].en).join('\n'),
    isCorrect: isRoundCorrect(ri),
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white px-5 py-3 text-sm text-neutral-500">
        <span>섞인 문장을 눌러서 원래 순서대로 배열하세요. 놓은 문장을 다시 누르면 그 문장부터 되돌려요.</span>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1 text-xs">
            한 번에
            <select
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="rounded-lg border px-2 py-1 text-xs"
            >
              {SIZES.map((n) => (
                <option key={n} value={n}>{n}문장</option>
              ))}
            </select>
          </label>
          {unitId && (
            <SaveResultButton
              unitId={unitId}
              drillType="sentence_order"
              refId={refId}
              score={score}
              total={checkedRounds.length}
              detail={detail}
            />
          )}
        </div>
      </div>

      {rounds.map((round, ri) => {
        const st = states[ri];
        const done = st.placed.length === round.length;
        const correct = st.checked && isRoundCorrect(ri);
        return (
          <section
            key={ri}
            className={['space-y-3 rounded-2xl border bg-white p-5', correct ? 'border-emerald-200' : ''].join(' ')}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-500">
                {ri + 1} / {rounds.length} · {round.length}문장
              </span>
              {st.checked && (
                <span className={['text-xs font-semibold', correct ? 'text-emerald-600' : 'text-amber-600'].join(' ')}>
                  {correct ? '✓ 모두 맞았어요' : `△ ${st.placed.filter((si, pos) => si === round[pos]).length}/${round.length} 자리 일치`}
                </span>
              )}
            </div>

            {/* 내가 배열한 순서 */}
            <ol className="space-y-2">
              {round.map((_, pos) => {
                const si = st.placed[pos];
                const filled = si !== undefined;
                const right = st.checked && filled && si === round[pos];
                const wrong = st.checked && filled && si !== round[pos];
                return (
                  <li key={pos}>
                    <button
                      type="button"
                      disabled={!filled || st.checked}
                      onClick={() => unplace(ri, pos)}
                      className={[
                        'flex w-full items-start gap-3 rounded-xl border px-3 py-2 text-left text-sm leading-6 transition',
                        !filled ? 'border-dashed bg-neutral-50 text-neutral-300' : 'bg-white text-neutral-900 hover:bg-neutral-50',
                        right ? 'border-emerald-300 bg-emerald-50' : '',
                        wrong ? 'border-rose-300 bg-rose-50' : '',
                      ].join(' ')}
                    >
                      <span className="mt-0.5 shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-500">
                        {pos + 1}
                      </span>
                      <span>{filled ? sentences[si].en : '여기에 놓일 문장을 아래에서 고르세요'}</span>
                    </button>
                  </li>
                );
              })}
            </ol>

            {/* 아직 안 놓은 문장 */}
            {st.pool.length > 0 && (
              <div className="space-y-2 rounded-xl bg-sky-50/60 p-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-sky-400">섞인 문장</div>
                {st.pool.map((si) => (
                  <button
                    key={si}
                    type="button"
                    onClick={() => place(ri, si)}
                    className="block w-full rounded-xl border border-sky-200 bg-white px-3 py-2 text-left text-sm leading-6 text-neutral-900 hover:bg-sky-50"
                  >
                    {sentences[si].en}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {!st.checked && (
                <button
                  type="button"
                  onClick={() => update(ri, { checked: true })}
                  disabled={!done}
                  className="rounded-xl bg-neutral-800 px-4 py-1.5 text-xs text-white disabled:opacity-40"
                >
                  확인
                </button>
              )}
              <button type="button" onClick={() => retry(ri)} className="rounded-xl border px-4 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50">
                다시 섞기
              </button>
              <button
                type="button"
                onClick={() => update(ri, { revealed: true })}
                className="rounded-xl border px-4 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50"
              >
                정답 보기
              </button>
            </div>

            {(st.revealed || (st.checked && !correct)) && (
              <div className="space-y-1 rounded-xl bg-sky-50 px-4 py-3">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-sky-400">정답 순서</div>
                {round.map((si, pos) => (
                  <p key={si} className="text-sm leading-relaxed text-sky-900">
                    <span className="mr-2 font-bold">{pos + 1}.</span>
                    {sentences[si].en}
                    {sentences[si].ko && <span className="ml-2 text-xs text-sky-600/80">{sentences[si].ko}</span>}
                  </p>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
