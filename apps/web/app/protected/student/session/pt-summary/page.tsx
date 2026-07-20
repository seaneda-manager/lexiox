// app/(protected)/student/session/pt-summary/page.tsx
// 하브루타 PT 요약 시트 — 학생/선생님이 함께 보는 오늘 학습 결과

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import PrintButton from './_components/PrintButton';

export const dynamic = 'force-dynamic';

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ── 집중 포인트 도출 (패턴 기반 — AI 호출 없이) ──────────────
type FocusPoint = { label: string; desc: string; severity: 'high' | 'mid' | 'low' };

function deriveFocusPoints(data: {
  hwScorePct:      number | null;
  hwWrongSubjects: string[];
  vocaDone:        boolean;
  readingDone:     boolean;
  grammarDone:     boolean;
  grammarWeak:     string[];
  speakingDone:    boolean;
  listeningDone:   boolean;
}): FocusPoint[] {
  const pts: FocusPoint[] = [];

  if (data.hwScorePct !== null && data.hwScorePct < 60) {
    pts.push({
      label: '숙제 정답률 낮음',
      desc:  `오늘 숙제 ${data.hwScorePct}% — 기본 개념 재확인 필요`,
      severity: 'high',
    });
  } else if (data.hwScorePct !== null && data.hwScorePct < 80) {
    pts.push({
      label: '숙제 오답 있음',
      desc:  `${data.hwScorePct}% — 오답 교정 완료 여부 확인`,
      severity: 'mid',
    });
  }

  if (data.grammarWeak.length > 0) {
    pts.push({
      label: '문법 취약 포인트',
      desc:  data.grammarWeak.slice(0, 3).join(' · '),
      severity: 'mid',
    });
  }

  if (!data.vocaDone) {
    pts.push({ label: '단어 학습 미완료', desc: '오늘 단어 배정 확인', severity: 'mid' });
  }
  if (!data.readingDone) {
    pts.push({ label: '리딩 드릴 미완료', desc: '내신 드릴 진행 상태 확인', severity: 'low' });
  }
  if (!data.grammarDone) {
    pts.push({ label: '그래머 미완료', desc: '오늘 문법 유닛 완료 필요', severity: 'low' });
  }

  if (pts.length === 0) {
    pts.push({ label: '오늘 모든 단계 완료 🎉', desc: '심화 질문 또는 다음 단계 예고', severity: 'low' });
  }

  return pts;
}

