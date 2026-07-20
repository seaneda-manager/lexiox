"use client";

import Image from "next/image";

const COLORS = [
  "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-yellow-500",
  "bg-lime-500", "bg-green-500", "bg-teal-500", "bg-cyan-500",
  "bg-blue-500", "bg-indigo-500", "bg-violet-500", "bg-purple-500",
  "bg-pink-500", "bg-rose-500",
];

function colorFromName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

type Size = "xs" | "sm" | "md" | "lg" | "xl";
const sizeMap: Record<Size, { px: number; text: string }> = {
  xs: { px: 24, text: "text-xs" },
  sm: { px: 32, text: "text-sm" },
  md: { px: 40, text: "text-base" },
  lg: { px: 56, text: "text-xl" },
  xl: { px: 80, text: "text-3xl" },
};

interface AvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  size?: Size;
  className?: string;
}

export default function Avatar({ name, avatarUrl, size = "md", className = "" }: AvatarProps) {
  const { px, text } = sizeMap[size];
  const initials = name ? name.trim().charAt(0).toUpperCase() : "?";
  const bgColor = name ? colorFromName(name) : "bg-gray-400";

  if (avatarUrl) {
    return (
      <div
        className={`rounded-full overflow-hidden shrink-0 ${className}`}
        style={{ width: px, height: px }}
      >
        <Image
          src={avatarUrl}
          alt={name ?? "avatar"}
          width={px}
          height={px}
          className="object-cover w-full h-full"
        />
      </div>
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 text-white font-bold select-none ${bgColor} ${text} ${className}`}
      style={{ width: px, height: px }}
    >
      {initials}
    </div>
  );
}
