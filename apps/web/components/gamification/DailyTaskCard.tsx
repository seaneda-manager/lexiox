'use client';

import { useState } from 'react';

const TASK_TYPE_LABELS: Record<string, { emoji: string; label: string; color: string }> = {
  light:     { emoji: '⭐', label: '기초 4문제',   color: 'sky'     },
  medium_1:  { emoji: '🎯', label: '중급 유형1',  color: 'indigo'  },
  medium_2:  { emoji: '🎯', label: '중급 유형2',  color: 'violet'  },
  medium_3:  { emoji: '🎯', label: '중급 유형3',  color: 'amber'   },
  medium_4:  { emoji: '🎯', label: '중급 유형4',  color: 'emerald' },
};

const COLOR_STYLES: Record<string, { border: string; bg: string; badge: string; btn: string }> = {
  sky:     { border: 'border-sky-200',     bg: 'bg-sky-50',     badge: 'bg-sky-100 text-sky-700',     btn: 'bg-sky-600 hover:bg-sky-700'     },
  indigo:  { border: 'border-indigo-200',  bg: 'bg-indigo-50',  badge: 'bg-indigo-100 text-indigo-700',  btn: 'bg-indigo-600 hover:bg-indigo-700'  },
  violet:  { border: 'border-violet-200',  bg: 'bg-violet-50',  badge: 'bg-violet-100 text-violet-700',  btn: 'bg-violet-600 hover:bg-violet-700'  },
  amber:   { border: 'border-amber-200',   bg: 'bg-amber-50',   badge: 'bg-amber-100 text-amber-700',   btn: 'bg-amber-600 hover:bg-amber-700'   },
  emerald: { border: 'border-emerald-200', bg: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700', btn: 'bg-emerald-600 hover:bg-emerald-700' },
  rose:    { border: 'border-rose-200',    bg: 'bg-rose-50',    badge: 'bg-rose-100 text-rose-700',    btn: 'bg-rose-600 hover:bg-rose-700'    },
};

export default function DailyTaskCard() {
  const [taskId, setTaskId]   = useState<string | null>(null);
  const [taskType, setTaskType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/daily-task/generate', { method: 'POST' });
      const data = await res.json();
      if (data.ok && data.daily_task_id) {
        setTaskId(data.daily_task_id);
        setTaskType(data.task_type);
      }
    } catch (err) {
      console.error('Failed to generate daily task:', err);
    } finally {
      setLoading(false);
    }
  };

  // Task 받은 상태
  if (taskId && taskType) {
    const meta = TASK_TYPE_LABELS[taskType] ?? { emoji: '⭐', label: '과제', color: 'sky' };
    const c = COLOR_STYLES[meta.color];

    return (
      <div className={`rounded-2xl border ${c.border} ${c.bg} p-4 space-y-3`}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{meta.emoji}</span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.badge}`}>
            오늘의 Daily Task · {meta.label}
          </span>
          <span className="ml-auto text-xs text-neutral-400">+50 P</span>
        </div>
        <p className="text-sm text-neutral-800">오늘 받은 맞춤형 과제를 풀어보세요!</p>
        <a
          href={`/student/daily-task/${taskId}`}
          className={`block w-full rounded-xl py-2.5 text-center text-sm font-semibold text-white transition ${c.btn}`}
        >
          시작하기 →
        </a>
      </div>
    );
  }

  // Task 없음 → 받기 버튼
  return (
    <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-5 text-center space-y-3">
      <p className="text-sm font-semibold text-neutral-700">오늘의 Daily Task</p>
      <p className="text-xs text-neutral-400">
        오늘 맞춤 과제를 받아보세요. 완료하면 +50 P 획득!
      </p>
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="rounded-xl bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {loading ? '생성 중…' : '테스크 받기'}
      </button>
    </div>
  );
}
