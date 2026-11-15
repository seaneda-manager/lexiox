"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * 게임 공통 전체화면 틀.
 *  - 브라우저 Fullscreen API가 되면 쓰고, 안 되는 기기(아이폰 사파리 등)는 화면 전체를 덮는 고정 레이어로 대신한다.
 *  - 폰에서 게임이 원하는 방향이 아니면 "돌려 주세요" 안내를 띄운다.
 *  - 전체화면 동안 화면이 꺼지지 않게 Wake Lock을 요청한다(지원 기기만).
 */
type Orientation = "landscape" | "portrait" | "any";

type Props = {
  children: ReactNode;
  orientation?: Orientation; // 게임이 선호하는 화면 방향
};

type WakeLockSentinelLike = { release: () => Promise<void> };

export default function GameFrame({ children, orientation = "any" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const wakeRef = useRef<WakeLockSentinelLike | null>(null);
  const [full, setFull] = useState(false);
  const [wrongWay, setWrongWay] = useState(false);

  const refreshGame = useCallback(() => {
    // Phaser가 부모 크기 변화를 따라가도록 resize 이벤트를 흘려 준다
    [60, 250, 600].forEach((ms) => setTimeout(() => window.dispatchEvent(new Event("resize")), ms));
  }, []);

  const releaseWake = useCallback(() => {
    wakeRef.current?.release().catch(() => {});
    wakeRef.current = null;
  }, []);

  const enter = useCallback(async () => {
    setFull(true);
    try {
      await ref.current?.requestFullscreen?.({ navigationUI: "hide" });
    } catch {
      /* 지원 안 하면 고정 레이어만 사용 */
    }
    try {
      const scr = screen as Screen & { orientation?: { lock?: (o: string) => Promise<void> } };
      if (orientation !== "any") await scr.orientation?.lock?.(orientation);
    } catch {
      /* 방향 고정은 안드로이드 전체화면에서만 가능 */
    }
    try {
      const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<WakeLockSentinelLike> } };
      wakeRef.current = (await nav.wakeLock?.request("screen")) ?? null;
    } catch {
      /* 무시 */
    }
    refreshGame();
  }, [orientation, refreshGame]);

  const exit = useCallback(async () => {
    setFull(false);
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      /* 무시 */
    }
    try {
      (screen.orientation as unknown as { unlock?: () => void })?.unlock?.();
    } catch {
      /* 무시 */
    }
    releaseWake();
    refreshGame();
  }, [refreshGame, releaseWake]);

  // 브라우저가 Esc 등으로 전체화면을 끝냈을 때 상태를 맞춘다
  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement) {
        setFull(false);
        releaseWake();
        refreshGame();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") exit();
    };
    document.addEventListener("fullscreenchange", onFs);
    if (full) window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      window.removeEventListener("keydown", onKey);
    };
  }, [full, exit, refreshGame, releaseWake]);

  // 전체화면 동안 페이지 스크롤 잠금
  useEffect(() => {
    if (!full) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [full]);

  // 컴포넌트가 사라질 때 정리
  useEffect(() => () => releaseWake(), [releaseWake]);

  // 방향 안내(터치 기기에서만)
  useEffect(() => {
    if (!full || orientation === "any") {
      setWrongWay(false);
      return;
    }
    const check = () => {
      const touch = navigator.maxTouchPoints > 0 && Math.min(window.innerWidth, window.innerHeight) < 700;
      const isPortrait = window.innerHeight > window.innerWidth;
      setWrongWay(touch && (orientation === "portrait" ? !isPortrait : isPortrait));
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [full, orientation]);

  const btn = "rounded-full text-sm font-semibold px-4 py-2 transition";

  return (
    <div>
      {!full && (
        <div className="max-w-5xl mx-auto mb-2 flex justify-end">
          <button className={`${btn} bg-slate-700 text-slate-100 hover:bg-slate-600`} onClick={enter}>
            ⛶ 전체화면
          </button>
        </div>
      )}

      <div
        ref={ref}
        className={full ? "fixed inset-0 z-[9999] bg-slate-950 flex items-center justify-center" : "relative"}
        style={full ? { height: "100dvh", width: "100vw" } : undefined}
      >
        <style>{`.gf-slot-full > div { width: 100% !important; height: 100% !important; max-width: none !important; aspect-ratio: auto !important; border-radius: 0 !important; box-shadow: none !important; }`}</style>
        <div className={full ? "gf-slot-full w-full h-full" : ""}>{children}</div>

        {full && (
          <>
            <button
              aria-label="전체화면 종료"
              className="fixed right-2 top-1/2 -translate-y-1/2 z-[10000] w-10 h-10 rounded-full bg-black/45 text-white text-lg hover:bg-black/70"
              onClick={exit}
            >
              ✕
            </button>
            {wrongWay && (
              <div className="fixed left-1/2 -translate-x-1/2 bottom-4 z-[10000] rounded-full bg-amber-400 text-slate-900 text-sm font-bold px-4 py-2 shadow-lg pointer-events-none">
                {orientation === "landscape" ? "폰을 가로로 돌려 주세요" : "폰을 세로로 돌려 주세요"}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
