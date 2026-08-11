'use client';

import { useTransition } from 'react';
import { toggleQuestionActiveAction } from '../actions';

type Question = {
  id: string;
  prompt: string;
  choices: { id: string; text: string }[] | null;
  correct_choice_id: string | null;
  is_active: boolean;
};

export default function QuestionRow({ question }: { question: Question }) {
  const [isPending, startTransition] = useTransition();
  const correctText = question.choices?.find((c) => c.id === question.correct_choice_id)?.text;

  return (
    <div className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 ${question.is_active ? 'border-neutral-100' : 'border-neutral-100 bg-neutral-50 opacity-50'}`}>
      <div className="min-w-0">
        <p className="text-sm text-neutral-800">{question.prompt}</p>
        {correctText && <p className="text-[11px] text-emerald-600 mt-0.5">정답: {correctText}</p>}
      </div>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => { void toggleQuestionActiveAction(question.id, !question.is_active); })}
        className="shrink-0 rounded-full border border-neutral-200 px-2.5 py-1 text-[11px] text-neutral-500 hover:bg-neutral-50 disabled:opacity-50"
      >
        {question.is_active ? '비활성화' : '활성화'}
      </button>
    </div>
  );
}
