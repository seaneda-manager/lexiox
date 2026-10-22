"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("input, textarea, select")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-3 sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className="grid max-h-full w-full max-w-xl gap-3 overflow-auto rounded-2xl bg-white p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100">닫기</button>
        </div>
        {children}
      </div>
    </div>
  );
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const show = (m: string) => {
    setMsg(m);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => setMsg(null), 2800);
  };
  const node = msg ? (
    <div role="status" className="fixed bottom-5 left-1/2 z-[60] max-w-[calc(100%-32px)] -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg">
      {msg}
    </div>
  ) : null;
  return { show, node };
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {}
    ta.remove();
    return ok;
  }
}

/** 두 번 눌러야 실행되는 삭제 버튼 */
export function ConfirmButton({ onConfirm, className, children = "삭제" }: { onConfirm: () => void; className?: string; children?: ReactNode }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button type="button" className={className} onClick={() => (armed ? onConfirm() : setArmed(true))}>
      {armed ? "한 번 더 누르면 삭제" : children}
    </button>
  );
}
