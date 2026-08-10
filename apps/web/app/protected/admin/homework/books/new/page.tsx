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

export default function NewHomeworkBookPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('mixed');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('교재명을 입력해 주세요.'); return; }

    setSaving(true);
    setError(null);
    try {
      const supabase = getBrowserSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('로그인이 필요합니다.'); return; }

      const { data: book, error: dbError } = await supabase
        .from('homework_books')
        .insert({ title: title.trim(), subject, created_by: user.id, is_active: true })
        .select('id')
        .single();

      if (dbError) throw dbError;
      router.push(`/admin/homework/books/${book.id}`);
    } catch (err: any) {
      setError(err?.message ?? '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-lg space-y-6 pb-12">
      <header>
        <div className="text-xs text-neutral-400 mb-1">
          <Link href="/admin/homework/books" className="hover:underline">교재</Link>
          {' / 새 교재'}
        </div>
        <h1 className="text-xl font-bold text-neutral-900">교재 등록</h1>
        <p className="text-xs text-neutral-400 mt-0.5">
          교재를 등록한 뒤 챕터별 정답을 추가하고, 학생에게 배정하면 스케줄대로 자동 생성됩니다.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-600">교재명 *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 능률 VOCA Level 2"
            className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm outline-none focus:border-neutral-400"
          />
        </div>

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
          {saving ? '저장 중…' : '교재 등록하고 유닛 추가하기'}
        </button>
      </form>
    </main>
  );
}
