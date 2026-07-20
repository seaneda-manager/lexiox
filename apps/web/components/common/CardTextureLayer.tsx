"use client";

import React from "react";

type Props = {
  roundedClassName?: string; // ex) "rounded-3xl"
  opacity?: number; // 0~1
};

export default function CardTextureLayer({
  roundedClassName = "rounded-3xl",
  opacity = 0.22,
}: Props) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-0 ${roundedClassName}`}
      style={{ opacity }}
    >
      {/* PNG texture (파일 있으면 더 디테일, 없으면 404여도 UI는 유지) */}
      <div
        className={`absolute inset-0 ${roundedClassName}`}
        style={{
          backgroundImage: "url(/assets/lingox/textures/paper-noise.png)",
          backgroundSize: "512px 512px",
          backgroundRepeat: "repeat",
          opacity: 0.9,
        }}
      />

      {/* CSS grain fallback */}
      <div
        className={`absolute inset-0 ${roundedClassName} mix-blend-overlay`}
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0,0,0,.14) 0, rgba(0,0,0,.14) 1px, transparent 1px, transparent 3px), repeating-linear-gradient(90deg, rgba(255,255,255,.10) 0, rgba(255,255,255,.10) 1px, transparent 1px, transparent 4px)",
          opacity: 0.35,
        }}
      />

      {/* soft vignette */}
      <div
        className={`absolute inset-0 ${roundedClassName}`}
        style={{
          backgroundImage:
            "radial-gradient(120% 90% at 50% 0%, rgba(255,255,255,.14) 0%, rgba(255,255,255,0) 55%), radial-gradient(120% 120% at 50% 100%, rgba(0,0,0,.18) 0%, rgba(0,0,0,0) 55%)",
        }}
      />
    </div>
  );
}
