"use client";

interface ResponseTimeBadgeProps {
  /** 남은 시간(초). null이면 "--:--"로 표시 (아직 카운트다운 시작 전). */
  secondsLeft: number | null;
  /** 강조(예: 5초 이하) 시 빨간색으로 표시 */
  urgent?: boolean;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** 실제 ETS 응답시간 위젯 — "RESPONSE TIME" 라벨 + 마이크 아이콘 + 카운트다운. */
export default function ResponseTimeBadge({ secondsLeft, urgent = false }: ResponseTimeBadgeProps) {
  return (
    <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid #E0E0E0", width: 200 }}>
      <div style={{ backgroundColor: "#1A2B4C", color: "#FFFFFF", textAlign: "center", padding: "6px 0", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
        RESPONSE TIME
      </div>
      <div style={{ backgroundColor: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 0" }}>
        <span style={{ fontSize: 16 }}>{secondsLeft === null ? "🔇" : "🎙️"}</span>
        <span style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 700, color: urgent ? "#DC2626" : "#333" }}>
          {secondsLeft === null ? "--:--" : formatTime(secondsLeft)}
        </span>
      </div>
    </div>
  );
}
