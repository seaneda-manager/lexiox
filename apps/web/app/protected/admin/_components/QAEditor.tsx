// apps/web/app/(protected)/admin/_components/QAEditor.tsx
'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';

/** ==== Types (align with your CMS shape) ==== */
type QType =
  | 'vocab'
  | 'detail'
  | 'negative_detail'
  | 'paraphrasing'
  | 'insertion'
  | 'inference'
  | 'purpose'
  | 'pronoun_ref'
  | 'summary'
  | 'organization';

type Choice = {
  id: string;
  question_id: string;
  text: string;
  is_correct: boolean;
  order_index?: number | null;
};

type Question = {
  id: string;
  passage_id: string;
  set_id: string;
  number: number;
  type: QType;
  stem: string;
  explanation?: string | null;
  clue_quote?: string | null;
  order_index?: number | null;
};

const TYPES: QType[] = [
  'vocab',
  'detail',
  'negative_detail',
  'paraphrasing',
  'insertion',
  'inference',
  'purpose',
  'pronoun_ref',
  'summary',
  'organization',
];

/** ==== Main QA Editor ==== */
export default function QAEditor({
  passageId,
  setId,
}: {
  passageId: string;
  setId: string;
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [editing, setEditing] = useState<Question | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/passages/${passageId}/questions?setId=${encodeURIComponent(setId)}`,
        { cache: 'no-store' },
      );
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as unknown;
      const list = Array.isArray(data) ? (data as Question[]) : [];
      setQuestions(list.sort((a, b) => (a.order_index ?? a.number) - (b.order_index ?? b.number)));
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [passageId, setId]);

  // 초기 로드 (비동기 IIFE - 표준 패턴)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(
          `/api/admin/passages/${passageId}/questions?setId=${encodeURIComponent(setId)}`,
          { cache: 'no-store' },
        );
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as unknown;
        if (!alive) return;
        const list = Array.isArray(data) ? (data as Question[]) : [];
        setQuestions(list.sort((a, b) => (a.order_index ?? a.number) - (b.order_index ?? b.number)));
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [passageId, setId]);

  const onSaved = useCallback(() => {
    startTransition(() => {
      void load();
      setEditing(null);
    });
  }, [load]);

  const onDelete = useCallback(
    async (qid: string) => {
      if (!confirm('이 문항을 삭제할까요?')) return;
      const res = await fetch(`/api/admin/questions/${qid}`, { method: 'DELETE' });
      if (res.ok) {
        startTransition(() => void load());
      } else {
        alert('삭제 실패');
      }
    },
    [load],
  );

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">QA Editor</h2>
          <p className="text-xs text-neutral-500">
            Passage: <b>{passageId}</b> · Set: <b>{setId}</b>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded border px-3 py-1.5 text-sm"
            onClick={() =>
              setEditing({
                id: '',
                passage_id: passageId,
                set_id: setId,
                number: (questions.at(-1)?.number ?? 0) + 1,
                type: 'detail',
                stem: '',
                explanation: '',
                clue_quote: '',
                order_index: (questions.at(-1)?.order_index ?? questions.at(-1)?.number ?? 0) + 1,
              } as Question)
            }
          >
            + Add Question
          </button>
          <button
            type="button"
            className="rounded border px-3 py-1.5 text-sm"
            onClick={() => startTransition(() => void load())}
          >
            Reload
          </button>
        </div>
      </header>

      {err && <div className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">{err}</div>}
      {(loading || isPending) && <div className="text-sm text-neutral-500">Loading…</div>}

      {/* Editor */}
      {editing && (
        <div className="rounded-2xl border p-4">
          <QuestionForm
            passageId={passageId}
            setId={setId}
            initial={editing?.id ? editing : undefined}
            onSaved={onSaved}
            onCancel={() => setEditing(null)}
          />
          {editing?.id ? (
            <div className="mt-6">
              <h4 className="mb-2 text-sm font-semibold">Choices</h4>
              <ChoiceList questionId={editing.id} />
            </div>
          ) : null}
        </div>
      )}

      {/* List */}
      <div className="overflow-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Stem</th>
              <th className="px-3 py-2 text-left">Order</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => (
              <tr key={q.id} className="border-t">
                <td className="px-3 py-2">{q.number}</td>
                <td className="px-3 py-2">{q.type}</td>
                <td className="px-3 py-2">
                  <span className="line-clamp-2">{q.stem}</span>
                </td>
                <td className="px-3 py-2">{q.order_index ?? q.number}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded border px-2 py-1"
                      onClick={() => setEditing(q)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded border px-2 py-1"
                      onClick={() => void onDelete(q.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {questions.length === 0 && !loading && (
              <tr>
                <td className="px-3 py-6 text-center text-neutral-500" colSpan={5}>
                  문항이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** ==== QuestionForm ==== */
function QuestionForm({
  passageId,
  setId,
  initial,
  onSaved,
  onCancel,
}: {
  passageId: string;
  setId: string;
  initial?: Partial<Question>;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<Partial<Question>>({
    number: initial?.number ?? 1,
    type: initial?.type ?? 'detail',
    stem: initial?.stem ?? '',
    explanation: initial?.explanation ?? '',
    clue_quote: initial?.clue_quote ?? '',
    order_index: initial?.order_index ?? initial?.number ?? 1,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isEdit = !!initial?.id;

  const save = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (busy) return;
      setBusy(true);
      setErr(null);
      try {
        if (isEdit && initial?.id) {
          const res = await fetch(`/api/admin/questions/${initial.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          });
          const j = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error((j as any).error || 'failed');
        } else {
          const res = await fetch(`/api/admin/passages/${passageId}/questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, set_id: setId }),
          });
          const j = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error((j as any).error || 'failed');
        }
        onSaved?.();
      } catch (e: any) {
        setErr(e?.message ?? String(e));
      } finally {
        setBusy(false);
      }
    },
    [busy, form, initial?.id, isEdit, onSaved, passageId, setId],
  );

  // ✅ deps에 실제 참조 필드를 모두 포함 (react-hooks/exhaustive-deps 경고 제거)
  useEffect(() => {
    setForm({
      number: initial?.number ?? 1,
      type: initial?.type ?? 'detail',
      stem: initial?.stem ?? '',
      explanation: initial?.explanation ?? '',
      clue_quote: initial?.clue_quote ?? '',
      order_index: initial?.order_index ?? initial?.number ?? 1,
    });
  }, [
    initial?.id,
    initial?.number,
    initial?.type,
    initial?.stem,
    initial?.explanation,
    initial?.clue_quote,
    initial?.order_index,
  ]);

  return (
    <form onSubmit={save} className="space-y-3">
      {err && <div className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">{err}</div>}

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs">No.</label>
          <input
            type="number"
            className="w-full rounded-lg border px-2 py-1"
            value={form.number ?? 1}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                number: Number(e.target.value),
              }))
            }
          />
        </div>
        <div>
          <label className="text-xs">Type</label>
          <select
            className="w-full rounded-lg border px-2 py-1"
            value={form.type ?? 'detail'}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                type: e.target.value as QType,
              }))
            }
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs">Order</label>
          <input
            type="number"
            className="w-full rounded-lg border px-2 py-1"
            value={form.order_index ?? form.number ?? 1}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                order_index: Number(e.target.value),
              }))
            }
          />
        </div>
      </div>

      <textarea
        className="w-full rounded-lg border px-3 py-2"
        placeholder="Stem"
        value={form.stem ?? ''}
        onChange={(e) => setForm((prev) => ({ ...prev, stem: e.target.value }))}
      />

      <textarea
        className="w-full rounded-lg border px-3 py-2"
        placeholder="Explanation (optional)"
        value={form.explanation ?? ''}
        onChange={(e) => setForm((prev) => ({ ...prev, explanation: e.target.value }))}
      />

      <textarea
        className="w-full rounded-lg border px-3 py-2"
        placeholder="Clue quote (optional)"
        value={form.clue_quote ?? ''}
        onChange={(e) => setForm((prev) => ({ ...prev, clue_quote: e.target.value }))}
      />

      <div className="flex justify-end gap-2">
        <button type="button" className="rounded-xl border px-3 py-2 text-sm" onClick={onCancel}>
          Cancel
        </button>
        <button
          disabled={busy}
          className="rounded-xl bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-60"
        >
          {isEdit ? 'Update Question' : 'Add Question'}
        </button>
      </div>
    </form>
  );
}

/** ==== ChoiceList ==== */
function ChoiceList({ questionId }: { questionId: string }) {
  const [rows, setRows] = useState<Choice[]>([]);
  const [text, setText] = useState('');
  const [correct, setCorrect] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/admin/questions/${questionId}/choices`, { cache: 'no-store' });
    if (!r.ok) return;
    const data = (await r.json()) as unknown;
    setRows(Array.isArray(data) ? (data as Choice[]) : []);
  }, [questionId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await fetch(`/api/admin/questions/${questionId}/choices`, { cache: 'no-store' });
      if (!r.ok) return;
      const data = (await r.json()) as unknown;
      if (!alive) return;
      setRows(Array.isArray(data) ? (data as Choice[]) : []);
    })();
    return () => {
      alive = false;
    };
  }, [questionId]);

  const add = useCallback(async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/questions/${questionId}/choices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          is_correct: !!correct,
          order_index: rows.length,
        }),
      });
      if (res.ok) {
        setText('');
        setCorrect(false);
        await load();
      }
    } finally {
      setBusy(false);
    }
  }, [busy, correct, load, questionId, rows.length, text]);

  const toggle = useCallback(
    async (id: string, is_correct: boolean) => {
      if (busy) return;
      setBusy(true);
      try {
        const res = await fetch(`/api/admin/choices/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_correct: !is_correct }),
        });
        if (res.ok) await load();
      } finally {
        setBusy(false);
      }
    },
    [busy, load],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!confirm('삭제할까요?') || busy) return;
      setBusy(true);
      try {
        const res = await fetch(`/api/admin/choices/${id}`, { method: 'DELETE' });
        if (res.ok) await load();
      } finally {
        setBusy(false);
      }
    },
    [busy, load],
  );

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-lg border px-3 py-2"
          placeholder="Choice text"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <label className="inline-flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            checked={correct}
            onChange={(e) => setCorrect(e.target.checked)}
          />
          Correct
        </label>
        <button
          type="button"
          onClick={() => void add()}
          className="rounded-xl border px-3 py-2 text-sm"
          disabled={busy}
        >
          Add
        </button>
      </div>

      <ul className="space-y-1">
        {rows.map((c) => (
          <li key={c.id} className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <button
              type="button"
              onClick={() => void toggle(c.id, !!c.is_correct)}
              className={`rounded px-2 py-1 text-xs ${
                c.is_correct ? 'bg-green-600 text-white' : 'bg-gray-100'
              }`}
              title={c.is_correct ? 'Mark as incorrect' : 'Mark as correct'}
              disabled={busy}
            >
              {c.is_correct ? 'Correct' : 'Mark'}
            </button>
            <span className="flex-1">{c.text}</span>
            <button
              type="button"
              onClick={() => void remove(c.id)}
              className="rounded border px-2 py-1 text-xs"
              disabled={busy}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
