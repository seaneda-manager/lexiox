import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const LEVEL_MAX: Record<number, number> = {
  1: 100, 2: 300, 3: 600, 4: 1000, 5: 2000,
  6: 4000, 7: 8000, 8: 15000, 9: 30000, 10: 30000,
};

const CATEGORY_LABEL: Record<string, string> = {
  vocab:      '단어',
  reading:    '리딩',
  listening:  '리스닝',
  grammar:    '문법',
  naesin:     '내신',
  homework:   '숙제',
  writing:    '라이팅',
  speaking:   '스피킹',
  daily_task: '데일리 태스크',
};

export default async function StudentProgressPage() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: gami }, { data: ledger }] = await Promise.all([
    supabase
      .from('student_gamification')
      .select('total_points, level, current_streak, longest_streak, last_activity_date')
      .eq('student_id', user.id)
      .maybeSingle(),
    supabase
      .from('student_point_ledger')
      .select('id, rule_id, points, bonus_points, source_ref, earned_at, rule:point_rules(label, category)')
      .eq('student_id', user.id)
      .order('earned_at', { ascending: false })
      .limit(50),
  ]);

  const totalPoints  = gami?.total_points    ?? 0;
  const level        = gami?.level           ?? 1;
  const streak       = gami?.current_streak  ?? 0;
  const longestStreak = gami?.longest_streak ?? 0;

  const levelFloor = level < 10 ? (LEVEL_MAX[level - 1] ?? 0) : 30000;
  const levelCeil  = LEVEL_MAX[level] ?? 30000;
  const levelPct   = level >= 10 ? 100
    : Math.min(100, Math.round(((totalPoints - levelFloor) / (levelCeil - levelFloor)) * 100));

  // 카테고리별 집계
  const byCategory: Record<string, number> = {};
  for (const row of ledger ?? []) {
    const cat = (row.rule as any)?.category ?? 'etc';
    byCategory[cat] = (byCategory[cat] ?? 0) + row.points + row.bonus_points;
  }
  const catEntries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  return (
    <main className="mx-auto max-w-lg space-y-6 pb-12">

      <header>
        <div className="text-xs text-neutral-400 mb-1">
          <Link href="/student" className="hover:underline">대시보드</Link>
          {' / 포인트 히스토리'}
        </div>
        <h1 className="text-xl font-bold text-neutral-900">포인트 & 레벨</h1>
      </header>

      {/* 레벨 카드 */}
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-amber-600">현재 레벨</p>
            <p className="text-4xl font-black text-amber-800">Lv {level}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-amber-600">총 포인트</p>
            <p className="text-2xl font-bold text-amber-700">{totalPoints.toLocaleString()} P</p>
          </div>
        </div>

        {/* 레벨 진행 바 */}
        {level < 10 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-amber-600">
              <span>Lv {level}</span>
              <span>{levelPct}%</span>
              <span>Lv {level + 1}</span>
            </div>
            <div className="h-3 w-full rounded-full bg-amber-100">
              <div
                className="h-3 rounded-full bg-amber-400 transition-all"
                style={{ width: `${levelPct}%` }}
              />
            </div>
            <p className="text-xs text-amber-500 text-right">
              {(levelCeil - totalPoints).toLocaleString()} P 더 모으면 Lv {level + 1}
            </p>
          </div>
        )}
        {level >= 10 && (
          <p className="text-sm font-bold text-amber-700 text-center">최고 레벨 달성!</p>
        )}
      </div>

      {/* 스트릭 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center">
          <p className="text-xs text-emerald-600">연속 학습</p>
          <p className="text-2xl font-black text-emerald-800">{streak}일</p>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-center">
          <p className="text-xs text-sky-600">최장 연속</p>
          <p className="text-2xl font-black text-sky-800">{longestStreak}일</p>
        </div>
      </div>

      {/* 카테고리별 적립 */}
      {catEntries.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-400">영역별 적립</h2>
          <div className="rounded-2xl border border-neutral-200 bg-white divide-y divide-neutral-100">
            {catEntries.map(([cat, pts]) => {
              const maxPts = catEntries[0][1];
              return (
                <div key={cat} className="px-4 py-3 flex items-center gap-3">
                  <span className="w-16 shrink-0 text-xs text-neutral-500">
                    {CATEGORY_LABEL[cat] ?? cat}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-neutral-100">
                    <div
                      className="h-2 rounded-full bg-amber-400"
                      style={{ width: `${Math.round((pts / maxPts) * 100)}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-xs font-semibold text-amber-700 shrink-0">
                    {pts.toLocaleString()} P
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 적립 내역 */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-400">최근 적립 내역</h2>

        {(!ledger || ledger.length === 0) ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 py-10 text-center">
            <p className="text-sm text-neutral-400">아직 적립 내역이 없습니다.</p>
            <p className="text-xs text-neutral-300 mt-1">학습을 시작하면 포인트가 쌓입니다!</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-neutral-200 bg-white divide-y divide-neutral-100">
            {ledger.map((row) => {
              const total = row.points + row.bonus_points;
              const cat   = (row.rule as any)?.category ?? 'etc';
              const label = (row.rule as any)?.label ?? row.rule_id;
              const date  = new Date(row.earned_at);
              return (
                <div key={row.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-800">{label}</p>
                    <p className="text-xs text-neutral-400">
                      {CATEGORY_LABEL[cat] ?? cat} · {date.toLocaleDateString('ko-KR')} {date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-amber-600">+{total} P</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Perk 샵 링크 */}
      <Link
        href="/student/perks"
        className="block w-full text-center rounded-xl border border-amber-200 bg-amber-50 py-3 text-sm font-semibold text-amber-700 hover:bg-amber-100"
      >
        Perk 샵에서 포인트 사용하기 →
      </Link>

    </main>
  );
}
