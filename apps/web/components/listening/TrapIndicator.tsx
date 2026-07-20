'use client';

import type { ChoiceTrapMeta, TrapType } from '@/models/listening';

const TRAP_COLORS: Record<TrapType, { bg: string; border: string; text: string; icon: string }> = {
  KEYWORD_OVERLAP: {
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    text: 'text-amber-900',
    icon: '🔑',
  },
  SCOPE_ERROR: {
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    text: 'text-blue-900',
    icon: '📍',
  },
  CAUSALITY_INVERSION: {
    bg: 'bg-rose-50',
    border: 'border-rose-300',
    text: 'text-rose-900',
    icon: '⬌',
  },
  TIME_CONFUSION: {
    bg: 'bg-purple-50',
    border: 'border-purple-300',
    text: 'text-purple-900',
    icon: '⏰',
  },
  HOMOPHONE_CONFUSION: {
    bg: 'bg-cyan-50',
    border: 'border-cyan-300',
    text: 'text-cyan-900',
    icon: '🔊',
  },
  INFERENCE_TRAP: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-300',
    text: 'text-indigo-900',
    icon: '💭',
  },
  ATTITUDE_MISREAD: {
    bg: 'bg-pink-50',
    border: 'border-pink-300',
    text: 'text-pink-900',
    icon: '😕',
  },
};

interface TrapIndicatorProps {
  trap: ChoiceTrapMeta;
  isSelected: boolean;
  isCorrect: boolean;
}

export default function TrapIndicator({ trap, isSelected, isCorrect }: TrapIndicatorProps) {
  if (!trap.trapType) return null;

  const style = TRAP_COLORS[trap.trapType];

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${style.bg} ${style.border} border`}>
      <div className={`flex items-start gap-2 ${style.text}`}>
        <span className="text-lg shrink-0">{style.icon}</span>
        <div className="flex-1 text-xs">
          <p className="font-semibold">{trap.trapType.replace(/_/g, ' ')}</p>
          <p className="opacity-75 mt-1">{trap.explanation}</p>
        </div>
      </div>

      {isSelected && !isCorrect && (
        <div className="pt-2 border-t border-current/20">
          <p className="text-[10px] font-semibold opacity-60">
            💡 왜 틀렸는가: 이 선택지는 위의 함정을 포함하고 있습니다.
          </p>
        </div>
      )}
    </div>
  );
}
