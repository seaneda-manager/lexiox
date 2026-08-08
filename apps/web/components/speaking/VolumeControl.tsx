"use client";

import { useState, useRef, useEffect } from "react";

interface VolumeControlProps {
  volume: number;
  onVolumeChange: (volume: number) => void;
}

/**
 * 실제 ETS는 전용 "볼륨 조절" 화면이 아니라, 시험 내내 헤더에 떠 있는 Volume 버튼 하나로
 * 언제든 슬라이더를 열어 조절한다. 이 컴포넌트가 그 버튼+팝오버를 담당한다.
 */
export default function VolumeControl({ volume, onVolumeChange }: VolumeControlProps) {
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
        Volume <span>{volume === 0 ? "🔇" : "🔊"}</span>
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#333" }}>Volume</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#1A2B4C" }}>{volume}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            style={{
              width: "100%",
              accentColor: "#0073E6",
              cursor: "pointer",
            }}
          />
        </div>
      )}
    </div>
  );
}
