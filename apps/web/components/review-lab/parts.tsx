"use client";

import { Check } from "lucide-react";

/** 영역별 포인트 색. Tailwind 가 읽도록 클래스 전체를 문자열로 적어 둔다. */
export type AccentKey = "reading" | "listening" | "speaking" | "writing";
export const ACCENTS: Record<
  AccentKey,
  { name: string; active: string; doneBg: string; doneText: string; doneDot: string; stroke: string; eyebrow: string; dot: string }
> = {
  reading: { name: "Reading", active: "bg-indigo-600", doneBg: "bg-indigo-50 hover:bg-indigo-100", doneText: "text-indigo-700", doneDot: "bg-indigo-600", stroke: "stroke-indigo-500", eyebrow: "text-indigo-600", dot: "bg-indigo-500" },
  listening: { name: "Listening", active: "bg-sky-600", doneBg: "bg-sky-50 hover:bg-sky-100", doneText: "text-sky-700", doneDot: "bg-sky-600", stroke: "stroke-sky-500", eyebrow: "text-sky-600", dot: "bg-sky-500" },
  speaking: { name: "Speaking", active: "bg-orange-500", doneBg: "bg-orange-50 hover:bg-orange-100", doneText: "text-orange-700", doneDot: "bg-orange-500", stroke: "stroke-orange-500", eyebrow: "text-orange-600", dot: "bg-orange-500" },
  writing: { name: "Writing", active: "bg-emerald-600", doneBg: "bg-emerald-50 hover:bg-emerald-100", doneText: "text-emerald-700", doneDot: "bg-emerald-600", stroke: "stroke-emerald-500", eyebrow: "text-emerald-600", dot: "bg-emerald-500" },
};

/** 복습 여정 진행 바 (모든 영역 공통). 지나온 단계로만 되돌아갈 수 있다. */
export function Stepper({
  steps,
  current,
  onJump,
  accent = "reading",
}: {
  steps: string[];
  current: number;
  onJump: (i: number) => void;
  accent?: AccentKey;
}) {
  const A = ACCENTS[accent];
  return (
    <ol className="flex items-center gap-1 overflow-x-auto pb-1" aria-label="복습 단계">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              disabled={i > current}
              onClick={() => onJump(i)}
              className={[
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                active
                  ? `${A.active} text-white shadow-sm`
                  : done
                    ? `${A.doneBg} ${A.doneText}`
                    : "bg-slate-100 text-slate-400",
              ].join(" ")}
            >
              <span
                className={[
                  "grid h-4 w-4 place-items-center rounded-full text-[10px]",
                  active ? "bg-white/25" : done ? `${A.doneDot} text-white` : "bg-slate-200",
                ].join(" ")}
              >
                {done ? <Check className="h-2.5 w-2.5" /> : i + 1}
              </span>
              <span className={active ? "" : "hidden lg:inline"}>{label}</span>
            </button>
            {i < steps.length - 1 && <span className="h-px w-3 bg-slate-300" />}
          </li>
        );
      })}
    </ol>
  );
}

/** 점수 링 */
export function ScoreRing({ value, total, label, accent = "reading" }: { value: number; total: number; label?: string; accent?: AccentKey }) {
  const pct = total > 0 ? value / total : 0;
  const r = 38;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="10" className="stroke-slate-100" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          className={`${ACCENTS[accent].stroke} transition-all duration-700`}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-2xl font-bold text-slate-900">
            {value}
            <span className="text-sm font-medium text-slate-400">/{total}</span>
          </div>
          {label && <div className="text-[10px] font-medium text-slate-500">{label}</div>}
        </div>
      </div>
    </div>
  );
}

/** 작은 알약 */
export function Pill({
  tone = "slate",
  children,
}: {
  tone?: "slate" | "indigo" | "rose" | "emerald" | "amber";
  children: React.ReactNode;
}) {
  const tones = {
    slate: "bg-slate-100 text-slate-600",
    indigo: "bg-indigo-50 text-indigo-700",
    rose: "bg-rose-50 text-rose-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-800",
  } as const;
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>{children}</span>;
}
