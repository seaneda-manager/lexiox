// apps/web/components/reading/admin/AdminReadingEditor.tsx
'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

// SSOT
import { readingSetSchema } from '@/models/reading/zod';
import type { RSet, RQuestion, RChoice } from '@/models/reading/zod';

type RQType = RQuestion['type'];

type Props = {
  initialJson: string;
  defaultSetId: string;
  // Server Action 이 아님 → 클라이언트 콜백은 *Action 네이밍
  onSaveAction: (fd: FormData) => Promise<{ ok: true; id: string }>;
};

type LintIssue = { level: 'error' | 'warn'; where: string; msg: string };

/* ------------------------------ utils ------------------------------ */
const uuid = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

/** textarea → paragraphs */
function splitParagraphs(content: string, mode: 'auto' | 'blankline' | 'html' = 'auto') {
  if (!content) return [];
  if (mode === 'html') {
    return content
      .split(/<\/p>|<\/div>/i)
      .map((s) => s.replace(/<[^>]+>/g, '').trim())
      .filter(Boolean);
  }
  // 기본: 빈 줄 2개 이상
  return content
    .split(/\n{2,}/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** meta 보조 뷰: 안전 any */
function metaView(q: RQuestion) {
  const m = (q.meta ?? {}) as any;
  return {
    summary: (m.summary ?? {}) as {
      candidates?: string[];
      correct?: number[];
      selectionCount?: number;
    },
    insertion: (m.insertion ?? {}) as {
      anchors?: (string | number)[];
      correctIndex?: number;
    },
    pronoun_ref: (m.pronoun_ref ?? {}) as {
      pronoun?: string;
      referents?: string[];
      correctIndex?: number;
    },
    paragraph_highlight: (m.paragraph_highlight ?? {}) as {
      paragraphs?: number[];
    },
  };
}

function lintReadingSet(set: RSet): LintIssue[] {
  const issues: LintIssue[] = [];
  const p0 = set.passages?.[0];
  if (!p0) {
    issues.push({ level: 'error', where: 'set.passages', msg: 'At least one passage is required.' });
    return issues;
  }
  const paras = Array.isArray(p0.paragraphs) ? p0.paragraphs : [];

  (p0.questions || []).forEach((q, qi) => {
    const where = `Q${q.number}(${q.type})`;
    const m = metaView(q);

    // 번호 연속성
    if (q.number !== qi + 1) {
      issues.push({
        level: 'warn',
        where,
      msg: `Question number mismatch. Expected ${qi + 1}, got ${q.number}.`,
      });
    }

    // 선택지
    if (!q.choices?.length) issues.push({ level: 'error', where, msg: 'No choices provided.' });
    q.choices?.forEach((c, ci) => {
      if (!c.text?.trim()) issues.push({ level: 'warn', where, msg: `Choice #${ci + 1} has empty text.` });
    });

    // 유형별 메타
    if (q.type === 'summary') {
      const cand = m.summary.candidates ?? [];
      const cor = m.summary.correct ?? [];
      const sel = Number.isFinite(m.summary.selectionCount) ? (m.summary.selectionCount as number) : NaN;

      if (cand.length === 0) issues.push({ level: 'error', where, msg: 'summary.candidates required.' });
      if (!Number.isFinite(sel) || sel < 1)
        issues.push({ level: 'error', where, msg: 'summary.selectionCount must be >= 1.' });
      if (cor.length !== sel)
        issues.push({
          level: 'error',
          where,
          msg: `summary.correct length (${cor.length}) must equal selectionCount (${Number.isNaN(sel) ? 'NaN' : sel}).`,
        });
      if (cor.some((i) => i < 0 || i >= cand.length))
        issues.push({ level: 'error', where, msg: 'summary.correct index out of range.' });
    } else if (q.type === 'insertion') {
      const ins = m.insertion;
      const anchorsLen = ins.anchors?.length ?? 0;
      if (!anchorsLen) issues.push({ level: 'error', where, msg: 'insertion.anchors required.' });
      if (ins && (ins.correctIndex == null || ins.correctIndex < 0 || ins.correctIndex >= anchorsLen)) {
        issues.push({ level: 'error', where, msg: 'insertion.correctIndex out of range.' });
      }
    } else if (q.type === 'pronoun_ref') {
      const pr = m.pronoun_ref;
      if (!pr?.pronoun) issues.push({ level: 'warn', where, msg: 'pronoun_ref.pronoun is empty.' });
      const refLen = pr?.referents?.length ?? 0;
      if (!refLen) issues.push({ level: 'error', where, msg: 'pronoun_ref.referents required.' });
      if (pr && (pr.correctIndex == null || pr.correctIndex < 0 || pr.correctIndex >= refLen)) {
        issues.push({ level: 'error', where, msg: 'pronoun_ref.correctIndex out of range.' });
      }
    }

    // paragraph_highlight 인덱스
    const ph = m.paragraph_highlight.paragraphs ?? [];
    if (ph.some((i: number) => i < 0 || i >= paras.length)) {
      issues.push({
        level: 'error',
        where,
        msg: `paragraph_highlight index out of range (passages have ${paras.length} paragraphs).`,
      });
    }

    // summary 외: 정답 1개
    if (q.type !== 'summary') {
      const cs = (q.choices || []).filter((c) => c.isCorrect);
      if (cs.length !== 1) {
        issues.push({ level: 'error', where, msg: `Single correct choice required. Found ${cs.length}.` });
      }
    }
  });

  return issues;
}

/* ------------------------------ component ------------------------------ */
export default function AdminReadingEditor({ initialJson, defaultSetId, onSaveAction }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<'json' | 'form'>('json');
  const [text, setText] = useState(initialJson);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // schema → RSet
  const parsed: RSet | null = useMemo(() => {
    try {
      const obj = JSON.parse(text);
      const z = readingSetSchema.parse(obj) as unknown as RSet;
      return z;
    } catch {
      return null;
    }
  }, [text]);

  const setId = parsed?.id ?? defaultSetId;

  const validate = useCallback(() => {
    try {
      const obj = JSON.parse(text);
      readingSetSchema.parse(obj);
      setErr(null);
      setMsg('✓ JSON is valid.');
    } catch (e: any) {
      setMsg(null);
      setErr(e?.message || 'Invalid JSON.');
    }
  }, [text]);

  const deepCheck = useCallback(() => {
    try {
      const obj = JSON.parse(text);
      const ok = readingSetSchema.parse(obj) as unknown as RSet;
      const issues = lintReadingSet(ok);
      if (issues.length === 0) setMsg('✓ Deep Check: no issues found.');
      else {
        const lines = issues.map((i) => `${i.level.toUpperCase()} | ${i.where} | ${i.msg}`).join('\n');
        setErr(`Deep Check Report\n${lines}`);
      }
    } catch (e: any) {
      setErr('Deep Check failed: ' + (e?.message || 'invalid json'));
    }
  }, [text]);

  const save = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setMsg(null);
      setErr(null);
      try {
        const obj = JSON.parse(text);
        readingSetSchema.parse(obj);

        const fd = new FormData();
        fd.set('json', JSON.stringify(obj));
        const r = await onSaveAction(fd);
        setMsg(`✓ Saved: ${r.id}`);
        router.replace(`/reading/admin?setId=${encodeURIComponent(r.id)}`);
      } catch (e: any) {
        setErr(e?.message || 'Save failed.');
      }
    },
    [text, onSaveAction, router]
  );

  const openTest = useCallback(() => {
    window.open(
      `/reading/test?setId=${encodeURIComponent(setId)}&mode=test&debug=1`,
      '_blank',
      'width=1200,height=800'
    );
  }, [setId]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-neutral-500">
          Set ID: <b>{setId}</b>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={`rounded border px-3 py-1 ${tab === 'json' ? 'bg-white/10' : ''}`}
            onClick={() => setTab('json')}
          >
            JSON
          </button>
          <button
            type="button"
            className={`rounded border px-3 py-1 ${tab === 'form' ? 'bg-white/10' : ''}`}
            onClick={() => setTab('form')}
          >
            Form (beta)
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded border px-3 py-1" onClick={validate}>
          Validate
        </button>
        <button type="button" className="rounded border px-3 py-1" onClick={deepCheck}>
          Deep Check
        </button>
        <button type="button" className="rounded border px-3 py-1" onClick={openTest}>
          Open Test Window
        </button>
      </div>

      {msg && (
        <div className="rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-green-300">
          {msg}
        </div>
      )}
      {err && (
        <div className="whitespace-pre-wrap rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-red-300">
          {err}
        </div>
      )}

      {/* JSON 에디터 */}
      {tab === 'json' && (
        <form onSubmit={save} className="space-y-3">
          <textarea
            className="h-[60vh] w-full rounded-xl border p-3 font-mono text-sm"
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
          />
          <div className="flex gap-2">
            <button type="submit" className="rounded border px-4 py-2">
              Save
            </button>
            <button
              type="button"
              className="rounded border px-4 py-2"
              onClick={() => setText(JSON.stringify(makeMinimalSet(setId), null, 2))}
            >
              New minimal template
            </button>
          </div>
        </form>
      )}

      {/* FORM 에디터 (MVP) */}
      {tab === 'form' &&
        (parsed ? (
          <FormEditor parsed={parsed} setText={setText} />
        ) : (
          <div className="text-sm text-red-400">JSON이 유효해야 Form 편집이 가능합니다. 먼저 Validate를 통과시켜 주세요.</div>
        ))}
    </div>
  );
}

