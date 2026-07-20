// app/(protected)/teacher/parent-report/[studentId]/page.tsx
// 선생님 → 부모님 공유용 주간 리포트

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import CopyLinkButton from './_components/CopyLinkButton';
import PrintButton from './_components/PrintButton';

export const dynamic = 'force-dynamic';

function getWeekRange(weeksAgo = 0) {
  const now = new Date();
  const day = now.getDay(); // 0=일, 1=월 ...
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day === 0 ? 7 : day) - 1) - weeksAgo * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return {
    from: monday.toISOString(),
    to:   sunday.toISOString(),
    label: `${monday.getMonth() + 1}월 ${monday.getDate()}일 ~ ${sunday.getMonth() + 1}월 ${sunday.getDate()}일`,
  };
}

const DRILL_TYPE_LABELS: Record<string, string> = {
  vocab:          '단어',
  translation:    '해석',
  fill_blank:     '빈칸',
  grammar_choice: '문법',
  writing:        '영작',
};

type Props = {
  params:       Promise<{ studentId: string }>;
  searchParams: Promise<{ week?: string }>;
};

export default async function ParentReportPage({ params, searchParams }: Props) {
  const { studentId } = await params;
  const { week }      = await searchParams;
  const weeksAgo      = Math.max(0, Math.min(4, parseInt(week ?? '0', 10) || 0));

  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const range = getWeekRange(weeksAgo);

  // ── 학생 정보 ──────────────────────────────────────────────
  const { data: student } = await supabase
    .from('academy_students')
    .select('id, display_name, grade, school, program, user_id, auth_user_id')
    .eq('id', studentId)
    .maybeSingle();

  if (!student) notFound();

  const authId      = (student as any).user_id ?? (student as any).auth_user_id as string | null;
  const studentName = (student as any).display_name ?? '(이름 없음)';
  const grade       = (student as any).grade ?? '';
  const school      = (student as any).school ?? '';

  // ── 리딩 드릴 세션 ────────────────────────────────────────
  const { data: sessions } = authId
    ? await supabase
        .from('hi_naesin_sessions')
        .select('id, passage_id, status, started_at, submitted_at')
        .eq('student_id', authId)
        .gte('started_at', range.from)
        .lte('started_at', range.to)
        .order('started_at')
    : { data: [] };

  const sessionRows = sessions ?? [];
  const completedSessions = sessionRows.filter((s: any) => s.status === 'submitted');

  // 지문 이름
  const passageIds = [...new Set(sessionRows.map((s: any) => s.passage_id as string))];
  const { data: passages } = passageIds.length > 0
    ? await supabase.from('hi_naesin_passages').select('id, title').in('id', passageIds)
    : { data: [] };
  const passageMap = new Map((passages ?? []).map((p: any) => [p.id as string, p.title as string]));

  // ── 드릴 응답 ─────────────────────────────────────────────
  const sessionIds = sessionRows.map((s: any) => s.id as string);
  const { data: responses } = sessionIds.length > 0
    ? await supabase
        .from('hi_naesin_drill_responses')
        .select('drill_id, is_correct, score_pct, response_text, feedback_text')
        .in('session_id', sessionIds)
    : { data: [] };

  const drillIds = [...new Set((responses ?? []).map((r: any) => r.drill_id as string))];
  const { data: drills } = drillIds.length > 0
    ? await supabase
        .from('hi_naesin_drills')
        .select('id, drill_type')
        .in('id', drillIds)
    : { data: [] };
  const drillTypeMap = new Map((drills ?? []).map((d: any) => [d.id as string, d.drill_type as string]));

  // 드릴 타입별 집계
  const typeStats = new Map<string, { correct: number; total: number }>();
  let totalCorrect = 0;
  let totalAnswered = 0;
  for (const resp of responses ?? []) {
    const type = drillTypeMap.get((resp as any).drill_id) ?? 'unknown';
    const cur = typeStats.get(type) ?? { correct: 0, total: 0 };
    cur.total += 1;
    totalAnswered += 1;
    if ((resp as any).is_correct === true) { cur.correct += 1; totalCorrect += 1; }
    typeStats.set(type, cur);
  }
  const overallPct = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : null;

  // ── 그래머 ─────────────────────────────────────────────────
  const { data: grammarRows } = authId
    ? await supabase
        .from('grammar_2026_unit_completions')
        .select('unit_id, completed_at')
        .eq('student_id', authId)
        .gte('completed_at', range.from)
        .lte('completed_at', range.to)
    : { data: [] };

  // ── 단어 학습 ─────────────────────────────────────────────
  const { data: vocaRows } = authId
    ? await supabase
        .from('student_vocab_assignments')
        .select('id, completed_at')
        .eq('student_id', studentId)   // academy student id
        .not('completed_at', 'is', null)
        .gte('completed_at', range.from)
        .lte('completed_at', range.to)
    : { data: [] };

  // ── 요일별 학습 현황 ──────────────────────────────────────
  const DAY_KO = ['일', '월', '화', '수', '목', '금', '토'];
  type DayRecord = { date: string; dayKo: string; reading: boolean; grammar: boolean; vocab: boolean };
  const dayMap = new Map<string, DayRecord>();

  const dateKey = (iso: string) => iso.slice(0, 10);

  for (const s of completedSessions) {
    const key = dateKey((s as any).started_at);
    if (!dayMap.has(key)) {
      const d = new Date((s as any).started_at);
      dayMap.set(key, { date: key, dayKo: DAY_KO[d.getDay()], reading: false, grammar: false, vocab: false });
    }
    dayMap.get(key)!.reading = true;
  }
  for (const g of grammarRows ?? []) {
    const key = dateKey((g as any).completed_at);
    if (!dayMap.has(key)) {
      const d = new Date((g as any).completed_at);
      dayMap.set(key, { date: key, dayKo: DAY_KO[d.getDay()], reading: false, grammar: false, vocab: false });
    }
    dayMap.get(key)!.grammar = true;
  }
  for (const v of vocaRows ?? []) {
    const key = dateKey((v as any).completed_at);
    if (!dayMap.has(key)) {
      const d = new Date((v as any).completed_at);
      dayMap.set(key, { date: key, dayKo: DAY_KO[d.getDay()], reading: false, grammar: false, vocab: false });
    }
    dayMap.get(key)!.vocab = true;
  }
  const dayRecords = [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  // ── 활동일 수 ─────────────────────────────────────────────
  const activeDays = dayRecords.length;
  const grammarUnits = (grammarRows ?? []).length;
  const vocaSessions = (vocaRows ?? []).length;

  const reportedAt = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <main className="mx-auto max-w-2xl space-y-6 pb-16 px-4 py-6">

      {/* 선생님 전용 컨트롤 — 인쇄 시 숨김 */}
      <div className="print:hidden flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Link href="/teacher/session-report" className="hover:underline text-xs">← 오늘 리포트</Link>
          <span className="text-neutral-300">|</span>
          <span className="font-medium text-neutral-700">주간 리포트 공유</span>
        </div>
        <div className="flex items-center gap-2">
          {/* 주간 선택 */}
          <div className="flex gap-1">
            {[0, 1, 2].map((w) => (
              <Link
                key={w}
                href={`/teacher/parent-report/${studentId}?week=${w}`}
                className={[
                  'rounded-lg px-2.5 py-1 text-xs font-medium transition',
                  weeksAgo === w
                    ? 'bg-neutral-800 text-white'
                    : 'border border-neutral-200 text-neutral-600 hover:bg-neutral-100',
                ].join(' ')}
              >
                {w === 0 ? '이번 주' : w === 1 ? '저번 주' : `${w}주 전`}
              </Link>
            ))}
          </div>
          <CopyLinkButton />
          <PrintButton />
        </div>
      </div>

      {/* 리포트 본문 */}
      <article className="rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-sm">

        {/* 헤더 */}
        <header className="bg-gradient-to-br from-sky-700 to-sky-500 px-6 py-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sky-200 text-xs font-medium uppercase tracking-widest mb-1">LEXiOX 학습 리포트</p>
              <h1 className="text-2xl font-black">{studentName}</h1>
              <p className="text-sky-200 text-sm mt-0.5">{school} {grade}</p>
            </div>
            <div className="text-right">
              <p className="text-sky-200 text-xs">{range.label}</p>
              <p className="text-sky-300 text-[11px] mt-1">발행: {reportedAt}</p>
            </div>
          </div>

          {/* 핵심 수치 3개 */}
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-white/15 px-3 py-3 text-center">
              <p className="text-2xl font-black">{activeDays}</p>
              <p className="text-sky-200 text-[11px] mt-0.5">학습일</p>
            </div>
            <div className="rounded-xl bg-white/15 px-3 py-3 text-center">
              <p className={`text-2xl font-black ${overallPct !== null && overallPct < 60 ? 'text-red-300' : ''}`}>
                {overallPct !== null ? `${overallPct}%` : '—'}
              </p>
              <p className="text-sky-200 text-[11px] mt-0.5">드릴 정답률</p>
            </div>
            <div className="rounded-xl bg-white/15 px-3 py-3 text-center">
              <p className="text-2xl font-black">{completedSessions.length}</p>
              <p className="text-sky-200 text-[11px] mt-0.5">완료 지문</p>
            </div>
          </div>
        </header>

        <div className="divide-y divide-neutral-100">

          {/* 요일별 활동 */}
          <section className="px-6 py-5">
            <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-400 mb-3">📅 이번 주 학습 현황</h2>
            {dayRecords.length > 0 ? (
              <div className="space-y-2">
                {dayRecords.map((day) => (
                  <div key={day.date} className="flex items-center gap-3">
                    <span className="w-14 shrink-0 text-xs font-semibold text-neutral-500">
                      {day.date.slice(5).replace('-', '/')} ({day.dayKo})
                    </span>
                    <div className="flex gap-1.5">
                      {day.reading && (
                        <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700">리딩</span>
                      )}
                      {day.grammar && (
                        <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">그래머</span>
                      )}
                      {day.vocab && (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">단어</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-400">이번 주 학습 기록이 없습니다.</p>
            )}
          </section>

          {/* 드릴 타입별 정답률 */}
          {typeStats.size > 0 && (
            <section className="px-6 py-5">
              <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-400 mb-3">📊 영역별 정답률</h2>
              <div className="space-y-3">
                {[...typeStats.entries()].map(([type, stat]) => {
                  const pct = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
                  const label = DRILL_TYPE_LABELS[type] ?? type;
                  return (
                    <div key={type}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="font-medium text-neutral-700">{label}</span>
                        <span className={`font-bold text-sm ${pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                          {stat.correct}/{stat.total}문항 &nbsp;{pct}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-neutral-100">
                        <div
                          className={`h-2 rounded-full transition-all ${pct >= 80 ? 'bg-emerald-400' : pct >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 학습 지문 목록 */}
          {completedSessions.length > 0 && (
            <section className="px-6 py-5">
              <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-400 mb-3">📖 학습한 지문</h2>
              <ul className="space-y-1.5">
                {completedSessions.map((s: any) => (
                  <li key={s.id} className="flex items-center gap-2 text-sm">
                    <span className="text-emerald-500 font-bold shrink-0">✓</span>
                    <span className="text-neutral-700">{passageMap.get(s.passage_id) ?? '(지문)'}</span>
                    <span className="text-neutral-400 text-xs ml-auto shrink-0">
                      {new Date(s.started_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 그래머 */}
          {grammarUnits > 0 && (
            <section className="px-6 py-5">
              <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-400 mb-2">✏️ 그래머</h2>
              <p className="text-sm text-neutral-700">이번 주 <strong>{grammarUnits}유닛</strong> 완료</p>
            </section>
          )}

          {/* 선생님 총평 영역 (인쇄용) */}
          <section className="px-6 py-5">
            <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-400 mb-3">💬 선생님 코멘트</h2>
            <div className="min-h-[60px] rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-3">
              {overallPct !== null && overallPct >= 80 && (
                <p className="text-sm text-emerald-700 font-medium">
                  이번 주 드릴 정답률 {overallPct}%로 우수한 성취를 보였습니다. 꾸준한 학습 태도가 돋보입니다.
                </p>
              )}
              {overallPct !== null && overallPct >= 60 && overallPct < 80 && (
                <p className="text-sm text-amber-700 font-medium">
                  이번 주 정답률 {overallPct}%입니다. 틀린 유형을 중심으로 복습하면 더욱 좋은 결과를 기대할 수 있습니다.
                </p>
              )}
              {overallPct !== null && overallPct < 60 && (
                <p className="text-sm text-red-700 font-medium">
                  이번 주 정답률 {overallPct}%입니다. 수업 시간에 오답 내용을 함께 복습하겠습니다.
                </p>
              )}
              {overallPct === null && activeDays > 0 && (
                <p className="text-sm text-neutral-600">이번 주 {activeDays}일 학습했습니다.</p>
              )}
              {activeDays === 0 && (
                <p className="text-sm text-neutral-400">이번 주 학습 기록이 없습니다.</p>
              )}
            </div>
          </section>

          {/* 푸터 */}
          <footer className="px-6 py-4 bg-neutral-50 flex items-center justify-between">
            <p className="text-xs text-neutral-400">LEXiOX · 학습 분석 리포트</p>
            <p className="text-xs text-neutral-400">{reportedAt} 기준</p>
          </footer>

        </div>
      </article>
    </main>
  );
}
