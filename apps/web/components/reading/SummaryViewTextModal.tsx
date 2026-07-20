'use client';

import { useEffect, useRef } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  content: string;
  title?: string;
};

export default function SummaryViewTextModal({
  open,
  onClose,
  content,
  title = 'View Text',
}: Props) {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  // ESC ?リ린 + ?ㅽ겕濡??좉툑 + ?ъ빱???대룞/蹂듦?
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);

    // ?ъ빱??愿由?
    prevFocusRef.current = (document.activeElement as HTMLElement) ?? null;
    // ?ㅼ쓬 ?꾨젅?꾩뿉 ?ъ빱??踰꾪듉???뚮뜑????
    const t = requestAnimationFrame(() => closeBtnRef.current?.focus());

    // ?ㅽ겕濡??좉툑
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKey);
      cancelAnimationFrame(t);
      document.body.style.overflow = prevOverflow;
      // ?ъ빱??蹂듦?
      prevFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const looksLikeHTML = /<[a-z][\s\S]*>/i.test(content);

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="svtm-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      {/* Dialog */}
      <div
        className="absolute left-1/2 top-1/2 w-[min(900px,92vw)] max-h-[80vh] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white text-neutral-900 shadow-xl"
        role="document"
        // ?대? ?대┃? ?ロ엳吏 ?딅룄濡?
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 id="svtm-title" className="font-semibold">
            {title}
          </h2>
          <button
            ref={closeBtnRef}
            className="rounded border px-3 py-1"
            onClick={onClose}
            aria-label="Close"
          >
            Close (Esc)
          </button>
        </div>

        <div className="p-4 overflow-auto" style={{ maxHeight: 'calc(80vh - 56px)' }}>
          {looksLikeHTML ? (
            <div dangerouslySetInnerHTML={{ __html: content }} />
          ) : (
            <pre className="whitespace-pre-wrap text-[16px] leading-7">{content}</pre>
          )}
        </div>
      </div>
    </div>
  );
}




