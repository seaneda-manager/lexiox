'use client';

type Choice = { id: string; label?: string; text?: string };
type Question = { id: string; number?: number; stem?: string; choices: Choice[] };

export default function QuestionPane({
  questions = [],
  answers = {},
  onChange,
  disabled,
}: {
  questions: Question[];
  answers: Record<string, string>;
  onChange: (qid: string, cid: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-2xl border p-4 space-y-4">
      <p className="text-sm text-gray-500">
        QuestionPane placeholder ??component under construction
      </p>

      {questions.length === 0 ? (
        <div className="text-sm text-gray-400">No questions.</div>
      ) : (
        questions.map((q, qi) => (
          <div key={q.id} className="rounded-lg border p-3 space-y-2">
            <div className="text-sm text-gray-600">
              Q{q.number ?? qi + 1}
            </div>
            {q.stem && <div className="font-medium">{q.stem}</div>}

            <div className="space-y-2">
              {q.choices?.length ? (
                q.choices.map((c, ci) => {
                  const cid = c.id;
                  const inputId = `q-${q.id}-c-${cid}`;
                  const label = c.text ?? c.label ?? `Choice ${String.fromCharCode(65 + ci)}`;
                  return (
                    <label
                      key={cid}
                      htmlFor={inputId}
                      className="flex items-start gap-2 cursor-pointer"
                    >
                      <input
                        id={inputId}
                        type="radio"
                        name={`q-${q.id}`}
                        className="mt-1"
                        checked={answers[q.id] === cid}
                        onChange={() => onChange(q.id, cid)}
                        disabled={disabled}
                      />
                      <span className="text-sm">{label}</span>
                    </label>
                  );
                })
              ) : (
                <div className="text-sm text-gray-400">No choices.</div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}




