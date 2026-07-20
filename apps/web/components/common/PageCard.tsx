"use client";

import React from "react";
import clsx from "clsx";

type Props = {
  children?: React.ReactNode;
  className?: string;
  maxWidthClass?: string; // e.g. "max-w-xl" | "max-w-3xl"
};

export default function PageCard({
  children,
  className,
  maxWidthClass = "max-w-xl",
}: Props) {
  return (
    <div className="relative z-10 mx-auto w-full px-4 py-6 sm:py-10">
      <div
        className={clsx(
          "mx-auto w-full",
          maxWidthClass,
          "rounded-[28px] bg-white/92 backdrop-blur-md",
          "shadow-[0_28px_90px_rgba(0,0,0,0.32)] ring-1 ring-black/10",
          "overflow-hidden",
          className
        )}
        style={{ maxHeight: "calc(100dvh - 48px)" }}
      >
        <div className="h-1.5 w-full bg-yellow-300" />
        <div className="p-5 sm:p-8 text-slate-900">{children}</div>
      </div>
    </div>
  );
}
