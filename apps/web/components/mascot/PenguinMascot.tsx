"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

export type PenguinMood =
  | "default"
  | "success"
  | "fail"
  | "hint"
  | "focus"
  | "celebrate"
  | "pause"; // "잠깐!"

type Props = {
  /** PNG/SVG image url. e.g. /assets/mascot/penguin.png */
  src: string;
  alt?: string;

  /** current mood (controlled) */
  mood?: PenguinMood;

  /** auto revert to default after ms (except focus) */
  autoRevertMs?: number;

  /** size in px */
  size?: number;

  /** Optional: small label under mascot (for debugging) */
  debugLabel?: boolean;

  /** className for positioning */
  className?: string;
};

/**
 * PenguinMascot v1
 * - 상태 class로 애니메이션만 바꿔줌 (이미지 자체는 동일)
 * - 추후 SVG로 교체하면 (눈 반짝/전구/별 등) 더 고급화 가능
 */
export default function PenguinMascot({
  src,
  alt = "LingoX penguin mascot",
  mood = "default",
  autoRevertMs = 900,
  size = 140,
  debugLabel = false,
  className = "",
}: Props) {
  const [localMood, setLocalMood] = useState<PenguinMood>(mood);
  const prevMoodRef = useRef<PenguinMood>(mood);

  // controlled -> local sync
  useEffect(() => {
    setLocalMood(mood);
    prevMoodRef.current = mood;
  }, [mood]);

  // auto revert (짧은 피드백은 다시 default로)
  useEffect(() => {
    if (localMood === "default") return;
    if (localMood === "focus") return; // focus는 유지하는 게 일반적
    const t = window.setTimeout(() => {
      // 마지막 외부 mood가 그대로면 default로 복귀
      if (prevMoodRef.current === localMood) {
        setLocalMood("default");
      }
    }, autoRevertMs);
    return () => window.clearTimeout(t);
  }, [localMood, autoRevertMs]);

  const moodClass = useMemo(() => {
    return `penguin penguin--${localMood}`;
  }, [localMood]);

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <div
        className={moodClass}
        style={{
          width: size,
          height: size,
        }}
        aria-label={alt}
        role="img"
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="penguin__img"
        />

        {/* FX layer */}
        <span className="penguin__fx" aria-hidden="true">
          <span className="fx fx--stars" />
          <span className="fx fx--sparkles" />
          <span className="fx fx--bulb" />
          <span className="fx fx--hand" />
        </span>
      </div>

      {debugLabel && (
        <div className="mt-2 text-xs text-neutral-500">{localMood}</div>
      )}

      {/* keyframes + styles */}
      <style jsx global>{`
        .penguin {
          position: relative;
          display: grid;
          place-items: center;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          transform: translateZ(0);
        }

        .penguin__img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          pointer-events: none;
          transform: translateZ(0);
          filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.12));
        }

        .penguin__fx {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .fx {
          position: absolute;
          inset: 0;
          opacity: 0;
        }

        /* =========
           DEFAULT (살아있는 느낌)
           ========= */
        .penguin--default {
          animation: penguin-idle 2.8s ease-in-out infinite;
        }

        @keyframes penguin-idle {
          0% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-3px) scale(1.01);
          }
          100% {
            transform: translateY(0) scale(1);
          }
        }

        /* =========
           SUCCESS (눈 반짝 + 바운스 + 스파클)
           ========= */
        .penguin--success {
          animation: penguin-bounce 520ms cubic-bezier(0.2, 1.2, 0.2, 1) 1;
        }
        .penguin--success .fx--sparkles {
          opacity: 1;
          animation: fx-sparkles 650ms ease-out 1;
        }

        @keyframes penguin-bounce {
          0% {
            transform: translateY(0) scale(1);
          }
          40% {
            transform: translateY(-10px) scale(1.04);
          }
          70% {
            transform: translateY(2px) scale(0.99);
          }
          100% {
            transform: translateY(0) scale(1);
          }
        }

        @keyframes fx-sparkles {
          0% {
            transform: scale(0.6);
            opacity: 0;
          }
          30% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1.25);
            opacity: 0;
          }
        }

        /* =========
           FAIL (살짝 시무룩: 아래로 + 흔들림 작게)
           ========= */
        .penguin--fail {
          animation: penguin-fail 600ms ease-out 1;
          filter: saturate(0.92);
        }

        @keyframes penguin-fail {
          0% {
            transform: translateY(0);
          }
          35% {
            transform: translateY(6px) scale(0.99);
          }
          60% {
            transform: translateY(5px) scale(0.99);
          }
          85% {
            transform: translateY(6px) rotate(-1deg);
          }
          100% {
            transform: translateY(0) rotate(0deg);
          }
        }

        /* =========
           HINT (찡긋 + 전구)
           ========= */
        .penguin--hint {
          animation: penguin-wink 520ms ease-out 1;
        }
        .penguin--hint .fx--bulb {
          opacity: 1;
          animation: fx-bulb 700ms ease-out 1;
        }

        @keyframes penguin-wink {
          0% {
            transform: rotate(0deg) scale(1);
          }
          40% {
            transform: rotate(2deg) scale(1.02);
          }
          100% {
            transform: rotate(0deg) scale(1);
          }
        }

        @keyframes fx-bulb {
          0% {
            transform: translateY(10px) scale(0.5);
            opacity: 0;
          }
          25% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-8px) scale(1.08);
            opacity: 0;
          }
        }

        /* =========
           FOCUS (눈 또렷: 살짝 앞으로)
           ========= */
        .penguin--focus {
          animation: penguin-focus 1.2s ease-in-out infinite;
        }
        @keyframes penguin-focus {
          0% {
            transform: translateY(0) scale(1.02);
          }
          50% {
            transform: translateY(-2px) scale(1.03);
          }
          100% {
            transform: translateY(0) scale(1.02);
          }
        }

        /* =========
           CELEBRATE (별 튐)
           ========= */
        .penguin--celebrate {
          animation: penguin-bounce 520ms cubic-bezier(0.2, 1.2, 0.2, 1) 1;
        }
        .penguin--celebrate .fx--stars {
          opacity: 1;
          animation: fx-stars 750ms ease-out 1;
        }

        @keyframes fx-stars {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          25% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1.35);
            opacity: 0;
          }
        }

        /* =========
           PAUSE ("잠깐!" 손짓)
           ========= */
        .penguin--pause {
          animation: penguin-pause 520ms ease-out 1;
        }
        .penguin--pause .fx--hand {
          opacity: 1;
          animation: fx-hand 650ms ease-out 1;
        }

        @keyframes penguin-pause {
          0% {
            transform: translateY(0) scale(1);
          }
          35% {
            transform: translateY(-4px) scale(1.02);
          }
          100% {
            transform: translateY(0) scale(1);
          }
        }

        @keyframes fx-hand {
          0% {
            transform: translateX(10px) scale(0.7);
            opacity: 0;
          }
          30% {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateX(-6px) scale(1.05);
            opacity: 0;
          }
        }

        /* =========
           FX visuals (임시: CSS로만 느낌 처리)
           - 나중에 SVG 파츠로 교체 가능
           ========= */
        .fx--sparkles::before,
        .fx--sparkles::after {
          content: "";
          position: absolute;
          width: 16px;
          height: 16px;
          border-radius: 6px;
          background: rgba(255, 220, 120, 0.95);
          box-shadow: 0 0 18px rgba(255, 210, 90, 0.6);
          top: 18%;
          left: 22%;
          transform: rotate(15deg);
        }
        .fx--sparkles::after {
          width: 10px;
          height: 10px;
          top: 22%;
          left: 70%;
          opacity: 0.9;
        }

        .fx--stars::before,
        .fx--stars::after {
          content: "★";
          position: absolute;
          font-size: 18px;
          color: rgba(255, 210, 90, 0.95);
          text-shadow: 0 0 16px rgba(255, 210, 90, 0.55);
          top: 10%;
          left: 18%;
        }
        .fx--stars::after {
          content: "✦";
          font-size: 16px;
          top: 14%;
          left: 76%;
        }

        .fx--bulb::before {
          content: "💡";
          position: absolute;
          font-size: 22px;
          top: 6%;
          left: 74%;
          filter: drop-shadow(0 6px 14px rgba(255, 220, 120, 0.35));
        }

        .fx--hand::before {
          content: "✋";
          position: absolute;
          font-size: 22px;
          top: 34%;
          left: 78%;
          filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.12));
        }

        /* reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .penguin,
          .penguin * {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}
