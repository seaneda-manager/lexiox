// app/(protected)/student/session/page.tsx
// 오늘 수업 네비게이터 — 학생이 수업 시작 시 이 페이지에서 단계별로 진행

import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import SessionStepper, { type SessionStep } from './_components/SessionStepper';

export const dynamic = 'force-dynamic';

// ── 요일 헬퍼 ─────────────────────────────────────────────────
const WEEKDAY_KO  = ['일', '월', '화', '수', '목', '금', '토'];
const WEEKDAY_MAP: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
  일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6,
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
};

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function todayLabel() {
  const d = new Date();
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });
}

// ── 수업 타입 결정 (A/B) ──────────────────────────────────────
// class_days 배열에서 오늘이 몇 번째 수업일인지 → 짝수=A, 홀수=B
function resolveSessionType(
  classDays: string[] | null,
  todayWeekday: number,
): 'A' | 'B' | null {
  if (!classDays || classDays.length === 0) return 'A'; // 기본값

  // 정렬된 weekday 번호 목록
  const sorted = classDays
    .map((d) => WEEKDAY_MAP[d.toLowerCase()] ?? -1)
    .filter((n) => n >= 0)
    .sort((a, b) => a - b);

  if (sorted.length === 0) return 'A';

  const idx = sorted.indexOf(todayWeekday);
  if (idx === -1) return null;  // 오늘은 수업 없는 날

  // 0번째(첫 번째 수업일) = A, 1번째 = B, 2번째 = A, ...
  return idx % 2 === 0 ? 'A' : 'B';
}

