'use client';

import { deleteContentAction } from '../../../actions';

export function DeleteContentButton({ id, unitId }: { id: string; unitId: string }) {
  return (
    <form action={deleteContentAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="unit_id" value={unitId} />
      <button
        type="submit"
        onClick={(e) => { if (!confirm('삭제할까요?')) e.preventDefault(); }}
        className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-500 hover:bg-red-50"
      >
        삭제
      </button>
    </form>
  );
}
