import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase/server';
import { sourceTypeLabel, gradeLabel } from '@/models/hi-naesin';
import type { HiNaesinPassageRow } from '@/models/hi-naesin';
import { startHiNaesinDrillSessionAction } from './actions';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ grade?: string; source_type?: string }>;

export default async function HiNaesinPassageStudentPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const supabase = await getServerSupabase();

  const { data: { user } } = await supabase.auth.getUser();

  let query = supabase
    .from('hi_naesin_passages')
    .select('id, source_type, grade, exam_year, exam_month, question_number, school_name, textbook_name, unit_label, book_name, book_unit, title, passage_text, word_count, topic_tags, is_published, updated_at')
    .eq('is_published', true)
    .order('grade')
    .order('source_type')
    .order('updated_at', { ascending: false });

  if (sp.grade) query = query.eq('grade', sp.grade);
  if (sp.source_type) query = query.eq('source_type', sp.source_type);

  const { data } = await query;
  const rows = (data ?? []) as HiNaesinPassageRow[];

  // 학생의 진행 중 세션 목록
  const { data: sessions } = user ? await supabase
    .from('hi_naesin_sessions')
    .select('passage_id, status')
    .eq('student_id', user.id)
    .eq('session_type', 'drill') : { data: [] };

  const sessionMap: Record<string, string> = {};
  for (const s of sessions ?? []) {
    sessionMap[s.passage_id] = s.status;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <header>
        <h1 className="text-2xl font-bold text-neutral-900">고등 내신 Drill</h1>
        <p className="mt-1 text-sm text-neutral-500">
          지문을 선택해서 Drill을 시작하세요.
        </p>
      </header>

      {/* 필터 */}
      <form className="flex flex-wrap gap-3">
        <select
          name="grade"
          defaultValue={sp.grade ?? ''}
          className="rounded-xl border px-3 py-2 text-sm outline-none"
        >
          <option value="">전체 학년</option>
          <option value="H1">고1</option>
          <option value="H2">고2</option>
          <option value="H3">고3</option>
        </select>
        <select
          name="source_type"
          defaultValue={sp.source_type ?? ''}
          className="rounded-xl border px-3 py-2 text-sm outline-none"
        >
          <option value="">전체 출처</option>
          <option value="mock_exam">모의고사</option>
          <option value="textbook">교과서</option>
          <option value="external_book">외부교재</option>
        </select>
        <button type="submit" className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50">
          적용
        </button>
      </form>

      {/* 지문 목록 */}
      <div className="space-y-3">
        {rows.map((row) => {
          const status = sessionMap[row.id];
          const hint = buildHint(row);

          return (
            <div
              key={row.id}
              className="flex flex-col gap-3 rounded-2xl border bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-neutral-200 px-2 py-0.5 text-xs text-neutral-500">
                    {gradeLabel(row.grade as never)}
                  </span>
                  <span className="rounded-full border border-neutral-200 px-2 py-0.5 text-xs text-neutral-500">
                    {sourceTypeLabel(row.source_type as never)}
                  </span>
                  {status === 'started' && (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                      진행 중
                    </span>
                  )}
                  {status === 'submitted' && (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                      완료
                    </span>
                  )}
                </div>
                <h2 className="mt-2 text-base font-semibold text-neutral-900">
                  {row.title ?? '(제목 없음)'}
                </h2>
                <p className="mt-0.5 text-xs text-neutral-400">{hint}</p>
              </div>

              <form action={startHiNaesinDrillSessionAction} className="shrink-0">
                <input type="hidden" name="passage_id" value={row.id} />
                <button
                  type="submit"
                  className="rounded-xl bg-neutral-900 px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
                >
                  {status === 'started' ? '이어하기' : status === 'submitted' ? '다시 하기' : '시작하기'}
                </button>
              </form>
            </div>
          );
        })}

        {rows.length === 0 && (
          <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-neutral-400">
            등록된 지문이 없습니다.
          </div>
        )}
      </div>
    </main>
  );
}

function buildHint(row: HiNaesinPassageRow): string {
  if (row.source_type === 'mock_exam') {
    return [row.exam_year, row.exam_month ? `${row.exam_month}월` : null, row.question_number ? `${row.question_number}번` : null]
      .filter(Boolean).join(' ');
  }
  if (row.source_type === 'textbook') {
    return [row.school_name, row.textbook_name, row.unit_label].filter(Boolean).join(' / ');
  }
  return [row.book_name, row.book_unit].filter(Boolean).join(' / ');
}
