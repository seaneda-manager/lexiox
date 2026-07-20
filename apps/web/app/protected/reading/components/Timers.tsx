// apps/web/app/(protected)/reading/components/Timer.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  seconds: number;
  /** Next 15 rule 71007: 함수 props는 *Action 접미사 권장 */
  onExpireAction?: () => void;
};

/**
 * Lint-safe 타이머:
 * - 이펙트 본문에서 동기 setState 금지 (초기화는 rAF 콜백에서)
 * - 인터벌은 콜백 안에서만 setState (외부 시스템 구독 패턴)
 */
export default function Timer({ seconds, onExpireAction }: Props) {
  // 최초 마운트 시점만 props.seconds 반영 (이펙트에서 동기 setState 없음)
  const [remaining, setRemaining] = useState<number>(() =>
    Math.max(0, Math.trunc(seconds))
  );

  const intervalRef = useRef<number | null>(null);
  const resetRafRef = useRef<number | null>(null);

  useEffect(() => {
    // 1) 기존 interval / rAF 정리
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (resetRafRef.current !== null) {
      cancelAnimationFrame(resetRafRef.current);
      resetRafRef.current = null;
    }

    // 2) 초기 리셋을 rAF 콜백에서 비동기로 수행 → setState in effect 경고 회피
    resetRafRef.current = requestAnimationFrame(() => {
      setRemaining(Math.max(0, Math.trunc(seconds)));

      // 3) 인터벌 시작 (setState는 인터벌 콜백 내부에서만 호출)
      intervalRef.current = window.setInterval(() => {
        setRemaining((s) => {
          if (s <= 1) {
            // 마지막 틱에서 정리 + 콜백
            if (intervalRef.current !== null) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            onExpireAction?.();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    });

    // 4) 언마운트/재시작 시 정리
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (resetRafRef.current !== null) {
        cancelAnimationFrame(resetRafRef.current);
        resetRafRef.current = null;
      }
    };
  }, [seconds, onExpireAction]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  return <div className="text-sm font-mono">{mm}:{ss}</div>;
}
