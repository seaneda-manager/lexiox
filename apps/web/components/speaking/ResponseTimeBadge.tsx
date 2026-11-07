"use client";

interface ResponseTimeBadgeProps {
  /** 남은 시간(초). null이면 "--:--"로 표시 (아직 카운트다운 시작 전). */
  secondsLeft: number | null;
  /** 강조(예: 5초 이하) 시 빨간색으로 표시 */
  urgent?: boolean;
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** 실제 ETS 응답시간 위젯 — 청록 "RESPONSE TIME" 헤더 + 마이크 아이콘 + 00:00:44 카운트다운. */
export default function ResponseTimeBadge({ secondsLeft, urgent = false }: ResponseTimeBadgeProps) {
  return (
    <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid #9FB8BA", width: 210, backgroundColor: "#FFFFFF" }}>
      <div style={{ backgroundColor: "#1E7B7D", color: "#FFFFFF", textAlign: "center", padding: "8px 0", fontSize: 13, fontWeight: 700 }}>
        RESPONSE TIME
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "10px 0" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#8A9A9B" aria-hidden="true">
          <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V22h2v-3.1A7 7 0 0 0 19 12h-2z" />
        </svg>
        <span style={{ fontSize: 17, fontVariantNumeric: "tabular-nums", color: urgent ? "#DC2626" : "#333" }}>
          {secondsLeft === null ? "00:00:00" : formatTime(secondsLeft)}
        </span>
      </div>
    </div>
  );
}
