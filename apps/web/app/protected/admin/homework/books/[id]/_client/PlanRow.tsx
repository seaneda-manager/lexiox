'use client';

import { useTransition } from 'react';
import { togglePlanAction } from '../actions';

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

type Plan = {
  id: string;
  student_id: string;
  weekdays: number[];
  units_per_session: number;
  cursor_unit_index: number;
  is_paused: boolean;
  start_date: string;
};

export default function PlanRow({
  bookId,
  plan,
  studentName,
  totalUnits,
  generatedCount,
  estimatedCompletionDate,
}: {
  bookId: string;
  plan: Plan;
  studentName: string;
  totalUnits: number;
  generatedCount: number;
  estimatedCompletionDate: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const weekdayLabel = (plan.weekdays ?? []).map((w) => WEEKDAY_KO[w]).join(', ');
  const isDone = totalUnits > 0 && generatedCount >= totalUnits;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-neutral-100 px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium text-neutral-800">{studentName}</p>
        <p className="text-[11px] text-neutral-400">
          {weekdayLabel || '요일 미지정'} · 회당 {plan.units_per_session}유닛 · 생성됨 {generatedCount}/{totalUnits}
        </p>
        {isDone ? (
          <p className="text-[11px] font-medium text-emerald-600">🎓 이 교재 완료</p>
        ) : estimatedCompletionDate ? (
          <p className="text-[11px] text-sky-600">
            예상 완료일 {new Date(estimatedCompletionDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        {plan.is_paused && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">일시정지</span>
        )}
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(() => {
              void togglePlanAction(plan.id, bookId, !plan.is_paused);
            })
          }
          className="rounded-full border border-neutral-200 px-3 py-1 text-[11px] font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
        >
          {plan.is_paused ? '재개' : '일시정지'}
        </button>
      </div>
    </div>
  );
}
