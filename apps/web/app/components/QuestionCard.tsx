// normalized utf8
'use client';
import { useCallback, useId } from 'react';

type AnyChoice = {
  id: string | number;
  text?: string;
  label?: string;
  explain?: string | null;   // ??null ?占쎌슜
  is_correct?: boolean;
  ord?: number;
  meta?: unknown;
};

type Props = {
  prompt: string;
  choices: AnyChoice[];       // ???占쎌뿰???占쎈젰
  selected?: string | null;
  onAnswer: (choiceId: string) => void;
};

function normalizeChoice(c: AnyChoice): { id: string; label: string } {
  const id = String((c as any)?.id ?? '');
  const label =
    typeof (c as any)?.label === 'string'
      ? (c as any).label
      : typeof (c as any)?.text === 'string'
      ? (c as any).text
      : '';
  return { id, label };
}

export default function QuestionCard({ prompt, choices, selected, onAnswer }: Props) {
  const groupId = useId();

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      let idx = ['1','2','3','4','5','6','7','8','9'].indexOf(e.key);
      if (idx < 0) {
        const map: Record<string, number> = {
          Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3, Numpad5: 4,
          Numpad6: 5, Numpad7: 6, Numpad8: 7, Numpad9: 8,
        };
        if (e.code in map) idx = map[e.code];
      }
      if (idx >= 0 && idx < choices.length) {
        e.preventDefault();
        const { id } = normalizeChoice(choices[idx]);
        onAnswer(id);
      }
    },
    [choices, onAnswer]
  );

  const shortcutMax = Math.min(9, choices.length);

  return (
    <div
      className="rounded-2xl border border-gray-200 p-4 space-y-3 bg-white dark:bg-neutral-900 dark:border-neutral-800"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-labelledby={`${groupId}-label`}
      role="group"
    >
      <div id={`${groupId}-label`} className="font-medium text-gray-900 dark:text-gray-100">
        {prompt}
      </div>

      <div role="radiogroup" aria-labelledby={`${groupId}-label`} className="space-y-2">
        {choices.map((c, i) => {
          const { id, label } = normalizeChoice(c);
          const isSelected = (selected ?? null) === id;
          const letter = String.fromCharCode(65 + i); // A, B, C, D...

          return (
            <button
              key={id || i}
              type="button"
              onClick={() => onAnswer(id)}
              role="radio"
              aria-checked={isSelected}
              aria-label={`${letter}. ${label}`}
              className={[
                'w-full text-left rounded-xl border px-3 py-2 transition',
                'hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50',
                'dark:hover:bg-neutral-800',
                isSelected
                  ? 'border-brand-500 ring-1 ring-brand-500 bg-brand-50 dark:bg-brand-950/20'
                  : 'border-gray-200 dark:border-neutral-700',
              ].join(' ')}
            >
              <span className="inline-flex items-center gap-2">
                <span
                  className={[
                    'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                    isSelected ? 'border-brand-500' : 'border-gray-300 dark:border-neutral-600',
                  ].join(' ')}
                  aria-hidden="true"
                >
                  <span
                    className={[
                      'h-2.5 w-2.5 rounded-full',
                      isSelected ? 'bg-brand-500' : 'bg-transparent',
                    ].join(' ')}
                  />
                </span>

                <span className="font-medium text-gray-900 dark:text-gray-100">{letter}.</span>
                <span className="text-gray-800 dark:text-gray-200">{label}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400">
        Tip: 臾몄젣 ?占쎌뿭???占쎌빱?占쏙옙? ?占쎌쓣 ???占쎈낫??<span className="tabular-nums">1~{shortcutMax}</span> 占?鍮좊Ⅴ占??占쏀깮?????占쎌뼱??
      </div>
    </div>
  );
}




