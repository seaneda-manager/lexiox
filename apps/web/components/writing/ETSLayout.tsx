"use client";

import { useRouter } from "next/navigation";

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
  const router = useRouter();

  const handleExit = () => {
    const confirmed = window.confirm(
      "If you exit now, your progress will not be saved and you will need to restart this test from the beginning.\n\nAre you sure you want to exit?"
    );
    if (confirmed) router.push("/student");
  };

  return (
    // 실제 ETS 시험 화면은 브라우저 전체가 아니라 중앙에 뜨는 고정 크기 "창"이다.
    // 바깥은 중립 배경으로 채우고, 안쪽 창만 1024×768 안팎으로 고정한다.
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#B9BEC7",
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <button
        onClick={handleExit}
        style={{
          position: "fixed",
          top: 16,
          left: 16,
          padding: "8px 14px",
          fontSize: 12,
          fontWeight: 700,
          color: "#1A2B4C",
          backgroundColor: "#FFFFFF",
          border: "1px solid rgba(0,0,0,0.15)",
          borderRadius: 6,
          cursor: "pointer",
          boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
          zIndex: 50,
        }}
      >
        ✕ Exit
      </button>
      <div
        className="flex flex-col"
        style={{
          width: "min(1024px, 96vw)",
          height: "min(768px, 92vh)",
          backgroundColor: "#F4F6F9",
          fontFamily: "Arial, Helvetica, sans-serif",
          borderRadius: 6,
          overflow: "hidden",
          boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
        }}
      >
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
    </div>
  );
}
