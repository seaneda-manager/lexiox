'use client';

import { useState } from 'react';
import {
  saveMiddleNaesinDrillResultAction,
  type MiddleNaesinDrillType,
  type MiddleNaesinDrillDetailItem,
} from '@/lib/middle-naesin/drill-results';

type Props = {
  unitId: string;
  drillType: MiddleNaesinDrillType;
  refId?: string;
  score: number;
  total: number;
  detail?: MiddleNaesinDrillDetailItem[];
  label?: string;
};

export default function SaveResultButton({ unitId, drillType, refId, score, total, detail, label }: Props) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const save = async () => {
    setStatus('saving');
    const res = await saveMiddleNaesinDrillResultAction({ unitId, drillType, refId, score, total, detail });
    if (res.ok) {
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2500);
    } else {
      setStatus('error');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={save}
        disabled={status === 'saving' || total === 0}
        className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-40"
      >
        {label ?? `결과 저장 (${score}/${total})`}
      </button>
      {status === 'saved' && <span className="text-xs font-semibold text-emerald-600">✓ 저장됨 · 선생님이 확인할 수 있어요</span>}
      {status === 'error' && <span className="text-xs font-semibold text-rose-600">저장 실패, 다시 시도해주세요</span>}
    </div>
  );
}
