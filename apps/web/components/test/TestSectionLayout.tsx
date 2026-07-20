// apps/web/components/test/TestSectionLayout.tsx
"use client";

import { ReactNode } from "react";
import { Volume2 } from "lucide-react";

type TestSectionLayoutProps = {
  sectionLabel: "Reading" | "Listening" | "Writing" | "Speaking";
  title: string;
  showVolumeButton?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string; // "Next", "Begin", "Continue" 등
  headerRightExtra?: ReactNode; // 타이머, 워드카운트 등
  left: ReactNode;   // 지문 / 이미지 / 안내
  right?: ReactNode; // 객관식 / 입력창 (없으면 full-width)
};

export default function TestSectionLayout({
  sectionLabel,
  title,
  showVolumeButton = true,
  showBackButton = false,
  onBack,
  onNext,
  nextLabel = "Next",
  headerRightExtra,
  left,
  right,
}: TestSectionLayoutProps) {
  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col gap-4 px-4 py-6">
      {/* Header */}
      <header className="flex items-center justify-between border-b pb-3">
        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase text-slate-500">
            {sectionLabel}
          </span>
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        </div>

        <div className="flex items-center gap-3">
          {headerRightExtra && (
            <div className="text-xs text-slate-600">{headerRightExtra}</div>
          )}

          {showVolumeButton && (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium text-slate-700 shadow-sm"
            >
              <Volume2 className="h-4 w-4" />
              <span>Volume</span>
            </button>
          )}

          {showBackButton && (
            <button
              type="button"
              onClick={onBack}
              className="rounded-full border px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Back
            </button>
          )}

          {onNext && (
            <button
              type="button"
              onClick={onNext}
              className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-600"
            >
              {nextLabel} →
            </button>
          )}
        </div>
      </header>

      {/* Body: 2-column layout */}
      {right ? (
        <div className="grid flex-1 grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)] gap-6">
          <section className="overflow-auto rounded-lg bg-white p-5 shadow-sm">
            {left}
          </section>
          <aside className="overflow-auto rounded-lg bg-white p-5 shadow-sm">
            {right}
          </aside>
        </div>
      ) : (
        // right가 필요 없는 인트로 화면 등
        <section className="flex-1 overflow-auto rounded-lg bg-white p-5 shadow-sm">
          {left}
        </section>
      )}
    </div>
  );
}
