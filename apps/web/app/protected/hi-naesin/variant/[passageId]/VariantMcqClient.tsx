'use client';

// 5지선다형 변형문제 풀이: ① 답 고르기 → ② 정답인 이유 고르기 → ③ 보기별 해설(복습)
// 정답/이유 정답/보기별 해설은 제출 전에는 클라이언트에 내려오지 않는다 (서버가 채점).

import { useState, useTransition } from 'react';
import {
  submitVariantChoiceAction,
  submitVariantReasonAction,
} from './actions';

const CIRCLED = ['①', '②', '③', '④', '⑤'];
const MARK_SPLIT = /(⟦\d+\|[^⟧]*⟧)/g;
const MARK_ONE = /^⟦(\d+)\|([^⟧]*)⟧$/;

export type McqView = {
  markedPassage?: string;
  passage?: string;
  numberedPassage?: string;
  summaryTemplate?: string;
  fixedSegment?: { text: string };
  segments?: Array<{ id: string; text: string }>;
};

export type McqChoice = { id: string; order: number; text: string };

export type McqAnswered = {
  selectedChoiceId: string | null;
  isCorrect: boolean;
  correctChoiceId: string;
  reasonIndex: number | null;
  reasonIsCorrect: boolean | null;
  /** 이유 문항이 끝난 뒤(또는 이유 문항이 없을 때)에만 내려온다 */
  correctReasonIndex: number | null;
  choiceNotes: string[] | null;
};

function Marked({ text }: { text: string }) {
  return (
    <>
      {text.split(MARK_SPLIT).map((part, i) => {
        const m = MARK_ONE.exec(part);
        if (!m) return <span key={i}>{part}</span>;
        const n = Number(m[1]);
        return (
          <span key={i} className="whitespace-pre-wrap">
            <sup className="mr-0.5 font-bold text-neutral-500">{CIRCLED[n - 1] ?? n}</sup>
            <span className="underline decoration-2 underline-offset-4">{m[2]}</span>
          </span>
        );
      })}
    </>
  );
}

