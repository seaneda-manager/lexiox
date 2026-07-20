"use client";

import React from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
  panelWidthClass?: string;
  dim?: boolean;
  blur?: boolean;
  variant?: "overlay" | "card" | string;
  tone?: "dark" | "light";
};

export default function FocusModeWrapper({
  children,
  className,
  panelWidthClass,
  dim = true,
  blur = true,
  variant = "overlay",
  tone = "dark",
}: Props) {
  // card mode (embedded)
  if (variant === "card") {
    return (
      <div className={["mx-auto w-full md:w-[66%]", panelWidthClass ?? "max-w-[980px]"].join(" ")}>
        <div
          className={[
            "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm",
            "text-slate-900",
            className ?? "",
          ].join(" ")}
        >
          {children}
        </div>
      </div>
    );
  }

  // overlay mode (focus stage)
  // ✅ SSOT: StageFrame padding만 조절하면 전체 StageCard 면적이 같이 변함
  const framePx = "px-[clamp(24px,2.6vw,72px)]";
  const framePy = "py-[clamp(20px,2.4vh,68px)]";

  // 디버그 프레임(흰 테두리) 보고 싶으면 true
  const DEBUG_FRAME = true;

  return (
    <div
      className="focus-root fixed inset-0 z-[60]"
      data-tone={tone}
      data-dim={String(Boolean(dim))}
      data-blur={String(Boolean(blur))}
    >
      <div className="focus-stage-wrap h-full w-full grid place-items-center px-[clamp(10px,2vw,24px)] py-[clamp(10px,2vh,24px)]">
        {/* 보드(초록 bg) 크게 + 비율 유지 */}
        <div className="relative w-[min(96vw,1600px)] aspect-[3/2]">
          <div className={["focus-stage absolute inset-0 overflow-hidden", className ?? ""].join(" ")}>
            <div className="focus-stage-inner relative h-full w-full">
              {/* ===== StageFrame (SSOT) ===== */}
              <div className={["absolute inset-0", framePx, framePy].join(" ")}>
                {/* ✅ 핵심: children의 “바로 아래 루트”를 무조건 프레임 100%로 늘림 */}
                <div className="h-full w-full min-h-0 min-w-0 [&>*]:h-full [&>*]:w-full [&>*]:min-h-0 [&>*]:min-w-0">
                  {children}
                </div>

                {DEBUG_FRAME ? (
                  <div className="pointer-events-none absolute inset-0 rounded-[28px] border-[4px] border-white/80" />
                ) : null}
              </div>
              {/* ============================ */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
