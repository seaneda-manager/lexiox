"use client";

import React, { useEffect } from "react";

type Props = {
  badge?: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  hint?: React.ReactNode;

  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;

  // legacy
  doneLabel?: string;
  onDone?: () => void;

  children?: React.ReactNode;
  theme?: "light" | "dark";
};

function isTypingTarget(el: EventTarget | null) {
  const node = el as HTMLElement | null;
  if (!node) return false;
  const tag = node.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if ((node as any).isContentEditable) return true;
  return false;
}

export default function StageIntroScreen({
  badge,
  title,
  subtitle,
  hint,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  doneLabel,
  onDone,
  children,
  theme = "light",
}: Props) {
  const dark = theme === "dark";
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      if (e.key === "1" && onPrimary) onPrimary();
      if (e.key === "2" && onSecondary) onSecondary();

      if (e.key === "Enter") {
        if (onPrimary) onPrimary();
        else if (onDone) onDone();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onPrimary, onSecondary, onDone]);

  const showTwo = Boolean(primaryLabel && secondaryLabel && (onPrimary || onSecondary));
  const showOne = Boolean(!showTwo && onDone);

  const panelStyle = dark
    ? { background: "#22503f", border: "1px solid rgba(93,202,165,0.15)", color: "#E1F5EE" }
    : undefined;

  const badgePillStyle = dark
    ? { background: "rgba(26,61,48,0.7)", border: "1px solid rgba(255,255,255,0.12)", color: "#9FE1CB" }
    : undefined;

  return (
    <div className="lx-panel rounded-[28px] shadow-sm" style={panelStyle ?? { border: "1px solid #e2e8f0", background: "rgba(255,255,255,0.95)", color: "#0f172a" }}>
      <div className="lx-panel-content">
        <div className="lx-panel-scroll">
          <div className="lx-panel-header p-8 pb-4">
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold" style={badgePillStyle ?? { border: "1px solid #e2e8f0", background: "white", color: "#0f172a" }}>
              {badge ?? "Info"}
              <span style={{ color: dark ? "#4da88a" : "#64748b" }}>(Keyboard supported)</span>
            </div>

            {title ? (
              <div className="mt-6 text-[clamp(28px,3cqi,56px)] font-extrabold leading-tight" style={{ color: dark ? "#E1F5EE" : "#0f172a" }}>
                {title}
              </div>
            ) : null}

            {subtitle ? (
              <div className="mt-2 text-[clamp(14px,1.5cqi,20px)] font-semibold" style={{ color: dark ? "#4da88a" : "#475569" }}>
                {subtitle}
              </div>
            ) : null}

            {hint ? (
              <div className="mt-4 text-sm font-semibold" style={{ color: dark ? "#9FE1CB" : "#334155" }}>{hint}</div>
            ) : null}
          </div>

          {/* body */}
          {children ? <div className="px-8 pb-6">{children}</div> : null}

          {/* actions */}
          {showTwo ? (
            <div className="px-8 pb-8">
              <div className="flex gap-4">
                {dark ? (
                  <>
                    <button type="button" className="lx-btn" style={{ background: "#5DCAA5", color: "#04342C", fontWeight: 800 }} onClick={onPrimary}>
                      {primaryLabel} <span className="ml-2 opacity-80">(1)</span>
                    </button>
                    <button type="button" className="lx-btn" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#9FE1CB", fontWeight: 800 }} onClick={onSecondary}>
                      {secondaryLabel} <span className="ml-2 opacity-70">(2)</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className="lx-btn lx-btn-primary" onClick={onPrimary}>
                      {primaryLabel} <span className="ml-2 opacity-80">(1)</span>
                    </button>
                    <button type="button" className="lx-btn lx-btn-secondary" onClick={onSecondary}>
                      {secondaryLabel} <span className="ml-2 opacity-70">(2)</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : showOne ? (
            <div className="px-8 pb-8">
              <button
                type="button"
                className="lx-btn w-full"
                style={dark ? { background: "#5DCAA5", color: "#04342C", fontWeight: 800 } : undefined}
                onClick={onDone}
              >
                {!dark && <span className="lx-btn-primary" />}
                {doneLabel ?? "Continue"} <span className="ml-2 opacity-80">(Enter)</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
