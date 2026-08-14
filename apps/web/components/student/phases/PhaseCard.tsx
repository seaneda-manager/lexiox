'use client';

import type { LearningPhase } from '@/lib/types/learning-phase';
import { PHASE_LABELS, PHASE_DESCRIPTIONS, PHASE_ICONS, PHASE_DURATION } from '@/lib/student-activities/curriculum-router';

export type PhaseStatus = 'completed' | 'in_progress' | 'upcoming' | 'locked';

interface PhaseCardProps {
  phase: LearningPhase;
  status: PhaseStatus;
  order: number;
  progress?: number; // 0-100
  onClick?: () => void;
  children?: React.ReactNode;
}

export function PhaseCard({
  phase,
  status,
  order,
  progress = 0,
  onClick,
  children,
}: PhaseCardProps) {
  const label = PHASE_LABELS[phase];
  const description = PHASE_DESCRIPTIONS[phase];
  const icon = PHASE_ICONS[phase];
  const duration = PHASE_DURATION[phase];

  const statusStyles = {
    completed: {
      container: 'border-emerald-200 bg-emerald-50',
      dot: 'bg-emerald-600 border-emerald-600 text-white',
      badge: 'bg-emerald-600 text-white',
      text: 'text-emerald-900',
      secondary: 'text-emerald-700',
    },
    in_progress: {
      container: 'border-blue-300 bg-blue-50 ring-2 ring-blue-200',
      dot: 'bg-blue-600 border-blue-600 text-white ring-4 ring-blue-200',
      badge: 'bg-blue-600 text-white animate-pulse',
      text: 'text-blue-900',
      secondary: 'text-blue-700',
    },
    upcoming: {
      container: 'border-amber-200 bg-amber-50',
      dot: 'bg-amber-600 border-amber-600 text-white',
      badge: 'bg-amber-600 text-white',
      text: 'text-amber-900',
      secondary: 'text-amber-700',
    },
    locked: {
      container: 'border-slate-200 bg-slate-50 opacity-60',
      dot: 'bg-slate-400 border-slate-400 text-white',
      badge: 'bg-slate-400 text-white',
      text: 'text-slate-900',
      secondary: 'text-slate-600',
    },
  };

  const styles = statusStyles[status];

  const statusLabel = {
    completed: '✓ 완료',
    in_progress: '🎯 진행 중',
    upcoming: '예정',
    locked: '미해제',
  }[status];

  return (
    <div
      className={`group relative rounded-lg border-2 p-5 transition cursor-pointer hover:shadow-md ${styles.container}`}
      onClick={onClick}
    >
      {/* Dot & Number */}
      <div className="absolute -left-4 top-5 flex items-center gap-3">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full border-2 font-bold text-sm ${styles.dot}`}
        >
          {status === 'completed' ? '✓' : order}
        </div>
      </div>

      {/* Content */}
      <div className="ml-8">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{icon}</span>
            <div>
              <h3 className={`font-semibold ${styles.text}`}>{label}</h3>
            </div>
          </div>
          <div className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles.badge}`}>
            {statusLabel}
          </div>
        </div>

        {/* Description */}
        <p className={`text-sm mb-4 ${styles.secondary}`}>{description}</p>

        {/* Progress Bar (if in progress) */}
        {status === 'in_progress' && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className={styles.secondary}>진행률</span>
              <span className="font-semibold">{progress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white overflow-hidden">
              <div
                className={`h-full transition-all ${
                  status === 'in_progress' ? 'bg-blue-600' : 'bg-emerald-600'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Duration & CTA */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500">
            ⏱️ 약 {duration}분
          </div>
          {status === 'in_progress' && (
            <div className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
              계속하기 →
            </div>
          )}
          {status === 'upcoming' && (
            <div className="rounded-full bg-amber-600 px-3 py-1 text-xs font-semibold text-white">
              시작하기 →
            </div>
          )}
        </div>

        {/* Custom children */}
        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
}
