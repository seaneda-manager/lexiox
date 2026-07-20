// components/ui/LearningCard.tsx

"use client";

import React from "react";

type Props = {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
};

export default function LearningCard({
  title,
  subtitle,
  children,
  className = "",
}: Props) {
  return (
    <div
      className={`
        bg-[var(--surface-card)]
        text-[var(--text-primary)]
        rounded-[var(--radius-lg)]
        shadow-[var(--shadow-card-light)]
        dark:shadow-[var(--shadow-card-dark)]
        p-8
        transition-all
        duration-[var(--motion-normal)]
        ease-[var(--ease-standard)]
        ${className}
      `}
    >
      {(title || subtitle) && (
        <div className="mb-6">
          {title && (
            <h2 className="text-2xl font-semibold tracking-tight">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-[var(--text-secondary)] mt-2 text-sm">
              {subtitle}
            </p>
          )}
        </div>
      )}

      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
}