/* ------------------------------ Helpers ------------------------------ */
function makeMinimalSet(id: string): RSet {
  return {
    id,
    label: 'New Reading Set',
    source: '',
    version: 1,
    passages: [
      {
        id: uuid(),
        title: 'Untitled Passage',
        paragraphs: ['Write your passage here...'],
        questions: [],
      },
    ],
  };
}

/* ------------------------------ Simple Form Editor (MVP) ------------------------------ */
function FormEditor({ parsed, setText }: { parsed: RSet; setText: (s: string) => void }) {
  const [draft, setDraft] = useState<RSet>(parsed);

  const sync = () => {
    try {
      const next = JSON.stringify(draft, null, 2);
      // 저장 전 SSOT 스키마 검증
      readingSetSchema.parse(JSON.parse(next));
      setText(next);
    } catch (e: any) {
      alert('Schema validation failed: ' + (e?.message ?? 'invalid'));
    }
  };

  const setPassageField = (k: keyof RSet['passages'][number], v: any, idx = 0) => {
    setDraft((prev) => ({
      ...prev,
      passages: prev.passages.map((p, i) => (i === idx ? { ...p, [k]: v } : p)),
    }));
  };

  const addQuestion = () => {
    const p0 = draft.passages[0];
    const q: RQuestion = {
      id: uuid(),
      number: (p0?.questions?.length ?? 0) + 1,
      type: 'detail',
      stem: 'Write the stem...',
      choices: [
        { id: uuid(), text: 'Choice A' },
        { id: uuid(), text: 'Choice B' },
        { id: uuid(), text: 'Choice C' },
        { id: uuid(), text: 'Choice D' },
      ],
      meta: {},
    };
    setDraft((prev) => ({
      ...prev,
      passages: prev.passages.map((p, i) => (i === 0 ? { ...p, questions: [...(p.questions || []), q] } : p)),
    }));
  };

  const updateQuestion = (i: number, patch: Partial<RQuestion>) => {
    const p0 = draft.passages[0];
    const qs = p0.questions.slice();
    qs[i] = { ...qs[i], ...patch };
    setDraft((prev) => ({ ...prev, passages: [{ ...p0, questions: qs }] }));
  };

  const setCorrect = (qi: number, ci: number) => {
    const p0 = draft.passages[0];
    const qs = p0.questions.slice();
    const q = { ...qs[qi] };
    q.choices = q.choices.map((c, i) => ({ ...c, isCorrect: i === ci }));
    qs[qi] = q;
    setDraft((prev) => ({ ...prev, passages: [{ ...p0, questions: qs }] }));
  };

  const setChoiceText = (qi: number, ci: number, text: string) => {
    const p0 = draft.passages[0];
    const qs = p0.questions.slice();
    const q = { ...qs[qi] };
    q.choices = q.choices.map((c, i) => (i === ci ? { ...c, text } : c));
    qs[qi] = q;
    setDraft((prev) => ({ ...prev, passages: [{ ...p0, questions: qs }] }));
  };

  const addChoice = (qi: number) => {
    const p0 = draft.passages[0];
    const qs = p0.questions.slice();
    const q = { ...qs[qi] };
    q.choices = [...q.choices, { id: uuid(), text: 'New choice' } as RChoice];
    qs[qi] = q;
    setDraft((prev) => ({ ...prev, passages: [{ ...p0, questions: qs }] }));
  };

  const setType = (qi: number, t: RQType) => updateQuestion(qi, { type: t });

  // summary: selectionCount 및 candidates/correct 구성(길이 동기화)
  const setSummarySelection = (qi: number, n: number) => {
    const p0 = draft.passages[0];
    const qs = p0.questions.slice();
    const q = { ...qs[qi] };
    const prev = metaView(q).summary;

    const sel = Math.max(1, Number.isFinite(n) ? n : 2);
    const nextCorrect = (Array.isArray(prev.correct) ? prev.correct : []).slice(0, sel);

    q.meta = {
      ...(q.meta || {}),
      summary: {
        candidates: Array.isArray(prev.candidates) ? prev.candidates : [],
        correct: nextCorrect,
        selectionCount: sel,
      },
    };

    qs[qi] = q;
    setDraft((prev) => ({ ...prev, passages: [{ ...p0, questions: qs }] }));
  };

  // summary 후보 입력
  const setSummaryCandidates = (qi: number, raw: string) => {
    const candidates = raw.split(/\r?\n|\|/g).map((s) => s.trim()).filter(Boolean);

    const p0 = draft.passages[0];
    const qs = p0.questions.slice();
    const q = { ...qs[qi] };
    const m = metaView(q);
    const sel = Math.max(1, Number(m.summary.selectionCount ?? 2) || 2);

    // 기존 correct 인덱스를 새 후보 길이에 맞게 정리
    const prevCorrect = (Array.isArray(m.summary.correct) ? m.summary.correct : []).filter(
      (i) => i >= 0 && i < candidates.length
    ).slice(0, sel);

    q.meta = {
      ...(q.meta || {}),
      summary: {
        candidates,
        correct: prevCorrect,
        selectionCount: sel,
      },
    };

    qs[qi] = q;
    setDraft((prev) => ({ ...prev, passages: [{ ...p0, questions: qs }] }));
  };

  // summary 정답 입력 (1-based → 0-based, selectionCount 자르기)
  const setSummaryCorrect = (qi: number, raw: string) => {
    const p0 = draft.passages[0];
    const qs = p0.questions.slice();
    const q = { ...qs[qi] };
    const m = metaView(q);
    const candidates = Array.isArray(m.summary.candidates) ? m.summary.candidates : [];
    const sel = Math.max(1, Number(m.summary.selectionCount ?? 2) || 2);

    let correct = raw
      .split(/\D+/g)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((v) => Math.max(0, (parseInt(v, 10) || 0) - 1))
      .filter((i) => i >= 0 && i < candidates.length)
      .slice(0, sel);

    q.meta = {
      ...(q.meta || {}),
      summary: {
        candidates,
        correct,
        selectionCount: sel,
      },
    };

    qs[qi] = q;
    setDraft((prev) => ({ ...prev, passages: [{ ...p0, questions: qs }] }));
  };

  // insertion (anchors + correctIndex 범위 보정)
  const setInsertionAnchors = (qi: number, anchorsCsv: string) => {
    const anchors = anchorsCsv.split('|').map((s) => s.trim()).filter(Boolean);
    const p0 = draft.passages[0];
    const qs = p0.questions.slice();
    const q = { ...qs[qi] };
    const m = metaView(q);

    const maxIdx = Math.max(0, anchors.length - 1);
    const nextCorrect = Math.min(Math.max(0, m.insertion.correctIndex ?? 0), maxIdx);

    q.meta = {
      ...(q.meta || {}),
      insertion: {
        ...m.insertion,
        anchors,
        correctIndex: nextCorrect,
      },
    };
    qs[qi] = q;
    setDraft((prev) => ({ ...prev, passages: [{ ...p0, questions: qs }] }));
  };

  // pronoun_ref (correctIndex 범위 보정)
  const setPronounRef = (qi: number, pronoun: string, referentsCsv: string, correctIndex: number) => {
    const referents = referentsCsv.split('|').map((s) => s.trim()).filter(Boolean);
    const maxIdx = Math.max(0, referents.length - 1);
    const fixedIdx = Math.min(Math.max(0, correctIndex | 0), maxIdx);

    const p0 = draft.passages[0];
    const qs = p0.questions.slice();
    const q = { ...qs[qi] };
    q.meta = {
      ...(q.meta || {}),
      pronoun_ref: {
        pronoun,
        referents,
        correctIndex: fixedIdx,
      },
    };
    qs[qi] = q;
    setDraft((prev) => ({ ...prev, passages: [{ ...p0, questions: qs }] }));
  };

  // textarea 표시용
  const passageText = (draft.passages[0]?.paragraphs || []).join('\n\n');

  return (
    <div className="space-y-4 rounded-2xl border p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="text-xs text-neutral-500">Set Label</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={draft.label || ''}
            onChange={(e) => setDraft((prev) => ({ ...prev, label: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-neutral-500">Source</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={draft.source || ''}
              onChange={(e) => setDraft((prev) => ({ ...prev, source: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-neutral-500">Version</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={String(draft.version ?? 1)}
              onChange={(e) => setDraft((prev) => ({ ...prev, version: Number(e.target.value || 1) }))}
            />
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-neutral-500">Passage Title</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={draft.passages[0]?.title || ''}
            onChange={(e) => setPassageField('title', e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-neutral-500">Passage Content</label>
          <textarea
            className="mt-1 h-40 w-full rounded border px-3 py-2 font-mono text-sm"
            value={passageText}
            onChange={(e) => setPassageField('paragraphs', splitParagraphs(e.target.value))}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Questions</h3>
        <button type="button" className="rounded border px-3 py-1" onClick={addQuestion}>
          + Add Question
        </button>
      </div>

      <div className="space-y-4">
        {(draft.passages[0]?.questions || []).map((q, qi) => {
          const m = metaView(q);
          return (
            <div key={q.id} className="rounded-xl border p-3">
              <div className="flex items-center gap-3">
                <div className="text-sm text-neutral-500">Q{q.number}</div>
                <select
                  className="rounded border px-2 py-1"
                  value={q.type}
                  onChange={(e) => setType(qi, e.target.value as RQType)}
                >
                  {[
                    'vocab',
                    'detail',
                    'negative_detail',
                    'paraphrasing',
                    'inference',
                    'purpose',
                    'pronoun_ref',
                    'insertion',
                    'summary',
                    'organization',
                  ].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <input
                className="mt-2 w-full rounded border px-3 py-2"
                value={q.stem}
                onChange={(e) => updateQuestion(qi, { stem: e.target.value })}
              />

              {/* 유형별 메타 (MVP) */}
              {q.type === 'summary' && (
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500">selectionCount</span>
                    <input
                      type="number"
                      className="w-20 rounded border px-2 py-1"
                      value={metaView(q).summary.selectionCount ?? 2}
                      onChange={(e) => setSummarySelection(qi, Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-neutral-500">
                      candidates (줄바꿈 또는 <code>|</code> 구분)
                    </div>
                    <textarea
                      className="w-full rounded border px-3 py-2 font-mono"
                      rows={4}
                      value={(m.summary.candidates || []).join('\n')}
                      onChange={(e) => setSummaryCandidates(qi, e.target.value)}
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-neutral-500">
                      correct (1-based, 예: <code>1|3|4</code>)
                    </div>
                    <input
                      className="w-full rounded border px-3 py-2 font-mono"
                      value={(m.summary.correct || []).map((i) => i + 1).join('|')}
                      onChange={(e) => setSummaryCorrect(qi, e.target.value)}
                    />
                  </div>
                </div>
              )}

              {q.type === 'insertion' && (
                <div className="mt-2 text-sm">
                  <div className="mb-1 text-neutral-500">
                    anchors (<code>|</code> 구분)
                  </div>
                  <input
                    className="w-full rounded border px-3 py-2"
                    placeholder="ex) [A] | [B] | [C] | [D]"
                    value={(m.insertion.anchors || []).join(' | ')}
                    onChange={(e) => setInsertionAnchors(qi, e.target.value)}
                  />
                </div>
              )}

              {q.type === 'pronoun_ref' && (
                <div className="mt-2 grid gap-2 text-sm md:grid-cols-3">
                  <input
                    className="rounded border px-3 py-2"
                    placeholder="pronoun (it / they ...)"
                    value={m.pronoun_ref.pronoun || ''}
                    onChange={(e) =>
                      setPronounRef(
                        qi,
                        e.target.value,
                        (m.pronoun_ref.referents || []).join(' | '),
                        m.pronoun_ref.correctIndex ?? 0
                      )
                    }
                  />
                  <input
                    className="rounded border px-3 py-2 md:col-span-2"
                    placeholder="referents ( | 구분 )"
                    value={(m.pronoun_ref.referents || []).join(' | ')}
                    onChange={(e) =>
                      setPronounRef(
                        qi,
                        m.pronoun_ref.pronoun || '',
                        e.target.value,
                        m.pronoun_ref.correctIndex ?? 0
                      )
                    }
                  />
                </div>
              )}

              <div className="mt-3">
                <div className="mb-1 text-sm text-neutral-500">Choices</div>
                <ul className="space-y-2">
                  {q.choices.map((c, ci) => (
                    <li key={c.id} className="flex items-center gap-2">
                      <input
                        className="flex-1 rounded border px-3 py-2"
                        value={c.text}
                        onChange={(e) => setChoiceText(qi, ci, e.target.value)}
                      />
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="radio"
                          name={`correct-${q.id}`}
                          checked={!!c.isCorrect}
                          onChange={() => setCorrect(qi, ci)}
                        />
                        correct
                      </label>
                    </li>
                  ))}
                </ul>
                <button type="button" className="mt-2 rounded border px-3 py-1" onClick={() => addChoice(qi)}>
                  + Add choice
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <button type="button" className="rounded border px-3 py-2" onClick={sync}>
          Apply to JSON
        </button>
        <div className="text-xs text-neutral-500">Apply를 누르면 현재 Form 상태가 JSON 영역에 반영됩니다.</div>
      </div>
    </div>
  );
}
