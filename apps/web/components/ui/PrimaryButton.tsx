// components/ui/PrimaryButton.tsx

"use client";

import React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function PrimaryButton({ children, ...props }: Props) {
  return (
    <button
      {...props}
      className="
        px-6 py-3
        rounded-xl
        font-semibold
        text-white
        bg-[var(--brand-primary)]
        transition-all
        duration-[var(--motion-fast)]
        ease-[var(--ease-energetic)]
        hover:scale-105
        active:scale-95
        disabled:opacity-50
      "
    >
      {children}
    </button>
  );
}
