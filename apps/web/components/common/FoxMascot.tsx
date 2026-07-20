"use client";

import React from "react";
import type { MascotMood } from "./ParrotMascot";

// 단계별 기본 이미지 (무드 override 없을 때)
const STAGE_IMAGE: Record<string, string> = {
  PRESCREEN:  "/lingox/mascot/fox/fox-default.png",   // 기본 서있기
  SPELLING:   "/lingox/mascot/fox/fox-focus.png",     // 엄지척+안경 (집중)
  LEARNING:   "/lingox/mascot/fox/fox-study.png",     // 책 들고 인사
  SPEED:      "/lingox/mascot/fox/fox-default.png",   // 기본 서있기
  DRILL:      "/lingox/mascot/fox/fox-focus.png",     // 엄지척+안경
  DONE:       "/lingox/mascot/fox/fox-celebrate.png", // 축하
  SUMMARY:    "/lingox/mascot/fox/fox-celebrate.png", // 축하
};

// 무드 override 이미지 (단계와 무관하게 감정 우선)
const MOOD_IMAGE: Record<MascotMood, string | null> = {
  default:   null,                                     // stage 기본값 사용
  success:   "/lingox/mascot/fox/fox-celebrate.png",
  celebrate: "/lingox/mascot/fox/fox-celebrate.png",
  fail:      "/lingox/mascot/fox/fox-default.png",
  focus:     null,                                     // stage 기본값 유지
  hint:      "/lingox/mascot/fox/fox-focus.png",
  pause:     "/lingox/mascot/fox/fox-default.png",
};

const MOOD_ANIM: Record<MascotMood, string> = {
  default:   "fox-idle 3s ease-in-out infinite",
  success:   "fox-bounce 500ms cubic-bezier(0.2,1.2,0.2,1) 1",
  celebrate: "fox-bounce 500ms cubic-bezier(0.2,1.2,0.2,1) 1",
  fail:      "fox-droop 400ms ease-out 1",
  focus:     "fox-idle 2s ease-in-out infinite",
  hint:      "fox-wiggle 500ms ease-out 1",
  pause:     "none",
};

export default function FoxMascot({
  mood = "default",
  stage = "",
  size = 100,
}: {
  mood?: MascotMood;
  stage?: string;
  size?: number;
}) {
  const stageKey = String(stage).toUpperCase();
  const stageImg = STAGE_IMAGE[stageKey] ?? "/lingox/mascot/fox/fox-default.png";
  const moodImg  = MOOD_IMAGE[mood];
  const src  = moodImg ?? stageImg;
  const anim = MOOD_ANIM[mood] ?? "none";

  return (
    <>
      <div
        style={{
          width: size,
          height: size,
          animation: anim,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          filter: mood === "fail"
            ? "drop-shadow(0 4px 8px rgba(0,0,0,0.12)) grayscale(0.3)"
            : "drop-shadow(0 4px 12px rgba(0,0,0,0.15))",
        }}
        aria-label="Lingo-X Fox mascot"
        role="img"
      >
        <img
          src={src}
          alt=""
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            pointerEvents: "none",
          }}
        />
      </div>

      <style jsx global>{`
        @keyframes fox-idle {
          0%,100% { transform: translateY(0) scale(1); }
          50%      { transform: translateY(-4px) scale(1.01); }
        }
        @keyframes fox-bounce {
          0%   { transform: translateY(0) scale(1); }
          35%  { transform: translateY(-12px) scale(1.06); }
          65%  { transform: translateY(2px) scale(0.98); }
          100% { transform: translateY(0) scale(1); }
        }
        @keyframes fox-droop {
          0%   { transform: translateY(0); }
          40%  { transform: translateY(5px) scale(0.98); }
          100% { transform: translateY(0); }
        }
        @keyframes fox-wiggle {
          0%,100% { transform: rotate(0deg); }
          25%     { transform: rotate(-6deg) scale(1.04); }
          75%     { transform: rotate(5deg) scale(1.04); }
        }
      `}</style>
    </>
  );
}
