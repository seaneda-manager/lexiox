'use client';

import { useState, useTransition } from 'react';
import type { DeepCheckInput } from '../../actions';

const SKILL_OPTIONS: { value: string; label: string }[] = [
  { value: 'reading', label: '📖 리딩' },
  { value: 'listening', label: '🎧 리스닝' },
  { value: 'speaking', label: '🎤 스피킹' },
  { value: 'writing', label: '✍️ 라이팅' },
  { value: 'grammar', label: '📚 문법' },
  { value: 'vocab', label: '🔤 어휘' },
];

function ChipInputList({
  label,
  hint,
  items,
  setItems,
  suggestions,
}: {
  label: string;
  hint?: string;
  items: string[];
  setItems: (items: string[]) => void;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState('');

  const addItem = (value: string) => {
    const v = value.trim();
    if (!v || items.includes(v)) return;
    setItems([...items, v]);
  };

  return (
    <div className="space-y-2">
      <div>
        <label className="text-xs font-semibold text-neutral-600">{label}</label>
        {hint && <p className="text-[11px] text-neutral-400">{hint}</p>}
      </div>

      {suggestions && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions
            .filter((s) => !items.includes(s))
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => addItem(s)}
                className="rounded-full border border-dashed border-neutral-300 px-2.5 py-1 text-[11px] text-neutral-500 hover:border-neutral-500 hover:text-neutral-800"
              >
                + {s}
              </button>
            ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 rounded-full bg-neutral-900 px-2.5 py-1 text-[11px] font-medium text-white"
            >
              {item}
              <button
                type="button"
                onClick={() => setItems(items.filter((i) => i !== item))}
                className="text-neutral-300 hover:text-white"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addItem(draft);
              setDraft('');
            }
          }}
          placeholder="직접 입력하고 Enter"
          className="flex-1 rounded-xl border border-neutral-200 px-4 py-2 text-sm outline-none focus:border-neutral-400"
        />
        <button
          type="button"
          onClick={() => { addItem(draft); setDraft(''); }}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-500 hover:bg-neutral-50"
        >
          추가
        </button>
      </div>
    </div>
  );
}

export default function DeepCheckForm({
  initial,
  suggestedWeaknesses,
  suggestedStrengths,
  action,
  submitLabel,
}: {
  initial?: Partial<DeepCheckInput>;
  suggestedWeaknesses: string[];
  suggestedStrengths: string[];
  action: (input: DeepCheckInput) => Promise<{ error: string } | { ok: true } | void>;
  submitLabel: string;
}) {
  const [coreConcepts, setCoreConcepts] = useState<string[]>(initial?.coreConcepts ?? []);
  const [weaknesses, setWeaknesses] = useState<string[]>(initial?.weaknesses ?? []);
  const [strengths, setStrengths] = useState<string[]>(initial?.strengths ?? []);
  const [englishExplanation, setEnglishExplanation] = useState(initial?.englishExplanation ?? '');
  const [skillsCovered, setSkillsCovered] = useState<string[]>(initial?.skillsCovered ?? []);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const toggleSkill = (v: string) =>
    setSkillsCovered((prev) => (prev.includes(v) ? prev.filter((s) => s !== v) : [...prev, v]));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await action({ coreConcepts, weaknesses, strengths, englishExplanation, skillsCovered });
      if (result && 'error' in result) setError(result.error);
    });
  };

  const grammarOnly =
    skillsCovered.length > 0 && skillsCovered.every((s) => s === 'grammar' || s === 'vocab');

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4">
        <ChipInputList
          label="🎯 중심 개념"
          hint="이번에 배운 핵심 내용을 정리해 보세요"
          items={coreConcepts}
          setItems={setCoreConcepts}
        />
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4">
        <ChipInputList
          label="🔴 약점"
          hint={suggestedWeaknesses.length > 0 ? '최근 정답률이 낮았던 항목을 자동으로 골라봤어요 — 눌러서 추가' : undefined}
          items={weaknesses}
          setItems={setWeaknesses}
          suggestions={suggestedWeaknesses}
        />
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4">
        <ChipInputList
          label="🟢 강점 (선생님께 자랑하기)"
          hint={suggestedStrengths.length > 0 ? '잘하고 있는 항목이에요 — 눌러서 추가' : undefined}
          items={strengths}
          setItems={setStrengths}
          suggestions={suggestedStrengths}
        />
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-2">
        <label className="text-xs font-semibold text-neutral-600">🗣️ 영어로 설명해보기</label>
        <p className="text-[11px] text-neutral-400">위 중심 개념 중 하나를 영어로 짧게 설명해 보세요. 세션에서 실제로 말해볼 내용이에요.</p>
        <textarea
          value={englishExplanation}
          onChange={(e) => setEnglishExplanation(e.target.value)}
          rows={4}
          placeholder="e.g. A relative clause is..."
          className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm outline-none focus:border-neutral-400 resize-none"
        />
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-3">
        <label className="text-xs font-semibold text-neutral-600">🧭 이번 세션에서 다룰 영역</label>
        <div className="flex flex-wrap gap-1.5">
          {SKILL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleSkill(opt.value)}
              className={[
                'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                skillsCovered.includes(opt.value)
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-200 text-neutral-600 hover:border-neutral-400',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {grammarOnly && (
          <p className="text-[11px] text-amber-600">
            💡 문법·어휘로만 채워졌어요. 듣기·읽기·말하기 중 하나도 함께 다뤄보면 어떨까요?
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {isPending ? '저장 중…' : submitLabel}
      </button>
    </form>
  );
}
