'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TestRowActions({ testId, testLabel }: { testId: string; testLabel: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`"${testLabel}" 시험을 삭제하시겠어요?\n(되돌릴 수 없습니다)`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/updated-listening/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: testId }),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Delete failed');

      router.refresh();
    } catch (err) {
      console.error('Delete error:', err);
      alert('삭제 실패: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="inline-flex items-center rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-medium text-rose-700 hover:border-rose-400 hover:bg-rose-50 disabled:opacity-50"
    >
      {loading ? '삭제 중…' : '삭제'}
    </button>
  );
}
