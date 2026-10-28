'use client';

import { useState, useTransition } from 'react';
import { togglePauseAction, resyncPlanAction, reschedulePlanAction, deletePlanAction } from '../actions';
import PlanForm, { type PlanFormInitial } from './PlanForm';

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];
const LEVEL_LABEL: Record<string, string> = { all: '전체', ms: '중등', hs: '고등', toefl: 'TOEFL' };

export type UpcomingItem = { date: string; label: string; ready: boolean; done: boolean; overdue: boolean };

export default function PlanRow(props: {
  planId: string;
  studentName: string;
  paused: boolean;
  settings: PlanFormInitial;
  total: number;
  done: number;
  overdue: number;
  todayLabels: string[];
  nextDate: string | null;
  lastDate: string | null;
  upcoming: UpcomingItem[];
  units: { id: string; label: string }[];
  today: string;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState('');
  const [editing, setEditing] = useState(false);
  const s = props.settings;
  const pct = props.total > 0 ? Math.round((props.done / props.total) * 100) : 0;

  const run = (fn: () => Promise<{ ok: true; created: number } | { error: string }>, okText: (n: number) => string) =>
    start(async () => {
      setMsg('');
      const r = await fn();
      setMsg('error' in r ? `오류: ${r.error}` : okText(r.created));
    });

  return (
    <div className={`rounded-xl border p-4 ${props.overdue > 0 ? 'border-rose-200' : 'border-neutral-200'} bg-white`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-neutral-900">
            {props.studentName}
            {props.paused && <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-500">일시정지</span>}
          </div>
          <div className="mt-0.5 text-xs text-neutral-500">
            {s.weekdays.map((w) => WEEKDAY_KO[w]).join('·')} · 하루 {s.unitsPerSession}챕터 · {LEVEL_LABEL[s.level] ?? s.level} · {s.startDate} 시작
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button disabled={pending} onClick={() => setEditing((v) => !v)} className="rounded-lg border px-2.5 py-1 text-xs hover:bg-neutral-50">
            {editing ? '닫기' : '수정'}
          </button>
          <button
            disabled={pending}
            onClick={() => run(() => togglePauseAction(props.planId, !props.paused), (n) => (props.paused ? `다시 시작 — 챕터 ${n}개 재배치` : '일시정지했습니다.'))}
            className="rounded-lg border px-2.5 py-1 text-xs hover:bg-neutral-50"
          >
            {props.paused ? '다시 시작' : '일시정지'}
          </button>
          <button disabled={pending} onClick={() => run(() => resyncPlanAction(props.planId), (n) => `동기화 — 새로 배치한 챕터 ${n}개`)} className="rounded-lg border px-2.5 py-1 text-xs hover:bg-neutral-50">
            재동기화
          </button>
          <button
            disabled={pending}
            onClick={() => {
              if (confirm('끝내지 않은 챕터(밀린 것 포함)를 지우고 오늘부터 다시 배치합니다. 계속할까요?')) run(() => reschedulePlanAction(props.planId), (n) => `오늘부터 다시 배치 — 챕터 ${n}개`);
            }}
            className="rounded-lg border px-2.5 py-1 text-xs hover:bg-neutral-50"
          >
            오늘부터 다시 잡기
          </button>
          <button
            disabled={pending}
            onClick={() => {
              if (confirm('이 학생의 스케줄을 삭제합니다. (완료 기록은 남습니다)')) run(() => deletePlanAction(props.planId), () => '삭제했습니다.');
            }}
            className="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50"
          >
            삭제
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-neutral-600">
        <span>
          진행 <b className="text-neutral-900">{props.done}/{props.total}</b> ({pct}%)
        </span>
        {props.overdue > 0 && <span className="font-semibold text-rose-600">밀림 {props.overdue}</span>}
        <span>오늘: {props.todayLabels.length > 0 ? props.todayLabels.join(', ') : '없음'}</span>
        {props.nextDate && <span>다음 {props.nextDate.slice(5).replace('-', '/')}</span>}
        {props.lastDate && <span>예상 완료 {props.lastDate}</span>}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
        <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
      </div>

      {msg && <p className="mt-2 text-xs text-neutral-600">{msg}</p>}

      {editing && (
        <div className="mt-3">
          <PlanForm students={[]} units={props.units} today={props.today} initial={props.settings} onDone={() => setEditing(false)} />
        </div>
      )}

      {props.upcoming.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-neutral-500">앞으로의 일정 ({props.upcoming.length})</summary>
          <ul className="mt-2 divide-y rounded-lg border text-xs">
            {props.upcoming.map((u, i) => (
              <li key={i} className="flex items-center justify-between gap-2 px-3 py-1.5">
                <span className="text-neutral-500">{u.date.slice(5).replace('-', '/')}</span>
                <span className="flex-1 truncate px-2 text-neutral-900">{u.label}</span>
                {u.done ? (
                  <span className="rounded bg-emerald-50 px-1.5 text-emerald-700">완료</span>
                ) : u.overdue ? (
                  <span className="rounded bg-rose-50 px-1.5 text-rose-700">밀림</span>
                ) : !u.ready ? (
                  <span className="rounded bg-amber-50 px-1.5 text-amber-700">내용 준비 중</span>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
