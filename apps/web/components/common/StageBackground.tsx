"use client";

import React from "react";

type Props = {
  className?: string;

  // ✅ legacy props tolerated (ignored)
  stage?: any;
  src?: string;
  srcMobile?: string;
  priority?: boolean;
  showMascot?: boolean;
  showTitle?: boolean;
  title?: string;
  subtitle?: string;
  mascotSrc?: string;
  tintOpacity?: number;
};

/**
 * StageBackground
 * - 페이지 전체 배경용 (focus overlay 뒤에 깔리는 레이어)
 * - 절대 bg-base 같은 이미지 깔지 말 것.
 * - 절대 blur/backdrop-filter 쓰지 말 것.
 * - "선명"을 위해 틴트는 아주 약하게(또는 0).
 */
export default function StageBackground({ className = "" }: Props) {
  return (
    <div
      aria-hidden
      className={className}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,

        // ✅ 더 선명하게: 안개(radial) 제거하고 단색+아주 약한 그라데이션만
        background: "linear-gradient(180deg, #f7f8f6 0%, #eef1ee 100%)",
      }}
    />
  );
}
