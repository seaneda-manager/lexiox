// apps/web/app/(protected)/reading/components/QuestionCard.tsx
'use client';

import type { RQuestion as Question, RChoice as Choice } from '@/models/reading';

export default function QuestionCard({
  q,
  disabled,
  selected,
  onChange,
  showFeedback,
}: {
  q: Question;
  disabled?: boolean;
  selected?: string | null;
  onChange?: (choiceId: string) => void;
  showFeedback?: boolean;
}) {
  function pick(c: Choice) {
    if (disabled) return;
    onChange?.(c.id);
  }

  return (
    <ul className="space-y-2">
      {q.choices.map((c: Choice, i: number) => {
        // A, B, C... (i>=26면 숫자표시로 폴백)
        const label = i < 26 ? String.fromCharCode(65 + i) : String(i + 1);
        const isPicked = selected === c.id;
        const isCorrect = !!c.isCorrect;
        
        // 피드백 표시 모드일 때 스타일
        const feedbackCls = showFeedback
          ? (isCorrect
              ? 'border-green-500 ring-1 ring-green-500/70 bg-green-50/60 dark:bg-green-900/20'
              : isPicked
                ? 'border-red-500 ring-1 ring-red-500/70 bg-red-50/60 dark:bg-red-900/20'
                : '')
          : '';

        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => pick(c)}
              aria-pressed={isPicked}
              disabled={disabled}
              className={[
                'w-full text-left p-3 rounded-xl border transition focus:outline-none focus:ring-2',
                isPicked && !showFeedback ? 'ring-2 ring-blue-500/70' : '',
                disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-white/20',
                feedbackCls,
              ].join(' ')}
            >
              <span className="mr-2 font-semibold">{label}.</span> {c.text}
            </button>
          </li>
        );
      })}
    </ul>
  );
}




