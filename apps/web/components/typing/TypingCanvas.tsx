// apps/web/components/typing/TypingCanvas.tsx
'use client';

import { useEffect, useRef } from 'react';
import type { RenderChar } from '@/lib/typing/engine';

type Props = {
  chars: RenderChar[];
  translationKo?: string | null;
  showTranslation?: boolean;
  onKey: (key: string) => void;
  autoFocus?: boolean;
};

const STATE_CLASS: Record<RenderChar['state'], string> = {
  pending: 'text-gray-400',
  correct: 'text-emerald-600',
  incorrect: 'text-red-600 bg-red-100',
  current: 'text-gray-800',
};

export default function TypingCanvas({ chars, translationKo, showTranslation, onKey, autoFocus = true }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoFocus) boxRef.current?.focus();
  }, [autoFocus]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      onKey('Backspace');
      return;
    }
    if (e.key.length === 1) {
      e.preventDefault();
      onKey(e.key);
    }
  };

  return (
    <div className="space-y-3">
      {showTranslation && translationKo ? (
        <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-3 text-indigo-900 text-sm font-medium">
          {translationKo}
        </div>
      ) : null}

      <div
        ref={boxRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="min-h-[120px] rounded-xl border-2 border-gray-200 bg-white p-5 font-mono text-xl leading-relaxed tracking-wide focus:outline-none focus:border-orange-400 whitespace-pre-wrap break-words"
      >
        {chars.map((c, i) => (
          <span
            key={i}
            className={`${STATE_CLASS[c.state]} ${c.state === 'current' ? 'border-b-2 border-orange-500 animate-pulse' : ''}`}
          >
            {c.char}
          </span>
        ))}
      </div>

      <p className="text-xs text-gray-500">클릭 후 바로 타이핑하세요 · Backspace로 정정</p>
    </div>
  );
}
