// app/(protected)/teacher/session-report/page.tsx
// 선생님 — 오늘 수업 전체 현황 리포트

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

const DOW_KO = ['일', '월', '화', '수', '목', '금', '토'];

// ── 스텝 완료율 계산 ──────────────────────────────────────────
type StudentReport = {
  studentId:       string;
  name:            string;
  grade:           string | null;
  // 각 스텝 완료 여부
  hwDone:          boolean;
  hwScorePct:      number | null;
  vocaDone:        boolean;
  readingDone:     boolean;
  readingScorePct: number | null;
  grammarDone:     boolean;
  speakingDone:    boolean;
  // 완료 스텝 수 / 전체
  doneCount:       number;
  totalSteps:      number;
};

const STEP_KEYS: (keyof Pick<StudentReport,'hwDone'|'vocaDone'|'readingDone'|'grammarDone'|'speakingDone'>)[] = [
  'hwDone', 'vocaDone', 'readingDone', 'grammarDone', 'speakingDone',
];

const STEP_LABELS: Record<string, string> = {
  hwDone:       '숙제',
  vocaDone:     '단어',
  readingDone:  '리딩',
  grammarDone:  '그래머',
  speakingDone: '스피킹',
};

export default async function TeacherSessionReportPage() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const today    = todayISO();
  const todayDow = new Date().getDay();

  // ── 1. 오늘 수업 있는 학생 목록 (class_days 기준) ────────────
  const { data: allStudents } = await supabase
    .from('academy_students')
    .select('id, display_name, grade, class_days, user_id, auth_user_id')
    .eq('is_active', true)
    .order('display_name');

  const DAY_MAP: Record<string, number> = {
    sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6,
    일:0, 월:1, 화:2, 수:3, 목:4, 금:5, 토:6,
    '0':0,'1':1,'2':2,'3':3,'4':4,'5':5,'6':6,
  };

  // 오늘 수업 있는 학생만 필터링 (class_days 없는 경우 포함)
  const todayStudents = (allStudents ?? []).filter((s: any) => {
    if (!s.class_days || s.class_days.length === 0) return true; // 스케줄 미설정 = 항상 포함
    return s.class_days.some((d: string) => DAY_MAP[d.toLowerCase()] === todayDow);
  });

  if (todayStudents.length === 0) {
    return (
      <main className="mx-auto max-w-3xl space-y-6 pb-12">
        <header>
          <h1 className="text-xl font-bold text-neutral-900">오늘 수업 리포트</h1>
          <p className="text-sm text-neutral-400">{DOW_KO[todayDow]}요일 · {today}</p>
        </header>
        <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-neutral-400">
          오늘 수업 예정 학생이 없습니다.
        </div>
      </main>
    );
  }

  // auth user id 목록 (user_id 또는 auth_user_id)
  const studentAuthIds = todayStudents
    .map((s: any) => (s.user_id ?? s.auth_user_id) as string | null)
    .filter(Boolean) as string[];

  const academyIds = todayStudents.map((s: any) => s.id as string);

  // ── 2. 숙제 제출 현황 ─────────────────────────────────────
  const { data: activeHW } = await supabase
    .from('photo_homework')
    .select('id')
    .eq('is_active', true)
    .limit(10);

  const hwIds = (activeHW ?? []).map((h: any) => h.id as string);

  const { data: hwSubs } = hwIds.length > 0 && studentAuthIds.length > 0
    ? await supabase
        .from('photo_homework_submissions')
        .select('student_id, homework_id, correct_count, total_count')
        .in('student_id', studentAuthIds)
        .in('homework_id', hwIds)
        .gte('created_at', today)
    : { data: [] };

  // studentAuthId → { done, scorePct }
  const hwMap = new Map<string, { done: boolean; scorePct: number | null }>();
  for (const sub of hwSubs ?? []) {
    const sid = (sub as any).student_id as string;
    const pct = (sub as any).total_count > 0
      ? Math.round(((sub as any).correct_count / (sub as any).total_count) * 100)
      : null;
    hwMap.set(sid, { done: true, scorePct: pct });
  }

  // ── 3. 단어 학습 ──────────────────────────────────────────
  const { data: vocaSubs } = academyIds.length > 0
    ? await supabase
        .from('student_vocab_assignments')
        .select('student_id')
        .in('student_id', academyIds)
        .not('completed_at', 'is', null)
        .gte('completed_at', today)
    : { data: [] };

  const vocaSet = new Set((vocaSubs ?? []).map((v: any) => v.student_id as string));

  // ── 4. 리딩 드릴 ─────────────────────────────────────────
  const { data: readingSubs } = studentAuthIds.length > 0
    ? await supabase
        .from('hi_naesin_sessions')
        .select('id, student_id, status')
        .in('student_id', studentAuthIds)
        .eq('status', 'submitted')
        .gte('started_at', today)
    : { data: [] };

  const readingSet = new Set((readingSubs ?? []).map((r: any) => r.student_id as string));

  // 리딩 드릴 정답률 — responses에서 집계
  const readingSessionIds = (readingSubs ?? []).map((r: any) => r.id as string);
  const { data: readingResponses } = readingSessionIds.length > 0
    ? await supabase
        .from('hi_naesin_drill_responses')
        .select('session_id, is_correct')
        .in('session_id', readingSessionIds)
    : { data: [] };

  // session_id → student_id 맵
  const sessionStudentMap = new Map<string, string>(
    (readingSubs ?? []).map((r: any) => [r.id as string, r.student_id as string]),
  );
  // student_id → { correct, total }
  const readingScoreMap = new Map<string, { correct: number; total: number }>();
  for (const resp of readingResponses ?? []) {
    const sid = sessionStudentMap.get((resp as any).session_id);
    if (!sid) continue;
    const cur = readingScoreMap.get(sid) ?? { correct: 0, total: 0 };
    cur.total += 1;
    if ((resp as any).is_correct === true) cur.correct += 1;
    readingScoreMap.set(sid, cur);
  }

  // ── 5. 그래머 ────────────────────────────────────────────
  const { data: grammarSubs } = studentAuthIds.length > 0
    ? await supabase
        .from('grammar_2026_unit_completions')
        .select('student_id')
        .in('student_id', studentAuthIds)
        .gte('completed_at', today)
    : { data: [] };

  const grammarSet = new Set((grammarSubs ?? []).map((g: any) => g.student_id as string));

  // ── 6. 스피킹 ────────────────────────────────────────────
  const { data: speakingSubs } = studentAuthIds.length > 0
    ? await supabase
        .from('speaking_results_2026')
        .select('user_id')
        .in('user_id', studentAuthIds)
        .gte('created_at', today)
    : { data: [] };

  const speakingSet = new Set((speakingSubs ?? []).map((sp: any) => sp.user_id as string));

  // ── 리포트 조합 ───────────────────────────────────────────
  const reports: StudentReport[] = todayStudents.map((s: any) => {
    const authId    = (s.user_id ?? s.auth_user_id) as string | null;
    const academyId = s.id as string;
    const hw        = authId ? (hwMap.get(authId) ?? { done: false, scorePct: null }) : { done: false, scorePct: null };

    const hwDone       = hw.done;
    const vocaDone     = vocaSet.has(academyId);
    const readingDone  = authId ? readingSet.has(authId) : false;
    const grammarDone  = authId ? grammarSet.has(authId) : false;
    const speakingDone = authId ? speakingSet.has(authId) : false;

    const readingScore = authId ? readingScoreMap.get(authId) : undefined;
    const readingScorePct = readingScore && readingScore.total > 0
      ? Math.round((readingScore.correct / readingScore.total) * 100)
      : null;

    const doneCount = [hwDone, vocaDone, readingDone, grammarDone, speakingDone].filter(Boolean).length;

    return {
      studentId:       s.id,
      name:            s.display_name ?? '(이름 없음)',
      grade:           s.grade,
      hwDone,
      hwScorePct:      hw.scorePct,
      vocaDone,
      readingDone,
      readingScorePct,
      grammarDone,
      speakingDone,
      doneCount,
      totalSteps:      5,
    };
  });

  // 완료율 내림차순 정렬
  reports.sort((a, b) => b.doneCount - a.doneCount);

  const allDoneCount = reports.filter(r => r.doneCount === r.totalSteps).length;
  const avgPct       = Math.round(
    reports.reduce((s, r) => s + r.doneCount, 0) / (reports.length * 5) * 100
  );

  return (
    <main className="mx-auto max-w-4xl space-y-6 pb-12">

      {/* 헤더 */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">오늘 수업 리포트</h1>
          <p className="text-sm text-neutral-400">
            {DOW_KO[todayDow]}요일 · {today} · {todayStudents.length}명
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-neutral-800">{avgPct}%</p>
          <p className="text-xs text-neutral-400">전체 평균 완료율</p>
        </div>
      </header>

      {/* 요약 바 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border bg-white p-4 text-center">
          <p className="text-2xl font-black text-neutral-800">{todayStudents.length}</p>
          <p className="text-xs text-neutral-400">오늘 수업 학생</p>
        </div>
        <div className="rounded-2xl border bg-emerald-50 border-emerald-200 p-4 text-center">
          <p className="text-2xl font-black text-emerald-700">{allDoneCount}</p>
          <p className="text-xs text-emerald-600">전체 완료</p>
        </div>
        <div className="rounded-2xl border bg-amber-50 border-amber-200 p-4 text-center">
          <p className="text-2xl font-black text-amber-700">{todayStudents.length - allDoneCount}</p>
          <p className="text-xs text-amber-600">진행 중 / 미시작</p>
        </div>
      </div>

      {/* 학생별 진도 테이블 */}
      <section className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 min-w-[100px]">학생</th>
                {STEP_KEYS.map(k => (
                  <th key={k} className="px-3 py-3 text-center text-xs font-semibold text-neutral-500">
                    {STEP_LABELS[k]}
                  </th>
                ))}
                <th className="px-3 py-3 text-center text-xs font-semibold text-neutral-500">완료율</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {reports.map((r, idx) => {
                const pct = Math.round((r.doneCount / r.totalSteps) * 100);
                return (
                  <tr
                    key={r.studentId}
                    className={[
                      'border-b border-neutral-50 transition hover:bg-neutral-50/50',
                      idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50/20',
                    ].join(' ')}
                  >
                    {/* 이름 */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-neutral-800">{r.name}</p>
                      {r.grade && <p className="text-[11px] text-neutral-400">{r.grade}</p>}
                    </td>

                    {/* 숙제 */}
                    <td className="px-3 py-3 text-center">
                      {r.hwDone ? (
                        <span className="inline-flex flex-col items-center">
                          <span className="text-emerald-500 font-bold">✓</span>
                          {r.hwScorePct !== null && (
                            <span className={`text-[10px] font-semibold ${r.hwScorePct >= 80 ? 'text-emerald-600' : r.hwScorePct >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                              {r.hwScorePct}%
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-neutral-200">—</span>
                      )}
                    </td>

                    {/* 단어 */}
                    <td className="px-3 py-3 text-center">
                      {r.vocaDone
                        ? <span className="text-emerald-500 font-bold">✓</span>
                        : <span className="text-neutral-200">—</span>}
                    </td>

                    {/* 리딩 (점수 표시) */}
                    <td className="px-3 py-3 text-center">
                      {r.readingDone ? (
                        <span className="inline-flex flex-col items-center">
                          <span className="text-emerald-500 font-bold">✓</span>
                          {r.readingScorePct !== null && (
                            <span className={`text-[10px] font-semibold ${r.readingScorePct >= 80 ? 'text-emerald-600' : r.readingScorePct >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                              {r.readingScorePct}%
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-neutral-200">—</span>
                      )}
                    </td>

                    {/* 그래머/스피킹 */}
                    {(['grammarDone', 'speakingDone'] as const).map(k => (
                      <td key={k} className="px-3 py-3 text-center">
                        {r[k]
                          ? <span className="text-emerald-500 font-bold">✓</span>
                          : <span className="text-neutral-200">—</span>
                        }
                      </td>
                    ))}

                    {/* 완료율 바 */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-neutral-100 min-w-[60px]">
                          <div
                            className={[
                              'h-2 rounded-full',
                              pct === 100 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-400' : 'bg-neutral-300',
                            ].join(' ')}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-neutral-500 w-8 text-right">
                          {pct}%
                        </span>
                      </div>
                    </td>

                    {/* 링크 */}
                    <td className="px-3 py-3">
                      <div className="flex gap-1.5">
                        <Link
                          href={`/teacher/session-report/${r.studentId}`}
                          className="rounded-lg border border-neutral-200 px-2.5 py-1 text-xs text-neutral-500 hover:bg-neutral-50 whitespace-nowrap"
                        >
                          PT 보기
                        </Link>
                        <Link
                          href={`/teacher/parent-report/${r.studentId}`}
                          className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs text-sky-600 hover:bg-sky-100 whitespace-nowrap"
                        >
                          📤 리포트
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 하단 — 전체 다시로드 */}
      <div className="flex gap-3">
        <Link
          href="/teacher/session-report"
          className="rounded-xl border border-neutral-200 px-4 py-2 text-xs text-neutral-600 hover:bg-neutral-50"
        >
          🔄 새로고침
        </Link>
      </div>
    </main>
  );
}
