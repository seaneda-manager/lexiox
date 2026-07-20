// app/(protected)/teacher/session-report/[studentId]/page.tsx
// 선생님 — 특정 학생의 오늘 PT 요약 (하브루타 용)

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export default async function TeacherStudentPtPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const today = todayISO();

  // ── 학생 정보 ──────────────────────────────────────────────
  const { data: student } = await supabase
    .from('academy_students')
    .select('id, display_name, grade, school, user_id, auth_user_id, class_days')
    .eq('id', studentId)
    .maybeSingle();

  if (!student) notFound();

  const authId    = (student as any).user_id ?? (student as any).auth_user_id as string | null;
  const studentName = (student as any).display_name ?? '(이름 없음)';

  // ── 숙제 결과 ─────────────────────────────────────────────
  const { data: activeHW } = await supabase
    .from('photo_homework')
    .select('id, title, subject')
    .eq('is_active', true);

  const hwIds = (activeHW ?? []).map((h: any) => h.id as string);

  const { data: hwSubs } = hwIds.length > 0 && authId
    ? await supabase
        .from('photo_homework_submissions')
        .select('homework_id, correct_count, total_count, result_data')
        .eq('student_id', authId)
        .in('homework_id', hwIds)
        .gte('created_at', today)
    : { data: [] };

  const hwResults = (hwSubs ?? []).map((sub: any) => {
    const hw       = (activeHW ?? []).find((h: any) => h.id === sub.homework_id);
    const scorePct = sub.total_count > 0 ? Math.round((sub.correct_count / sub.total_count) * 100) : null;
    const items: any[] = (sub.result_data as any)?.items ?? [];
    return {
      title:      hw?.title ?? '숙제',
      subject:    hw?.subject ?? '',
      scorePct,
      correct:    sub.correct_count ?? 0,
      total:      sub.total_count   ?? 0,
      wrongItems: items.filter((it: any) => !it.is_correct),
    };
  });

  // ── 리딩 드릴 ─────────────────────────────────────────────
  const { data: readingSessions } = authId
    ? await supabase
        .from('hi_naesin_sessions')
        .select('id, passage_id, status, score_percent')
        .eq('student_id', authId)
        .gte('started_at', today)
    : { data: [] };

  const readingPassageIds = [...new Set((readingSessions ?? []).map((s: any) => s.passage_id as string))];
  const { data: passages } = readingPassageIds.length > 0
    ? await supabase
        .from('hi_naesin_passages')
        .select('id, title')
        .in('id', readingPassageIds)
    : { data: [] };
  const passageMap = new Map((passages ?? []).map((p: any) => [p.id, p.title]));

  // ── 그래머 ─────────────────────────────────────────────────
  const { data: grammarRows } = authId
    ? await supabase
        .from('grammar_2026_unit_completions')
        .select('unit_id, completed_at')
        .eq('student_id', authId)
        .gte('completed_at', today)
    : { data: [] };

  // ── 드릴 응답 전체 (타입별 분석용) ───────────────────────────
  const sessionIds = (readingSessions ?? []).map((s: any) => s.id as string);
  const { data: allResponses } = sessionIds.length > 0
    ? await supabase
        .from('hi_naesin_drill_responses')
        .select('drill_id, is_correct, score_pct, response_text, feedback_text')
        .in('session_id', sessionIds)
    : { data: [] };

  const drillIds = [...new Set((allResponses ?? []).map((r: any) => r.drill_id as string))];
  const { data: drillMeta } = drillIds.length > 0
    ? await supabase
        .from('hi_naesin_drills')
        .select('id, drill_type, sentence_en, sentence_ko, payload')
        .in('id', drillIds)
    : { data: [] };

  const drillMetaMap = new Map((drillMeta ?? []).map((d: any) => [d.id, d]));

  // 드릴 타입별 집계
  type DrillTypeStat = {
    label: string;
    total: number;
    correct: number;
    wrongs: { sentenceEn: string; studentAnswer: string; feedback: string | null }[];
  };
  const DRILL_TYPE_LABELS: Record<string, string> = {
    vocab:          '단어',
    translation:    '해석',
    fill_blank:     '빈칸',
    grammar_choice: '문법',
    writing:        '영작',
  };
  const typeStats = new Map<string, DrillTypeStat>();
  for (const resp of allResponses ?? []) {
    const meta = drillMetaMap.get((resp as any).drill_id);
    if (!meta) continue;
    const type: string = meta.drill_type;
    const stat = typeStats.get(type) ?? { label: DRILL_TYPE_LABELS[type] ?? type, total: 0, correct: 0, wrongs: [] };
    stat.total += 1;
    if ((resp as any).is_correct === true) stat.correct += 1;
    if ((resp as any).is_correct === false) {
      const payload = meta.payload as Record<string, unknown> ?? {};
      const studentAns = (resp as any).response_text ?? (resp as any).response_choice ?? '—';
      const correctAns = (payload.answer_ko ?? payload.answer ?? payload.correct_option ?? '') as string;
      stat.wrongs.push({
        sentenceEn:    meta.sentence_en ?? (payload.sentence_en as string) ?? '',
        studentAnswer: `${studentAns}${correctAns ? ` → 정답: ${correctAns}` : ''}`,
        feedback:      (resp as any).feedback_text ?? null,
      });
    }
    typeStats.set(type, stat);
  }

  const wrongCount = (allResponses ?? []).filter((r: any) => r.is_correct === false).length;
  const totalAnswered = (allResponses ?? []).length;
  const totalCorrect = (allResponses ?? []).filter((r: any) => r.is_correct === true).length;
  const overallPct = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : null;

  const todayStr = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });

  return (
    <main className="mx-auto max-w-2xl space-y-6 pb-16">

      {/* 헤더 */}
      <header>
        <div className="text-xs text-neutral-400 mb-1">
          <Link href="/teacher/session-report" className="hover:underline">오늘 리포트</Link>
          {' / '}
          {studentName}
        </div>
        <h1 className="text-xl font-bold text-neutral-900">{studentName} — PT 시트</h1>
        <p className="text-xs text-neutral-400">{todayStr}</p>
      </header>

      {/* 숙제 */}
      <section className="rounded-2xl border border-neutral-200 bg-white divide-y">
        <div className="px-5 py-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-neutral-800">📋 숙제 채점</h2>
          {hwResults.length === 0
            ? <span className="text-sm text-neutral-300">미제출</span>
            : <span className={`text-xl font-black ${
                (hwResults[0].scorePct ?? 0) >= 80 ? 'text-emerald-600'
                : (hwResults[0].scorePct ?? 0) >= 60 ? 'text-amber-500'
                : 'text-red-500'
              }`}>{hwResults[0].scorePct ?? '—'}%</span>
          }
        </div>

        {hwResults.map((hw, i) => (
          <div key={i} className="px-5 py-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-neutral-700">{hw.title}</p>
              <p className="text-sm text-neutral-500">{hw.correct}/{hw.total}</p>
            </div>
            {hw.wrongItems.length > 0 && (
              <div className="space-y-1">
                {hw.wrongItems.map((it: any) => (
                  <div key={it.number} className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2">
                    <span className="shrink-0 text-xs font-bold text-red-500">Q{it.number}</span>
                    <div className="text-xs text-red-700">
                      <span className="line-through text-red-400 mr-2">내 답: {it.student_answer || '—'}</span>
                      <span className="font-semibold">정답: {it.correct_answer}</span>
                      {it.explanation && <p className="mt-1 text-red-600 opacity-80">{it.explanation}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {hwResults.length === 0 && (
          <div className="px-5 py-4 text-sm text-neutral-400">오늘 제출된 숙제가 없습니다.</div>
        )}
      </section>

      {/* 프로그램 학습 */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-400">💻 프로그램</h2>

        {/* 리딩 드릴 */}
        {readingPassageIds.length > 0 ? (
          <div className="rounded-2xl border border-sky-200 bg-white overflow-hidden">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 py-3 bg-sky-50">
              <p className="text-sm font-semibold text-sky-800">📖 리딩 드릴</p>
              {overallPct !== null && (
                <span className={`text-lg font-black ${overallPct >= 80 ? 'text-emerald-600' : overallPct >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                  {overallPct}%
                </span>
              )}
            </div>

            {/* 지문 목록 */}
            <div className="px-5 py-3 space-y-1 border-b border-sky-100">
              {(readingSessions ?? []).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <span className="text-neutral-700 truncate">{passageMap.get(s.passage_id) ?? '(지문)'}</span>
                  <span className={`shrink-0 ml-2 text-xs font-semibold ${s.status === 'submitted' ? 'text-emerald-600' : 'text-amber-500'}`}>
                    {s.status === 'submitted' ? '완료' : '진행 중'}
                  </span>
                </div>
              ))}
            </div>

            {/* 드릴 타입별 정답률 */}
            {typeStats.size > 0 && (
              <div className="px-5 py-3 space-y-2 border-b border-sky-100">
                {[...typeStats.entries()].map(([type, stat]) => {
                  const pct = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
                  return (
                    <div key={type}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-neutral-600">{stat.label}</span>
                        <span className={`font-semibold ${pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                          {stat.correct}/{stat.total} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-neutral-100">
                        <div
                          className={`h-1.5 rounded-full ${pct >= 80 ? 'bg-emerald-400' : pct >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 오답 상세 */}
            {wrongCount > 0 && (
              <div className="px-5 py-3 space-y-2">
                <p className="text-xs font-semibold text-red-500">오답 {wrongCount}개</p>
                {[...typeStats.entries()].flatMap(([, stat]) =>
                  stat.wrongs.map((w, i) => (
                    <div key={i} className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 space-y-0.5">
                      {w.sentenceEn && (
                        <p className="text-xs text-neutral-500 italic">{w.sentenceEn}</p>
                      )}
                      <p className="text-xs text-red-700">{w.studentAnswer}</p>
                      {w.feedback && (
                        <p className="text-xs text-red-500 opacity-80">{w.feedback}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-neutral-100 bg-neutral-50 px-5 py-3 text-sm text-neutral-400">
            📖 리딩 드릴 미진행
          </div>
        )}

        {/* 그래머 */}
        {(grammarRows ?? []).length > 0 ? (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-3">
            <p className="text-sm font-semibold text-indigo-800">
              ✏️ 그래머 — {(grammarRows ?? []).length}유닛 완료
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-neutral-100 bg-neutral-50 px-5 py-3 text-sm text-neutral-400">
            ✏️ 그래머 미완료
          </div>
        )}
      </section>

      {/* 하브루타 가이드 */}
      <section className="rounded-2xl border border-violet-200 bg-violet-50 p-5 space-y-3">
        <h2 className="text-sm font-bold text-violet-800">💬 하브루타 포인트</h2>
        <ul className="space-y-2 text-sm text-violet-700">
          {hwResults.some(h => h.wrongItems.length > 0) && (
            <li>→ 숙제 오답 Q{hwResults.find(h=>h.wrongItems.length>0)?.wrongItems[0]?.number}번 — 왜 틀렸는지 설명시키기</li>
          )}
          {readingPassageIds.length > 0 && overallPct !== null && overallPct < 80 && (
            <li>→ 리딩 드릴 {overallPct}% — 틀린 문장 다시 해석시키기 ({wrongCount}개)</li>
          )}
          {readingPassageIds.length > 0 && (overallPct === null || overallPct >= 80) && (
            <li>→ &quot;{passageMap.get(readingPassageIds[0])}&quot; 핵심 문장 구술</li>
          )}
          {(() => {
            const weakType = [...typeStats.entries()]
              .filter(([, s]) => s.total > 0)
              .sort(([, a], [, b]) => (a.correct / a.total) - (b.correct / b.total))[0];
            return weakType && (weakType[1].correct / weakType[1].total) < 0.7 ? (
              <li>→ {weakType[1].label} 유형 집중 — {Math.round((weakType[1].correct / weakType[1].total) * 100)}% 정답률</li>
            ) : null;
          })()}
          {(grammarRows ?? []).length > 0 && (
            <li>→ 오늘 문법 유닛 예문 만들기</li>
          )}
          <li>→ 다음 수업 예고 + 복습 포인트 확인</li>
        </ul>
      </section>

      <div className="flex gap-3">
        <Link
          href="/teacher/session-report"
          className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-center text-sm text-neutral-600 hover:bg-neutral-50"
        >
          ← 전체 리포트로
        </Link>
        <Link
          href={`/teacher/parent-report/${studentId}`}
          className="flex-1 rounded-xl border border-sky-200 bg-sky-50 py-2.5 text-center text-sm font-semibold text-sky-700 hover:bg-sky-100"
        >
          📤 부모님 리포트
        </Link>
      </div>
    </main>
  );
}
