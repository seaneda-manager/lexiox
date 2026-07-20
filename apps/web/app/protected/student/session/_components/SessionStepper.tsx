'use client';

import Link from 'next/link';
import { useState } from 'react';

// ── 타입 ──────────────────────────────────────────────────────
export type StepStatus = 'done' | 'active' | 'locked' | 'pending';

export type SessionStep = {
  id:       string;
  label:    string;
  sublabel?: string;
  icon:     string;
  status:   StepStatus;
  href:     string | null;   // null = PT (선생님 주도)
  ctaLabel?: string;
  detail?:  string;          // 완료 시 표시할 요약
  color:    'emerald' | 'sky' | 'indigo' | 'violet' | 'amber' | 'rose' | 'neutral';
};

// ── 색 맵 (Tailwind JIT: 모든 클래스 정적 문자열로 명시) ─────
const COLOR = {
  emerald: { border: 'border-emerald-400', dot: 'bg-emerald-500', btn: 'bg-emerald-600 hover:bg-emerald-700', badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', iconBg: 'bg-emerald-100' },
  sky:     { border: 'border-sky-400',     dot: 'bg-sky-500',     btn: 'bg-sky-600     hover:bg-sky-700',     badge: 'bg-sky-50     text-sky-700     ring-1 ring-sky-200',     iconBg: 'bg-sky-100'     },
  indigo:  { border: 'border-indigo-400',  dot: 'bg-indigo-500',  btn: 'bg-indigo-600  hover:bg-indigo-700',  badge: 'bg-indigo-50  text-indigo-700  ring-1 ring-indigo-200',  iconBg: 'bg-indigo-100'  },
  violet:  { border: 'border-violet-400',  dot: 'bg-violet-500',  btn: 'bg-violet-600  hover:bg-violet-700',  badge: 'bg-violet-50  text-violet-700  ring-1 ring-violet-200',  iconBg: 'bg-violet-100'  },
  amber:   { border: 'border-amber-400',   dot: 'bg-amber-500',   btn: 'bg-amber-600   hover:bg-amber-700',   badge: 'bg-amber-50   text-amber-700   ring-1 ring-amber-200',   iconBg: 'bg-amber-100'   },
  rose:    { border: 'border-rose-400',    dot: 'bg-rose-500',    btn: 'bg-rose-600    hover:bg-rose-700',    badge: 'bg-rose-50    text-rose-700    ring-1 ring-rose-200',    iconBg: 'bg-rose-100'    },
  neutral: { border: 'border-neutral-300', dot: 'bg-neutral-400', btn: 'bg-neutral-800 hover:bg-neutral-700', badge: 'bg-neutral-50  text-neutral-600 ring-1 ring-neutral-200', iconBg: 'bg-neutral-100' },
};

// ── Props ────────────────────────────────────────────────────
type Props = {
  steps:       SessionStep[];
  sessionType: 'A' | 'B';
  studentName: string;
  todayLabel:  string;
};

export default function SessionStepper({ steps, sessionType, studentName, todayLabel }: Props) {
  // active 스텝 expand (기본: 첫 번째 active)
  const defaultOpen = steps.find((s) => s.status === 'active')?.id ?? null;
  const [expanded, setExpanded] = useState<string | null>(defaultOpen);

  const doneCount    = steps.filter((s) => s.status === 'done').length;
  const totalCount   = steps.length;
  const progressPct  = Math.round((doneCount / totalCount) * 100);
  const allDone      = doneCount === totalCount;

  return (
    <div className="space-y-5">

      {/* ── 헤더 배너 ─────────────────────────────────────── */}
      <div className={[
        'rounded-2xl border p-5',
        allDone
          ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white'
          : doneCount === 0
          ? 'border-neutral-200 bg-gradient-to-br from-neutral-50 to-white'
          : 'border-sky-200 bg-gradient-to-br from-sky-50 to-white',
      ].join(' ')}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-neutral-400">{todayLabel}</p>
            <h1 className="text-xl font-bold text-neutral-900 mt-0.5">
              {allDone ? '🎉 오늘 수업 완료!' : `안녕하세요, ${studentName}!`}
            </h1>
            <p className="text-sm text-neutral-500 mt-0.5">
              {allDone
                ? '모든 단계를 마쳤어요. 수고했어요!'
                : `${doneCount}/${totalCount} 단계 완료`}
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className={[
              'inline-block rounded-full px-3 py-1 text-xs font-semibold',
              sessionType === 'A'
                ? 'bg-sky-100 text-sky-700 ring-1 ring-sky-200'
                : 'bg-violet-100 text-violet-700 ring-1 ring-violet-200',
            ].join(' ')}>
              수업 {sessionType}
            </span>
          </div>
        </div>

        {/* 진도 바 */}
        <div className="mt-4 space-y-1">
          <div className="h-2 w-full rounded-full bg-white/70">
            <div
              className={[
                'h-2 rounded-full transition-all duration-500',
                allDone ? 'bg-emerald-500' : 'bg-sky-500',
              ].join(' ')}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-neutral-400">
            <span>오늘의 수업 진도</span>
            <span>{progressPct}%</span>
          </div>
        </div>
      </div>

      {/* ── 스텝 목록 ────────────────────────────────────── */}
      <div className="relative">
        {/* 왼쪽 타임라인 선 */}
        <div className="absolute left-[18px] top-6 bottom-6 w-0.5 bg-neutral-100 z-0" />

        <div className="relative z-10 space-y-2">
          {steps.map((step, idx) => {
            const c       = COLOR[step.color];
            const isOpen  = expanded === step.id;
            const isDone  = step.status === 'done';
            const isActive = step.status === 'active';
            const isLocked = step.status === 'locked';

            return (
              <div
                key={step.id}
                className={[
                  'rounded-2xl border transition-all',
                  isDone    ? 'border-neutral-100 bg-white opacity-70'
                  : isActive ? `border-2 ${c.border} bg-white shadow-sm`
                  : isLocked ? 'border-neutral-100 bg-neutral-50/50'
                  : 'border-neutral-200 bg-white',
                ].join(' ')}
              >
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : step.id)}
                  disabled={isLocked}
                  className="w-full text-left"
                >
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    {/* 번호 / 아이콘 dot */}
                    <div className={[
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg',
                      isDone    ? 'bg-emerald-100'
                      : isActive ? c.iconBg
                      : 'bg-neutral-100',
                    ].join(' ')}>
                      {isDone ? '✓' : step.icon}
                    </div>

                    {/* 라벨 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={[
                          'text-sm font-semibold',
                          isDone   ? 'text-neutral-400 line-through'
                          : isActive ? 'text-neutral-900'
                          : isLocked ? 'text-neutral-300'
                          : 'text-neutral-600',
                        ].join(' ')}>
                          {step.label}
                        </span>
                        {isActive && (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${c.badge}`}>
                            진행중
                          </span>
                        )}
                        {isDone && step.detail && (
                          <span className="text-[11px] text-emerald-600 font-medium truncate">
                            {step.detail}
                          </span>
                        )}
                      </div>
                      {step.sublabel && !isDone && (
                        <p className={[
                          'text-xs mt-0.5 truncate',
                          isLocked ? 'text-neutral-300' : 'text-neutral-400',
                        ].join(' ')}>
                          {step.sublabel}
                        </p>
                      )}
                    </div>

                    {/* 오른쪽 상태 표시 */}
                    {!isLocked && (
                      <span className={[
                        'text-neutral-300 text-sm shrink-0 transition-transform',
                        isOpen ? 'rotate-180' : '',
                      ].join(' ')}>
                        ▾
                      </span>
                    )}
                    {isLocked && (
                      <span className="text-neutral-200 text-sm shrink-0">🔒</span>
                    )}
                  </div>
                </button>

                {/* 펼쳐진 상세 */}
                {isOpen && !isLocked && (
                  <div className="px-4 pb-4 space-y-3">
                    <div className="h-px bg-neutral-100" />

                    {/* step별 설명 (sublabel) */}
                    {step.sublabel && (
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        {step.sublabel}
                      </p>
                    )}

                    {/* CTA 버튼 */}
                    {step.href ? (
                      <Link
                        href={step.href}
                        className={[
                          'block w-full rounded-xl py-2.5 text-center text-sm font-semibold text-white transition',
                          isDone
                            ? 'bg-neutral-200 text-neutral-600 hover:bg-neutral-300'
                            : c.btn,
                        ].join(' ')}
                      >
                        {step.ctaLabel ?? (isDone ? '다시 하기' : '시작하기 →')}
                      </Link>
                    ) : (
                      /* PT — 선생님 주도 */
                      <div className={[
                        'rounded-xl px-4 py-3 text-sm text-center',
                        isDone
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-neutral-50 text-neutral-500',
                      ].join(' ')}>
                        {isDone
                          ? '✓ 선생님과 PT 완료'
                          : '선생님과 함께 진행합니다'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
