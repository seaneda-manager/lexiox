"use client";

import { useCallback, useState } from "react";
import type { PenguinMood } from "./PenguinMascot";

/**
 * 이벤트 -> mascot mood를 깔끔하게 관리하는 훅
 */
export function usePenguinMood() {
  const [mood, setMood] = useState<PenguinMood>("default");

  const setDefault = useCallback(() => setMood("default"), []);

  const success = useCallback(() => setMood("success"), []);
  const fail = useCallback(() => setMood("fail"), []);
  const hint = useCallback(() => setMood("hint"), []);
  const focus = useCallback(() => setMood("focus"), []);
  const celebrate = useCallback(() => setMood("celebrate"), []);
  const pause = useCallback(() => setMood("pause"), []);

  return {
    mood,
    setMood,
    setDefault,
    success,
    fail,
    hint,
    focus,
    celebrate,
    pause,
  };
}
