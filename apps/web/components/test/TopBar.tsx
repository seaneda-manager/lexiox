// apps/web/components/test/TopBar.tsx
'use client';

import Link from 'next/link';
import { useEffect, useMemo } from 'react';

type Props = {
  mode: 'study' | 'test';
  section: 'reading' | 'listening' | 'speaking' | 'writing';
  qIndex: number;
  total: number;
  onBack?: () => void;
  onNext?: () => void;
  onPause?: () => void;
  onReview?: () => void;
  onToggleTime?: () => void;
  showTime?: boolean;

  /** 선택: 상단 브랜드 링크 표시 여부 (기본 true) */
  showBrand?: boolean;
};

const noop = () => {};

export default function TopBar({
  mode,
  section,
  qIndex,
  total,
  onBack,
  onNext,
  onPause,
  onReview,
  onToggleTime,
  showTime,
  showBrand = true,
}: Props) {
  // 키보드로 Prev/Next
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') onBack?.();
      if (e.key === 'ArrowRight') onNext?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack, onNext]);

  const title = useMemo(
    () => `${section.toUpperCase()} · ${mode.toUpperCase()}`,
    [section, mode]
  );

  const _onBack = onBack ?? noop;
  const _onNext = onNext ?? noop;         // ✅ 이름 일치시킴
  const _onPause = onPause ?? noop;
  const _onReview = onReview ?? noop;
  const _onToggleTime = onToggleTime ?? noop;

  return (
    <header className="sticky top-0 z-40 border-b bg-neutral-100 text-neutral-900 backdrop-blur supports-[backdrop-filter]:bg-neutral-100/80">
      <div className="container mx-auto flex h-12 items-center justify-between px-4">
        {/* 좌측: 브랜드 + 진행상태 */}
        <div className="flex min-w-0 items-center gap-4">
          {showBrand && (
            <>
              <Link href="/" className="font-bold tracking-tight">K-Prime</Link>
              <span className="h-4 w-px bg-neutral-300" aria-hidden />
              <Link href="/" className="font-semibold whitespace-nowrap">Pier Academy</Link>
              <span className="h-4 w-px bg-neutral-300" aria-hidden />
            </>
          )}
          <div className="truncate text-sm font-medium" title={title}>
            {title} · {qIndex + 1} / {total}
          </div>
        </div>

        {/* 우측: 컨트롤 */}
        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            className="rounded border px-2 py-1"
            onClick={_onBack}
            disabled={!onBack}
            aria-label="Previous question"
            title="Previous"
          >
            ← Prev
          </button>
          <button
            type="button"
            className="rounded border px-2 py-1"
            onClick={_onNext}
            disabled={!onNext}
            aria-label="Next question"
            title="Next"
          >
            Next →
          </button>
          <button
            type="button"
            className="rounded border px-2 py-1"
            onClick={_onPause}
            disabled={!onPause}
            aria-label="Pause"
            title="Pause"
          >
            Pause
          </button>
          <button
            type="button"
            className="rounded border px-2 py-1"
            onClick={_onReview}
            disabled={!onReview}
            aria-label="Review"
            title="Review"
          >
            Review
          </button>
          <button
            type="button"
            className="rounded border px-2 py-1"
            onClick={_onToggleTime}
            disabled={!onToggleTime}
            aria-pressed={!!showTime}
            aria-label="Toggle time display"
            title={showTime ? 'Hide Time' : 'Show Time'}
          >
            {showTime ? 'Hide Time' : 'Show Time'}
          </button>
        </div>
      </div>
    </header>
  );
}
