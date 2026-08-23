'use client';

import { useState, useTransition } from 'react';
import { togglePlanAction, resyncPlanAction } from '../actions';

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

type LevelInfo = {
  level: string | null;
  expectedSchoolGrade: string | null;
  expectedMockExam: string | null;
};

export default function PlanRow({
  bookId,
  plan,
  studentName,
  totalUnits,
  generatedCount,
  targetRepeatCount,
  currentRepeatNumber,
  estimatedCompletionDate,
  levelInfo,
}: {
  bookId: string;
  plan: Plan;
  studentName: string;
  totalUnits: number;
  generatedCount: number;
  targetRepeatCount: number;
  currentRepeatNumber: number;
  estimatedCompletionDate: string | null;
  levelInfo?: LevelInfo;
}) {
  const [isPending, startTransition] = useTransition();
  const [resyncMsg, setResyncMsg] = useState<string | null>(null);
  const weekdayLabel = (plan.weekdays ?? []).map((w) => WEEKDAY_KO[w]).join(', ');
  const lapDone = totalUnits > 0 && generatedCount >= totalUnits;
  const isDone = lapDone && currentRepeatNumber >= targetRepeatCount;
  const isMultiRepeat = targetRepeatCount > 1;

  const levelSummary = [
    levelInfo?.level,
    levelInfo?.expectedSchoolGrade && `예상 내신 ${levelInfo.expectedSchoolGrade}`,
    levelInfo?.expectedMockExam && `모의고사 ${levelInfo.expectedMockExam}`,
  ].filter(Boolean).join(' · ');

  const handleResync = () => {
    setResyncMsg(null);
    startTransition(async () => {
      const result = await resyncPlanAction(plan.id, bookId);
      setResyncMsg('error' in result ? result.error : `동기화 완료 (신규 ${result.created}개)`);
    });
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-neutral-100 px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium text-neutral-800">{studentName}</p>
        <p className="text-[11px] text-neutral-400">
          {weekdayLabel || '요일 미지정'} · 회당 {plan.units_per_session}유닛 · 생성됨 {generatedCount}/{totalUnits}
          {isMultiRepeat && ` · ${currentRepeatNumber}/${targetRepeatCount}회독`}
        </p>
        {isDone ? (
          <>
            <p className="text-[11px] font-medium text-emerald-600">🎓 목표 회독까지 전부 완료</p>
            {levelSummary && <p className="text-[11px] text-violet-600">{levelSummary}</p>}
          </>
        ) : lapDone && isMultiRepeat ? (
          <p className="text-[11px] text-amber-600">
            {currentRepeatNumber}회독 완료 · 다음 회차는 새 유닛 추가 시 자동 시작되거나, 지금 바로 동기화할 수 있습니다.
          </p>
        ) : estimatedCompletionDate ? (
          <p className="text-[11px] text-sky-600">
            예상 완료일(목표 회독 기준) {new Date(estimatedCompletionDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
            {levelSummary && ` · 완료 시 ${levelSummary}`}
          </p>
        ) : null}
        {resyncMsg && <p className="text-[11px] text-neutral-400">{resyncMsg}</p>}
      </div>
      <div className="flex items-center gap-2">
        {plan.is_paused && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">일시정지</span>
        )}
        {lapDone && !isDone && (
          <button
            type="button"
            disabled={isPending}
            onClick={handleResync}
            className="rounded-full border border-violet-200 text-violet-600 px-3 py-1 text-[11px] font-medium hover:bg-violet-50 disabled:opacity-50"
          >
            다음 회차 동기화
          </button>
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
