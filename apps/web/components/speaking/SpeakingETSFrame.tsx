"use client";

import { useRouter } from "next/navigation";

/**
 * 실제 ETS TOEFL iBT 시험 화면은 브라우저 전체가 아니라 중앙에 뜨는 고정 크기 "창"이다.
 * Listening 쪽 ListeningETSFrame(components/listening/ListeningETSFrame.tsx)과 동일한
 * 크기·배경을 사용해 Speaking 섹션의 모든 화면(안내, 문항, 결과)이 같은 비율로 보이도록 공유한다.
 */
export function SpeakingETSFrame({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const handleExit = () => {
    const confirmed = window.confirm(
      "If you exit now, your progress will not be saved and you will need to restart this test from the beginning.\n\nAre you sure you want to exit?"
    );
    if (confirmed) router.push("/student");
  };

  return (
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
        {children}
      </div>
    </div>
  );
}
