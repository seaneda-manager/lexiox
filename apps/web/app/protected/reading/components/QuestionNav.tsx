'use client';

type Props = {
  total: number;
  current: number;
  onPrev: () => void;
  onNext: () => void;
  onJump: (i: number) => void;
  answered: Record<number, boolean>;
  labels?: Array<number | string>;
};

export default function QuestionNav({
  total,
  current,
  onPrev,
  onNext,
  onJump,
  answered,
  labels,
}: Props) {
  const nums = Array.from({ length: total }, (_, i) => i);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-10 gap-2">
        {nums.map((i) => {
          const isCurrent = i === current;
          const done = !!answered[i];
          const label = labels?.[i] ?? i + 1;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onJump(i)}
              className={[
                'h-9 rounded-md border text-sm',
                isCurrent ? 'border-blue-500 ring-1 ring-blue-400' : 'border-gray-300',
                done ? 'bg-green-50' : 'bg-white',
              ].join(' ')}
              aria-current={isCurrent ? 'page' : undefined}
              title={`Q${label}${done ? ' (answered)' : ''}`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <button className="px-3 py-2 rounded-md border" onClick={onPrev} disabled={current <= 0}>
          Prev
        </button>
        <button className="px-3 py-2 rounded-md border" onClick={onNext} disabled={current >= total - 1}>
          Next
        </button>
      </div>
    </div>
  );
}





