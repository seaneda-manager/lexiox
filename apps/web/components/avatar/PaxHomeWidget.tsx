"use client";

import { PaxAvatar, levelToStage, STAGE_LABEL } from "./PaxAvatar";
import type { Tribe, PaxStage } from "./PaxAvatar";

const DAILY_MESSAGES = [
  "이번 주 첫 날. 작게 시작해도 괜찮아.",
  "어제보다 조금만 더. 그게 전부야.",
  "중간이 제일 힘들어. 그래도 여기 있잖아.",
  "이번 주 거의 다 왔어. 오늘도 한 번만.",
  "오늘 끝내면 주말이 더 편해.",
  "쉬어도 돼. 근데 10분만 어때?",
  "내일을 위해 오늘 하나만.",
];

const TRIBE_BG: Record<Tribe, string> = {
  kenine:  "from-orange-50 to-amber-50 border-orange-200",
  fenine:  "from-indigo-50 to-violet-50 border-indigo-200",
  lutrine: "from-amber-50 to-yellow-50 border-amber-200",
};

const TRIBE_ACCENT: Record<Tribe, string> = {
  kenine:  "text-orange-600",
  fenine:  "text-indigo-600",
  lutrine: "text-amber-600",
};

const TRIBE_BADGE: Record<Tribe, string> = {
  kenine:  "bg-orange-100 text-orange-700",
  fenine:  "bg-indigo-100 text-indigo-700",
  lutrine: "bg-amber-100 text-amber-700",
};

const TRIBE_LABEL: Record<Tribe, string> = {
  kenine:  "Kenine",
  fenine:  "Fenine",
  lutrine: "Lutrine",
};

interface PaxHomeWidgetProps {
  tribe?: Tribe | null;
  level?: number;
  streak?: number;
  name?: string | null;
}

export function PaxHomeWidget({ tribe, level = 1, streak = 0, name }: PaxHomeWidgetProps) {
  const t: Tribe = tribe ?? "kenine";
  const stage: PaxStage = levelToStage(level);

  const today = new Date().getDay(); // 0=일 ... 6=토
  const message = DAILY_MESSAGES[today] ?? DAILY_MESSAGES[0];

  const greeting = name ? `${name}` : "안녕";

  return (
    <div className={`rounded-3xl border bg-gradient-to-br ${TRIBE_BG[t]} p-5 shadow-sm`}>
      <div className="flex items-end gap-4">
        {/* Avatar */}
        <div className="shrink-0 relative">
          <PaxAvatar tribe={t} stage={stage} size={100} />
          {/* Stage badge */}
          <span className={`absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${TRIBE_BADGE[t]}`}>
            {STAGE_LABEL[stage]}
          </span>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 pb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold ${TRIBE_ACCENT[t]}`}>
              {TRIBE_LABEL[t]} · Lv.{level}
            </span>
            {streak > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                🔥 {streak}일 연속
              </span>
            )}
          </div>
          <p className="mt-1 text-base font-bold text-gray-900">
            {greeting}! 👋
          </p>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">
            {message}
          </p>
        </div>
      </div>

      {/* XP bar */}
      <div className="mt-4">
        <div className="flex justify-between text-[11px] text-gray-500 mb-1">
          <span>다음 단계까지</span>
          <span>Lv.{level} → {nextStageLevel(level)}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/60">
          <div
            className="h-1.5 rounded-full bg-emerald-400 transition-all"
            style={{ width: `${xpProgress(level)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function nextStageLevel(level: number): number {
  if (level < 5) return 5;
  if (level < 15) return 15;
  if (level < 30) return 30;
  if (level < 50) return 50;
  return 50;
}

function xpProgress(level: number): number {
  if (level < 5) return Math.round((level / 5) * 100);
  if (level < 15) return Math.round(((level - 5) / 10) * 100);
  if (level < 30) return Math.round(((level - 15) / 15) * 100);
  if (level < 50) return Math.round(((level - 30) / 20) * 100);
  return 100;
}
