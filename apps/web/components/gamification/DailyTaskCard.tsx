'use client';

import { useState } from 'react';

type DailyTask = {
  id:           string;
  task_type:    string;
  prompt:       string;
  completed_at: string | null;
  points_earned: number;
} | null;

const TASK_LABELS: Record<string, { emoji: string; label: string; color: string }> = {
  current_events_q: { emoji: '📰', label: '시사 문제',     color: 'sky'     },
  email_writing:    { emoji: '✉️',  label: '이메일 쓰기',  color: 'indigo'  },
  listen_repeat:    { emoji: '🎧', label: '듣고 따라하기', color: 'violet'  },
  writing:          { emoji: '✍️',  label: '작문',         color: 'amber'   },
  random_interview: { emoji: '💬', label: '랜덤 인터뷰',   color: 'emerald' },
  mock_lecturing:   { emoji: '🎓', label: '문법 설명하기', color: 'rose'    },
};

const COLOR_STYLES: Record<string, { border: string; bg: string; badge: string; btn: string }> = {
  sky:     { border: 'border-sky-200',     bg: 'bg-sky-50',     badge: 'bg-sky-100 text-sky-700',     btn: 'bg-sky-600 hover:bg-sky-700'     },
  indigo:  { border: 'border-indigo-200',  bg: 'bg-indigo-50',  badge: 'bg-indigo-100 text-indigo-700',  btn: 'bg-indigo-600 hover:bg-indigo-700'  },
  violet:  { border: 'border-violet-200',  bg: 'bg-violet-50',  badge: 'bg-violet-100 text-violet-700',  btn: 'bg-violet-600 hover:bg-violet-700'  },
  amber:   { border: 'border-amber-200',   bg: 'bg-amber-50',   badge: 'bg-amber-100 text-amber-700',   btn: 'bg-amber-600 hover:bg-amber-700'   },
  emerald: { border: 'border-emerald-200', bg: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700', btn: 'bg-emerald-600 hover:bg-emerald-700' },
  rose:    { border: 'border-rose-200',    bg: 'bg-rose-50',    badge: 'bg-rose-100 text-rose-700',    btn: 'bg-rose-600 hover:bg-rose-700'    },
};

export default function DailyTaskCard({ task: initialTask }: { task: DailyTask }) {
  const [task, setTask]       = useState<DailyTask>(initialTask);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/daily-task/generate', { method: 'POST' });
      const data = await res.json();
      if (data.ok && data.task) setTask(data.task);
    } finally {
      setLoading(false);
    }
  };

  // 오늘 태스크 완료됨
  if (task?.completed_at) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
        <span className="text-2xl">✅</span>
        <div>
          <p className="text-sm font-bold text-emerald-800">오늘의 태스크 완료!</p>
          <p className="text-xs text-emerald-600 mt-0.5">+{task.points_earned} P 획득</p>
        </div>
      </div>
    );
  }

  // 태스크 있음, 미완료
  if (task) {
    const meta = TASK_LABELS[task.task_type] ?? { emoji: '⭐', label: '태스크', color: 'sky' };
    const c    = COLOR_STYLES[meta.color];

    return (
      <div className={`rounded-2xl border ${c.border} ${c.bg} p-4 space-y-3`}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{meta.emoji}</span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.badge}`}>
            오늘의 태스크 · {meta.label}
          </span>
          <span className="ml-auto text-xs text-neutral-400">+50 P</span>
        </div>
        <p className="text-sm text-neutral-800 leading-relaxed">{task.prompt}</p>
        <a
          href={`/student/daily-task/${task.id}`}
          className={`block w-full rounded-xl py-2.5 text-center text-sm font-semibold text-white transition ${c.btn}`}
        >
          시작하기 →
        </a>
      </div>
    );
  }

  // 태스크 없음 → 생성 버튼
  return (
    <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-5 text-center space-y-3">
      <p className="text-sm font-semibold text-neutral-700">오늘의 Daily Task</p>
      <p className="text-xs text-neutral-400">
        오늘 맞춤 태스크를 받아보세요. 완료하면 +50 P 획득!
      </p>
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="rounded-xl bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {loading ? '생성 중…' : '태스크 받기'}
      </button>
    </div>
  );
}
