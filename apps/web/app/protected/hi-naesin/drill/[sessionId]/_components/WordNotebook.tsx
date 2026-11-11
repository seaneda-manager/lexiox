'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ── 타입 ─────────────────────────────────────────────────
export type TermKind = 'word' | 'phrase' | 'phrasal_verb' | 'idiom' | 'term';

export type KeyTermItem = {
  term: string;
  surface: string;
  kind: TermKind;
  pos: string;
  meaningKo: string;
  reason?: string;
};

export type SavedWord = {
  term: string;
  key: string;
  lemma?: string | null;
  kind: TermKind;
  pos?: string | null;
  meaningKo?: string | null;
  context?: string | null;
  source: 'highlight' | 'key_term';
  status: 'loading' | 'ready' | 'error';
};

const KIND_META: Record<TermKind, { label: string; badge: string }> = {
  word:         { label: '단어',     badge: 'bg-sky-100 text-sky-700' },
  phrasal_verb: { label: '구동사',   badge: 'bg-violet-100 text-violet-700' },
  idiom:        { label: '관용구',   badge: 'bg-rose-100 text-rose-700' },
  phrase:       { label: '구/표현',  badge: 'bg-emerald-100 text-emerald-700' },
  term:         { label: '전문용어', badge: 'bg-amber-100 text-amber-800' },
};
const KIND_ORDER: TermKind[] = ['word', 'phrasal_verb', 'idiom', 'phrase', 'term'];

export function normKey(t: string) {
  return t
    .normalize('NFKC')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .toLowerCase()
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '')
    .replace(/\s+/g, ' ');
}

// ── 상태 훅 ─────────────────────────────────────────────
export function useWordNotebook(passageId: string) {
  const lsKey = `hn_words_${passageId}`;
  const [words, setWords] = useState<SavedWord[]>([]);
  const [serverOk, setServerOk] = useState<boolean | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wordsRef = useRef<SavedWord[]>([]);
  wordsRef.current = words;

  const flash = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const writeLocal = useCallback((list: SavedWord[]) => {
    try { localStorage.setItem(lsKey, JSON.stringify(list.filter((w) => w.status === 'ready'))); } catch { /* ignore */ }
  }, [lsKey]);

  // 초기 로드: localStorage → 서버
  useEffect(() => {
    let alive = true;
    let local: SavedWord[] = [];
    try { local = JSON.parse(localStorage.getItem(lsKey) ?? '[]') as SavedWord[]; } catch { /* ignore */ }
    if (local.length) setWords(local);
    fetch(`/api/hi-naesin/words?passageId=${passageId}`)
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        setServerOk(!!j.available);
        if (j.available) {
          const fromServer: SavedWord[] = (j.items as Array<Record<string, string | null>>).map((r) => ({
            term: r.term ?? '', key: r.term_key ?? normKey(r.term ?? ''), lemma: r.lemma, kind: (r.kind as TermKind) ?? 'word',
            pos: r.pos, meaningKo: r.meaning_ko, context: r.context_sentence,
            source: r.source === 'key_term' ? 'key_term' : 'highlight', status: 'ready' as const,
          }));
          setWords(fromServer);
        }
      })
      .catch(() => { if (alive) setServerOk(false); });
    return () => { alive = false; };
  }, [passageId, lsKey]);

  const saveRemote = useCallback((w: SavedWord) => {
    fetch('/api/hi-naesin/words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        passageId, term: w.term, lemma: w.lemma, kind: w.kind, pos: w.pos,
        meaningKo: w.meaningKo, context: w.context, source: w.source,
      }),
    }).catch(() => { /* 로컬에는 남아 있음 */ });
  }, [passageId]);

  const update = useCallback((key: string, patch: Partial<SavedWord>) => {
    setWords((prev) => {
      const next = prev.map((w) => (w.key === key ? { ...w, ...patch } : w));
      writeLocal(next);
      return next;
    });
  }, [writeLocal]);

  /** 지문에서 드래그/더블클릭으로 고른 표현 → 목록에 쌓고 뜻·품사 자동 조회 */
  const pick = useCallback(async (term: string, context: string | null) => {
    const key = normKey(term);
    if (!key) return;
    if (wordsRef.current.some((w) => w.key === key)) { flash(`"${term}" 은(는) 이미 단어장에 있어요`); return; }
    const draft: SavedWord = { term, key, kind: term.includes(' ') ? 'phrase' : 'word', context, source: 'highlight', status: 'loading' };
    setWords((prev) => [draft, ...prev]);
    flash(`"${term}" 단어장에 추가 중…`);
    try {
      const r = await fetch('/api/hi-naesin/term-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term, context }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error('lookup');
      const done: SavedWord = { ...draft, lemma: j.lemma, kind: j.kind, pos: j.pos, meaningKo: j.meaningKo, status: 'ready' };
      setWords((prev) => {
        const next = prev.map((w) => (w.key === key ? done : w));
        writeLocal(next);
        return next;
      });
      saveRemote(done);
      flash(`"${term}" · ${j.pos} · ${j.meaningKo}`);
    } catch {
      update(key, { status: 'error' });
      flash(`"${term}" 뜻을 찾지 못했어요`);
    }
  }, [flash, saveRemote, update, writeLocal]);

  const addKeyTerm = useCallback((kt: KeyTermItem) => {
    const key = normKey(kt.term);
    if (wordsRef.current.some((w) => w.key === key)) return;
    const w: SavedWord = {
      term: kt.term, key, lemma: kt.term, kind: kt.kind, pos: kt.pos, meaningKo: kt.meaningKo,
      context: null, source: 'key_term', status: 'ready',
    };
    setWords((prev) => {
      const next = [w, ...prev];
      writeLocal(next);
      return next;
    });
    saveRemote(w);
  }, [saveRemote, writeLocal]);

  const remove = useCallback((key: string) => {
    const target = wordsRef.current.find((w) => w.key === key);
    setWords((prev) => {
      const next = prev.filter((w) => w.key !== key);
      writeLocal(next);
      return next;
    });
    if (target) fetch(`/api/hi-naesin/words?term=${encodeURIComponent(target.term)}`, { method: 'DELETE' }).catch(() => {});
  }, [writeLocal]);

  return { words, serverOk, toast, pick, addKeyTerm, remove };
}

