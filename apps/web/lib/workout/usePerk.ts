"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 게임 보상(플레이 시간) 상태 훅.
 *  state: loading | ok(열림) | locked(오늘 시간 없음) | login(로그인 필요) | error
 *  - 직원 계정은 unlimited(미리보기).
 *  - 로컬 개발(NODE_ENV!=='production')에서 로그인 세션이 없으면(401) 막지 않는다(개발 편의).
 */
export type PerkState = "loading" | "ok" | "locked" | "login" | "error";

export type PerkInfo = {
  state: PerkState;
  balance: number;
  unlimited: boolean;
  dev: boolean; // 개발 환경 우회 중
  earnedToday: number;
  usedToday: number;
  homeworkDone: boolean;
  academyChecked: boolean;
  homeworkMinutes: number;
  academyMinutes: number;
};

const INITIAL: PerkInfo = {
  state: "loading",
  balance: 0,
  unlimited: false,
  dev: false,
  earnedToday: 0,
  usedToday: 0,
  homeworkDone: false,
  academyChecked: false,
  homeworkMinutes: 10,
  academyMinutes: 10,
};

const IS_DEV = process.env.NODE_ENV !== "production";

export function usePerk(opts: { tick?: boolean } = {}) {
  const [info, setInfo] = useState<PerkInfo>(INITIAL);
  const infoRef = useRef(info);
  infoRef.current = info;

  const refresh = useCallback(async () => {
    // 개발 확인용: ?perk=locked | login 으로 잠금 화면을 강제로 본다(운영 빌드에서는 이 분기가 사라진다)
    if (IS_DEV && typeof window !== "undefined") {
      const forced = new URLSearchParams(window.location.search).get("perk");
      if (forced === "locked" || forced === "login") {
        setInfo({ ...INITIAL, state: forced, usedToday: forced === "locked" ? 10 : 0, homeworkDone: true });
        return;
      }
    }
    try {
      const r = await fetch("/api/workout/perk", { cache: "no-store" });
      if (r.status === 401) {
        setInfo({ ...INITIAL, state: IS_DEV ? "ok" : "login", unlimited: IS_DEV, dev: IS_DEV });
        return;
      }
      if (!r.ok) {
        setInfo({ ...INITIAL, state: "error" });
        return;
      }
      const j = await r.json();
      const unlimited = !!j.unlimited;
      setInfo({
        state: unlimited || j.balance > 0 ? "ok" : "locked",
        balance: j.balance ?? 0,
        unlimited,
        dev: false,
        earnedToday: j.earnedToday ?? 0,
        usedToday: j.usedToday ?? 0,
        homeworkDone: !!j.homeworkDone,
        academyChecked: !!j.academyChecked,
        homeworkMinutes: j.homeworkMinutes ?? 10,
        academyMinutes: j.academyMinutes ?? 10,
      });
    } catch {
      setInfo({ ...INITIAL, state: "error" });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // 플레이 중 60초마다 1분 차감(탭이 보일 때만). 첫 차감은 시작 직후.
  useEffect(() => {
    if (!opts.tick || info.state !== "ok" || info.unlimited) return;
    let stop = false;
    const tick = async () => {
      if (stop || document.visibilityState !== "visible") return;
      try {
        const r = await fetch("/api/workout/perk", { method: "POST" });
        if (r.status === 401) return;
        const j = await r.json();
        if (j.locked || j.balance <= 0) {
          setInfo((p) => ({ ...p, state: "locked", balance: 0 }));
        } else if (typeof j.balance === "number") {
          setInfo((p) => ({ ...p, balance: j.balance }));
        }
      } catch {
        /* 네트워크 오류는 다음 틱에 다시 */
      }
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
    // 상태가 ok 로 들어올 때 한 번만 시작
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.tick, info.state === "ok", info.unlimited]);

  return { ...info, refresh };
}
