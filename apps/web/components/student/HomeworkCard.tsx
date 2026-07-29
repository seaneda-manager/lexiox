'use client';

import Link from 'next/link';

export type HomeworkItem = {
  id: string;
  type: 'vocab' | 'reading' | 'writing' | 'listening' | 'speaking';
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  dueDate?: string;
  href: string;
};

interface HomeworkCardProps {
  items: HomeworkItem[];
}

const ICON_MAP: Record<HomeworkItem['type'], string> = {
  vocab: '📚',
  reading: '📖',
  writing: '✍️',
  listening: '🎧',
  speaking: '🎤',
};

const LABEL_MAP: Record<HomeworkItem['type'], string> = {
  vocab: 'Vocabulary',
  reading: 'Reading',
  writing: 'Writing',
  listening: 'Listening',
  speaking: 'Speaking',
};

const COLOR_MAP: Record<HomeworkItem['type'], { bg: string; text: string; badge: string }> = {
  vocab: { bg: 'bg-amber-50', text: 'text-amber-900', badge: 'bg-amber-100 text-amber-700' },
  reading: { bg: 'bg-blue-50', text: 'text-blue-900', badge: 'bg-blue-100 text-blue-700' },
  writing: { bg: 'bg-rose-50', text: 'text-rose-900', badge: 'bg-rose-100 text-rose-700' },
  listening: { bg: 'bg-purple-50', text: 'text-purple-900', badge: 'bg-purple-100 text-purple-700' },
  speaking: { bg: 'bg-emerald-50', text: 'text-emerald-900', badge: 'bg-emerald-100 text-emerald-700' },
};

export default function HomeworkCard({ items }: HomeworkCardProps) {
  if (!items || items.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center">
        <p className="text-sm text-slate-500">숙제가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-slate-900">📋 숙제</h2>

      <div className="grid gap-3">
        {items.map((item) => {
          const icon = ICON_MAP[item.type];
          const label = LABEL_MAP[item.type];
          const colors = COLOR_MAP[item.type];
          const isCompleted = item.status === 'completed';
          const isInProgress = item.status === 'in_progress';

          return (
            <Link key={item.id} href={item.href}>
              <div
                className={`rounded-xl border-2 px-4 py-3 transition-all cursor-pointer ${
                  isCompleted
                    ? 'border-emerald-200 bg-emerald-50'
                    : isInProgress
                      ? `border-blue-200 ${colors.bg}`
                      : `border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50`
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-2xl flex-shrink-0">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 text-sm truncate">{item.title}</div>
                      {item.description && (
                        <div className="text-xs text-slate-600 truncate">{item.description}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0 text-right">
                    {isCompleted ? (
                      <div className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        <span>✓</span>
                        <span>완료</span>
                      </div>
                    ) : isInProgress ? (
                      <div className={`inline-flex items-center gap-1 rounded-full ${colors.badge} px-2.5 py-1 text-xs font-semibold`}>
                        <span className="inline-block h-2 w-2 rounded-full bg-current animate-pulse" />
                        <span>진행중</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        <span>→</span>
                        <span>시작</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
