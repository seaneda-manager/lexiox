"use client";

import ListeningTestLayout2026, { ListeningHeaderLabel } from "@/components/listening/ListeningTestLayout2026";

interface ModuleEndScreenProps {
  module: 1 | 2;
  correctCount: number;
  totalQuestions: number;
  /** Module1 성적에 따라 Module2 Hard/Easy를 가르는 실제 기준선 (기본 0.7 = 70%) */
  cutScore?: number;
  onNext: () => void;
}

const nextButtonStyle: React.CSSProperties = {
  height: 32,
  padding: "0 16px",
  fontSize: 12,
  fontWeight: 700,
  border: "none",
  borderRadius: 4,
  backgroundColor: "#0073E6",
  color: "#FFFFFF",
  cursor: "pointer",
};

export default function ModuleEndScreen({
  module,
  correctCount,
  totalQuestions,
  cutScore = 0.7,
  onNext,
}: ModuleEndScreenProps) {
  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const isHardModule = percentage >= Math.round(cutScore * 100);
  const isFinal = module === 2;

  return (
    <ListeningTestLayout2026
      headerLeft={<ListeningHeaderLabel module={module} />}
      headerRight={
        <button onClick={onNext} style={nextButtonStyle}>
          Next &gt;
        </button>
      }
    >
      <div style={{ maxWidth: 560, margin: "40px auto 0" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111", marginBottom: 16 }}>
          {isFinal ? "End of Listening Section" : `End of Module ${module}`}
        </h2>

        <p style={{ fontSize: 15, lineHeight: 1.7, color: "#333", marginBottom: 28 }}>
          {isFinal
            ? "Thank you for completing the listening section."
            : `This is the end of Module ${module} of the Listening section. You will now begin Module ${module + 1}.`}
        </p>

        {/* 참고용 성적 요약 (실제 ETS 화면엔 없지만, 연습 목적상 남겨둔다) */}
        <div style={{ backgroundColor: "#F4F6F9", borderRadius: 6, padding: "18px 22px", border: "1px solid #E0E0E0" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: "#1A2B4C" }}>{percentage}%</span>
            <span style={{ fontSize: 13, color: "#555" }}>
              {correctCount} of {totalQuestions} correct
            </span>
          </div>
          {!isFinal && (
            <p style={{ fontSize: 12, color: "#666", marginTop: 10 }}>
              Module 2 difficulty: <strong>{isHardModule ? "Hard (Advanced)" : "Easy (Basic)"}</strong>
            </p>
          )}
        </div>
      </div>
    </ListeningTestLayout2026>
  );
}