export default function VariantMcqClient({
  passageId,
  sessionId,
  questionId,
  view,
  fallbackPassage,
  choices,
  hasReason,
  initial,
  reasonOptions,
  explanation,
}: {
  passageId: string;
  sessionId: string;
  questionId: string;
  view: McqView;
  fallbackPassage: string;
  choices: McqChoice[];
  hasReason: boolean;
  initial: McqAnswered | null;
  /** 본문제를 푼 뒤에만 내려온다 */
  reasonOptions: string[] | null;
  explanation: string | null;
}) {
  const [picked, setPicked] = useState<string | null>(initial?.selectedChoiceId ?? null);
  const [answer, setAnswer] = useState<McqAnswered | null>(initial);
  const [reasons, setReasons] = useState<string[] | null>(reasonOptions);
  const [reasonPick, setReasonPick] = useState<number | null>(initial?.reasonIndex ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const answered = answer !== null;
  const reasonDone = answer?.reasonIndex != null;
  const needsReason = hasReason && answered && !reasonDone;
  const markedChoices = choices.every((c) => CIRCLED.includes(c.text)); // 밑줄형: 보기는 번호만

  function submitChoice() {
    if (!picked || answered) return;
    setError(null);
    start(async () => {
      const r = await submitVariantChoiceAction(passageId, sessionId, questionId, picked);
      if ('error' in r) { setError(r.error); return; }
      setAnswer({
        selectedChoiceId: picked,
        isCorrect: r.isCorrect,
        correctChoiceId: r.correctChoiceId,
        reasonIndex: null,
        reasonIsCorrect: null,
        correctReasonIndex: null,
        choiceNotes: r.choiceNotes,
      });
      if (r.reasonOptions) setReasons(r.reasonOptions);
    });
  }

  function submitReason() {
    if (reasonPick == null || !answer) return;
    setError(null);
    start(async () => {
      const r = await submitVariantReasonAction(sessionId, questionId, reasonPick);
      if ('error' in r) { setError(r.error); return; }
      setAnswer({
        ...answer,
        reasonIndex: reasonPick,
        reasonIsCorrect: r.isCorrect,
        correctReasonIndex: r.correctIndex,
        choiceNotes: r.choiceNotes,
      });
    });
  }

  const body = view.markedPassage ?? view.numberedPassage ?? view.passage ?? null;
  const showFallback = !body && !view.segments;

  return (
    <div className="space-y-4">
      {/* 지문 */}
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm leading-7 text-neutral-800 whitespace-pre-line">
        {view.fixedSegment && (
          <div className="mb-3">
            <p className="mb-1 text-xs font-semibold text-neutral-400">주어진 글</p>
            {view.fixedSegment.text}
          </div>
        )}
        {view.segments?.map((s) => (
          <p key={s.id} className="mb-2">
            <span className="mr-1 font-bold">({s.id})</span>{s.text}
          </p>
        ))}
        {body && <Marked text={body} />}
        {showFallback && fallbackPassage}
        {view.summaryTemplate && (
          <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-3">
            <p className="mb-1 text-xs font-semibold text-neutral-400">요약문</p>
            {view.summaryTemplate}
          </div>
        )}
      </div>

      {/* 보기 */}
      <div className="space-y-2">
        {choices.map((c) => {
          const isPicked = picked === c.id;
          const isAnswer = answered && answer!.correctChoiceId === c.id;
          const isWrongPick = answered && isPicked && !answer!.isCorrect;
          return (
            <button
              key={c.id}
              type="button"
              disabled={answered || pending}
              onClick={() => setPicked(c.id)}
              className={[
                'flex w-full items-start gap-2 rounded-xl border px-4 py-2.5 text-left text-sm transition',
                isAnswer ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                  : isWrongPick ? 'border-red-300 bg-red-50 text-red-800'
                  : isPicked ? 'border-neutral-900 bg-neutral-100'
                  : 'border-neutral-200 bg-white hover:bg-neutral-50',
              ].join(' ')}
            >
              <span className="font-bold">{CIRCLED[c.order - 1] ?? c.order}</span>
              {!markedChoices && <span>{c.text}</span>}
              {answered && answer!.choiceNotes && answer!.choiceNotes[c.order - 1] && (
                <span className="ml-auto max-w-[60%] text-xs font-normal text-neutral-500">
                  {answer!.choiceNotes[c.order - 1]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!answered && (
        <button
          type="button"
          onClick={submitChoice}
          disabled={!picked || pending}
          className="w-full rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-40"
        >
          {pending ? '채점 중...' : '정답 확인'}
        </button>
      )}

      {answered && (
        <div className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${answer!.isCorrect ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {answer!.isCorrect ? '✓ 정답이에요' : '✗ 오답이에요'}
          {needsReason && <span className="ml-2 font-normal">— 이제 정답인 이유를 골라 보세요</span>}
        </div>
      )}

      {/* 정답인 이유 고르기 */}
      {hasReason && answered && reasons && (
        <div className="space-y-2 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
          <p className="text-sm font-semibold text-indigo-900">이 문제의 정답은 왜 정답일까요?</p>
          {reasons.map((r, i) => {
            const mine = reasonPick === i;
            const isRight = reasonDone && answer!.correctReasonIndex === i;
            const isWrongMine = reasonDone && mine && !answer!.reasonIsCorrect;
            return (
              <button
                key={i}
                type="button"
                disabled={reasonDone || pending}
                onClick={() => setReasonPick(i)}
                className={[
                  'w-full rounded-lg border px-3 py-2 text-left text-sm',
                  isRight ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                    : isWrongMine ? 'border-red-300 bg-red-50 text-red-800'
                    : mine ? 'border-indigo-500 bg-white'
                    : 'border-indigo-100 bg-white hover:bg-indigo-50',
                ].join(' ')}
              >
                {r}
              </button>
            );
          })}
          {!reasonDone && (
            <button
              type="button"
              onClick={submitReason}
              disabled={reasonPick == null || pending}
              className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? '확인 중...' : '이유 확인'}
            </button>
          )}
          {reasonDone && (
            <p className={`text-sm font-semibold ${answer!.reasonIsCorrect ? 'text-emerald-700' : 'text-red-600'}`}>
              {answer!.reasonIsCorrect ? '✓ 이유까지 정확해요' : '✗ 이유가 달라요 — 초록색 이유를 확인하세요'}
            </p>
          )}
        </div>
      )}

      {/* 해설 (이유 단계까지 마친 뒤) */}
      {answered && (!hasReason || reasonDone) && explanation && (
        <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3">
          <p className="mb-1 text-xs font-semibold text-neutral-500">해설</p>
          <p className="text-sm text-neutral-700">{explanation}</p>
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
