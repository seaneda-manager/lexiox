'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import type { AnswerKeyItem } from '@/app/api/homework/grade/route';

function getBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

type AnswerRow = { id: number; answer: string; hint: string };
let nextId = 100;

export default function EditHomeworkPage() {
  const { id: homeworkId } = useParams<{ id: string }>();
  const router = useRouter();

  const [title, setTitle]       = useState('');
  const [answers, setAnswers]   = useState<AnswerRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // ── 기존 데이터 로드 ──────────────────────────────────────
  useEffect(() => {
    const supabase = getBrowserSupabase();
    supabase
      .from('photo_homework')
      .select('title, answer_key_data')
      .eq('id', homeworkId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setTitle((data as any).title ?? '');
        const items: AnswerKeyItem[] =
          (data as any).answer_key_data?.items ?? [];
        setAnswers(
          items.map((item) => ({
            id: nextId++,
            answer: item.answer,
            hint: item.hint ?? '',
          })),
        );
        setLoading(false);
      });
  }, [homeworkId]);

  const updateAnswer = (id: number, field: 'answer' | 'hint', val: string) =>
    setAnswers((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: val } : r)));

  const addRows = (n: number) =>
    setAnswers((prev) => [
      ...prev,
      ...Array.from({ length: n }, () => ({ id: nextId++, answer: '', hint: '' })),
    ]);

  const removeRow = (id: number) =>
    setAnswers((prev) => prev.filter((r) => r.id !== id));

  const handleSave = async () => {
    const validItems = answers
      .filter((r) => r.answer.trim())
      .map((r, idx) => ({
        number: idx + 1,
        answer: r.answer.trim(),
        hint:   r.hint.trim() || null,
      }));

    if (validItems.length === 0) { setError('정답을 1개 이상 입력해 주세요.'); return; }

    setSaving(true);
    setError(null);
    try {
      const supabase = getBrowserSupabase();
      const { error: dbErr } = await supabase
        .from('photo_homework')
        .update({ answer_key_data: { items: validItems }, updated_at: new Date().toISOString() })
        .eq('id', homeworkId);
      if (dbErr) throw dbErr;
      router.push(`/admin/homework/${homeworkId}`);
    } catch (err: any) {
      setError(err?.message ?? '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl p-8 text-sm text-neutral-400">
        불러오는 중…
      </main>
    );
  }

  const filledCount = answers.filter((r) => r.answer.trim()).length;

  return (
    <main className="mx-auto max-w-2xl space-y-6 pb-12">
      <header>
        <div className="text-xs text-neutral-400 mb-1">
          <Link href={`/admin/homework/${homeworkId}`} className="hover:underline">
            결과 보기
          </Link>
          {' / 정답 수정'}
        </div>
        <h1 className="text-xl font-bold text-neutral-900">{title}</h1>
        <p className="text-xs text-neutral-400 mt-0.5">정답을 수정하면 다음 채점부터 반영됩니다.</p>
      </header>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-400">정답 목록</h2>
          <span className="text-[11px] text-neutral-400">{filledCount}개</span>
        </div>

        <div className="grid grid-cols-[2rem_1fr_1fr_1.5rem] gap-2 px-1">
          <span className="text-[11px] text-neutral-400 text-center">번호</span>
          <span className="text-[11px] text-neutral-400">정답</span>
          <span className="text-[11px] text-neutral-400">힌트 (선택)</span>
          <span />
        </div>

        <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
          {answers.map((row, idx) => (
            <div
              key={row.id}
              className="grid grid-cols-[2rem_1fr_1fr_1.5rem] gap-2 items-center"
            >
              <span className="text-xs text-neutral-400 text-center font-mono">{idx + 1}</span>
              <input
                type="text"
                value={row.answer}
                onChange={(e) => updateAnswer(row.id, 'answer', e.target.value)}
                placeholder="정답"
                className="rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
              />
              <input
                type="text"
                value={row.hint}
                onChange={(e) => updateAnswer(row.id, 'hint', e.target.value)}
                placeholder="오답 힌트"
                className="rounded-lg border border-neutral-200 px-3 py-2 text-xs text-neutral-500 outline-none focus:border-neutral-400"
              />
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                className="text-neutral-300 hover:text-red-400 text-sm"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={() => addRows(5)}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50">
            + 5줄
          </button>
          <button type="button" onClick={() => addRows(10)}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50">
            + 10줄
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {saving ? '저장 중…' : '저장'}
      </button>
    </main>
  );
}
