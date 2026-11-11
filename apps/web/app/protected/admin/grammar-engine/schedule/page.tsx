import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import { getServiceSupabase } from '@/lib/supabase/service';
import { summarizePlan, todayKst } from '@/lib/grammar/planSchedule';
import ConceptPlanForm, { type BookOption } from './_client/ConceptPlanForm';
import ConceptPlanRow, { type UpcomingItem } from './_client/ConceptPlanRow';

export const dynamic = 'force-dynamic';

type PlanRec = {
  id: string;
  student_id: string;
  book_id: string | null;
  current_unit_id: string | null;
  level: number;
  start_date: string;
  weekdays: number[] | null;
  units_per_session: number | null;
  is_paused: boolean | null;
};
type AssignRec = { plan_id: string; student_id: string; concept_id: string; scheduled_date: string; seq: number };

export default async function ConceptSchedulePage() {
  const db = getServiceSupabase();
  const today = todayKst();

  const { data: planData, error: planErr } = await db.from('student_grammar_concept_plans').select('*').order('created_at', { ascending: true });
  const missingTable = !!planErr && /student_grammar_concept_plans|does not exist|schema cache/i.test(planErr.message);
  const plans = (planData ?? []) as PlanRec[];

  const [{ data: bookData, error: bookErr }, { data: bookUnits }, { data: conceptData }, { data: lessonData }, { data: assignData }, { data: doneData }, { data: students }] =
    await Promise.all([
      db.from('grammar_books').select('id, title, grade').order('grade').order('title'),
      db.from('grammar_book_units').select('id, book_id, chapter_no, unit_no, title, sort_order').order('sort_order'),
      db.from('grammar_concepts').select('id, title_ko'),
      db.from('grammar_lessons').select('concept_id, level').eq('status', 'final'),
      missingTable ? Promise.resolve({ data: [] }) : db.from('student_grammar_concept_assignments').select('plan_id, student_id, concept_id, scheduled_date, seq'),
      missingTable ? Promise.resolve({ data: [] }) : db.from('student_grammar_concept_done').select('student_id, concept_id, level'),
      db.from('profiles').select('id, full_name, name, email').eq('role', 'student').order('full_name', { ascending: true }),
    ]);
  const engineMissing = !!bookErr && /grammar_books|does not exist|schema cache/i.test(bookErr.message);

  const books: BookOption[] = ((bookData ?? []) as { id: string; title: string }[]).map((b) => ({
    id: b.id,
    title: b.title,
    units: ((bookUnits ?? []) as { id: string; book_id: string; chapter_no: number; unit_no: number; title: string }[])
      .filter((u) => u.book_id === b.id)
      .map((u) => ({ id: u.id, label: `${u.chapter_no}-${u.unit_no} ${u.title}` })),
  }));
  const bookById = new Map(books.map((b) => [b.id, b]));
  const conceptTitle = new Map(((conceptData ?? []) as { id: string; title_ko: string }[]).map((c) => [c.id, c.title_ko]));
  const finalLessons = new Set(((lessonData ?? []) as { concept_id: string; level: number }[]).map((l) => `${l.concept_id}:${l.level}`));

  const nameOf = new Map<string, string>(
    ((students ?? []) as { id: string; full_name: string | null; name: string | null; email: string | null }[]).map((s) => [s.id, s.full_name || s.name || s.email || '이름 미설정']),
  );
  const doneKey = new Set(((doneData ?? []) as { student_id: string; concept_id: string; level: number }[]).map((d) => `${d.student_id}:${d.concept_id}:${d.level}`));
  const assignments = (assignData ?? []) as AssignRec[];

  const rows = plans.map((p) => {
    const mine = assignments.filter((a) => a.plan_id === p.id);
    const isDone = (c: string) => doneKey.has(`${p.student_id}:${c}:${p.level}`);
    const doneIds = new Set(mine.filter((a) => isDone(a.concept_id)).map((a) => a.concept_id));
    const sum = summarizePlan(mine.map((a) => ({ unit_id: a.concept_id, scheduled_date: a.scheduled_date, seq: a.seq })), doneIds, today);
    const upcoming: UpcomingItem[] = mine
      .filter((a) => !isDone(a.concept_id))
      .sort((a, b) => (a.scheduled_date === b.scheduled_date ? a.seq - b.seq : a.scheduled_date < b.scheduled_date ? -1 : 1))
      .slice(0, 14)
      .map((a) => ({
        date: a.scheduled_date,
        label: conceptTitle.get(a.concept_id) ?? a.concept_id,
        ready: finalLessons.has(`${a.concept_id}:${p.level}`),
        overdue: a.scheduled_date < today,
      }));
    const book = p.book_id ? bookById.get(p.book_id) : null;
    const curUnit = book?.units.find((u) => u.id === p.current_unit_id);
    const bookLabel = book ? `교재: ${book.title}${curUnit ? ` · 현재 ${curUnit.label}` : ' · 처음부터'}` : '교재 없음 — 개념 난이도순';
    return { plan: p, sum, upcoming, bookLabel };
  });

  const totalOverdue = rows.reduce((s, r) => s + r.sum.overdue, 0);

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <header className="space-y-1">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-medium text-indigo-700">
          <CalendarDays className="h-3.5 w-3.5" />
          Admin · 문법 엔진
        </div>
        <h1 className="mt-2 text-xl font-bold tracking-tight text-gray-900">문법 개념 스케줄</h1>
        <p className="text-xs text-gray-500">
          학생이 보는 교재의 진도에 맞춰, 그 단원에 연결된 개념을 학생 레벨(L1~L5)로 날짜에 배정합니다.{' '}
          <Link href="/admin/grammar-engine" className="underline">
            ← 문법 엔진
          </Link>{' '}
          <Link href="/admin/grammar-engine/books" className="underline">
            교재·단원 보기 →
          </Link>
        </p>
      </header>

      {(missingTable || engineMissing) && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {engineMissing ? (
            <>
              문법 엔진 테이블이 없습니다. <code>supabase/migrations/20261028000001_grammar_engine_core.sql</code> 적용 후 seed(<code>scripts/grammar-toc/seed-grammar-engine.ts</code>)를 실행하세요.
            </>
          ) : (
            <>
              DB 마이그레이션이 필요합니다. Supabase SQL Editor에서 <code>20261111000002_grammar_concept_plans.sql</code> 을 실행한 뒤 새로고침하세요.
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Stat label="스케줄 학생" value={`${rows.length}명`} />
        <Stat label="밀린 개념" value={`${totalOverdue}개`} bad={totalOverdue > 0} />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-800">학생별 스케줄</h2>
        {rows.length === 0 && <p className="rounded-xl border bg-white p-4 text-sm text-gray-400">아직 스케줄이 없습니다. 아래에서 만드세요.</p>}
        {rows.map(({ plan, sum, upcoming, bookLabel }) => (
          <ConceptPlanRow
            key={plan.id}
            planId={plan.id}
            studentName={nameOf.get(plan.student_id) ?? '이름 미설정'}
            paused={!!plan.is_paused}
            bookLabel={bookLabel}
            settings={{
              studentId: plan.student_id,
              bookId: plan.book_id,
              currentUnitId: plan.current_unit_id,
              level: plan.level,
              startDate: plan.start_date,
              weekdays: plan.weekdays ?? [],
              perSession: plan.units_per_session ?? 1,
            }}
            total={sum.total}
            done={sum.done}
            overdue={sum.overdue}
            todayLabels={sum.todayUnitIds.map((id) => conceptTitle.get(id) ?? id)}
            nextDate={sum.nextDate}
            lastDate={sum.lastDate}
            upcoming={upcoming}
            books={books}
            today={today}
          />
        ))}
      </section>

      {!missingTable && !engineMissing && (
        <ConceptPlanForm students={[...nameOf.entries()].map(([id, name]) => ({ id, name }))} books={books} today={today} />
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
