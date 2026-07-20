'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type Task = {
  id:            string;
  task_type:     string;
  prompt:        string;
  completed_at:  string | null;
  ai_feedback:   string | null;
  points_earned: number;
};

const TASK_LABELS: Record<string, { emoji: string; label: string }> = {
  current_events_q: { emoji: '📰', label: '시사 문제'     },
  email_writing:    { emoji: '✉️',  label: '이메일 쓰기'  },
  listen_repeat:    { emoji: '🎧', label: '듣고 따라하기' },
  writing:          { emoji: '✍️',  label: '작문'         },
  random_interview: { emoji: '💬', label: '랜덤 인터뷰'   },
  mock_lecturing:   { emoji: '🎓', label: '문법 설명하기' },
};

export default function DailyTaskPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [task, setTask]       = useState<Task | null>(null);
  const [response, setResponse] = useState('');
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/daily-task/${id}`)
      .then((r) => r.json())
      .then((d) => { if (d.task) setTask(d.task); })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = useCallback(async () => {
    if (!response.trim() || !task) return;
    setSubmitting(true);
    setError(null);

    try {
      const res  = await fetch(`/api/daily-task/${id}/complete`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ response: response.trim() }),
      });
      const data = await res.json();

      if (!res.ok) { setError(data.error ?? '오류가 발생했습니다.'); return; }
      setTask(data.task);
    } finally {
      setSubmitting(false);
    }
  }, [id, response, task]);

  if (loading) {
    return (
      <main className="mx-auto max-w-lg py-16 flex justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-neutral-200 border-t-neutral-600 animate-spin" />
      </main>
    );
  }

  if (!task) {
    return (
      <main className="mx-auto max-w-lg py-16 text-center space-y-3">
        <p className="text-neutral-500">태스크를 찾을 수 없습니다.</p>
        <Link href="/student" className="text-sm text-neutral-400 hover:underline">대시보드로</Link>
      </main>
    );
  }

  const meta = TASK_LABELS[task.task_type] ?? { emoji: '⭐', label: '태스크' };

  // 완료 상태
  if (task.completed_at) {
    return (
      <main className="mx-auto max-w-lg space-y-5 pb-12">
        <header>
          <div className="text-xs text-neutral-400 mb-1">
            <Link href="/student" className="hover:underline">대시보드</Link>
            {' / 데일리 태스크'}
          </div>
          <h1 className="text-xl font-bold text-neutral-900">
            {meta.emoji} {meta.label}
          </h1>
        </header>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 space-y-2">
          <p className="text-base font-bold text-emerald-800">완료! +{task.points_earned} P 획득</p>
          <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-wrap">{task.prompt}</p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-2">
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-wide">내 답변</p>
          <p className="text-sm text-neutral-800 leading-relaxed whitespace-pre-wrap">{response || '(저장된 답변)'}</p>
        </div>

        {task.ai_feedback && (
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 space-y-1">
            <p className="text-xs font-bold text-sky-600 uppercase tracking-wide">AI 피드백</p>
            <p className="text-sm text-neutral-800 leading-relaxed whitespace-pre-wrap">{task.ai_feedback}</p>
          </div>
        )}

        <Link
          href="/student"
          className="block w-full text-center rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white hover:bg-neutral-800"
        >
          대시보드로
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg space-y-5 pb-12">
      <header>
        <div className="text-xs text-neutral-400 mb-1">
          <Link href="/student" className="hover:underline">대시보드</Link>
          {' / 데일리 태스크'}
        </div>
        <h1 className="text-xl font-bold text-neutral-900">
          {meta.emoji} {meta.label}
        </h1>
        <p className="text-xs text-neutral-400 mt-0.5">오늘의 태스크 완료 시 +50 P</p>
      </header>

      {/* 태스크 프롬프트 */}
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
        <p className="text-sm text-neutral-800 leading-relaxed whitespace-pre-wrap">{task.prompt}</p>
      </div>

      {/* 답변 입력 */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
          내 답변 (영어로 작성)
        </label>
        <textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder="여기에 답변을 입력하세요..."
          rows={6}
          className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none resize-none focus:border-neutral-400 transition"
        />
        <p className="text-xs text-neutral-400 text-right">{response.length}자</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || response.trim().length < 10}
        className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-40"
      >
        {submitting ? 'AI 피드백 생성 중…' : '제출하고 포인트 받기'}
      </button>
    </main>
  );
}
