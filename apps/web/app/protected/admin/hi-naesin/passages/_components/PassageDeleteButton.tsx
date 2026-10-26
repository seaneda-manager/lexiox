'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { countHiNaesinPassageUsageAction, deleteHiNaesinPassagesAction } from '../actions';

type Props = {
  ids: string[];
  label: string; // 확인창에 보여줄 이름 (지문 제목 / 교재·모의고사 그룹명)
  variant?: 'row' | 'group';
};

export default function PassageDeleteButton({ ids, label, variant = 'row' }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onClick = (e: React.MouseEvent) => {
    // 그룹 제목(summary) 안에 있어도 접힘/펼침이 바뀌지 않게
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    start(async () => {
      const usage = await countHiNaesinPassageUsageAction(ids);
      const msg =
        `"${label}" 지문 ${ids.length}개를 삭제할까요?\n\n` +
        `문장·Drill 등 딸린 내용이 함께 삭제됩니다.\n` +
        `학생 진행 기록 ${usage.sessions}건, 숙제 배정 ${usage.assignments}건도 함께 삭제됩니다.\n` +
        `되돌릴 수 없습니다.`;
      if (!window.confirm(msg)) return;
      const res = await deleteHiNaesinPassagesAction(ids);
      if (res.ok === false) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className={
          variant === 'group'
            ? 'rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50'
            : 'rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50'
        }
      >
        {pending ? '처리 중…' : variant === 'group' ? '그룹 삭제' : '삭제'}
      </button>
      {error && <span className="mt-1 text-xs text-red-600">{error}</span>}
    </span>
  );
}
