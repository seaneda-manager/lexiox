"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 문제별 카운트다운.
 * - resetKey가 바뀔 때마다(다음 문제) seconds로 초기화
 * - 0이 되면 onExpire를 한 번 호출 (시간 초과 = 오답 처리용)
 * - paused 동안은 멈춤
 */
export function useCountdown(
  seconds: number,
  resetKey: string | number,
  onExpire: () => void,
  paused = false,
): number {
  const [left, setLeft] = useState(seconds);
  const expireRef = useRef(onExpire);
  const firedRef = useRef(false);

  useEffect(() => {
    expireRef.current = onExpire;
  });

  useEffect(() => {
    setLeft(seconds);
    firedRef.current = false;
  }, [resetKey, seconds]);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setLeft((t) => (t <= 1 ? 0 : t - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resetKey, paused]);

  useEffect(() => {
    if (left === 0 && !paused && !firedRef.current) {
      firedRef.current = true;
      expireRef.current();
    }
  }, [left, paused]);

  return left;
}

/** 철자 입력용 제한 시간: 기본 10초 + 글자당 1초, 최대 30초 (넉넉하게) */
export function spellingTimeLimit(answer: string): number {
  const letters = String(answer ?? "").replace(/\s+/g, "").length;
  return Math.min(30, 10 + letters);
}
