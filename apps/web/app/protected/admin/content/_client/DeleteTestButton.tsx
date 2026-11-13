'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * 시험 삭제 버튼 (Reading/Writing 목록 공용).
 * 배정된 시험은 비활성화하고(서버도 한 번 더 막는다), 삭제 전에 이름·날짜를 보여주며 확인받는다.
 */
export default function DeleteTestButton({
  endpoint,
  testId,
  testLabel,
  createdHint,
  assigned = false,
}: {
  endpoint: string;
  testId: string;
  testLabel: string;
  /** 이름이 없을 때 구분용으로 확인창에 보여줄 날짜/주제 */
  createdHint?: string;
  assigned?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const name = testLabel?.trim() || '(이름 없음)';

  const onDelete = async () => {
    const detail = createdHint ? `\n${createdHint}` : '';
    if (!confirm(`"${name}" 시험을 삭제하시겠어요?${detail}\n(되돌릴 수 없습니다)`)) return;

    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: testId }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || '삭제 실패');
      router.refresh();
    } catch (err) {
      alert('삭제 실패: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={loading || assigned}
      title={assigned ? '학생에게 배정된 시험은 삭제할 수 없습니다' : undefined}
      className="inline-flex items-center rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-medium text-rose-700 hover:border-rose-400 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-rose-200 disabled:hover:bg-white"
    >
      {loading ? '삭제 중…' : '삭제'}
    </button>
  );
}