// ── 메인 페이지 ───────────────────────────────────────────────
export default async function StudentSessionPage() {
  const supabase  = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const today       = todayISO();
  const todayDow    = new Date().getDay(); // 0=일, 1=월 ...

  // ── 1. 학생 정보 ──────────────────────────────────────────
  const { data: student } = await supabase
    .from('academy_students')
    .select('id, display_name, class_days')
    .or(`user_id.eq.${user.id},auth_user_id.eq.${user.id}`)
    .maybeSingle();

  const studentName  = student?.display_name ?? user.email?.split('@')[0] ?? '학생';
  const sessionType  = resolveSessionType(student?.class_days ?? null, todayDow);

  // 오늘 수업 없는 날이면 자율 학습 모드 (A 플로우로 표시)
  const flowType: 'A' | 'B' = sessionType ?? 'A';
  const isClassDay  = sessionType !== null;

  // ── 2. 숙제 채점 현황 ────────────────────────────────────
  // photo_homework 중 오늘 마감 또는 활성 & 학생 제출 여부
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
        .select('homework_id, correct_count, total_count, created_at')
        .eq('student_id', user.id)
        .in('homework_id', hwIds)
        .gte('created_at', today)        // 오늘 제출한 것만
    : { data: [] };

  const hwDoneToday = (hwSubs ?? []).length > 0;
  const hwTotalScore = hwDoneToday
    ? (() => {
        const s = (hwSubs ?? []);
        const correct = s.reduce((a: number, b: any) => a + (b.correct_count ?? 0), 0);
        const total   = s.reduce((a: number, b: any) => a + (b.total_count   ?? 0), 0);
        return total > 0 ? `${Math.round((correct / total) * 100)}%` : null;
      })()
    : null;

  // ── 3. 단어 학습 현황 ────────────────────────────────────
  const { data: vocaToday } = student?.id
    ? await supabase
        .from('student_vocab_assignments')
        .select('id, completed_at')
        .eq('student_id', student.id)
        .not('completed_at', 'is', null)
        .gte('completed_at', today)
    : { data: [] };

  const vocaDoneToday = (vocaToday ?? []).length > 0;

  // ── 4. 리딩 드릴 (Hi-내신) 현황 ─────────────────────────
  const { data: readingToday } = await supabase
    .from('hi_naesin_sessions')
    .select('id, status')
    .eq('student_id', user.id)
    .gte('started_at', today)
    .order('started_at', { ascending: false })
    .limit(1);

  const readingSession   = readingToday?.[0] ?? null;
  const readingDoneToday = readingSession?.status === 'submitted';
  const readingInProgress = readingSession?.status === 'started';

  // ── 5. 그래머 현황 ────────────────────────────────────────
  const { data: grammarToday } = await supabase
    .from('grammar_2026_unit_completions')
    .select('unit_id, completed_at')
    .eq('student_id', user.id)
    .gte('completed_at', today)
    .limit(1);

  const grammarDoneToday = (grammarToday ?? []).length > 0;

  // ── 6. 리스닝 현황 (테이블 없으면 graceful fallback) ──────
  let listeningDoneToday = false;
  try {
    const { data: listeningToday } = await supabase
      .from('listening_2026_results' as any)
      .select('id')
      .eq('user_id', user.id)
      .gte('created_at', today)
      .limit(1);
    listeningDoneToday = (listeningToday ?? []).length > 0;
  } catch { /* 테이블 미생성 시 무시 */ }

  // ── 7. 스피킹 현황 ────────────────────────────────────────
  const { data: speakingToday } = await supabase
    .from('speaking_results_2026')
    .select('id')
    .eq('user_id', user.id)
    .gte('created_at', today)
    .limit(1);

  const speakingDoneToday = (speakingToday ?? []).length > 0;

  // ── 스텝 조합 ────────────────────────────────────────────
  // 각 단계는 이전 단계가 완료돼야 active (첫 단계는 항상 active)
  type RawStep = {
    id:       string;
    label:    string;
    sublabel?: string;
    icon:     string;
    isDone:   boolean;
    href:     string | null;
    ctaLabel?: string;
    detail?:  string;
    color:    SessionStep['color'];
    flows:    ('A' | 'B' | 'both')[];
  };

  const ALL_STEPS: RawStep[] = [
    {
      id:       'homework',
      label:    '숙제 채점',
      sublabel: '교재 사진을 찍어 AI 자동 채점 → 오답 교정',
      icon:     '📋',
      isDone:   hwDoneToday,
      href:     '/student/homework',
      ctaLabel: hwDoneToday ? '결과 다시 보기' : '📷 사진 채점 시작 →',
      detail:   hwTotalScore ? `${hwTotalScore} 정답률` : undefined,
      color:    'neutral',
      flows:    ['both'],
    },
    {
      id:       'vocab',
      label:    '단어 학습',
      sublabel: '오늘 배정된 단어를 학습하고 테스트',
      icon:     '📚',
      isDone:   vocaDoneToday,
      href:     '/vocab/learn',
      ctaLabel: vocaDoneToday ? '추가 학습' : '단어 학습 시작 →',
      detail:   vocaDoneToday ? '오늘 완료' : undefined,
      color:    'emerald',
      flows:    ['both'],
    },
    {
      id:       'reading',
      label:    '리딩 드릴',
      sublabel: '배정된 내신 지문 — 단어·해석·작문·빈칸·문법·요약',
      icon:     '📖',
      isDone:   readingDoneToday,
      href:     readingInProgress
        ? `/hi-naesin/drill/${readingSession!.id}`
        : '/hi-naesin',
      ctaLabel: readingDoneToday    ? '다시 학습'
               : readingInProgress  ? '이어하기 →'
               : '드릴 시작 →',
      detail:   readingDoneToday ? '완료' : readingInProgress ? '진행 중' : undefined,
      color:    'sky',
      flows:    ['both'],
    },
    {
      id:       'grammar',
      label:    '그래머',
      sublabel: '문법 개념 학습 + 드릴',
      icon:     '✏️',
      isDone:   grammarDoneToday,
      href:     '/grammar-2026',
      ctaLabel: grammarDoneToday ? '다시 학습' : '문법 학습 →',
      detail:   grammarDoneToday ? '완료' : undefined,
      color:    'indigo',
      flows:    ['both'],
    },
    {
      id:       'listening',
      label:    '리스닝',
      sublabel: '듣기 문제 풀기',
      icon:     '🎧',
      isDone:   listeningDoneToday,
      href:     '/updated-listening/study',
      ctaLabel: listeningDoneToday ? '추가 학습' : '리스닝 시작 →',
      detail:   listeningDoneToday ? '완료' : undefined,
      color:    'violet',
      flows:    ['A'],      // Flow A 전용
    },
    {
      id:       'speaking',
      label:    '스피킹',
      sublabel: '말하기 연습 & 발음 피드백',
      icon:     '🎤',
      isDone:   speakingDoneToday,
      href:     '/speaking-2026/study',
      ctaLabel: speakingDoneToday ? '추가 학습' : '스피킹 시작 →',
      detail:   speakingDoneToday ? '완료' : undefined,
      color:    'rose',
      flows:    ['B'],      // Flow B 전용
    },
    {
      id:       'writing',
      label:    '라이팅',
      sublabel: '영어 쓰기 표현 연습',
      icon:     '✍️',
      isDone:   false,
      href:     '/writing-2026/study',
      ctaLabel: '라이팅 시작 →',
      color:    'amber',
      flows:    ['B'],      // Flow B 전용
    },
    {
      id:       'pt',
      label:    'PT (하브루타)',
      sublabel: '오늘 학습한 내용을 선생님과 함께 정리하고 질의응답',
      icon:     '🎯',
      isDone:   false,
      href:     null,       // 선생님 주도
      color:    'neutral',
      flows:    ['both'],
    },
  ];

  // 오늘 플로우에 맞는 스텝만 필터링
  const filteredSteps = ALL_STEPS.filter(
    (s) => s.flows.includes('both') || s.flows.includes(flowType),
  );

  // 순서대로 status 계산
  // 이전 스텝이 done이거나 첫 번째 → active, 나머지 → pending/locked
  let prevDone = true;
  const steps: SessionStep[] = filteredSteps.map((raw) => {
    let status: SessionStep['status'];

    if (raw.isDone) {
      status = 'done';
    } else if (prevDone) {
      status = 'active';
    } else {
      status = 'pending';
    }

    prevDone = raw.isDone;

    return {
      id:       raw.id,
      label:    raw.label,
      sublabel: raw.sublabel,
      icon:     raw.icon,
      status,
      href:     raw.href,
      ctaLabel: raw.ctaLabel,
      detail:   raw.detail,
      color:    raw.color,
    };
  });

  return (
    <main className="mx-auto max-w-xl pb-16 space-y-4">
      {/* 오늘 수업 없는 날 안내 */}
      {!isClassDay && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-700">
          📅 오늘은 정규 수업 일정이 없어요. 자율 학습 모드로 진행합니다.
        </div>
      )}

      <SessionStepper
        steps={steps}
        sessionType={flowType}
        studentName={studentName}
        todayLabel={todayLabel()}
      />
    </main>
  );
}
