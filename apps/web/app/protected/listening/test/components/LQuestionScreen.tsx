// apps/web/app/(protected)/listening/test/components/LQuestionScreen.tsx
'use client';

type Choice = { id: string; text: string };
type Question = {
  id: string | number;
  prompt?: string;
  qtype?: string;
  choices?: Choice[];
};

type Props = {
  question: Question;
  index: number;                 // 현재 문항(0-based)
  total: number;                 // 총 문항 수
  selectedChoiceId?: string;     // 단일 선택형일 때
  selectedChoiceIds?: string[];  // 다중 선택형(있다면)
  disabled?: boolean;

  /** Next 13+ 규칙 준수: 함수 prop은 *Action 네이밍 */
  onChooseAction?: (qid: string, cid?: string) => void;
  onNextAction?: () => void;
  onPrevAction?: () => void;

  // 상위에서 추가 속성을 넘겨도 타입 에러 방지
  [key: string]: any;
};

export default function LQuestionScreen({
  question,
  index,
  total,
  selectedChoiceId,
  selectedChoiceIds = [],
  disabled = false,
  onChooseAction,
  onNextAction,
  onPrevAction,
}: Props) {
  // React Compiler 경고 회피: 불필요한 useMemo 제거
  const choices: Choice[] = Array.isArray(question?.choices) ? (question.choices as Choice[]) : [];

  const isChecked = (cid: string) => {
    if (Array.isArray(selectedChoiceIds) && selectedChoiceIds.length > 0) {
      return selectedChoiceIds.includes(cid);
    }
    return selectedChoiceId === cid;
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between text-sm text-neutral-500">
        <div>
          Question {index + 1} / {total}
          <span className="ml-2 rounded bg-emerald-600/15 px-2 py-0.5 text-[11px] text-emerald-400">
            Listening
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded border px-3 py-1 disabled:opacity-50"
            onClick={onPrevAction}
            disabled={disabled || index === 0}
          >
            Prev
          </button>
          <button
            type="button"
            className="rounded border px-3 py-1 disabled:opacity-50"
            onClick={onNextAction}
            disabled={disabled}
          >
            Next
          </button>
        </div>
      </div>

      {/* 질문 본문 */}
      <h2 className="text-lg font-semibold whitespace-pre-wrap">{question?.prompt ?? ''}</h2>

      {/* 보기 목록 */}
      <ul className="mt-2 space-y-2">
        {choices.map((c, i) => {
          const checked = isChecked(c.id);
          return (
            <li key={c.id}>
              <label
                className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 hover:bg-white/5 ${
                  checked ? 'ring-2 ring-blue-400/50' : ''
                }`}
              >
                <input
                  type="radio"
                  name={`q-${String(question?.id ?? 'none')}`}
                  className="mt-1"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onChooseAction?.(String(question.id), c.id)}
                  aria-label={`Choice ${i + 1}`}
                />
                <span className="leading-7">{c.text}</span>
              </label>
            </li>
          );
        })}
      </ul>

      {/* 하단 네비게이션 (모바일 편의) */}
      <div className="mt-3 flex justify-between">
        <button
          type="button"
          className="rounded border px-4 py-2 disabled:opacity-50"
          onClick={onPrevAction}
          disabled={disabled || index === 0}
        >
          Prev
        </button>
        <button
          type="button"
          className="rounded border px-4 py-2 disabled:opacity-50"
          onClick={onNextAction}
          disabled={disabled}
        >
          Next
        </button>
      </div>
    </div>
  );
}