// ── 핵심 어휘 불러오기 ───────────────────────────────────
function useKeyTerms(passageId: string) {
  const [items, setItems] = useState<KeyTermItem[] | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const load = useCallback(() => {
    setState('loading');
    fetch(`/api/hi-naesin/key-terms?passageId=${passageId}`)
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok) throw new Error('x');
        setItems(j.items as KeyTermItem[]);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, [passageId]);
  useEffect(() => { load(); }, [load]);
  return { items, state, reload: load };
}

// ── UI ───────────────────────────────────────────────────
function KindBadge({ kind }: { kind: TermKind }) {
  const m = KIND_META[kind] ?? KIND_META.word;
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${m.badge}`}>{m.label}</span>;
}

export default function WordNotebook({
  passageId,
  notebook,
  hideMeanings,
}: {
  passageId: string;
  notebook: ReturnType<typeof useWordNotebook>;
  /** 단어(뜻 입력) 문제를 푸는 중에는 뜻이 정답이므로 숨긴다 */
  hideMeanings: boolean;
}) {
  const { words, serverOk, toast, addKeyTerm, remove } = notebook;
  const kt = useKeyTerms(passageId);
  const [tab, setTab] = useState<'key' | 'mine'>('key');
  const [filter, setFilter] = useState<TermKind | 'all'>('all');
  const saved = new Set(words.map((w) => w.key));

  const keyItems = (kt.items ?? []).filter((i) => filter === 'all' || i.kind === filter);
  const counts = KIND_ORDER.map((k) => ({ k, n: (kt.items ?? []).filter((i) => i.kind === k).length })).filter((c) => c.n > 0);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex border-b border-neutral-200 text-sm">
        <button
          type="button"
          onClick={() => setTab('key')}
          className={`flex-1 px-4 py-3 font-semibold ${tab === 'key' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-50'}`}
        >
          핵심 어휘 {kt.items ? <span className="opacity-60">({kt.items.length})</span> : null}
        </button>
        <button
          type="button"
          onClick={() => setTab('mine')}
          className={`flex-1 px-4 py-3 font-semibold ${tab === 'mine' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-50'}`}
        >
          내 단어장 <span className="opacity-60">({words.length})</span>
        </button>
      </div>

      {toast && (
        <div className="pointer-events-none absolute inset-x-3 top-14 z-10 rounded-lg bg-neutral-900/90 px-3 py-2 text-center text-xs text-white shadow-lg">
          {toast}
        </div>
      )}

      <div className="max-h-[420px] overflow-y-auto p-4">
        {tab === 'key' && (
          <>
            <p className="mb-3 text-[11px] leading-relaxed text-neutral-500">
              지문에서 <b>시험 빈출·주제 핵심·고난도</b> 기준으로 자동 선별했어요. 단어 · 구동사 · 관용구 · 구/표현 · 전문용어로 나눠 보여줘요.
            </p>
            {hideMeanings && (
              <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700">단어 문제를 푸는 동안엔 뜻이 가려져요.</p>
            )}
            {kt.state === 'loading' && (
              <div className="space-y-2" aria-busy="true">
                {[0, 1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-neutral-100" />)}
                <p className="text-center text-[11px] text-neutral-400">핵심 어휘를 뽑는 중… (처음 한 번만 몇 초 걸려요)</p>
              </div>
            )}
            {kt.state === 'error' && (
              <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-center text-xs text-red-600">
                핵심 어휘를 불러오지 못했어요.{' '}
                <button type="button" onClick={kt.reload} className="font-semibold underline">다시 시도</button>
              </div>
            )}
            {kt.state === 'ready' && (
              <>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => setFilter('all')}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${filter === 'all' ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 text-neutral-600'}`}>
                    전체 {kt.items?.length ?? 0}
                  </button>
                  {counts.map(({ k, n }) => (
                    <button key={k} type="button" onClick={() => setFilter(k)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${filter === k ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 text-neutral-600'}`}>
                      {KIND_META[k].label} {n}
                    </button>
                  ))}
                </div>
                {keyItems.length === 0 && <p className="py-6 text-center text-xs text-neutral-400">해당 유형의 항목이 없어요.</p>}
                <ul className="space-y-2">
                  {keyItems.map((it) => {
                    const has = saved.has(normKey(it.term));
                    return (
                      <li key={it.term} className="flex items-start gap-3 rounded-xl border border-neutral-100 px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-bold text-neutral-900">{it.term}</span>
                            <KindBadge kind={it.kind} />
                            {it.pos && it.pos !== 'phrase' && it.pos !== '-' && (
                              <span className="text-[10px] text-neutral-400">{it.pos}</span>
                            )}
                          </div>
                          <div className="mt-0.5 text-xs text-neutral-700">
                            {hideMeanings ? <span className="tracking-widest text-neutral-300">••••••</span> : it.meaningKo}
                          </div>
                          {it.surface.toLowerCase() !== it.term.toLowerCase() && (
                            <div className="mt-0.5 text-[10px] text-neutral-400">지문: {it.surface}</div>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={has}
                          onClick={() => addKeyTerm(it)}
                          className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold ${has ? 'bg-emerald-50 text-emerald-600' : 'border border-neutral-300 text-neutral-600 hover:bg-neutral-50'}`}
                        >
                          {has ? '✓ 담김' : '+ 담기'}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </>
        )}

        {tab === 'mine' && (
          <>
            {serverOk === false && (
              <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                지금은 이 기기에만 저장돼요. (서버 저장 준비 중)
              </p>
            )}
            {words.length === 0 ? (
              <p className="py-8 text-center text-xs leading-relaxed text-neutral-400">
                아직 담은 단어가 없어요.<br />지문에서 모르는 단어를 <b>드래그</b>하면 여기에 쌓여요.
              </p>
            ) : (
              <ul className="space-y-2">
                {words.map((w) => (
                  <li key={w.key} className="rounded-xl border border-neutral-100 px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-bold text-neutral-900">{w.term}</span>
                          <KindBadge kind={w.kind} />
                          {w.pos && w.pos !== '-' && <span className="text-[10px] text-neutral-400">{w.pos}</span>}
                        </div>
                        <div className="mt-0.5 text-xs text-neutral-700">
                          {w.status === 'loading' && <span className="text-neutral-400">뜻 찾는 중…</span>}
                          {w.status === 'error' && <span className="text-red-500">뜻을 찾지 못했어요</span>}
                          {w.status === 'ready' && (hideMeanings ? '••••••' : w.meaningKo)}
                        </div>
                        {w.context && <div className="mt-1 line-clamp-2 text-[10px] italic text-neutral-400">“{w.context}”</div>}
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(w.key)}
                        aria-label={`${w.term} 삭제`}
                        className="shrink-0 rounded-md px-1.5 py-0.5 text-sm text-neutral-300 hover:bg-neutral-100 hover:text-neutral-600"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
