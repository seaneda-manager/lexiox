"use client";

import { createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { StudyLangToggle } from "@/lib/ui/studyLang";

/** true이면 Study 모드: 시간 제한 없음 + 한/영 전환 버튼 표시 */
export const WritingStudyContext = createContext(false);

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
  const isStudy = useContext(WritingStudyContext);
  const [hideTime, setHideTime] = useState(false);

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
        {/* Header — 실제 ETS: 왼쪽 비움, 오른쪽에 Back(테두리) / Next(흰색) */}
        <header className="flex items-center shrink-0 px-6" style={{ height: 60, backgroundColor: "#1E7B7D", justifyContent: "flex-end", gap: 8 }}>
          {isStudy && (
            <StudyLangToggle className="h-9 rounded-md border border-white/80 bg-transparent px-3 text-xs font-bold text-white hover:bg-white/10" />
          )}
          {onBack && (
            <button
              onClick={onBack}
              disabled={backDisabled}
              style={{ height: 36, padding: "0 18px", fontSize: 13, fontWeight: 700, color: "#FFFFFF", backgroundColor: "transparent", border: "1px solid rgba(255,255,255,0.85)", borderRadius: 6, cursor: "pointer", opacity: backDisabled ? 0.4 : 1 }}
            >
              &lt; Back
            </button>
          )}
          <button
            onClick={onNext}
            disabled={nextDisabled}
            style={{ height: 36, padding: "0 18px", fontSize: 13, fontWeight: 700, color: "#1E7B7D", backgroundColor: "#FFFFFF", border: "none", borderRadius: 6, cursor: "pointer", opacity: nextDisabled ? 0.5 : 1 }}
          >
            {nextLabel ?? "Next >"}
          </button>
        </header>

        {/* Sub-header: "Writing | Question X of Y" + 남은 시간(Hide Time) */}
        <div className="shrink-0 flex items-center justify-between" style={{ height: 40, backgroundColor: "#FFFFFF", borderBottom: "1px solid #E0E0E0", padding: "0 36px", fontSize: 12, color: "#444" }}>
          <span>
            <strong style={{ fontSize: 14, color: "#222" }}>Writing</strong>
            {questionLabel ? <><span style={{ margin: "0 10px", color: "#BBB" }}>|</span>{questionLabel}</> : null}
          </span>
          {timerDisplay ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10, fontVariantNumeric: "tabular-nums" }}>
              {!hideTime && <span style={{ fontWeight: 700 }}>{timerDisplay.length === 5 ? `00:${timerDisplay}` : timerDisplay}</span>}
              <button type="button" onClick={() => setHideTime((v) => !v)} style={{ background: "none", border: "none", color: "#666", fontSize: 12, cursor: "pointer" }}>
                {hideTime ? "Show Time" : "Hide Time"}
              </button>
            </span>
          ) : null}
        </div>

        {/* Body */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden" style={{ backgroundColor: "#FFFFFF" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
