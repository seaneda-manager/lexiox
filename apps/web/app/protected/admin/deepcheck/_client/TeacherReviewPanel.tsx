'use client';

import { useState, useTransition } from 'react';
import { saveTeacherNotesAction, setSessionCompletedAction } from '../actions';

export default function TeacherReviewPanel({
  sessionId,
  initialNotes,
  isCompleted,
}: {
  sessionId: string;
  initialNotes: string | null;
  isCompleted: boolean;
}) {
  const [notes, setNotes] = useState(initialNotes ?? '');
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSaveNotes = () => {
    setSaved(false);
    startTransition(async () => {
      const result = await saveTeacherNotesAction(sessionId, notes);
      if (!('error' in result)) setSaved(true);
    });
  };

  const handleToggleCompleted = () => {
    startTransition(() => {
      void setSessionCompletedAction(sessionId, !isCompleted);
    });
  };

  return (
    <div className="space-y-2 border-t border-gray-100 pt-3">
      <p className="text-[10px] font-semibold text-gray-500">👩‍🏫 선생님 메모</p>
      <textarea
        value={notes}
        onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
        rows={2}
        placeholder="세션 중 나온 이야기, 다음에 이어갈 내용 등을 메모하세요"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-gray-400 resize-none"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={handleSaveNotes}
          className="rounded-full border border-gray-200 px-3 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          {isPending ? '저장 중…' : '메모 저장'}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={handleToggleCompleted}
          className={[
            'rounded-full px-3 py-1 text-[11px] font-semibold disabled:opacity-50',
            isCompleted
              ? 'border border-gray-200 text-gray-500 hover:bg-gray-50'
              : 'bg-sky-600 text-white hover:bg-sky-700',
          ].join(' ')}
        >
          {isCompleted ? '완료 취소' : '✓ 세션 완료로 표시'}
        </button>
        {saved && <span className="text-[11px] text-emerald-600">저장됨</span>}
      </div>
    </div>
  );
}
