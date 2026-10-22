"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 시험/학습 중 다른 탭·창으로 나가는 것을 감지한다 (사전 검색 억제용).
 * - 첫 이탈: 경고만 표시
 * - 두 번째 이탈부터: onPenalty 호출 (현재 단어를 오답 처리하고 다음으로)
 * 브라우저에서 완전히 막을 수는 없으므로 "억제 + 기록"이 목적이다.
 */
export function useTabLeaveGuard(opts: {
  enabled: boolean;
  onPenalty: () => void;
}): { leaveCount: number; showWarning: boolean; dismissWarning: () => void } {
  const { enabled, onPenalty } = opts;
  const [leaveCount, setLeaveCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);

  const countRef = useRef(0);
  const awayRef = useRef(false);
  const penaltyRef = useRef(onPenalty);

  useEffect(() => {
    penaltyRef.current = onPenalty;
  });

  useEffect(() => {
    if (!enabled) return;

    const handleLeave = () => {
      if (awayRef.current) return; // visibilitychange + blur 중복 방지
      awayRef.current = true;
      countRef.current += 1;
      setLeaveCount(countRef.current);
      setShowWarning(true);
      if (countRef.current >= 2) penaltyRef.current();
    };
    const handleReturn = () => {
      awayRef.current = false;
    };
    const onVisibility = () => {
      if (document.hidden) handleLeave();
      else handleReturn();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", handleLeave);
    window.addEventListener("focus", handleReturn);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", handleLeave);
      window.removeEventListener("focus", handleReturn);
    };
  }, [enabled]);

  const dismissWarning = useCallback(() => setShowWarning(false), []);

  return { leaveCount, showWarning, dismissWarning };
}
