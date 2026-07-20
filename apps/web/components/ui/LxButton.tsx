"use client";

import React from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export default function LxButton({
  variant = "primary",
  className = "",
  ...props
}: Props) {
  const base =
    "rounded-3xl px-8 py-4 font-semibold transition active:scale-[0.98]";

  const variants: Record<Variant, React.CSSProperties> = {
    primary: {
      background: "var(--lx-primary)",
      color: "#fff",
      boxShadow: "0 8px 24px rgba(91,140,255,0.25)",
    },
    secondary: {
      background: "var(--lx-surface)",
      color: "var(--lx-text)",
      border: "1px solid var(--lx-border)",
    },
    ghost: {
      background: "transparent",
      color: "var(--lx-primary)",
    },
    danger: {
      background: "var(--lx-danger)",
      color: "#fff",
    },
  };

  return (
    <button
      {...props}
      className={`${base} ${className}`}
      style={variants[variant]}
    />
  );
}
