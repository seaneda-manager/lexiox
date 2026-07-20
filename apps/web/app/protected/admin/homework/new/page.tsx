'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';

function getBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

const SUBJECT_OPTIONS = [
  { value: 'vocab',   label: '어휘/단어' },
  { value: 'grammar', label: '문법 드릴' },
  { value: 'reading', label: '리딩 문제' },
  { value: 'mixed',   label: '복합' },
];

type AnswerRow = { id: number; answer: string; hint: string };

let nextId = 1;

function makeRow(): AnswerRow {
  return { id: nextId++, answer: '', hint: '' };
}

export default function NewHomeworkPage() {
  const router = useRouter();

  const [title, setTitle]         = useState('');
  const [description, setDesc]    = useState('');
  const [subject, setSubject]     = useState('vocab');
  const [dueAt, setDueAt]         = useState('');
  const [answers, setAnswers]     = useState<AnswerRow[]>(() =>
    Array.from({ length: 10 }, makeRow),
  );
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // ── 정답 행 수정 ──────────────────────────────────────────
  const updateAnswer = (id: number, field: 'answer' | 'hint', val: string) =>
    setAnswers((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: val } : r)),
    );

  const addRows = (n: number) =>
    setAnswers((prev) => [...prev, ...Array.from({ length: n }, makeRow)]);

  const removeRow = (id: number) =>
    setAnswers((prev) => prev.filter((r) => r.id !== id));

  // ── 저장 ──────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('제목을 입력해 주세요.'); return; }

    const validItems = answers
      .filter((r) => r.answer.trim())
      .map((r, idx) => ({
        number: idx + 1,
        answer: r.answer.trim(),
        hint:   r.hint.trim() || null,
      }));

    if (validItems.length === 0) {
      setError('정답을 1개 이상 입력해 주세요.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const supabase = getBrowserSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('로그인이 필요합니다.'); return; }

      const { data: hw, error: dbError } = await supabase
        .from('photo_homework')
        .insert({
          title:           title.trim(),
          description:     description.trim() || null,
          subject,
          answer_key_data: { items: validItems },
          due_at:          dueAt ? new Date(dueAt).toISOString() : null,
          created_by:      user.id,
          is_active:       true,
        })
        .select('id')
        .single();

      if (dbError) throw dbError;
      router.push(`/admin/homework/${hw.id}`);
    } catch (err: any) {
      setError(err?.message ?? '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const filledCount = answers.filter((r) => r.answer.trim()).length;

  return (
    <main className="mx-auto max-w-2xl space-y-6 pb-12">
      <header>
        <div className="text-xs text-neutral-400 mb-1">
          <Link href="/admin/homework" className="hover:underline">숙제 목록</Link>
          {' / 새 숙제'}
        </div>
        <h1 className="text-xl font-bold text-neutral-900">숙제 만들기</h1>
        <p className="text-xs text-neutral-400 mt-0.5">
          정답을 입력하면 학생이 사진으로 제출했을 때 자동으로 채점됩니다.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* 기본 정보 */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-400">기본 정보</h2>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-600">제목 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 6월 1주차 어휘 숙제"
              className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm outline-none focus:border-neutral-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-600">설명 (선택)</label>
            <textarea
              value={description}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="학생에게 보여줄 안내 메시지"
              rows={2}
              className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm outline-none focus:border-neutral-400 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-600">종류</label>
              <div className="flex flex-wrap gap-1.5">
                {SUBJECT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSubject(opt.value)}
                    className={[
                      'rounded-full border px-3 py-1 text-xs font-medium transition',
                      subject === opt.value
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 text-neutral-600 hover:border-neutral-400',
                    ].join(' ')}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-600">마감일 (선택)</label>
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm outline-none focus:border-neutral-400"
              />
            </div>
          </div>
        </div>

        {/* 정답 입력 */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-400">정답 입력</h2>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {filledCount}개 입력됨
              </p>
            </div>
          </div>

          {/* 헤더 */}
          <div className="grid grid-cols-[2rem_1fr_1fr_1.5rem] gap-2 px-1">
            <span className="text-[11px] text-neutral-400 text-center">번호</span>
            <span className="text-[11px] text-neutral-400">정답 *</span>
            <span className="text-[11px] text-neutral-400">힌트 (선택)</span>
            <span />
          </div>

          {/* 정답 행들 */}
          <div className="space-y-1.5 max-h-[440px] overflow-y-auto pr-1">
            {answers.map((row, idx) => (
              <div
                key={row.id}
                className="grid grid-cols-[2rem_1fr_1fr_1.5rem] gap-2 items-center"
              >
                <span className="text-xs text-neutral-400 text-center font-mono">
                  {idx + 1}
                </span>
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
                  placeholder="오답 시 힌트"
                  className="rounded-lg border border-neutral-200 px-3 py-2 text-xs text-neutral-500 outline-none focus:border-neutral-400"
                />
                {answers.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    className="text-neutral-300 hover:text-red-400 text-sm leading-none"
                    title="삭제"
                  >
                    ✕
                  </button>
                ) : (
                  <span />
                )}
              </div>
            ))}
          </div>

          {/* 행 추가 */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => addRows(5)}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50"
            >
              + 5줄 추가
            </button>
            <button
              type="button"
              onClick={() => addRows(10)}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50"
            >
              + 10줄 추가
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {saving ? '저장 중…' : `숙제 만들기 (${filledCount}문항)`}
        </button>
      </form>
    </main>
  );
}
