'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

type ExamRow = {
  id:        string;
  exam_name: string;
  exam_date: string;
  school:    string;
  note:      string;
};

export default function StudentExamSchedulePage() {
  const { id: studentId } = useParams<{ id: string }>();
  const router = useRouter();

  const [exams, setExams]         = useState<ExamRow[]>([]);
  const [studentName, setName]    = useState('');
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // 새 시험 입력 폼
  const [newName, setNewName]     = useState('내신 시험');
  const [newDate, setNewDate]     = useState('');
  const [newSchool, setNewSchool] = useState('');
  const [newNote, setNewNote]     = useState('');

  useEffect(() => {
    const sb = getSupabase();
    Promise.all([
      sb.from('profiles').select('full_name, name, email').eq('id', studentId).maybeSingle(),
      sb.from('naesin_exam_schedule').select('id, exam_name, exam_date, school, note')
        .eq('student_id', studentId).order('exam_date'),
    ]).then(([{ data: profile }, { data: rows }]) => {
      setName(
        (profile as any)?.full_name ??
        (profile as any)?.name ??
        (profile as any)?.email ??
        studentId.slice(0, 8),
      );
      setExams((rows ?? []) as ExamRow[]);
      setLoading(false);
    });
  }, [studentId]);

  const handleAdd = async () => {
    if (!newDate) { setError('날짜를 선택해 주세요.'); return; }
    setSaving(true);
    setError(null);
    const sb = getSupabase();
    const { data: me } = await sb.auth.getUser();
    const { data, error: err } = await sb
      .from('naesin_exam_schedule')
      .insert({
        student_id: studentId,
        exam_name:  newName.trim() || '내신 시험',
        exam_date:  newDate,
        school:     newSchool.trim() || null,
        note:       newNote.trim() || null,
        created_by: me.user?.id,
      })
      .select('id, exam_name, exam_date, school, note')
      .single();

    if (err) { setError(err.message); }
    else {
      setExams((prev) => [...prev, data as ExamRow].sort((a, b) => a.exam_date.localeCompare(b.exam_date)));
      setNewDate(''); setNewSchool(''); setNewNote('');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const sb = getSupabase();
    await sb.from('naesin_exam_schedule').delete().eq('id', id);
    setExams((prev) => prev.filter((e) => e.id !== id));
  };

  const today = new Date().toISOString().slice(0, 10);

  if (loading) return <main className="p-8 text-sm text-neutral-400">불러오는 중…</main>;

  return (
    <main className="mx-auto max-w-xl space-y-6 pb-12">
      <header>
        <div className="text-xs text-neutral-400 mb-1">
          <Link href="/admin/students" className="hover:underline">학생 목록</Link>
          {' / 시험 일정'}
        </div>
        <h1 className="text-xl font-bold text-neutral-900">{studentName}</h1>
        <p className="text-xs text-neutral-400 mt-0.5">내신 시험 날짜 설정</p>
      </header>

      {/* 기존 시험 목록 */}
      {exams.length > 0 ? (
        <div className="space-y-2">
          {exams.map((e) => {
            const dDay = Math.ceil(
              (new Date(e.exam_date).getTime() - new Date(today).getTime()) /
              (1000 * 60 * 60 * 24),
            );
            const isPast = dDay < 0;
            return (
              <div
                key={e.id}
                className={[
                  'flex items-center justify-between gap-3 rounded-2xl border p-4',
                  isPast ? 'border-neutral-100 bg-neutral-50 opacity-60' : 'border-neutral-200 bg-white',
                ].join(' ')}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={[
                      'text-sm font-bold',
                      isPast ? 'text-neutral-400' :
                      dDay <= 3 ? 'text-red-600' :
                      dDay <= 7 ? 'text-amber-600' :
                      'text-emerald-600',
                    ].join(' ')}>
                      {isPast ? '종료' : `D-${dDay}`}
                    </span>
                    <span className="text-sm font-semibold text-neutral-800">
                      {e.exam_name}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {new Date(e.exam_date).toLocaleDateString('ko-KR', {
                      year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
                    })}
                    {e.school ? ` · ${e.school}` : ''}
                  </p>
                  {e.note && <p className="text-[11px] text-neutral-400 mt-0.5">{e.note}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(e.id)}
                  className="shrink-0 text-neutral-300 hover:text-red-400 text-sm"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-neutral-400">
          아직 설정된 시험 일정이 없습니다.
        </div>
      )}

      {/* 새 시험 추가 */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-400">
          시험 일정 추가
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <label className="text-xs font-semibold text-neutral-600">시험명</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="내신 시험"
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
            />
          </div>
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <label className="text-xs font-semibold text-neutral-600">시험 날짜 *</label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
            />
          </div>
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <label className="text-xs font-semibold text-neutral-600">학교 (선택)</label>
            <input
              type="text"
              value={newSchool}
              onChange={(e) => setNewSchool(e.target.value)}
              placeholder="○○중학교"
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
            />
          </div>
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <label className="text-xs font-semibold text-neutral-600">메모 (선택)</label>
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="예: 3과~6과"
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
            />
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}

        <button
          type="button"
          onClick={handleAdd}
          disabled={saving || !newDate}
          className="w-full rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-40"
        >
          {saving ? '저장 중…' : '+ 시험 추가'}
        </button>
      </div>
    </main>
  );
}
