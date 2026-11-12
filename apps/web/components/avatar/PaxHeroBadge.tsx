"use client";

import { PaxAvatar, levelToStage, STAGE_LABEL } from "./PaxAvatar";
import type { Tribe } from "./PaxAvatar";

/** 서버 컴포넌트(학생 홈 히어로)에서 쓰는 Pax 캐릭터 + 단계 뱃지. 클라이언트 모듈의 함수는 서버에서 호출할 수 없어 래퍼로 감쌌다. */
export function PaxHeroBadge({ tribe, level, size = 84 }: { tribe: Tribe | null; level: number | null; size?: number }) {
  const stage = levelToStage(level ?? 1);
  return (
    <div className="relative shrink-0 rounded-2xl bg-white/90 p-1.5">
      <PaxAvatar tribe={tribe ?? "kenine"} stage={stage} size={size} />
      <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-amber-950">
        {STAGE_LABEL[stage]}
      </span>
    </div>
  );
}
