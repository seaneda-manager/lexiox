"use client";

import React from "react";

export type MascotMood =
  | "default"
  | "success"
  | "fail"
  | "hint"
  | "focus"
  | "celebrate"
  | "pause";

export function ParrotMark({ size = 420 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none" aria-hidden="true">
      <path
        d="M338 116c-56-42-153-19-197 60-33 58-20 131 24 176 23 23 54 39 88 44 42 7 78-5 104-29 31-29 50-73 46-122-3-43-24-90-65-129Z"
        fill="currentColor"
      />
      <path
        d="M372 106c-18-34-55-54-92-60 18 18 29 41 32 66 23-8 45-9 60-6Z"
        fill="currentColor"
      />
      <path
        d="M310 192c18-16 40-24 66-24-17 22-35 38-54 47"
        stroke="currentColor"
        strokeWidth="18"
        strokeLinecap="round"
      />
      <path
        d="M286 346c-10 34-33 69-72 96 48-9 87-35 112-70"
        stroke="currentColor"
        strokeWidth="18"
        strokeLinecap="round"
      />
      <circle cx="316" cy="210" r="10" fill="currentColor" />
    </svg>
  );
}

function moodClass(mood: MascotMood) {
  switch (mood) {
    case "success":
      return "motion-safe:animate-bounce";
    case "celebrate":
      return "motion-safe:animate-pulse";
    case "fail":
      return "opacity-70 grayscale";
    case "hint":
      return "opacity-90 motion-safe:animate-pulse";
    case "focus":
      return "opacity-95";
    case "pause":
      return "opacity-55";
    default:
      return "opacity-90";
  }
}

export default function ParrotMascot({
  mood = "default",
  size = 84,
}: {
  mood?: MascotMood;
  size?: number;
}) {
  const cls = moodClass(mood);

  return (
    <div className={`select-none drop-shadow-lg ${cls}`} style={{ width: size, height: size }} aria-label="Parrot mascot">
      <svg viewBox="0 0 128 128" width={size} height={size} fill="none">
        {/* tail */}
        <path d="M44 92c-8 10-14 20-16 28 12-6 22-14 30-24" fill="#22c55e" opacity="0.9" />
        <path d="M56 96c-4 12-7 20-8 28 10-8 18-16 24-28" fill="#60a5fa" opacity="0.85" />

        {/* body */}
        <path
          d="M38 72c0-24 14-46 40-46 20 0 34 16 34 34 0 24-18 44-44 44-18 0-30-14-30-32Z"
          fill="#34d399"
        />

        {/* wing */}
        <path
          d="M44 76c6-12 16-18 30-18 10 0 18 4 24 10-8 18-24 30-40 30-8 0-12-6-14-22Z"
          fill="#22c55e"
          opacity="0.95"
        />

        {/* belly highlight */}
        <path
          d="M54 80c0-12 10-24 26-24 10 0 18 6 18 14 0 14-14 28-30 28-8 0-14-6-14-18Z"
          fill="#a7f3d0"
          opacity="0.7"
        />

        {/* head */}
        <path
          d="M74 26c10 0 18 8 18 18 0 12-10 22-22 22-10 0-18-8-18-18 0-12 10-22 22-22Z"
          fill="#34d399"
        />

        {/* beak */}
        <path d="M92 46c10-6 20-6 26-2-6 10-14 16-24 18" fill="#f59e0b" />
        <path d="M90 52c10 2 18 8 22 14-10 4-18 4-26 0" fill="#fb7185" opacity="0.9" />

        {/* eye */}
        <circle cx="78" cy="44" r="5" fill="#0f172a" />
        <circle cx="80" cy="42" r="2" fill="#ffffff" opacity="0.9" />

        {/* cheek */}
        <circle cx="68" cy="52" r="4" fill="#fda4af" opacity="0.8" />
      </svg>
    </div>
  );
}
