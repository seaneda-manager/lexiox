"use client";

import { useContext } from "react";
import ListeningTestLayout2026, { ListeningHeaderLabel, ListeningSubHeaderLabel, useListeningTx, ListeningStudyContext } from "@/components/listening/ListeningTestLayout2026";

interface ModuleEndScreenProps {
  module: 1 | 2;
  correctCount: number;
  totalQuestions: number;
  /** Module1 성적에 따라 Module2 Hard/Easy를 가르는 실제 기준선 (기본 0.7 = 70%) */
  cutScore?: number;
  onNext: () => void;
}

const nextButtonStyle: React.CSSProperties = {
  height: 36,
  padding: "0 18px",
  fontSize: 13,
  fontWeight: 700,
  border: "none",
  borderRadius: 6,
  backgroundColor: "#FFFFFF",
  color: "#1E7B7D",
  cursor: "pointer",
};

const paragraphStyle: React.CSSProperties = { fontSize: 14, lineHeight: 1.7, color: "#444", marginBottom: 14 };

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
  const tx = useListeningTx();
  const isStudy = useContext(ListeningStudyContext);

  return (
    <ListeningTestLayout2026
      headerLeft={<ListeningHeaderLabel module={module} />}
      headerRight={
        <button onClick={onNext} style={nextButtonStyle}>
          {tx("Next >", "다음 >")}
        </button>
      }
      subHeaderLeft={<ListeningSubHeaderLabel />}
    >
      <div style={{ maxWidth: 620, margin: "6px auto 0" }}>
        <h2 style={{ fontSize: 22, fontWeight: 400, color: "#333", paddingBottom: 8, marginBottom: 20, borderBottom: "1px solid #DDD" }}>
          {isFinal ? tx("End of Listening Section", "Listening 섹션 종료") : tx(`End of Module ${module}`, `Module ${module} 종료`)}
        </h2>

        {isFinal ? (
          <p style={paragraphStyle}>{tx("Thank you for completing the listening section.", "Listening 섹션을 마쳤습니다.")}</p>
        ) : (
          <>
            <p style={paragraphStyle}>{tx(`This is the end of Module ${module} of the Listening section.`, `Listening 섹션의 Module ${module}이 끝났습니다.`)}</p>
            <p style={paragraphStyle}>{tx(`You will now begin Module ${module + 1}.`, `이제 Module ${module + 1}을 시작합니다.`)}</p>
          </>
        )}

        {isStudy && (
          <div style={{ marginTop: 24, backgroundColor: "#F4F6F9", borderRadius: 6, padding: "14px 18px", border: "1px solid #E0E0E0" }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: "#222" }}>{percentage}%</span>
            <span style={{ marginLeft: 10, fontSize: 13, color: "#555" }}>
              {tx(`${correctCount} of ${totalQuestions} correct`, `${totalQuestions}문항 중 ${correctCount}문항 정답`)}
            </span>
            {!isFinal && (
              <p style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
                {tx("Module 2 difficulty: ", "Module 2 난이도: ")}<strong>{isHardModule ? "Hard" : "Easy"}</strong>
              </p>
            )}
          </div>
        )}
      </div>
    </ListeningTestLayout2026>
  );
}
