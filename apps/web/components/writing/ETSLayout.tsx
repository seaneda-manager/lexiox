"use client";

/**
 * Writing 화면 전반에서 재사용하는 ETS 스타일 레이아웃 래퍼.
 * WritingRunnerETS(문항 화면)와 WritingInterstitials(인터스티셜 화면) 양쪽에서 쓰므로
 * 순환 참조를 피하기 위해 별도 파일로 둔다.
 */
export function ETSLayout({
  title,
  timerDisplay,
  questionLabel,
  totalQuestions,
  currentQuestion,
  onBack,
  backDisabled,
  onNext,
  nextDisabled,
  nextLabel,
  hideFooter,
  children,
}: {
  title?: string;
  timerDisplay?: string;
  questionLabel?: string;
  totalQuestions?: number;
  currentQuestion?: number;
  onBack?: () => void;
  backDisabled?: boolean;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  hideFooter?: boolean;
  children: React.ReactNode;
}) {
  const progressPct = totalQuestions && currentQuestion
    ? (currentQuestion / totalQuestions) * 100 : 0;

  return (
    <div className="flex flex-col" style={{ height: "100%", backgroundColor: "#F4F6F9", fontFamily: "Arial, Helvetica, sans-serif" }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 shrink-0" style={{ height: 60, backgroundColor: "#1A2B4C" }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>
          {title ?? "Updated TOEFL iBT - Writing"}
        </span>
        <div className="flex items-center" style={{ gap: 8 }}>
          {onBack && (
            <button
              onClick={onBack}
              disabled={backDisabled}
              className="rounded border border-slate-400 bg-transparent text-white disabled:opacity-30"
              style={{ width: 90, height: 36, fontSize: 13 }}
            >
              &lt; Back
            </button>
          )}
          <button
            onClick={onNext}
            disabled={nextDisabled}
            className="rounded font-semibold text-white disabled:opacity-40"
            style={{ width: 100, height: 36, fontSize: 13, backgroundColor: "#0073E6", border: "none", borderRadius: 4 }}
          >
            {nextLabel ?? "Next >"}
          </button>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        {children}
      </main>

      {/* Footer */}
      {!hideFooter && (
        <footer className="flex items-center justify-between shrink-0 border-t px-6"
          style={{ height: 60, backgroundColor: "#FFFFFF", borderColor: "#E0E0E0" }}>
          <span style={{ fontSize: 15, fontWeight: 500, color: "#333333" }}>
            {questionLabel ?? ""}
          </span>
          <div className="flex items-center gap-4">
            {totalQuestions && currentQuestion ? (
              <div className="overflow-hidden rounded-full" style={{ width: 240, height: 8, backgroundColor: "#E0E0E0" }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%`, backgroundColor: "#0073E6" }} />
              </div>
            ) : null}
            <span className="font-mono font-semibold" style={{ fontSize: 15, color: "#333333" }}>
              {timerDisplay}
            </span>
          </div>
        </footer>
      )}
    </div>
  );
}
