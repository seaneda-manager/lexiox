'use client';

import { useState, useTransition } from 'react';
import { setRecommendedLevelAction } from '../actions';

export default function ReviewPanel({
  sessionId,
  initialLevel,
  initialNotes,
}: {
  sessionId: string;
  initialLevel: string | null;
  initialNotes: string | null;
}) {
  const [level, setLevel] = useState(initialLevel ?? '');
  const [notes, setNotes] = useState(initialNotes ?? '');
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    setSaved(false);
    startTransition(async () => {
      const result = await setRecommendedLevelAction(sessionId, level, notes);
      if (!('error' in result)) setSaved(true);
    });
  };

  return (
    <div className="space-y-2 border-t border-gray-100 pt-3">
      <p className="text-[10px] font-semibold text-gray-500">🎯 추천 레벨 지정</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={level}
          onChange={(e) => { setLevel(e.target.value); setSaved(false); }}
          placeholder="예: Level 3"
          className="w-32 rounded-lg border border-gray-200 px-3 py-1.5 text-xs outline-none focus:border-gray-400"
        />
        <input
          type="text"
          value={notes}
          onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
          placeholder="학생에게 보여줄 코멘트 (선택)"
          className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs outline-none focus:border-gray-400"
        />
        <button
          type="button"
          disabled={isPending}
          onClick={handleSave}
          className="shrink-0 rounded-full border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          {isPending ? '저장 중…' : '저장'}
        </button>
        {saved && <span className="self-center text-[11px] text-emerald-600">저장됨</span>}
      </div>
    </div>
  );
}
