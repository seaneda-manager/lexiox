"use client";

import { useState, useRef, useEffect } from "react";

interface PlaybackRateControlProps {
  rate: number;
  onRateChange: (rate: number) => void;
}

const PRESETS = [0.75, 0.85, 1, 1.1, 1.25];

/**
 * VolumeControl과 같은 패턴(헤더의 버튼 + 팝오버)의 재생 속도 조절.
 * 실제 ETS는 없지만, 중학 레벨 학생에게는 기본 속도가 빠르게 느껴질 수 있어 추가했다.
 */
export default function PlaybackRateControl({ rate, onRateChange }: PlaybackRateControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        style={{
          height: 32,
          padding: "0 16px",
          fontSize: 12,
          fontWeight: 700,
          border: "1px solid rgba(255,255,255,0.4)",
          borderRadius: 20,
          backgroundColor: isOpen ? "rgba(255,255,255,0.15)" : "transparent",
          color: "#FFFFFF",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        Speed <span>{rate}x</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 220,
            backgroundColor: "#FFFFFF",
            borderRadius: 6,
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            padding: "16px 18px",
            zIndex: 20,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: "#333", marginBottom: 10 }}>재생 속도</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => onRateChange(p)}
                style={{
                  flex: "1 0 30%",
                  height: 30,
                  fontSize: 12,
                  fontWeight: 700,
                  borderRadius: 4,
                  border: p === rate ? "1px solid #0073E6" : "1px solid #D0D5DD",
                  backgroundColor: p === rate ? "#0073E6" : "#FFFFFF",
                  color: p === rate ? "#FFFFFF" : "#333",
                  cursor: "pointer",
                }}
              >
                {p}x
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
