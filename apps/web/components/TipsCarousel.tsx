"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TipsCarouselProps {
  title: string;
  emoji: string;
  color: "blue" | "violet" | "sky" | "indigo";
  tips: string[];
}

const colorClasses = {
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    dark: "text-blue-900",
    button: "bg-blue-500 hover:bg-blue-600",
  },
  violet: {
    bg: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-700",
    dark: "text-violet-900",
    button: "bg-violet-500 hover:bg-violet-600",
  },
  sky: {
    bg: "bg-sky-50",
    border: "border-sky-200",
    text: "text-sky-700",
    dark: "text-sky-900",
    button: "bg-sky-500 hover:bg-sky-600",
  },
  indigo: {
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    text: "text-indigo-700",
    dark: "text-indigo-900",
    button: "bg-indigo-500 hover:bg-indigo-600",
  },
};

export default function TipsCarousel({
  title,
  emoji,
  color,
  tips,
}: TipsCarouselProps) {
  const [current, setCurrent] = useState(0);
  const colors = colorClasses[color];

  const handlePrev = () => {
    setCurrent((prev) => (prev === 0 ? tips.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrent((prev) => (prev === tips.length - 1 ? 0 : prev + 1));
  };

  return (
    <div
      className={`rounded-lg border ${colors.border} ${colors.bg} p-6 space-y-4`}
    >
      {/* 제목 */}
      <div className="text-center">
        <p className={`text-xs font-semibold ${colors.text} uppercase`}>
          {emoji} {title}
        </p>
      </div>

      {/* 슬라이드 */}
      <div className="relative min-h-32 flex items-center justify-center">
        <div className="absolute inset-0 opacity-0" />
        <div className="text-center max-w-xl px-4">
          <div className="text-sm font-semibold text-gray-800 mb-2">
            <span className={colors.text}>계명 {current + 1}/10</span>
          </div>
          <p
            className={`text-lg md:text-xl font-bold ${colors.dark} leading-relaxed transition-all duration-300`}
          >
            {tips[current]}
          </p>
        </div>
      </div>

      {/* 네비게이션 */}
      <div className="flex items-center justify-center gap-4 pt-4">
        <button
          onClick={handlePrev}
          className={`${colors.button} text-white p-2 rounded-lg transition-colors`}
          aria-label="Previous tip"
        >
          <ChevronLeft size={20} />
        </button>

        {/* 인디케이터 */}
        <div className="flex gap-1">
          {tips.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === current
                  ? `${colors.button} w-6`
                  : "bg-gray-300 w-2"
              }`}
              aria-label={`Go to tip ${idx + 1}`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          className={`${colors.button} text-white p-2 rounded-lg transition-colors`}
          aria-label="Next tip"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
