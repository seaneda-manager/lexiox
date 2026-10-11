'use client';

import { useEffect, useMemo, useState } from 'react';
import type { MiddleDrillSentence } from '@/models/middle-naesin/drill';
import SaveResultButton from '@/components/middle-naesin/drill/SaveResultButton';
import type { MiddleNaesinDrillDetailItem } from '@/lib/middle-naesin/drill-results';
import { buildConnectorItems, CONNECTOR_CATEGORY_LABEL } from '@/lib/middle-naesin/connectors';

type Props = {
  sentences: MiddleDrillSentence[];
  unitId?: string;
  refId?: string;
};

const shuffle = <T,>(arr: T[]): T[] => {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

export default function ConnectorFillStage({ sentences, unitId, refId }: Props) {
  const items = useMemo(() => buildConnectorItems(sentences), [sentences]);
  // 보기 순서는 하이드레이션 불일치를 피하려고 마운트 후에 섞는다.
  const [choices, setChoices] = useState<string[][] | null>(null);
  const [picked, setPicked] = useState<(string | null)[]>([]);

  useEffect(() => {
    setChoices(items.map((it) => shuffle(it.choices)));
    setPicked(items.map(() => null));
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-neutral-400">
        이 본문에서 연결어(however, because, but, so …)를 찾지 못했어요.
      </div>
    );
  }
  if (!choices) return null;

  const answered = picked.filter((p) => p !== null).length;
  const score = items.filter((it, i) => picked[i] === it.answer).length;
  const detail: MiddleNaesinDrillDetailItem[] = items
    .map((it, i) => ({ it, i }))
    .filter(({ i }) => picked[i] !== null)
    .map(({ it, i }) => ({
      prompt: it.template,
      yourAnswer: picked[i] as string,
      correctAnswer: it.answer,
      isCorrect: picked[i] === it.answer,
    }));

  const pick = (i: number, c: string) => setPicked((prev) => prev.map((p, k) => (k === i && p === null ? c : p)));
  const retry = (i: number) => {
    setChoices((prev) => prev && prev.map((cs, k) => (k === i ? shuffle(items[i].choices) : cs)));
    setPicked((prev) => prev.map((p, k) => (k === i ? null : p)));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white px-5 py-3 text-sm text-neutral-500">
        <span>
          빈칸에 문맥상 가장 알맞은 연결어를 고르세요. ({answered}/{items.length}문제 · 맞힌 개수 {score})
        </span>
        {unitId && (
          <SaveResultButton
            unitId={unitId}
            drillType="connector_fill"
            refId={refId}
            score={score}
            total={answered}
            detail={detail}
          />
        )}
      </div>

      {items.map((it, i) => {
        const chosen = picked[i];
        const done = chosen !== null;
        const right = done && chosen === it.answer;
        const ko = sentences[it.sentenceIndex]?.ko;
        const [head, tail] = it.template.split('___');
        return (
          <section
            key={it.sentenceIndex}
            className={['space-y-3 rounded-2xl border bg-white p-5', done ? (right ? 'border-emerald-200' : 'border-rose-200') : ''].join(' ')}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-500">
                {i + 1}
              </span>
              <div className="space-y-1">
                {it.before && <p className="text-sm leading-6 text-neutral-400">{it.before}</p>}
                <p className="text-base leading-7 text-neutral-900">
                  {head}
                  <span
                    className={[
                      'mx-1 inline-block min-w-[5rem] border-b-2 px-1 text-center font-semibold',
                      !done ? 'border-neutral-400 text-transparent' : right ? 'border-emerald-500 text-emerald-700' : 'border-rose-400 text-rose-600',
                    ].join(' ')}
                  >
                    {done ? chosen : '___'}
                  </span>
                  {tail}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {choices[i].map((c) => {
                const isAnswer = c === it.answer;
                return (
                  <button
                    key={c}
                    type="button"
                    disabled={done}
                    onClick={() => pick(i, c)}
                    className={[
                      'rounded-xl border px-3 py-2 text-sm transition',
                      !done ? 'bg-white hover:border-sky-300 hover:bg-sky-50' : '',
                      done && isAnswer ? 'border-emerald-300 bg-emerald-50 font-semibold text-emerald-800' : '',
                      done && !isAnswer && c === chosen ? 'border-rose-300 bg-rose-50 text-rose-700' : '',
                      done && !isAnswer && c !== chosen ? 'text-neutral-300' : '',
                    ].join(' ')}
                  >
                    {c}
                  </button>
                );
              })}
            </div>

            {done && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-900">
                <span className={right ? 'font-semibold text-emerald-600' : 'font-semibold text-amber-600'}>
                  {right ? '✓ 정답' : `△ 정답: ${it.answer}`}
                </span>
                <span className="text-xs text-sky-700">({CONNECTOR_CATEGORY_LABEL[it.category]} 연결어)</span>
                {ko && <span className="text-xs text-sky-700/80">{ko}</span>}
                <button type="button" onClick={() => retry(i)} className="ml-auto rounded-lg border border-sky-200 bg-white px-3 py-1 text-xs text-sky-700 hover:bg-sky-100">
                  다시 풀기
                </button>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
