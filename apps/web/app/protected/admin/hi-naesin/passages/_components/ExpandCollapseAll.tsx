'use client';

// 페이지 안의 모든 아코디언(<details data-acc>)를 한 번에 펼치거나 접는다.
export default function ExpandCollapseAll() {
  const setAll = (open: boolean) => {
    document.querySelectorAll<HTMLDetailsElement>('details[data-acc]').forEach((d) => {
      d.open = open;
    });
  };
  return (
    <div className="flex gap-2">
      <button type="button" onClick={() => setAll(true)} className="rounded-lg border px-3 py-1 text-xs hover:bg-neutral-50">
        모두 펼치기
      </button>
      <button type="button" onClick={() => setAll(false)} className="rounded-lg border px-3 py-1 text-xs hover:bg-neutral-50">
        모두 접기
      </button>
    </div>
  );
}
