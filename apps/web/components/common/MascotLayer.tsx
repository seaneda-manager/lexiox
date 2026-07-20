"use client";

import React, { useState, useRef } from "react";
import FoxMascot from "./FoxMascot";
import type { MascotMood } from "./ParrotMascot";

export default function MascotLayer({
  stage,
  mood = "default",
}: {
  stage: string;
  mood?: MascotMood;
}) {
  const s = String(stage || "").toUpperCase();

  const isLearning = s.includes("LEARNING");
  const isSpeed = s.includes("SPEED");
  const isIntro = s.includes("INTRO");

  const size = isLearning ? 110 : isSpeed ? 130 : 150;

  // 드래그 상태 관리
  const [pos, setPos] = useState({ x: 0, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // 초기 위치를 클라이언트에서 설정
  React.useEffect(() => {
    setPos({ x: window.innerWidth - 50, y: 50 });
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPos({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (isIntro) return null;

  return (
    <div
      ref={containerRef}
      className="fixed z-[10000] cursor-grab active:cursor-grabbing select-none"
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        pointerEvents: "auto",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <FoxMascot mood={mood} stage={s} size={size} />
    </div>
  );
}
