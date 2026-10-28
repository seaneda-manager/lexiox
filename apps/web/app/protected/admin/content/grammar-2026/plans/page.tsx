import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import { getServiceSupabase } from '@/lib/supabase/service';
import { summarizePlan, todayKst } from '@/lib/grammar/planSchedule';
import PlanForm from './_client/PlanForm';
import PlanRow, { type UpcomingItem } from './_client/PlanRow';

export const dynamic = 'force-dynamic';

type UnitRow = { id: string; label_ko: string; label_en: string; level: string; order_index: number; status: string };
type PlanRec = {
  id: string;
  student_id: string;
  start_date: string;
  weekdays: number[] | null;
  units_per_session: number | null;
  level: string | null;
  start_unit_id: string | null;
  is_paused: boolean | null;
};
type AssignRec = { plan_id: string; student_id: string; unit_id: string; scheduled_date: string; seq: number };

const SOON_DAYS = 14; // 이 기간 안에 배정됐는데 내용이 아직 없는 챕터를 "곧 필요"로 본다

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default async function GrammarPlansPage() {
  const db = getServiceSupabase();
  const today = todayKst();

  const { data: planData, error: planErr } = await db.from('student_grammar_plans').select('*').order('created_at', { ascending: true });
  const plans = (planData ?? []) as PlanRec[];
  const missingTable = !!planErr && /student_grammar_plans|does not exist|schema cache/i.test(planErr.message);

  const [{ data: unitData }, { data: assignData }, { data: completions }, { data: candidates }] = await Promise.all([
    db.from('grammar_2026_units').select('id, label_ko, label_en, level, order_index, status').order('order_index'),
    missingTable ? Promise.resolve({ data: [] }) : db.from('student_grammar_assignments').select('plan_id, student_id, unit_id, scheduled_date, seq'),
    db.from('grammar_2026_unit_completions').select('student_id, unit_id'),
    db.from('profiles').select('id, full_name, name, email').eq('role', 'student').in('program', ['toefl', 'gap']).order('full_name', { ascending: true }),
  ]);

  const units = (unitData ?? []) as UnitRow[];
  const assignments = (assignData ?? []) as AssignRec[];
  const planStudentIds = plans.map((p) => p.student_id);
  const { data: planStudents } = planStudentIds.length
    ? await db.from('profiles').select('id, full_name, name, email').in('id', planStudentIds)
    : { data: [] as { id: string; full_name: string | null; name: string | null; email: string | null }[] };
  const nameOf = new Map<string, string>(
    [...(candidates ?? []), ...(planStudents ?? [])].map((s) => [s.id as string, (s.full_name || s.name || s.email || '이름 미설정') as string]),
  );

  const unitList = units;
  const unitById = new Map<string, UnitRow>(unitList.map((u) => [u.id, u] as [string, UnitRow]));
  const unitLabel = (id: string) => unitById.get(id)?.label_ko ?? id;
  const doneByStudent = new Map<string, Set<string>>();
  for (const c of completions ?? []) {
    const set = doneByStudent.get(c.student_id as string) ?? new Set<string>();
    set.add(c.unit_id as string);
    doneByStudent.set(c.student_id as string, set);
  }

  const rows = plans.map((p) => {
    const mine = assignments.filter((a) => a.plan_id === p.id);
    const done = doneByStudent.get(p.student_id) ?? new Set<string>();
    const sum = summarizePlan(
      mine.map((a) => ({ unit_id: a.unit_id, scheduled_date: a.scheduled_date, seq: a.seq })),
      done,
      today,
    );
    const upcoming: UpcomingItem[] = mine
      .filter((a) => !done.has(a.unit_id))
      .sort((a, b) => (a.scheduled_date === b.scheduled_date ? a.seq - b.seq : a.scheduled_date < b.scheduled_date ? -1 : 1))
      .slice(0, 14)
      .map((a) => ({
        date: a.scheduled_date,
        label: unitLabel(a.unit_id),
        ready: unitById.get(a.unit_id)?.status === 'published',
        done: false,
        overdue: a.scheduled_date < today,
      }));
    return { plan: p, sum, upcoming };
  });

  // 일정은 잡혔는데 내용이 아직 없는 챕터 → 내용을 채워야 할 순서 (가까운 날짜 먼저)
  const soon = addDays(today, SOON_DAYS);
  const needContent = new Map<string, { date: string; students: Set<string> }>();
  const pausedPlanIds = new Set(plans.filter((p) => p.is_paused).map((p) => p.id)); // 재개할 때 다시 잡히므로 제외
  for (const a of assignments) {
    if (pausedPlanIds.has(a.plan_id)) continue;
    const u = unitById.get(a.unit_id);
    if (!u || u.status === 'published') continue;
    if ((doneByStudent.get(a.student_id) ?? new Set<string>()).has(a.unit_id)) continue;
    if (a.scheduled_date > soon) continue;
    const cur = needContent.get(a.unit_id) ?? { date: a.scheduled_date, students: new Set<string>() };
    if (a.scheduled_date < cur.date) cur.date = a.scheduled_date;
    cur.students.add(nameOf.get(a.student_id) ?? '학생');
    needContent.set(a.unit_id, cur);
  }
  const needList = [...needContent.entries()].sort((a, b) => (a[1].date < b[1].date ? -1 : 1));

  const unitOptions = unitList.map((u) => ({ id: u.id, label: `${u.order_index}. ${u.label_ko}` }));
  const totalOverdue = rows.reduce((s, r) => s + r.sum.overdue, 0);

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <header className="space-y-1">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-medium text-indigo-700">
          <CalendarDays className="h-3.5 w-3.5" />
          Admin · LEXiOX-Gram
        </div>
        <h1 className="mt-2 text-xl font-bold tracking-tight text-gray-900">문법 스케줄</h1>
        <p className="text-xs text-gray-500">
          학생별 페이스(요일 · 하루 챕터 수 · 시작일)에 맞춰 날짜와 챕터를 자동으로 매칭합니다. 문법 챕터는 TOEFL·GAP 학생용입니다.{' '}
          <Link href="/admin/content/grammar-2026" className="underline">
            챕터(유닛) 관리 →
          </Link>
        </p>
      </header>

      {missingTable && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          DB 마이그레이션이 필요합니다. Supabase SQL Editor에서 <code>20261021000002_student_grammar_plans.sql</code> 을 실행한 뒤 새로고침하세요.
        </div>
      )}

      {unitList.length === 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          등록된 문법 챕터(유닛)가 없습니다. 챕터를 먼저 만드세요.
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <Stat label="스케줄 학생" value={`${rows.length}명`} />
        <Stat label="밀린 챕터" value={`${totalOverdue}개`} bad={totalOverdue > 0} />
        <Stat label={`${SOON_DAYS}일 안에 내용이 필요한 챕터`} value={`${needList.length}개`} bad={needList.length > 0} />
      </div>

      {needList.length > 0 && (
        <section className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
          <h2 className="text-sm font-semibold text-amber-900">곧 내용이 필요한 챕터 (일정이 가까운 순)</h2>
          <p className="text-xs text-amber-800">일정은 잡혔지만 아직 공개(published)되지 않은 챕터입니다. 날짜 전에 설명·드릴을 채우세요.</p>
          <ul className="divide-y rounded-lg border border-amber-200 bg-white text-sm">
            {needList.map(([id, info]) => (
              <li key={id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <Link href={`/admin/content/grammar-2026/${id}`} className="font-medium text-gray-900 hover:underline">
                  {unitLabel(id)}
                </Link>
                <span className="text-xs text-gray-500">
                  {info.date.slice(5).replace('-', '/')} 부터 · {[...info.students].join(', ')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-800">학생별 스케줄</h2>
        {rows.length === 0 && <p className="rounded-xl border bg-white p-4 text-sm text-gray-400">아직 스케줄이 없습니다. 아래에서 만드세요.</p>}
        {rows.map(({ plan, sum, upcoming }) => (
          <PlanRow
            key={plan.id}
            planId={plan.id}
            studentName={nameOf.get(plan.student_id) ?? '이름 미설정'}
            paused={!!plan.is_paused}
            settings={{
              studentId: plan.student_id,
              startDate: plan.start_date,
              weekdays: plan.weekdays ?? [],
              unitsPerSession: plan.units_per_session ?? 1,
              level: plan.level ?? 'all',
              startUnitId: plan.start_unit_id ?? null,
            }}
            total={sum.total}
            done={sum.done}
            overdue={sum.overdue}
            todayLabels={sum.todayUnitIds.map(unitLabel)}
            nextDate={sum.nextDate}
            lastDate={sum.lastDate}
            upcoming={upcoming}
            units={unitOptions}
            today={today}
          />
        ))}
      </section>

      {!missingTable && (
        <PlanForm
          students={(candidates ?? []).map((s) => ({ id: s.id as string, name: nameOf.get(s.id as string) ?? '이름 미설정' }))}
          units={unitOptions}
          today={today}
        />
      )}
    </main>
  );
}

function Stat({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className={`rounded-xl border bg-white px-3 py-2 ${bad ? 'border-rose-200' : ''}`}>
      <div className="text-[10px] uppercase tracking-wide text-gray-400">{label}</div>
      <div className={`text-base font-bold ${bad ? 'text-rose-600' : 'text-gray-900'}`}>{value}</div>
    </div>
  );
}
