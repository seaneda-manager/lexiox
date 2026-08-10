'use client';

import { useTransition } from 'react';
import { markWrongAnswerReviewedAction } from './actions';

export default function MarkReviewedButton({
  responseId,
  revalidateTargetPath,
}: {
  responseId: string;
  revalidateTargetPath: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(() => {
          void markWrongAnswerReviewedAction(responseId, revalidateTargetPath);
        })
      }
      className="flex-shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
    >
      {isPending ? "처리 중…" : "✓ 확인함"}
    </button>
  );
}
