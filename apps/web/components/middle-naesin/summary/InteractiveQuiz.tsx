'use client';

import { useState } from 'react';

// 화면에서 눌러서 푸는 퀴즈. 인쇄용 문제지(QuizView 의 정적 버전)와 같은 데이터를 쓴다.

export type ChoiceItem = { prompt: string; sub?: string | null; choices: string[]; answer: number };

function ScoreBar({ answered, total, correct, onReset }: { answered: number; total: number; correct: number; onReset: () => void }) {
  const done = answered === total && total > 0;
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-neutral-50 px-3 py-1.5 text-xs">
      <span className="text-neutral-600">
        {done ? (
          <b className={correct === total ? 'text-emerald-600' : 'text-neutral-900'}>
            {correct === total ? '🎉 모두 맞혔어요! ' : ''}
            {correct} / {total} 정답
          </b>
        ) : (
          <>
            {answered} / {total} 풀이 · 정답 {correct}
          </>
        )}
      </span>
      <button type="button" onClick={onReset} className="rounded border px-2 py-0.5 text-neutral-600 hover:bg-white">
        다시 풀기
      </button>
    </div>
  );
}

// 보기를 눌러 고르는 문제 목록. 한 번 고르면 정오답이 바로 표시되고, 틀리면 정답도 함께 보여준다.
export function ChoiceList({ items }: { items: ChoiceItem[] }) {
  const [picks, setPicks] = useState<(number | null)[]>(() => items.map(() => null));
  const answered = picks.filter((p) => p !== null).length;
  const correct = picks.filter((p, i) => p === items[i].answer).length;

  return (
    <div className="space-y-2">
      <ScoreBar answered={answered} total={items.length} correct={correct} onReset={() => setPicks(items.map(() => null))} />
      <ol className="space-y-2">
        {items.map((it, i) => {
          const pick = picks[i];
          const stacked = it.choices.some((c) => c.length > 26);
          return (
            <li key={i} className="rounded-lg border bg-white p-2.5 text-sm">
              <p className="leading-snug">
                <span className="mr-1.5 text-xs font-bold text-neutral-400">{i + 1}.</span>
                {it.prompt}
                {it.sub && <span className="ml-1.5 text-xs text-neutral-500">{it.sub}</span>}
              </p>
              <div className={stacked ? 'mt-2 space-y-1.5' : 'mt-2 flex flex-wrap gap-1.5'}>
                {it.choices.map((c, ci) => {
                  const isPick = pick === ci;
                  const isAnswer = ci === it.answer;
                  const revealed = pick !== null;
                  const cls = !revealed
                    ? 'border-neutral-300 bg-white hover:border-sky-400 hover:bg-sky-50'
                    : isAnswer
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                      : isPick
                        ? 'border-red-400 bg-red-50 text-red-700'
                        : 'border-neutral-200 bg-white text-neutral-400';
                  return (
                    <button
                      key={ci}
                      type="button"
                      disabled={revealed}
                      onClick={() => setPicks((prev) => prev.map((p, pi) => (pi === i ? ci : p)))}
                      className={`rounded-lg border px-3 py-1.5 text-left text-sm transition ${stacked ? 'block w-full' : ''} ${cls}`}
                    >
                      {revealed && isAnswer && '✓ '}
                      {revealed && isPick && !isAnswer && '✗ '}
                      {c}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// 질문 하나에 대해 응답을 보기 목록에서 고르는 짝짓기. (질문마다 같은 응답 목록을 보기로 쓴다.)
export function MatchList({ questions, replies, answerIdx }: { questions: string[]; replies: string[]; answerIdx: number[] }) {
  return (
    <ChoiceList items={questions.map((q, i) => ({ prompt: q, choices: replies, answer: answerIdx[i] }))} />
  );
}

export type OrderItem = { title: string; first: string; shuffled: { letter: string; text: string }[]; answer: string };

// 문장을 눌러 이어질 순서대로 고르는 순서 배열.
export function OrderList({ items }: { items: OrderItem[] }) {
  const [picks, setPicks] = useState<string[][]>(() => items.map(() => []));
  const reset = () => setPicks(items.map(() => []));
  const results = items.map((it, i) => picks[i].length === it.shuffled.length && picks[i].join('-') === it.answer);
  const answered = items.filter((it, i) => picks[i].length === it.shuffled.length).length;
  const correct = results.filter(Boolean).length;
  const set = (i: number, fn: (cur: string[]) => string[]) => setPicks((prev) => prev.map((p, pi) => (pi === i ? fn(p) : p)));

  return (
    <div className="space-y-2">
      <ScoreBar answered={answered} total={items.length} correct={correct} onReset={reset} />
      {items.map((it, i) => {
        const cur = picks[i];
        const full = cur.length === it.shuffled.length;
        const ok = results[i];
        const byLetter = new Map(it.shuffled.map((s) => [s.letter, s.text]));
        const correctOrder = it.answer.split('-');
        return (
          <div key={i} className={`rounded-lg border bg-white p-2.5 text-sm ${full ? (ok ? 'border-emerald-300' : 'border-red-300') : ''}`}>
            <div className="text-xs font-semibold text-neutral-500">
              {i + 1}. {it.title}
            </div>
            <p className="mt-1">
              <b className="mr-1">(처음)</b>
              {it.first}
            </p>

            {cur.length > 0 && (
              <ol className="mt-1.5 space-y-0.5 rounded bg-sky-50 p-2 text-xs">
                {cur.map((l, k) => (
                  <li key={k}>
                    <b className="mr-1 text-sky-700">{k + 1}</b>
                    {byLetter.get(l)}
                  </li>
                ))}
              </ol>
            )}

            <div className="mt-2 space-y-1">
              {it.shuffled.map((s) => {
                const used = cur.includes(s.letter);
                return (
                  <button
                    key={s.letter}
                    type="button"
                    disabled={used || full}
                    onClick={() => set(i, (c) => [...c, s.letter])}
                    className={`block w-full rounded-lg border px-3 py-1.5 text-left text-sm transition ${
                      used ? 'border-neutral-200 bg-neutral-50 text-neutral-300' : 'border-neutral-300 hover:border-sky-400 hover:bg-sky-50'
                    }`}
                  >
                    {s.text}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex items-center gap-3 text-xs">
              <button
                type="button"
                disabled={cur.length === 0}
                onClick={() => set(i, (c) => c.slice(0, -1))}
                className="rounded border px-2 py-0.5 text-neutral-600 disabled:opacity-40"
              >
                ← 한 개 취소
              </button>
              <button
                type="button"
                disabled={cur.length === 0}
                onClick={() => set(i, () => [])}
                className="rounded border px-2 py-0.5 text-neutral-600 disabled:opacity-40"
              >
                다시 고르기
              </button>
              {full && (ok ? <b className="text-emerald-600">✓ 정답!</b> : <b className="text-red-600">✗ 순서가 달라요</b>)}
            </div>

            {full && !ok && (
              <ol className="mt-2 space-y-0.5 rounded bg-emerald-50 p-2 text-xs text-emerald-900">
                <li className="font-semibold">정답 순서</li>
                {correctOrder.map((l, k) => (
                  <li key={k}>
                    <b className="mr-1">{k + 1}</b>
                    {byLetter.get(l)}
                  </li>
                ))}
              </ol>
            )}
          </div>
        );
      })}
    </div>
  );
}