// ── Page ──────────────────────────────────────────────────────
export default async function PtSummaryPage() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const today = todayISO();

  // ── 학생 정보 ──────────────────────────────────────────────
  const { data: student } = await supabase
    .from('academy_students')
    .select('id, display_name, grade, school')
    .or(`user_id.eq.${user.id},auth_user_id.eq.${user.id}`)
    .maybeSingle();

  const studentName = student?.display_name ?? user.email?.split('@')[0] ?? '학생';

  // ── 1. 숙제 결과 ───────────────────────────────────────────
  const { data: activeHW } = await supabase
    .from('photo_homework')
    .select('id, title, subject')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(5);

  const hwIds = (activeHW ?? []).map((h: any) => h.id as string);

  const { data: hwSubs } = hwIds.length > 0
    ? await supabase
        .from('photo_homework_submissions')
        .select('homework_id, correct_count, total_count, result_data, created_at')
        .eq('student_id', user.id)
        .in('homework_id', hwIds)
        .gte('created_at', today)
        .order('created_at', { ascending: false })
    : { data: [] };

  const hwResults = (hwSubs ?? []).map((sub: any) => {
    const hw = (activeHW ?? []).find((h: any) => h.id === sub.homework_id);
    const scorePct = sub.total_count > 0
      ? Math.round((sub.correct_count / sub.total_count) * 100)
      : null;
    const items: any[] = (sub.result_data as any)?.items ?? [];
    const wrongItems   = items.filter((it: any) => !it.is_correct);
    return {
      title:      hw?.title ?? '숙제',
      subject:    hw?.subject ?? '',
      scorePct,
      correct:    sub.correct_count ?? 0,
      total:      sub.total_count   ?? 0,
      wrongItems,
    };
  });

  const hwTotalPct = hwResults.length > 0
    ? Math.round(
        hwResults.reduce((a, b) => a + (b.scorePct ?? 0), 0) / hwResults.length
      )
    : null;
  const hwWrongSubjects = [...new Set(hwResults.filter(h => (h.scorePct ?? 100) < 100).map(h => h.subject).filter(Boolean))];

  // ── 2. 단어 학습 ───────────────────────────────────────────
  const { data: vocaToday } = student?.id
    ? await supabase
        .from('student_vocab_assignments')
        .select('id, completed_at')
        .eq('student_id', student.id)
        .not('completed_at', 'is', null)
        .gte('completed_at', today)
    : { data: [] };

  const vocaDone      = (vocaToday ?? []).length > 0;
  const vocaCount     = (vocaToday ?? []).length;

  // ── 3. 리딩 드릴 ──────────────────────────────────────────
  const { data: readingSessions } = await supabase
    .from('hi_naesin_sessions')
    .select('id, passage_id, status, score_percent')
    .eq('student_id', user.id)
    .gte('started_at', today)
    .order('started_at', { ascending: false });

  const readingDone   = (readingSessions ?? []).some((s: any) => s.status === 'submitted');
  const readingPassageIds = [...new Set((readingSessions ?? []).map((s: any) => s.passage_id as string))];

  const { data: readingPassages } = readingPassageIds.length > 0
    ? await supabase
        .from('hi_naesin_passages')
        .select('id, title')
        .in('id', readingPassageIds)
    : { data: [] };
  const passageMap = new Map((readingPassages ?? []).map((p: any) => [p.id, p.title]));

  // ── 4. 그래머 ─────────────────────────────────────────────
  const { data: grammarToday } = await supabase
    .from('grammar_2026_unit_completions')
    .select('unit_id, completed_at')
    .eq('student_id', user.id)
    .gte('completed_at', today);

  const grammarDone  = (grammarToday ?? []).length > 0;
  const grammarCount = (grammarToday ?? []).length;

  // 취약 문법 (최근 오답 기준)
  const { data: grammarWrongRows } = await supabase
    .from('hi_naesin_drill_responses')
    .select('drill_id')
    .eq('student_id', user.id)
    .eq('is_correct', false)
    .gte('created_at', today);

  const weakGrammar: string[] = []; // 실제론 drill payload의 category 조인 필요

  // ── 5. 스피킹 ─────────────────────────────────────────────
  const { data: speakingToday } = await supabase
    .from('speaking_results_2026')
    .select('id, score')
    .eq('user_id', user.id)
    .gte('created_at', today)
    .limit(3);
  const speakingDone = (speakingToday ?? []).length > 0;

  // ── 집중 포인트 도출 ───────────────────────────────────────
  const focusPoints = deriveFocusPoints({
    hwScorePct:      hwTotalPct,
    hwWrongSubjects,
    vocaDone,
    readingDone,
    grammarDone,
    grammarWeak:     weakGrammar,
    speakingDone,
    listeningDone:   false,
  });

  const todayStr = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });

  const SEVERITY_STYLE = {
    high: 'border-red-200   bg-red-50   text-red-700',
    mid:  'border-amber-200 bg-amber-50 text-amber-700',
    low:  'border-neutral-200 bg-neutral-50 text-neutral-600',
  };

  return (
    <main className="mx-auto max-w-2xl space-y-6 pb-16">

      {/* 헤더 */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs text-neutral-400">
            <Link href="/student/session" className="hover:underline">오늘 수업</Link>
            {' / PT 요약'}
          </div>
          <h1 className="text-xl font-bold text-neutral-900 mt-0.5">
            PT 요약 — {studentName}
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">{todayStr}</p>
        </div>
        {/* 인쇄 버튼 — client island */}
        <PrintButton />
      </header>

      {/* ── 집중 포인트 ─────────────────────────────────────── */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-400">
          🎯 오늘의 집중 포인트
        </h2>
        {focusPoints.map((pt, i) => (
          <div key={i} className={`rounded-2xl border px-4 py-3 ${SEVERITY_STYLE[pt.severity]}`}>
            <p className="text-sm font-semibold">{pt.label}</p>
            <p className="text-xs mt-0.5 opacity-80">{pt.desc}</p>
          </div>
        ))}
      </section>

      {/* ── 숙제 결과 ───────────────────────────────────────── */}
      <section className="rounded-2xl border border-neutral-200 bg-white divide-y">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-sm font-bold text-neutral-800">📋 숙제 채점</h2>
          {hwTotalPct !== null ? (
            <span className={[
              'text-xl font-black',
              hwTotalPct >= 80 ? 'text-emerald-600'
              : hwTotalPct >= 60 ? 'text-amber-500'
              : 'text-red-500',
            ].join(' ')}>
              {hwTotalPct}%
            </span>
          ) : (
            <span className="text-sm text-neutral-300">미제출</span>
          )}
        </div>

        {hwResults.length === 0 ? (
          <div className="px-5 py-4 text-sm text-neutral-400">오늘 제출된 숙제가 없습니다.</div>
        ) : (
          hwResults.map((hw, i) => (
            <div key={i} className="px-5 py-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-neutral-800">{hw.title}</p>
                <p className={[
                  'text-sm font-bold',
                  (hw.scorePct ?? 0) >= 80 ? 'text-emerald-600'
                  : (hw.scorePct ?? 0) >= 60 ? 'text-amber-500'
                  : 'text-red-500',
                ].join(' ')}>
                  {hw.correct}/{hw.total}
                  {hw.scorePct !== null && ` (${hw.scorePct}%)`}
                </p>
              </div>
              {/* 오답 목록 */}
              {hw.wrongItems.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {hw.wrongItems.map((it: any) => (
                    <span
                      key={it.number}
                      className="rounded-lg bg-red-50 border border-red-200 px-2 py-1 text-xs text-red-600"
                      title={`정답: ${it.correct_answer}`}
                    >
                      Q{it.number} ✕
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </section>

      {/* ── 학습 현황 그리드 ────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-400 mb-3">
          💻 프로그램 학습
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard
            icon="📚"
            label="단어 학습"
            done={vocaDone}
            detail={vocaDone ? `${vocaCount}개 완료` : '미완료'}
          />
          <SummaryCard
            icon="📖"
            label="리딩 드릴"
            done={readingDone}
            detail={
              readingPassageIds.length > 0
                ? readingPassageIds.map(id => passageMap.get(id) ?? '지문').join(', ')
                : '미완료'
            }
          />
          <SummaryCard
            icon="✏️"
            label="그래머"
            done={grammarDone}
            detail={grammarDone ? `${grammarCount}유닛 완료` : '미완료'}
          />
          <SummaryCard
            icon="🎤"
            label="스피킹"
            done={speakingDone}
            detail={speakingDone ? `${(speakingToday ?? []).length}회 완료` : '미완료'}
          />
        </div>
      </section>

      {/* ── 하브루타 질문 가이드 ─────────────────────────────── */}
      <section className="rounded-2xl border border-violet-200 bg-violet-50 p-5 space-y-3">
        <h2 className="text-sm font-bold text-violet-800">💬 하브루타 질문 가이드</h2>
        <ul className="space-y-2 text-sm text-violet-700">
          {hwResults.some(h => h.wrongItems.length > 0) && (
            <li className="flex gap-2">
              <span className="shrink-0">Q.</span>
              <span>
                {hwResults.find(h => h.wrongItems.length > 0)?.wrongItems[0]
                  ? `Q${hwResults.find(h => h.wrongItems.length > 0)?.wrongItems[0].number}번을 왜 틀렸는지 설명해볼까요?`
                  : '오답 문제에서 어떤 부분이 헷갈렸나요?'}
              </span>
            </li>
          )}
          {readingDone && (
            <li className="flex gap-2">
              <span className="shrink-0">Q.</span>
              <span>오늘 드릴한 지문에서 가장 어려웠던 문장을 말해보세요.</span>
            </li>
          )}
          {grammarDone && (
            <li className="flex gap-2">
              <span className="shrink-0">Q.</span>
              <span>오늘 배운 문법 규칙을 예문을 들어 설명해보세요.</span>
            </li>
          )}
          <li className="flex gap-2">
            <span className="shrink-0">Q.</span>
            <span>다음 수업까지 특별히 복습하고 싶은 부분이 있나요?</span>
          </li>
        </ul>
      </section>

      <div className="flex gap-3 print:hidden">
        <Link
          href="/student/session"
          className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-center text-sm text-neutral-600 hover:bg-neutral-50"
        >
          ← 수업으로 돌아가기
        </Link>
      </div>
    </main>
  );
}

// ── 요약 카드 ──────────────────────────────────────────────────
function SummaryCard({ icon, label, done, detail }: {
  icon: string; label: string; done: boolean; detail: string;
}) {
  return (
    <div className={[
      'rounded-2xl border p-4',
      done ? 'border-emerald-200 bg-emerald-50' : 'border-neutral-200 bg-white',
    ].join(' ')}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">{icon}</span>
        <span className={`text-xs font-bold ${done ? 'text-emerald-700' : 'text-neutral-500'}`}>
          {done ? '✓ 완료' : '미완료'}
        </span>
      </div>
      <p className="text-sm font-semibold text-neutral-800">{label}</p>
      <p className="text-xs text-neutral-400 mt-0.5 line-clamp-2">{detail}</p>
    </div>
  );
}
