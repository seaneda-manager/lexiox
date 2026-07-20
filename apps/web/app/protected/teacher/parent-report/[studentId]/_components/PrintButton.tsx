'use client';

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition"
    >
      🖨️ 인쇄
    </button>
  );
}
