'use client';
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="shrink-0 rounded-xl border border-neutral-200 px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50 print:hidden"
    >
      🖨️ 인쇄
    </button>
  );
}
