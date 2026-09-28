import { getServerSupabase } from '@/lib/supabase/server';
import type { MiddleNaesinDrillDetailItem, MiddleNaesinDrillType } from '@/lib/middle-naesin/drill-results';

const DRILL_TYPE_LABEL: Record<MiddleNaesinDrillType, string> = {
  translation: '영한번역',
  composition: '한영작문',
  vocab_check: '단어확인',
  vocab_test_en_en: '단어시험(영영)',
  vocab_test_en_to_ko: '단어시험(영한)',
  vocab_test_ko_to_en: '단어시험(한영)',
  vocab_cram: '디지털깜지',
  grammar_point: '문법포인트',
};

type ResultRow = {
  id: string;
  student_id: string;
  unit_id: string;
  drill_type: MiddleNaesinDrillType;
  ref_id: string;
  score: number;
  total: number;
  detail: MiddleNaesinDrillDetailItem[] | null;
  attempt_count: number;
  completed_at: string;
};

export default async function MiddleNaesinDrillResultsReport() {
  const supabase = await getServerSupabase();

  const { data: results } = await supabase
    .from('middle_naesin_drill_results')
    .select('*')
    .order('completed_at', { ascending: false });

  const rows = (results ?? []) as ResultRow[];

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-neutral-400">
        아직 저장된 드릴 결과가 없습니다.
      </div>
    );
  }

  const studentIds = [...new Set(rows.map((r) => r.student_id))];
  const unitIds = [...new Set(rows.map((r) => r.unit_id))];
  const grammarPointIds = [...new Set(rows.filter((r) => r.drill_type === 'grammar_point' && r.ref_id).map((r) => r.ref_id))];

  const [{ data: students }, { data: units }, { data: grammarPoints }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email').in('id', studentIds),
    supabase.from('middle_naesin_units').select('id, publisher, grade, semester, lesson_number, lesson_title').in('id', unitIds),
    grammarPointIds.length > 0
      ? supabase.from('middle_naesin_contents').select('id, title').in('id', grammarPointIds)
      : Promise.resolve({ data: [] as { id: string; title: string | null }[] }),
  ]);

  const studentMap = new Map((students ?? []).map((s) => [s.id, s.full_name ?? s.email ?? s.id.slice(0, 8)]));
  const unitMap = new Map(
    (units ?? []).map((u) => [
      u.id,
      `${u.publisher} · ${u.grade} ${u.semester}학기${u.lesson_number != null ? ` · L${u.lesson_number}` : ''}${u.lesson_title ? ` "${u.lesson_title}"` : ''}`,
    ]),
  );
  const grammarPointMap = new Map((grammarPoints ?? []).map((g) => [g.id, g.title ?? '문법 포인트']));

  const rowsByStudent = new Map<string, ResultRow[]>();
  for (const r of rows) {
    if (!rowsByStudent.has(r.student_id)) rowsByStudent.set(r.student_id, []);
    rowsByStudent.get(r.student_id)!.push(r);
  }

  const studentEntries = [...rowsByStudent.entries()].sort((a, b) =>
    (studentMap.get(a[0]) ?? '').localeCompare(studentMap.get(b[0]) ?? ''),
  );

  return (
    <div className="space-y-6">
      {studentEntries.map(([studentId, studentRows]) => (
        <section key={studentId} className="rounded-2xl border bg-white overflow-hidden">
          <div className="border-b bg-neutral-50 px-5 py-3 text-sm font-semibold text-neutral-800">
            {studentMap.get(studentId) ?? studentId.slice(0, 8)}
          </div>
          <div className="divide-y">
            {studentRows.map((r) => {
              const pct = r.total > 0 ? Math.round((r.score / r.total) * 100) : 0;
              const label =
                r.drill_type === 'grammar_point' && r.ref_id
                  ? `문법: ${grammarPointMap.get(r.ref_id) ?? r.ref_id}`
                  : DRILL_TYPE_LABEL[r.drill_type];
              const wrongItems = (r.detail ?? []).filter((d) => !d.isCorrect);

              return (
                <div key={r.id} className="px-5 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-neutral-800">{label}</div>
                      <div className="truncate text-xs text-neutral-400">{unitMap.get(r.unit_id) ?? r.unit_id}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-xs text-neutral-500">
                      <span
                        className={[
                          'rounded-full border px-2.5 py-0.5 font-semibold',
                          pct >= 80 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                          pct >= 50 ? 'border-amber-200 bg-amber-50 text-amber-700' :
                          'border-rose-200 bg-rose-50 text-rose-700',
                        ].join(' ')}
                      >
                        {r.score}/{r.total} ({pct}%)
                      </span>
                      <span>시도 {r.attempt_count}회</span>
                      <span>{new Date(r.completed_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  {wrongItems.length > 0 && (
                    <details className="mt-2 rounded-xl border border-rose-100 bg-rose-50/50 px-3 py-2">
                      <summary className="cursor-pointer text-xs font-medium text-rose-600">
                        오답 {wrongItems.length}개 보기
                      </summary>
                      <div className="mt-2 space-y-2">
                        {wrongItems.map((d, i) => (
                          <div key={i} className="rounded-lg bg-white p-2.5 text-xs leading-relaxed">
                            <p className="font-medium text-neutral-800">{d.prompt}</p>
                            <p className="mt-1 text-rose-600">학생 답: {d.yourAnswer || '(미응답)'}</p>
                            <p className="text-emerald-700">정답: {d.correctAnswer}</p>
                            {d.explanation && <p className="mt-1 text-sky-700">💡 {d.explanation}</p>}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
