'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import {
  generateAnalysisAction,
  saveAnalysisSectionAction,
  toggleLockAction,
} from '../actions';
import type {
  GrammarItem, VocabItem, ConnectorItem, BlankItem,
} from '@/lib/hi-naesin/passage-analyzer';

type AnalysisRow = {
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
  passageId: string;
  passageText: string;
  passageTitle: string;
  initial: AnalysisRow | null;
};

type Tab = 'grammar' | 'vocab' | 'connector' | 'blank';

const TAB_LABELS: Record<Tab, string> = {
  grammar: '문법 요소',
  vocab: '단어',
  connector: '연결어',
  blank: '빈칸추론',
};

function HighlightedPassage({ text, highlight }: { text: string; highlight: string | null }) {
  if (!highlight) return <span className="whitespace-pre-wrap">{text}</span>;
  const escaped = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase()
          ? <mark key={i} className="rounded bg-amber-200 px-0.5">{part}</mark>
          : part
      )}
    </span>
  );
}

export default function AnalyzeClient({ passageId, passageText, passageTitle, initial }: Props) {
  const [tab, setTab] = useState<Tab>('grammar');
  const [data, setData] = useState<AnalysisRow | null>(initial);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState('');
  const [highlighted, setHighlighted] = useState<string | null>(null);

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000); }

  function handleGenerate() {
    startTransition(async () => {
      const res = await generateAnalysisAction(passageId, passageText);
      if ('error' in res) { flash(res.error); return; }
      // reload by re-fetching — simplest: just reload page
      window.location.reload();
    });
  }

  function handleToggleLock(section: Tab) {
    if (!data) return;
    const lockedKey = `${section}_locked` as keyof AnalysisRow;
    const current = data[lockedKey] as boolean;
    startTransition(async () => {
      const res = await toggleLockAction(passageId, section, !current);
      if ('error' in res) { flash(res.error); return; }
      setData({ ...data, [lockedKey]: !current });
      flash(!current ? '🔒 잠금 완료' : '🔓 잠금 해제');
    });
  }

  const locked = data ? (data[`${tab}_locked` as keyof AnalysisRow] as boolean) : false;

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Left: Passage */}
      <div className="w-[45%] overflow-y-auto border-r bg-white p-6">
        <h2 className="mb-4 text-base font-bold text-neutral-800">{passageTitle}</h2>
        <p className="text-sm leading-7 text-neutral-700">
          <HighlightedPassage text={passageText} highlight={highlighted} />
        </p>
      </div>

      {/* Right: Analysis */}
      <div className="flex w-[55%] flex-col overflow-hidden bg-neutral-50">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b bg-white px-6 py-3">
          <div className="flex items-center gap-3">
            <Link
              href={`/admin/hi-naesin/passages/${passageId}/edit`}
              className="rounded-lg border px-3 py-1.5 text-sm text-neutral-500 hover:bg-neutral-50"
            >
              ← 편집으로
            </Link>
          <div className="flex gap-2">
            {(Object.keys(TAB_LABELS) as Tab[]).map((t) => {
              const lk = `${t}_locked` as keyof AnalysisRow;
              const isLocked = data ? (data[lk] as boolean) : false;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                    tab === t
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-500 hover:bg-neutral-100'
                  }`}
                >
                  {TAB_LABELS[t]}
                  {isLocked && <span className="ml-1 text-xs">🔒</span>}
                </button>
              );
            })}
          </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isPending}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isPending ? '생성 중…' : data ? 'AI 재생성' : 'AI 분석 생성'}
          </button>
        </div>

        {/* Flash message */}
        {msg && (
          <div className="border-b bg-emerald-50 px-6 py-2 text-sm text-emerald-700">{msg}</div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!data ? (
            <div className="flex h-full items-center justify-center text-sm text-neutral-400">
              AI 분석 생성 버튼을 눌러 시작하세요.
            </div>
          ) : (
            <>
              {tab === 'grammar' && (
                <GrammarSection
                  items={data.grammar_items}
                  locked={locked}
                  passageId={passageId}
                  onHighlight={setHighlighted}
                  onChange={(items) => setData({ ...data, grammar_items: items })}
                  onSave={(items) => {
                    startTransition(async () => {
                      const res = await saveAnalysisSectionAction(passageId, 'grammar', items);
                      if ('error' in res) flash(res.error); else flash('저장됨');
                    });
                  }}
                />
              )}
              {tab === 'vocab' && (
                <VocabSection
                  items={data.vocab_items}
                  locked={locked}
                  passageId={passageId}
                  onHighlight={setHighlighted}
                  onChange={(items) => setData({ ...data, vocab_items: items })}
                  onSave={(items) => {
                    startTransition(async () => {
                      const res = await saveAnalysisSectionAction(passageId, 'vocab', items);
                      if ('error' in res) flash(res.error); else flash('저장됨');
                    });
                  }}
                />
              )}
              {tab === 'connector' && (
                <ConnectorSection
                  items={data.connector_items}
                  locked={locked}
                  onHighlight={setHighlighted}
                  onChange={(items) => setData({ ...data, connector_items: items })}
                  onSave={(items) => {
                    startTransition(async () => {
                      const res = await saveAnalysisSectionAction(passageId, 'connector', items);
                      if ('error' in res) flash(res.error); else flash('저장됨');
                    });
                  }}
                />
              )}
              {tab === 'blank' && (
                <BlankSection
                  items={data.blank_items}
                  locked={locked}
                  onHighlight={setHighlighted}
                  onChange={(items) => setData({ ...data, blank_items: items })}
                  onSave={(items) => {
                    startTransition(async () => {
                      const res = await saveAnalysisSectionAction(passageId, 'blank', items);
                      if ('error' in res) flash(res.error); else flash('저장됨');
                    });
                  }}
                />
              )}

              {/* Lock button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => handleToggleLock(tab)}
                  disabled={isPending}
                  className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                    locked
                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {locked ? '🔓 잠금 해제 (학생에게 숨김)' : '🔒 잠금 (학생에게 공개)'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Grammar Section ────────────────────────────────────────────────
function GrammarSection({
  items, locked, onChange, onSave, onHighlight,
}: {
  items: GrammarItem[];
  locked: boolean;
  passageId: string;
  onChange: (items: GrammarItem[]) => void;
  onSave: (items: GrammarItem[]) => void;
  onHighlight: (text: string | null) => void;
}) {
  function update(i: number, field: keyof GrammarItem, val: string) {
    const next = items.map((it, idx) => idx === i ? { ...it, [field]: val } : it);
    onChange(next);
  }
  function remove(i: number) { onChange(items.filter((_, idx) => idx !== i)); }

  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div
          key={i}
          className="cursor-pointer rounded-xl border bg-white p-4 shadow-sm hover:border-indigo-300 hover:shadow-md transition-shadow"
          onMouseEnter={() => onHighlight(item.highlight)}
          onMouseLeave={() => onHighlight(null)}
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
              {item.label}
            </span>
            {!locked && (
              <button onClick={() => remove(i)} className="text-xs text-red-400 hover:text-red-600">삭제</button>
            )}
          </div>
          {locked ? (
            <>
              <p className="mb-1 rounded bg-neutral-50 px-3 py-2 font-mono text-sm text-neutral-700">"{item.highlight}"</p>
              <p className="text-sm text-neutral-600">{item.explanation}</p>
            </>
          ) : (
            <>
              <input
                className="mb-2 w-full rounded-lg border px-3 py-1.5 font-mono text-sm"
                value={item.highlight}
                onChange={(e) => update(i, 'highlight', e.target.value)}
                placeholder="지문 원문 구절"
              />
              <input
                className="mb-2 w-full rounded-lg border px-3 py-1.5 text-sm"
                value={item.label}
                onChange={(e) => update(i, 'label', e.target.value)}
                placeholder="문법 요소 이름"
              />
              <textarea
                className="w-full rounded-lg border px-3 py-1.5 text-sm"
                rows={3}
                value={item.explanation}
                onChange={(e) => update(i, 'explanation', e.target.value)}
                placeholder="설명"
              />
            </>
          )}
        </div>
      ))}
      {!locked && (
        <div className="flex gap-2">
          <button
            onClick={() => onChange([...items, { highlight: '', label: '', explanation: '' }])}
            className="rounded-lg border px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
          >
            + 항목 추가
          </button>
          <button
            onClick={() => onSave(items)}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            저장
          </button>
        </div>
      )}
    </div>
  );
}

// ── Vocab Section ──────────────────────────────────────────────────
function VocabSection({
  items, locked, onChange, onSave, onHighlight,
}: {
  items: VocabItem[];
  locked: boolean;
  passageId: string;
  onChange: (items: VocabItem[]) => void;
  onSave: (items: VocabItem[]) => void;
  onHighlight: (text: string | null) => void;
}) {
  function update(i: number, field: keyof VocabItem, val: string) {
    onChange(items.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
  }
  function remove(i: number) { onChange(items.filter((_, idx) => idx !== i)); }

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div
          key={i}
          className="cursor-pointer rounded-xl border bg-white p-4 shadow-sm hover:border-indigo-300 hover:shadow-md transition-shadow"
          onMouseEnter={() => onHighlight(item.word)}
          onMouseLeave={() => onHighlight(null)}
        >
          {locked ? (
            <div className="flex gap-4">
              <div className="min-w-[100px]">
                <p className="font-semibold text-neutral-900">{item.word}</p>
                <p className="text-xs text-neutral-400">{item.pos}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-indigo-700">{item.meaning}</p>
                <p className="mt-1 text-sm text-neutral-600">{item.explanation}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input className="w-32 rounded-lg border px-3 py-1.5 font-semibold text-sm" value={item.word} onChange={(e) => update(i, 'word', e.target.value)} placeholder="단어" />
                <input className="w-24 rounded-lg border px-3 py-1.5 text-sm" value={item.pos} onChange={(e) => update(i, 'pos', e.target.value)} placeholder="품사" />
                <input className="flex-1 rounded-lg border px-3 py-1.5 text-sm" value={item.meaning} onChange={(e) => update(i, 'meaning', e.target.value)} placeholder="뜻" />
                <button onClick={() => remove(i)} className="text-xs text-red-400 hover:text-red-600">삭제</button>
              </div>
              <textarea className="w-full rounded-lg border px-3 py-1.5 text-sm" rows={2} value={item.explanation} onChange={(e) => update(i, 'explanation', e.target.value)} placeholder="문맥 설명" />
            </div>
          )}
        </div>
      ))}
      {!locked && (
        <div className="flex gap-2">
          <button
            onClick={() => onChange([...items, { word: '', pos: '', meaning: '', explanation: '' }])}
            className="rounded-lg border px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
          >
            + 항목 추가
          </button>
          <button onClick={() => onSave(items)} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800">저장</button>
        </div>
      )}
    </div>
  );
}

// ── Connector Section ──────────────────────────────────────────────
function ConnectorSection({
  items, locked, onChange, onSave, onHighlight,
}: {
  items: ConnectorItem[];
  locked: boolean;
  onChange: (items: ConnectorItem[]) => void;
  onSave: (items: ConnectorItem[]) => void;
  onHighlight: (text: string | null) => void;
}) {
  function update(i: number, field: keyof ConnectorItem, val: string) {
    onChange(items.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
  }
  function remove(i: number) { onChange(items.filter((_, idx) => idx !== i)); }

  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div
          key={i}
          className="cursor-pointer rounded-xl border bg-white p-4 shadow-sm hover:border-sky-300 hover:shadow-md transition-shadow"
          onMouseEnter={() => onHighlight(item.highlight)}
          onMouseLeave={() => onHighlight(null)}
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold text-neutral-900">"{item.highlight}"</span>
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-700">{item.type}</span>
            </div>
            {!locked && <button onClick={() => remove(i)} className="text-xs text-red-400 hover:text-red-600">삭제</button>}
          </div>
          {locked ? (
            <p className="text-sm text-neutral-600">{item.reason}</p>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input className="flex-1 rounded-lg border px-3 py-1.5 font-mono text-sm" value={item.highlight} onChange={(e) => update(i, 'highlight', e.target.value)} placeholder="연결어 원문" />
                <input className="w-28 rounded-lg border px-3 py-1.5 text-sm" value={item.type} onChange={(e) => update(i, 'type', e.target.value)} placeholder="유형" />
              </div>
              <textarea className="w-full rounded-lg border px-3 py-1.5 text-sm" rows={3} value={item.reason} onChange={(e) => update(i, 'reason', e.target.value)} placeholder="왜 이 연결어인지 설명" />
            </div>
          )}
        </div>
      ))}
      {!locked && (
        <div className="flex gap-2">
          <button onClick={() => onChange([...items, { highlight: '', type: '', reason: '' }])} className="rounded-lg border px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50">+ 항목 추가</button>
          <button onClick={() => onSave(items)} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800">저장</button>
        </div>
      )}
    </div>
  );
}

// ── Blank Section ──────────────────────────────────────────────────
function BlankSection({
  items, locked, onChange, onSave, onHighlight,
}: {
  items: BlankItem[];
  locked: boolean;
  onChange: (items: BlankItem[]) => void;
  onSave: (items: BlankItem[]) => void;
  onHighlight: (text: string | null) => void;
}) {
  function update(i: number, field: keyof BlankItem, val: string) {
    onChange(items.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
  }
  function remove(i: number) { onChange(items.filter((_, idx) => idx !== i)); }

  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div
          key={i}
          className="cursor-pointer rounded-xl border bg-white p-4 shadow-sm hover:border-amber-300 hover:shadow-md transition-shadow"
          onMouseEnter={() => onHighlight(item.highlight)}
          onMouseLeave={() => onHighlight(null)}
        >
          <div className="mb-2 flex items-start justify-between">
            <span className="rounded-md bg-amber-50 px-2 py-1 font-mono text-sm text-amber-800">"{item.highlight}"</span>
            {!locked && <button onClick={() => remove(i)} className="text-xs text-red-400 hover:text-red-600">삭제</button>}
          </div>
          {locked ? (
            <>
              <p className="text-sm text-neutral-600"><span className="font-medium text-neutral-800">왜:</span> {item.why}</p>
              <p className="mt-1 text-sm text-neutral-600"><span className="font-medium text-neutral-800">힌트:</span> {item.hint}</p>
            </>
          ) : (
            <div className="space-y-2">
              <input className="w-full rounded-lg border px-3 py-1.5 font-mono text-sm" value={item.highlight} onChange={(e) => update(i, 'highlight', e.target.value)} placeholder="빈칸이 될 구절" />
              <textarea className="w-full rounded-lg border px-3 py-1.5 text-sm" rows={2} value={item.why} onChange={(e) => update(i, 'why', e.target.value)} placeholder="왜 빈칸추론 포인트인지" />
              <textarea className="w-full rounded-lg border px-3 py-1.5 text-sm" rows={2} value={item.hint} onChange={(e) => update(i, 'hint', e.target.value)} placeholder="풀이 힌트" />
            </div>
          )}
        </div>
      ))}
      {!locked && (
        <div className="flex gap-2">
          <button onClick={() => onChange([...items, { highlight: '', why: '', hint: '' }])} className="rounded-lg border px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50">+ 항목 추가</button>
          <button onClick={() => onSave(items)} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800">저장</button>
        </div>
      )}
    </div>
  );
}
