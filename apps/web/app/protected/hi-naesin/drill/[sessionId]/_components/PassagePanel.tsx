'use client';

import { useState } from 'react';
import Link from 'next/link';

type Props = {
  passageText: string;
  passageTranslation: string | null;
  highlightText: string | null;
  highlightType: 'sentence' | 'word' | null;
};

function HighlightedText({
  text,
  highlight,
  type,
}: {
  text: string;
  highlight: string | null;
  type: 'sentence' | 'word' | null;
}) {
  if (!highlight || !type) return <span className="whitespace-pre-wrap">{text}</span>;

  // Use first 40 chars of highlight for matching (handles fill_blank ____ case)
  const matchStr = highlight.replace(/_{3,}/g, '').trim().slice(0, 40).toLowerCase();
  if (!matchStr) return <span className="whitespace-pre-wrap">{text}</span>;

  if (type === 'word') {
    // Highlight all occurrences of the word (case-insensitive, whole word)
    const regex = new RegExp(`(${matchStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
      <span className="whitespace-pre-wrap">
        {parts.map((part, i) =>
          part.toLowerCase() === matchStr ? (
            <mark key={i} className="rounded bg-amber-200 px-0.5 text-amber-900 not-italic">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  }

  // sentence: highlight the first matching substring
  const idx = text.toLowerCase().indexOf(matchStr);
  if (idx === -1) return <span className="whitespace-pre-wrap">{text}</span>;

  // Expand to nearest sentence boundary
  const sentStart = Math.max(0, text.lastIndexOf('.', idx - 1) + 1);
  const sentEndRaw = text.indexOf('.', idx + matchStr.length);
  const sentEnd = sentEndRaw === -1 ? text.length : sentEndRaw + 1;

  return (
    <span className="whitespace-pre-wrap">
      <span>{text.slice(0, sentStart)}</span>
      <mark className="rounded bg-sky-100 px-0.5 text-sky-900 not-italic">
        {text.slice(sentStart, sentEnd)}
      </mark>
      <span>{text.slice(sentEnd)}</span>
    </span>
  );
}

export default function PassagePanel({ passageText, passageTranslation, highlightText, highlightType }: Props) {
  const [showTranslation, setShowTranslation] = useState(false);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border bg-white p-6">
      {passageTranslation && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowTranslation((v) => !v)}
            className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            {showTranslation ? '번역 숨기기' : '번역 보기'}
          </button>
        </div>
      )}

      <div className="text-sm leading-8 text-neutral-800">
        <HighlightedText text={passageText} highlight={highlightText} type={highlightType} />
      </div>

      {showTranslation && passageTranslation && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-relaxed text-blue-800">
          {passageTranslation}
        </div>
      )}
    </div>
  );
}
