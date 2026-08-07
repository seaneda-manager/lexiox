"use client";

/**
 * 실제 ETS TOEFL iBT 시험 화면은 브라우저 전체가 아니라 중앙에 뜨는 고정 크기 "창"이다.
 * Writing 쪽 ETSLayout(components/writing/ETSLayout.tsx)과 동일한 크기·배경을 사용해
 * Reading 섹션의 모든 화면(안내, Complete the Words, 문항, Stage Break, Review, 결과)이
 * 같은 비율로 보이도록 공유한다.
 */
export function ReadingETSFrame({ children }: { children: React.ReactNode }) {
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
