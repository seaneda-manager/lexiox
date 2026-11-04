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

  // 화면 안에 온전히 보이도록 가두는 함수 (예전엔 초기 x가 창 폭-50px 라서 마스코트 대부분이 잘려 보였다)
  const clamp = (x: number, y: number) => {
    const margin = 8;
    const maxX = Math.max(margin, window.innerWidth - size - margin);
    const maxY = Math.max(margin, window.innerHeight - size - margin);
    return {
      x: Math.min(Math.max(margin, x), maxX),
      y: Math.min(Math.max(margin, y), maxY),
    };
  };

  // 초기 위치: 오른쪽 아래 구석에 온전히 보이게 (학습 화면 본문은 가운데에 있고 버튼은 아래 중앙이라 덜 가린다)
  React.useEffect(() => {
    setPos(clamp(window.innerWidth - size - 20, window.innerHeight - size - 20));
    const onResize = () => setPos((p) => clamp(p.x, p.y));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPos(clamp(e.clientX - dragOffset.x, e.clientY - dragOffset.y));
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
