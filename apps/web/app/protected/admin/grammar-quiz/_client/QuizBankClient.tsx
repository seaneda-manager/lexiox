"use client";

import { useMemo, useState } from "react";
import {
  GRAMMAR_TRACKS,
  GRAMMAR_TRACK_LABEL,
  QUIZ_ITEM_TYPES,
  QUIZ_ITEM_TYPE_LABEL,
} from "@/models/grammar/quiz";
import type { GrammarElement, GrammarQuizItem, GrammarTrack, QuizItemType } from "@/models/grammar/quiz";

type Props = {
  initialElements: GrammarElement[];
  initialItems: GrammarQuizItem[];
  trackCounts: Record<string, number>;
  loadError: string | null;
  needsSeed: boolean;
};

type Tab = "pool" | "import" | "generate";

export default function QuizBankClient({ initialElements, initialItems, trackCounts, loadError, needsSeed }: Props) {
  const [tab, setTab] = useState<Tab>("pool");
  const [elements, setElements] = useState<GrammarElement[]>(initialElements);
  const [items, setItems] = useState<GrammarQuizItem[]>(initialItems);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const elByCode = useMemo(() => new Map(elements.map((e) => [e.code, e])), [elements]);
  const elementsByCategory = useMemo(() => {
    const m = new Map<string, GrammarElement[]>();
    for (const e of elements) {
      if (!m.has(e.category)) m.set(e.category, []);
      m.get(e.category)!.push(e);
    }
    return [...m.entries()];
  }, [elements]);

  async function seedElements() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/grammar-quiz/elements/seed", { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "실패");
      const list = await fetch("/api/admin/grammar-quiz/elements").then((r) => r.json());
      setElements(list.elements ?? []);
      setMsg(`문법 요소 ${j.seeded}개 시드 완료`);
    } catch (e: any) {
      setMsg(`오류: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function reloadItems(status: "active" | "archived" = "active") {
    const j = await fetch(`/api/admin/grammar-quiz/items?status=${status}&limit=300`).then((r) => r.json());
    setItems(j.items ?? []);
  }

  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 py-6">
      <header>
        <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-[11px] font-medium text-violet-700">
          Admin · 문법 퀴즈 뱅크
        </div>
        <h1 className="mt-2 text-xl font-bold tracking-tight text-gray-900">문법 퀴즈 문항 풀</h1>
        <p className="mt-1 text-xs text-gray-500">
          레벨·문법요소·유형·단어수·어휘수준으로 필터되는 문항 풀. 선생님이 여기서 골라 학생에게 시험으로 배정합니다(Phase 2).
        </p>
      </header>

      {loadError && (
        <div className="rounded-md bg-rose-50 px-3 py-2 text-[11px] text-rose-900">
          <p className="font-semibold">DB 오류</p>
          <p className="mt-0.5">{loadError}</p>
          <p className="mt-1 text-rose-700">마이그레이션 20260902000001_grammar_quiz_bank.sql 적용 여부를 확인하세요.</p>
        </div>
      )}

      {needsSeed && !loadError && (
        <div className="flex items-center justify-between rounded-md bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
          <span>문법 요소 카탈로그가 비어 있습니다. 먼저 시드하세요.</span>
          <button
            onClick={seedElements}
            disabled={busy}
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-amber-700 disabled:opacity-40"
          >
            요소 카탈로그 시드
          </button>
        </div>
      )}

      {msg && <div className="rounded-md bg-gray-50 px-3 py-2 text-[11px] text-gray-700">{msg}</div>}

      {/* 트랙별 카운트 */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {GRAMMAR_TRACKS.map((t) => (
          <div key={t} className="rounded-xl border bg-white p-3 shadow-sm">
            <p className="text-[11px] font-medium text-gray-500">{GRAMMAR_TRACK_LABEL[t]}</p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {items.filter((it) => it.track === t).length || trackCounts[t] || 0}
            </p>
          </div>
        ))}
      </section>

      {/* 탭 */}
      <div className="flex gap-1 border-b">
        {(
          [
            ["pool", "문항 풀"],
            ["import", "가져오기"],
            ["generate", "AI 생성"],
          ] as [Tab, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-3 py-2 text-xs font-semibold transition ${
              tab === k ? "border-b-2 border-violet-600 text-violet-700" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "pool" && (
        <PoolTab items={items} elByCode={elByCode} elements={elements} onReload={reloadItems} setMsg={setMsg} />
      )}
      {tab === "import" && <ImportTab onDone={() => reloadItems()} setMsg={setMsg} />}
      {tab === "generate" && (
        <GenerateTab
          elementsByCategory={elementsByCategory}
          onSaved={() => {
            reloadItems();
            setTab("pool");
          }}
          setMsg={setMsg}
        />
      )}
    </main>
  );
}

/* ─────────────────────────── 문항 풀 ─────────────────────────── */

function PoolTab({
  items,
  elByCode,
  elements,
  onReload,
  setMsg,
}: {
  items: GrammarQuizItem[];
  elByCode: Map<string, GrammarElement>;
  elements: GrammarElement[];
  onReload: (s?: "active" | "archived") => void;
  setMsg: (s: string | null) => void;
}) {
  const [fTrack, setFTrack] = useState<string>("");
  const [fType, setFType] = useState<string>("");
  const [fElement, setFElement] = useState<string>("");
  const [fVocabMax, setFVocabMax] = useState<number>(0);
  const [fWcMin, setFWcMin] = useState<number>(0);
  const [fWcMax, setFWcMax] = useState<number>(0);

  const filtered = items.filter((it) => {
    if (fTrack && it.track !== fTrack) return false;
    if (fType && it.item_type !== fType) return false;
    if (fElement && it.element_code !== fElement) return false;
    if (fVocabMax && it.vocab_level > fVocabMax) return false;
    if (fWcMin && it.word_count < fWcMin) return false;
    if (fWcMax && it.word_count > fWcMax) return false;
    return true;
  });

  async function archive(id: string) {
    const res = await fetch(`/api/admin/grammar-quiz/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived" }),
    });
    if (res.ok) {
      setMsg("문항을 보관 처리했습니다.");
      onReload();
    } else {
      setMsg("보관 실패");
    }
  }

  return (
    <section className="space-y-3">
      {/* 필터 바 */}
      <div className="grid grid-cols-2 gap-2 rounded-xl border bg-white p-3 text-xs sm:grid-cols-3 lg:grid-cols-6">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-gray-400">트랙</span>
          <select value={fTrack} onChange={(e) => setFTrack(e.target.value)} className="rounded border px-2 py-1">
            <option value="">전체</option>
            {GRAMMAR_TRACKS.map((t) => (
              <option key={t} value={t}>
                {GRAMMAR_TRACK_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-gray-400">유형</span>
          <select value={fType} onChange={(e) => setFType(e.target.value)} className="rounded border px-2 py-1">
            <option value="">전체</option>
            {QUIZ_ITEM_TYPES.map((t) => (
              <option key={t} value={t}>
                {QUIZ_ITEM_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-gray-400">문법 요소</span>
          <select value={fElement} onChange={(e) => setFElement(e.target.value)} className="rounded border px-2 py-1">
            <option value="">전체</option>
            {elements.map((e) => (
              <option key={e.code} value={e.code}>
                {e.label_ko}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-gray-400">어휘수준 ≤</span>
          <select value={fVocabMax} onChange={(e) => setFVocabMax(Number(e.target.value))} className="rounded border px-2 py-1">
            <option value={0}>전체</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-gray-400">단어수 ≥</span>
          <input
            type="number"
            min={0}
            value={fWcMin || ""}
            onChange={(e) => setFWcMin(Number(e.target.value))}
            className="rounded border px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-gray-400">단어수 ≤</span>
          <input
            type="number"
            min={0}
            value={fWcMax || ""}
            onChange={(e) => setFWcMax(Number(e.target.value))}
            className="rounded border px-2 py-1"
          />
        </label>
      </div>

      <p className="text-xs text-gray-500">
        조건 매칭 <span className="font-bold text-violet-700">{filtered.length}</span>개 / 전체 {items.length}개
      </p>

      <div className="space-y-2">
        {filtered.map((it) => (
          <div key={it.id} className="rounded-xl border bg-white p-3 text-xs shadow-sm">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <Badge>{GRAMMAR_TRACK_LABEL[it.track as GrammarTrack] ?? it.track}</Badge>
              <Badge>{QUIZ_ITEM_TYPE_LABEL[it.item_type as QuizItemType] ?? it.item_type}</Badge>
              <Badge>{it.element_code ? elByCode.get(it.element_code)?.label_ko ?? it.element_code : "요소 미지정"}</Badge>
              <Badge>단어 {it.word_count}</Badge>
              <Badge>어휘 {it.vocab_level}</Badge>
              <span className="ml-auto text-[10px] text-gray-300">{it.source}</span>
              <button onClick={() => archive(it.id)} className="text-[10px] text-rose-400 hover:text-rose-600">
                보관
              </button>
            </div>
            <p className="font-medium text-gray-900">{it.stem}</p>
            <p className="mt-1 text-gray-500">
              정답: <span className="font-semibold text-green-700">{it.answer}</span>
              {it.item_type === "fill" && it.distractors?.length > 0 && (
                <span className="ml-2 text-gray-400">오답: {it.distractors.join(" / ")}</span>
              )}
            </p>
            {it.explanation && <p className="mt-1 text-[11px] text-gray-400">{it.explanation}</p>}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="rounded-xl border border-dashed bg-white px-4 py-8 text-center text-xs text-gray-400">
            조건에 맞는 문항이 없습니다. [가져오기] 또는 [AI 생성] 탭에서 채우세요.
          </p>
        )}
      </div>
    </section>
  );
}

/* ─────────────────────────── 가져오기 ─────────────────────────── */

function ImportTab({ onDone, setMsg }: { onDone: () => void; setMsg: (s: string | null) => void }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; unmatchedElement: string[] } | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/grammar-quiz/import-drills", { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "실패");
      setResult(j);
      setMsg(`가져오기 완료: ${j.imported}개 추가`);
      onDone();
    } catch (e: any) {
      setMsg(`오류: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border bg-white p-4 text-xs">
      <p className="text-gray-600">
        기존 <code className="rounded bg-gray-100 px-1">grammar_2026_drills</code>의 fill·judgment 드릴을 문항 풀로 가져옵니다.
        이미 가져온 드릴은 건너뜁니다.
      </p>
      <button
        onClick={run}
        disabled={busy}
        className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-40"
      >
        {busy ? "가져오는 중..." : "기존 드릴에서 가져오기"}
      </button>

      {result && (
        <div className="space-y-1 rounded-lg bg-gray-50 p-3">
          <p>추가: <b>{result.imported}</b> · 건너뜀: {result.skipped}</p>
          {result.unmatchedElement.length > 0 && (
            <div>
              <p className="text-amber-700">요소 코드 매칭 실패(요소 미지정으로 저장됨):</p>
              <ul className="ml-4 list-disc text-gray-500">
                {result.unmatchedElement.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* ─────────────────────────── AI 생성 ─────────────────────────── */

function GenerateTab({
  elementsByCategory,
  onSaved,
  setMsg,
}: {
  elementsByCategory: [string, GrammarElement[]][];
  onSaved: () => void;
  setMsg: (s: string | null) => void;
}) {
  const [track, setTrack] = useState<GrammarTrack>("middle");
  const [elementCode, setElementCode] = useState<string>("");
  const [itemType, setItemType] = useState<QuizItemType>("fill");
  const [count, setCount] = useState(5);
  const [wcMin, setWcMin] = useState(6);
  const [wcMax, setWcMax] = useState(14);
  const [vocabLevel, setVocabLevel] = useState(3);
  const [seed, setSeed] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<any[]>([]);

  async function generate() {
    setBusy(true);
    setMsg(null);
    setDraft([]);
    try {
      const res = await fetch("/api/admin/grammar-quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          track,
          element_code: elementCode || null,
          item_type: itemType,
          count,
          word_count_min: wcMin,
          word_count_max: wcMax,
          vocab_level: vocabLevel,
          seed: seed.trim() || undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "생성 실패");
      setDraft(j.items ?? []);
      setMsg(`${j.items?.length ?? 0}개 생성됨 — 검토 후 저장`);
    } catch (e: any) {
      setMsg(`오류: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function saveAll() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/grammar-quiz/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: draft }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "저장 실패");
      setMsg(`${j.saved}개 저장 완료`);
      setDraft([]);
      onSaved();
    } catch (e: any) {
      setMsg(`오류: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 gap-3 rounded-xl border bg-white p-4 text-xs sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-gray-400">트랙</span>
          <select value={track} onChange={(e) => setTrack(e.target.value as GrammarTrack)} className="rounded border px-2 py-1">
            {GRAMMAR_TRACKS.map((t) => (
              <option key={t} value={t}>
                {GRAMMAR_TRACK_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-gray-400">유형</span>
          <select value={itemType} onChange={(e) => setItemType(e.target.value as QuizItemType)} className="rounded border px-2 py-1">
            {QUIZ_ITEM_TYPES.map((t) => (
              <option key={t} value={t}>
                {QUIZ_ITEM_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-gray-400">문항 수</span>
          <input type="number" min={1} max={15} value={count} onChange={(e) => setCount(Number(e.target.value))} className="rounded border px-2 py-1" />
        </label>
        <label className="col-span-2 flex flex-col gap-1 sm:col-span-3">
          <span className="text-[10px] text-gray-400">문법 요소</span>
          <select value={elementCode} onChange={(e) => setElementCode(e.target.value)} className="rounded border px-2 py-1">
            <option value="">(seed로만)</option>
            {elementsByCategory.map(([cat, els]) => (
              <optgroup key={cat} label={cat}>
                {els.map((e) => (
                  <option key={e.code} value={e.code}>
                    {e.label_ko}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-gray-400">단어수 최소</span>
          <input type="number" min={3} value={wcMin} onChange={(e) => setWcMin(Number(e.target.value))} className="rounded border px-2 py-1" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-gray-400">단어수 최대</span>
          <input type="number" min={3} value={wcMax} onChange={(e) => setWcMax(Number(e.target.value))} className="rounded border px-2 py-1" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-gray-400">목표 어휘수준</span>
          <select value={vocabLevel} onChange={(e) => setVocabLevel(Number(e.target.value))} className="rounded border px-2 py-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-2 flex flex-col gap-1 sm:col-span-3">
          <span className="text-[10px] text-gray-400">참고 재료 (선택 — 문장 목록/포인트)</span>
          <textarea value={seed} onChange={(e) => setSeed(e.target.value)} rows={3} className="rounded border px-2 py-1 resize-none" />
        </label>
      </div>

      <button
        onClick={generate}
        disabled={busy}
        className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-40"
      >
        {busy ? "생성 중..." : "🪄 AI 생성"}
      </button>

      {draft.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-700">검토 ({draft.length}개)</p>
            <button
              onClick={saveAll}
              disabled={busy}
              className="rounded-lg bg-green-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-40"
            >
              전체 저장
            </button>
          </div>
          {draft.map((it, i) => (
            <div key={i} className="rounded-xl border bg-white p-3 text-xs shadow-sm">
              <div className="mb-1 flex gap-1.5">
                <Badge>{QUIZ_ITEM_TYPE_LABEL[it.item_type as QuizItemType]}</Badge>
                <Badge>어휘 {it.vocab_level}</Badge>
                <button
                  onClick={() => setDraft((d) => d.filter((_, idx) => idx !== i))}
                  className="ml-auto text-[10px] text-rose-400 hover:text-rose-600"
                >
                  제외
                </button>
              </div>
              <p className="font-medium text-gray-900">{it.stem}</p>
              <p className="mt-1 text-gray-500">
                정답: <span className="font-semibold text-green-700">{it.answer}</span>
                {it.distractors?.length > 0 && <span className="ml-2 text-gray-400">오답: {it.distractors.join(" / ")}</span>}
              </p>
              {it.explanation && <p className="mt-1 text-[11px] text-gray-400">{it.explanation}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
      {children}
    </span>
  );
}
