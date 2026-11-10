'use client';

import React, { useMemo } from 'react';

type Props = {
  target: string;
  value: string;
  onChange: (next: string) => void;
};

/** 섞인 글자 타일: 눌러서 입력. 타이핑한 글자만큼 타일도 함께 사용 처리된다. */
export default function LetterTiles({ target, value, onChange }: Props) {
  const tiles = useMemo(() => {
    const letters = target.toLowerCase().split('').filter((c) => /[a-z]/.test(c));
    const shuffled = [...letters];
    for (let attempt = 0; attempt < 5; attempt++) {
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      if (shuffled.join('') !== letters.join('') || letters.length < 2) break;
    }
    return shuffled.map((ch, id) => ({ id, ch }));
  }, [target]);

  const usedIds = useMemo(() => {
    const used = new Set<number>();
    for (const c of value.toLowerCase()) {
      const t = tiles.find((x) => x.ch === c && !used.has(x.id));
      if (t) used.add(t.id);
    }
    return used;
  }, [value, tiles]);

  const press = (ch: string) => {
    let base = value;
    while (base.length < target.length && !/[a-zA-Z]/.test(target[base.length])) base += target[base.length];
    onChange(base + ch);
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {tiles.map((t) => (
        <button
          key={t.id}
          type="button"
          disabled={usedIds.has(t.id)}
          onClick={() => press(t.ch)}
          className="h-12 w-12 rounded-xl border-2 border-slate-300 bg-white text-2xl font-bold text-slate-800 hover:bg-blue-50 disabled:opacity-25"
        >
          {t.ch}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange(value.slice(0, -1))}
        className="h-12 rounded-xl border-2 border-slate-300 bg-slate-100 px-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
      >
        ⌫ 지우기
      </button>
    </div>
  );
}
