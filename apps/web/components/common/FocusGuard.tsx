"use client";

// 학생 학습/시험 화면 보호:
//  - 전체화면으로 시작하도록 요구 (벗어나면 다시 안내)
//  - 탭/창 이탈을 기록하고 학생에게 경고
// 웹 페이지가 막을 수는 없으므로 "억제 + 기록"이다. 학원 PC는 Windows 키오스크로 따로 잠근다.

import React, { useCallback, useEffect, useRef, useState } from "react";

type Props = { context: string; children: React.ReactNode };

function report(context: string, event: string, durationMs?: number) {
  try {
    void fetch("/api/student/focus-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context, event, durationMs }),
      keepalive: true,
    });
  } catch {
    /* 기록 실패는 무시 */
  }
}

export default function FocusGuard({ context, children }: Props) {
  const [enforce, setEnforce] = useState(true);
  const [isFull, setIsFull] = useState(true);
  const [leaveCount, setLeaveCount] = useState(0);
  const [showWarn, setShowWarn] = useState(false);
  const hiddenAt = useRef<number | null>(null);
  const wasFull = useRef(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/student/focus-events")
      .then((r) => r.json())
      .then((j) => {
        if (alive && j?.enforce) {
          setEnforce(true);
          setIsFull(!!document.fullscreenElement);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!enforce) return;

    const leave = (event: "tab_hidden" | "window_blur") => {
      if (hiddenAt.current != null) return;
      hiddenAt.current = Date.now();
      (leave as any)._ev = event;
    };
    const back = () => {
      if (hiddenAt.current == null) return;
      const dur = Date.now() - hiddenAt.current;
      const ev = (leave as any)._ev ?? "window_blur";
      hiddenAt.current = null;
      if (dur < 800) return; // 순간적인 포커스 변화는 무시
      report(context, ev, dur);
      setLeaveCount((n) => n + 1);
      setShowWarn(true);
    };

    const onVis = () => (document.hidden ? leave("tab_hidden") : back());
    const onBlur = () => leave("window_blur");
    const onFocus = () => back();
    const onFs = () => {
      const full = !!document.fullscreenElement;
      if (!full && wasFull.current) report(context, "fullscreen_exit");
      wasFull.current = full;
      setIsFull(full);
    };

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, [enforce, context]);

  const goFull = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      /* 지원 안 하는 기기: 기록만 유지 */
      setIsFull(true);
    }
  }, []);

  return (
    <>
      {children}
      {enforce && !isFull && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/90 p-6">
          <div className="max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
            <p className="text-lg font-bold text-slate-900">전체화면으로 학습해요</p>
            <p className="mt-2 text-sm text-slate-600">
              집중해서 학습하기 위해 전체화면이 필요해요. 다른 탭이나 창으로 나가면 선생님이 확인할 수 있어요.
            </p>
            <button
              type="button"
              onClick={goFull}
              className="mt-4 w-full rounded-xl bg-emerald-600 py-3 font-bold text-white hover:bg-emerald-700"
            >
              전체화면으로 시작
            </button>
          </div>
        </div>
      )}
      {enforce && isFull && showWarn && (
        <div className="fixed inset-x-0 top-3 z-[190] mx-auto w-fit max-w-[90vw] rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 shadow">
          ⚠️ 다른 화면으로 나갔어요 (오늘 {leaveCount}회). 선생님이 확인할 수 있어요.
          <button type="button" onClick={() => setShowWarn(false)} className="ml-3 underline">
            닫기
          </button>
        </div>
      )}
    </>
  );
}
