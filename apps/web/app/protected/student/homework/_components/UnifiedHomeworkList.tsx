import Link from 'next/link';
import {
  ASSIGNMENT_KIND_LABEL,
  type AssignmentItem,
  type AssignmentStatus,
} from '@/lib/assignments/types';

/** 학생이 눌러서 바로 할 수 있는 화면 경로 (집계 항목의 href는 관리자용이라 쓰지 않는다) */
function studentHref(it: AssignmentItem): string {
  switch (it.kind) {
    case 'homework': return `/student/homework/${it.id}/submit`;
    case 'daily_test': return `/student/daily-tests/${it.id}`;
    case 'toefl_section':
    case 'toefl_group': return '/student/exams';
    case 'vocab': return '/vocab/hub-new';
    case 'jr': return '/jr';
    case 'hi_naesin':
    case 'middle_general': return '/hi-naesin';
    case 'middle_naesin': return '/naesin/middle';
    case 'grammar_plan': return '/student/grammar';
    default: return '/student/home';
  }
}

const isDone = (s: AssignmentStatus) => s === 'completed' || s === 'graded' || s === 'submitted';

const STATUS_STYLE: Record<AssignmentStatus, { label: string; cls: string }> = {
  pending:     { label: '할 일',    cls: 'border-amber-200 bg-amber-50 text-amber-700' },
  in_progress: { label: '진행중',   cls: 'border-sky-200 bg-sky-50 text-sky-700' },
  submitted:   { label: '제출 완료', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  completed:   { label: '완료',     cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  graded:      { label: '채점 완료', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  overdue:     { label: '밀림',     cls: 'border-red-200 bg-red-50 text-red-600' },
};

function mmdd(iso: string) {
  const [, m, d] = iso.split('-');
  return `${Number(m)}/${Number(d)}`;
}

function Row({ it, today }: { it: AssignmentItem; today: string }) {
  const done = isDone(it.status);
  // 기한이 지났는데 끝나지 않은 것은 종류와 무관하게 "밀림"으로 보여준다
  const status: AssignmentStatus =
    !done && it.date < today && it.dateBasis !== 'assigned' ? 'overdue' : it.status;
  const st = STATUS_STYLE[status];
  return (
    <Link
      href={studentHref(it)}
      className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 transition hover:bg-neutral-50"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-400">
          <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-neutral-500">
            {ASSIGNMENT_KIND_LABEL[it.kind]}
          </span>
          <span>{it.dateBasis === 'due' ? `마감 ${mmdd(it.date)}` : mmdd(it.date)}</span>
        </div>
        <p className={`mt-1 truncate text-sm font-semibold ${done ? 'text-neutral-400 line-through' : 'text-neutral-900'}`}>
          {it.title}
        </p>
      </div>
      {typeof it.scorePct === 'number' && (
        <span className="shrink-0 text-sm font-bold text-neutral-700">{Math.round(it.scorePct)}%</span>
      )}
      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${st.cls}`}>{st.label}</span>
    </Link>
  );
}

function Section({ title, tone, items, today }: {
  title: string; tone?: string; items: AssignmentItem[]; today: string;
}) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className={`text-xs font-bold uppercase tracking-wide ${tone ?? 'text-neutral-400'}`}>
        {title} <span className="font-semibold">{items.length}</span>
      </h2>
      <div className="space-y-2">
        {items.map((it) => <Row key={`${it.kind}:${it.id}`} it={it} today={today} />)}
      </div>
    </section>
  );
}

export default function UnifiedHomeworkList({ items, today }: { items: AssignmentItem[]; today: string }) {
  const open = items.filter((i) => !isDone(i.status));
  const overdue = open.filter((i) => i.date < today && i.dateBasis !== 'assigned');
  const todays = open.filter((i) => !overdue.includes(i) && i.date <= today);
  const upcoming = open.filter((i) => i.date > today);
  const finishedToday = items.filter((i) => isDone(i.status) && i.date === today);

  // 오늘 기준 진행 요약: 오늘 해야 하는 것(밀린 것 포함) 중 몇 개를 끝냈는지
  const total = overdue.length + todays.length + finishedToday.length;
  const doneCnt = finishedToday.length;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">오늘의 숙제</p>
        {total === 0 ? (
          <p className="mt-1 text-sm text-neutral-600">오늘 해야 할 숙제가 없어요 🎉</p>
        ) : (
          <>
            <p className="mt-1 text-lg font-bold text-neutral-900">
              {total}개 중 {doneCnt}개 완료
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${Math.round((doneCnt / total) * 100)}%` }}
              />
            </div>
          </>
        )}
      </div>

      <Section title="밀린 숙제" tone="text-red-500" items={overdue} today={today} />
      <Section title="오늘 할 숙제" items={todays} today={today} />
      <Section title="오늘 끝낸 숙제" tone="text-emerald-600" items={finishedToday} today={today} />
      <Section title="앞으로 할 숙제" items={upcoming} today={today} />
    </div>
  );
}
