"use client";

import React from "react";

type Step = { index: number; total: number };

type Action = {
  label: string;
  onClick?: () => void;
  disabled?: boolean;

  // legacy/compat
  variant?: string;
  [key: string]: any;
};

type Props = {
  children: React.ReactNode;

  stageKey?: string;
  stageLabel?: string;

  title?: string;
  subtitle?: string;

  step?: Step;
  topRight?: React.ReactNode;

  hint?: string;

  primary?: Action;
  secondary?: Action;

  align?: "left" | "center";
  className?: string;
  theme?: "light" | "dark";

  // legacy props (ignored intentionally)
  maxWidthClassName?: string;

  [key: string]: any;
};

function Btn({
  kind,
  label,
  onClick,
  disabled,
  dark,
}: {
  kind: "primary" | "secondary";
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  dark?: boolean;
}) {
  const base =
    "h-11 rounded-2xl px-5 text-sm font-extrabold transition active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed";
  const cls = dark
    ? kind === "primary"
      ? "text-[#04342C] hover:opacity-90"
      : "border text-[#9FE1CB] hover:opacity-80"
    : kind === "primary"
      ? "bg-emerald-700 text-white hover:bg-emerald-600"
      : "bg-white/80 text-emerald-900 border border-emerald-900/20 hover:bg-white";
  const style = dark
    ? kind === "primary"
      ? { background: "#5DCAA5" }
      : { background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.15)" }
    : undefined;
  return (
    <button type="button" className={`${base} ${cls}`} style={style} onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}

export default function StageScaffold({
  children,
  stageKey,
  stageLabel,
  title,
  subtitle,
  step,
  topRight,
  hint,
  primary,
  secondary,
  align = "center",
  className,
  theme = "light",
}: Props) {
  const headerAlign = align === "center" ? "text-center" : "text-left";
  const rowAlign = align === "center" ? "justify-center" : "justify-between";
  const dark = theme === "dark";

  const containerStyle = dark
    ? { containerType: "inline-size" as const, background: "#22503f", border: "1px solid rgba(93,202,165,0.15)" }
    : { containerType: "inline-size" as const };

  const containerCls = dark
    ? ["h-full w-full overflow-hidden rounded-[28px]", "shadow-[0_18px_50px_rgba(0,0,0,0.30)]", className ?? ""].join(" ")
    : ["h-full w-full overflow-hidden rounded-[28px]", "border border-black/10 bg-white/80 backdrop-blur-[2px]", "shadow-[0_18px_50px_rgba(0,0,0,0.16)]", className ?? ""].join(" ");

  const pillStyle = dark
    ? { background: "rgba(26,61,48,0.7)", border: "1px solid rgba(255,255,255,0.12)", color: "#9FE1CB" }
    : undefined;
  const pillCls = dark
    ? "rounded-full px-3 py-1 text-xs font-extrabold"
    : "rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs font-extrabold text-slate-700";

  return (
    <div className="h-full w-full" data-stage={stageKey ?? ""}>
      <div className={containerCls} style={containerStyle}>
        <div className="flex h-full min-h-0 flex-col">
          {/* Top bar */}
          <div className="shrink-0 px-6 pt-5">
            <div className={`flex items-center ${rowAlign} gap-3`}>
              <div className="flex items-center gap-3">
                {stageLabel ? (
                  <div className={pillCls} style={pillStyle}>
                    {stageLabel}
                  </div>
                ) : null}

                {step ? (
                  <div className={pillCls} style={pillStyle}>
                    {step.index}/{step.total}
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-2">{topRight}</div>
            </div>

            {(title || subtitle) ? (
              <div className={`mt-4 ${headerAlign}`}>
                {title ? (
                  <div
                    className="text-[clamp(22px,2.0cqi,32px)] font-black"
                    style={{ color: dark ? "#E1F5EE" : undefined }}
                  >
                    {title}
                  </div>
                ) : null}
                {subtitle ? (
                  <div
                    className="mt-1 text-[clamp(12px,1.25cqi,14px)] font-semibold"
                    style={{ color: dark ? "#4da88a" : "#475569" }}
                  >
                    {subtitle}
                  </div>
                ) : null}
              </div>
            ) : null}

            {hint ? (
              <div className={`mt-3 ${headerAlign}`}>
                <div
                  className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-[clamp(12px,1.2cqi,13px)] font-semibold"
                  style={dark
                    ? { background: "rgba(26,61,48,0.7)", border: "1px solid rgba(255,255,255,0.1)", color: "#9FE1CB" }
                    : { border: "1px solid rgba(0,0,0,0.1)", background: "rgba(255,255,255,0.7)", color: "#475569" }
                  }
                >
                  <span style={{ color: dark ? "#5DCAA5" : "#94a3b8" }}>Hint:</span>
                  <span>{hint}</span>
                </div>
              </div>
            ) : null}
          </div>

          {/* Content */}
          <div className="min-h-0 flex-1 overflow-auto px-6 pb-6 pt-5">
            <div className="h-full w-full">{children}</div>
          </div>

          {/* Footer */}
          {(primary || secondary) ? (
            <div className="shrink-0 px-6 pb-6">
              <div className="flex items-center justify-center gap-3">
                {secondary ? (
                  <Btn kind="secondary" label={secondary.label} onClick={secondary.onClick} disabled={secondary.disabled} dark={dark} />
                ) : null}
                {primary ? (
                  <Btn kind="primary" label={primary.label} onClick={primary.onClick} disabled={primary.disabled} dark={dark} />
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
