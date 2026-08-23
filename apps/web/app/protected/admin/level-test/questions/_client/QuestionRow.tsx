'use client';

import { useTransition } from 'react';
import { toggleQuestionActiveAction } from '../actions';
import { TRACK_LABEL, subLevelLabel, type Track, type SubLevel } from '@/lib/level-test/proficiencyLevels';

type Question = {
  id: string;
  prompt: string;
  choices: { id: string; text: string }[] | null;
  correct_choice_id: string | null;
  is_active: boolean;
  track?: Track | null;
  sub_level?: SubLevel | null;
  generated_by_ai?: boolean;
  audio_url?: string | null;
  topic_label?: string | null;
};

export default function QuestionRow({ question }: { question: Question }) {
  const [isPending, startTransition] = useTransition();
  const correctText = question.choices?.find((c) => c.id === question.correct_choice_id)?.text;

  return (
    <div className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 ${question.is_active ? 'border-neutral-100' : 'border-neutral-100 bg-neutral-50 opacity-50'}`}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1 mb-1">
          {question.track && (
            <span className="rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] text-violet-600">
              {TRACK_LABEL[question.track]}{question.sub_level ? ` ${subLevelLabel(question.track, question.sub_level)}` : ''}
            </span>
          )}
          {question.generated_by_ai && (
            <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] text-indigo-500">🤖 AI</span>
          )}
          {question.topic_label && (
            <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-600">🏷️ {question.topic_label}</span>
          )}
        </div>
        <p className="text-sm text-neutral-800">{question.prompt}</p>
        {question.audio_url && <audio controls src={question.audio_url} className="h-8 mt-1 max-w-full" />}
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
