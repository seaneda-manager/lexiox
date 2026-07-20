'use client';

import { useState } from 'react';
import type { GrammarItem, VocabItem, ConnectorItem, BlankItem } from '@/lib/hi-naesin/passage-analyzer';

type AnalysisData = {
  grammar_items: GrammarItem[];
  vocab_items: VocabItem[];
  connector_items: ConnectorItem[];
  blank_items: BlankItem[];
  grammar_locked: boolean;
  vocab_locked: boolean;
  connector_locked: boolean;
  blank_locked: boolean;
};

type Props = {
  passageText: string;
  passageTitle: string;
  analysis: AnalysisData;
};

type Tab = 'grammar' | 'vocab' | 'connector' | 'blank';

const TAB_CONFIG: { key: Tab; label: string; lockedKey: keyof AnalysisData }[] = [
  { key: 'grammar',   label: '문법 요소', lockedKey: 'grammar_locked' },
  { key: 'vocab',     label: '단어',      lockedKey: 'vocab_locked' },
  { key: 'connector', label: '연결어',    lockedKey: 'connector_locked' },
  { key: 'blank',     label: '빈칸추론',  lockedKey: 'blank_locked' },
];

export default function StudentAnalyzeClient({ passageText, passageTitle, analysis }: Props) {
  const availableTabs = TAB_CONFIG.filter((t) => analysis[t.lockedKey]);
  const [tab, setTab] = useState<Tab>(availableTabs[0]?.key ?? 'grammar');
  const [highlighted, setHighlighted] = useState<string | null>(null);

  function highlightPassage(text: string) {
    if (!text) return passageText;
    const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = passageText.split(new RegExp(`(${escaped})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === text.toLowerCase()
        ? <mark key={i} className="rounded bg-amber-200 px-0.5">{part}</mark>
        : part
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Left: Passage */}
      <div className="w-[45%] overflow-y-auto border-r bg-white p-6">
        <h2 className="mb-4 text-base font-bold text-neutral-800">{passageTitle}</h2>
        <p className="whitespace-pre-wrap text-sm leading-7 text-neutral-700">
          {highlighted ? highlightPassage(highlighted) : passageText}
        </p>
      </div>

      {/* Right: Analysis */}
      <div className="flex w-[55%] flex-col overflow-hidden bg-neutral-50">
        {/* Tabs */}
        <div className="flex gap-2 border-b bg-white px-6 py-3">
          {availableTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setHighlighted(null); }}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-500 hover:bg-neutral-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'grammar' && (
            <div className="space-y-4">
              {analysis.grammar_items.map((item, i) => (
                <div
                  key={i}
                  className="cursor-pointer rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                  onMouseEnter={() => setHighlighted(item.highlight)}
                  onMouseLeave={() => setHighlighted(null)}
                >
                  <span className="mb-2 inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                    {item.label}
                  </span>
                  <p className="mb-2 rounded bg-neutral-50 px-3 py-1.5 font-mono text-sm text-neutral-700">
                    "{item.highlight}"
                  </p>
                  <p className="text-sm leading-relaxed text-neutral-600">{item.explanation}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'vocab' && (
            <div className="space-y-3">
              {analysis.vocab_items.map((item, i) => (
                <div
                  key={i}
                  className="cursor-pointer rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                  onMouseEnter={() => setHighlighted(item.word)}
                  onMouseLeave={() => setHighlighted(null)}
                >
                  <div className="flex gap-4">
                    <div className="min-w-[100px]">
                      <p className="font-semibold text-neutral-900">{item.word}</p>
                      <p className="text-xs text-neutral-400">{item.pos}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-indigo-700">{item.meaning}</p>
                      <p className="mt-1 text-sm leading-relaxed text-neutral-600">{item.explanation}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'connector' && (
            <div className="space-y-4">
              {analysis.connector_items.map((item, i) => (
                <div
                  key={i}
                  className="cursor-pointer rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                  onMouseEnter={() => setHighlighted(item.highlight)}
                  onMouseLeave={() => setHighlighted(null)}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="font-mono font-semibold text-neutral-900">"{item.highlight}"</span>
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-700">{item.type}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-neutral-600">{item.reason}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'blank' && (
            <div className="space-y-4">
              {analysis.blank_items.map((item, i) => (
                <div
                  key={i}
                  className="cursor-pointer rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                  onMouseEnter={() => setHighlighted(item.highlight)}
                  onMouseLeave={() => setHighlighted(null)}
                >
                  <p className="mb-2 rounded-md bg-amber-50 px-3 py-1.5 font-mono text-sm text-amber-800">
                    "{item.highlight}"
                  </p>
                  <p className="text-sm text-neutral-600">
                    <span className="font-medium text-neutral-800">왜 빈칸? </span>{item.why}
                  </p>
                  <p className="mt-1 text-sm text-neutral-600">
                    <span className="font-medium text-neutral-800">풀이 힌트: </span>{item.hint}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
