import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import type { GradeResult, GradeItem } from '@/app/api/homework/grade/route';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export default async function AdminHomeworkDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  // 숙제 정보
  const { data: hw } = await supabase
    .from('photo_homework')
    .select('id, title, description, subject, answer_key_url, due_at, is_active, created_at')
    .eq('id', id)
    .maybeSingle();

  if (!hw) notFound();

  // 학생 제출 목록
  const { data: submissions } = await supabase
    .from('photo_homework_submissions')
    .select('id, student_id, ai_results, correct_count, total_count, graded_at')
    .eq('homework_id', id)
    .order('graded_at', { ascending: false });

  // 학생 이름 가져오기
  const studentIds = [...new Set((submissions ?? []).map((s: any) => s.student_id as string))];
  const { data: profiles } = studentIds.length > 0
    ? await supabase
        .from('profiles')
        .select('id, full_name, name, email')
        .in('id', studentIds)
    : { data: [] };

  const profileMap = new Map(
    (profiles ?? []).map((p: any) => [p.id as string, p]),
  );

  const subjectLabel: Record<string, string> = {
    vocab: '어휘/단어', grammar: '문법 드릴', reading: '리딩 문제', mixed: '복합',
  };

  return (
    <main className="mx-auto max-w-3xl space-y-6 pb-12">
      {/* 헤더 */}
      <header>
        <div className="text-xs text-neutral-400 mb-1">
          <Link href="/admin/homework" className="hover:underline">숙제 목록</Link>
          {' / 결과'}
        </div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-neutral-900">{hw.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {hw.subject && (
                <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] text-neutral-500">
                  {subjectLabel[(hw as any).subject] ?? hw.subject}
                </span>
              )}
              {hw.due_at && (
                <span className="text-xs text-neutral-400">
                  마감{' '}
                  {new Intl.DateTimeFormat('ko-KR', {
                    month: 'numeric', day: 'numeric', weekday: 'short',
                  }).format(new Date(hw.due_at))}
                </span>
              )}
              <span className="text-xs text-neutral-400">
                제출 {(submissions ?? []).length}명
              </span>
            </div>
          </div>

          <Link
            href={`/admin/homework/${id}/edit`}
            className="shrink-0 rounded-xl border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50"
          >
            정답 수정
          </Link>
        </div>
      </header>

      {/* 제출 없음 */}
      {(submissions ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-neutral-400">
          아직 제출한 학생이 없습니다.
        </div>
      ) : (
        <div className="space-y-4">
          {(submissions ?? []).map((sub: any) => {
            const profile = profileMap.get(sub.student_id);
            const name =
              (profile as any)?.full_name ??
              (profile as any)?.name ??
              (profile as any)?.email ??
              sub.student_id.slice(0, 8);

            const result = sub.ai_results as GradeResult | null;
            const scorePct = sub.total_count > 0
              ? Math.round((sub.correct_count / sub.total_count) * 100)
              : null;

            const gradedAt = sub.graded_at
              ? new Intl.DateTimeFormat('ko-KR', {
                  month: 'numeric', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                }).format(new Date(sub.graded_at))
              : null;

            return (
              <details
                key={sub.id}
                className="rounded-2xl border border-neutral-200 bg-white overflow-hidden"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-3 p-5 hover:bg-neutral-50">
                  <div className="flex items-center gap-3">
                    {scorePct !== null && (
                      <span className={[
                        'text-lg font-black',
                        scorePct >= 80 ? 'text-emerald-600'
                        : scorePct >= 60 ? 'text-amber-500'
                        : 'text-red-500',
                      ].join(' ')}>
                        {scorePct}%
                      </span>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">{name}</p>
                      <p className="text-xs text-neutral-400">
                        {sub.correct_count}/{sub.total_count}개 정답
                        {gradedAt && ` · ${gradedAt}`}
                      </p>
                    </div>
                  </div>
                  <span className="text-neutral-300 text-xs">▾</span>
                </summary>

                {/* 펼치면 문항별 결과 */}
                {result?.items && (
                  <div className="border-t border-neutral-100 p-5 space-y-2">
                    {result.overall_feedback && (
                      <p className="text-xs text-neutral-600 italic mb-3">
                        {result.overall_feedback}
                      </p>
                    )}
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {result.items.map((item: GradeItem) => (
                        <div
                          key={item.number}
                          className={[
                            'rounded-xl border p-3 text-xs',
                            item.is_correct
                              ? 'border-emerald-200 bg-emerald-50'
                              : 'border-red-200 bg-red-50',
                          ].join(' ')}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={item.is_correct ? 'text-emerald-600' : 'text-red-600'}>
                              {item.is_correct ? '○' : '✕'}
                            </span>
                            <span className="text-neutral-400">Q{item.number}</span>
                            <span className="font-medium text-neutral-800">
                              {item.student_answer || '(미기입)'}
                            </span>
                          </div>
                          {!item.is_correct && (
                            <>
                              <p className="text-neutral-500">
                                정답: <span className="font-semibold">{item.correct_answer}</span>
                              </p>
                              {item.explanation && (
                                <p className="text-red-700 mt-1">{item.explanation}</p>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </details>
            );
          })}
        </div>
      )}
    </main>
  );
}
