import type { ReactNode } from "react";
import { CHANNEL_COLORS } from "@/lib/promo/constants";

export function PageHead({ title, desc, right }: { title: string; desc?: string; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900">{title}</h1>
        {desc && <p className="mt-1 max-w-2xl text-sm text-slate-500">{desc}</p>}
      </div>
      {right}
    </div>
  );
}

export function Panel({ title, right, children, className = "" }: { title?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-xl border border-slate-200 bg-white p-4 ${className}`}>
      {(title || right) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Kpis({ items }: { items: { label: string; value: ReactNode; unit?: string }[] }) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-white sm:grid-cols-4">
      {items.map((k, i) => (
        <div key={k.label} className={`p-4 ${i % 2 === 0 ? "border-r" : ""} sm:border-r ${i < 2 ? "border-b sm:border-b-0" : ""} border-slate-200 last:border-r-0`}>
          <div className="text-xs text-slate-500">{k.label}</div>
          <div className="mt-0.5 text-2xl font-extrabold tabular-nums text-slate-900">
            {k.value}
            {k.unit && <span className="ml-0.5 text-sm font-semibold text-slate-400">{k.unit}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-3 text-sm text-slate-500">{children}</p>;
}

export function Pill({ children, tone = "bg-slate-100 text-slate-600" }: { children: ReactNode; tone?: string }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>{children}</span>;
}

export function Dot({ colorIdx }: { colorIdx?: number | null }) {
  const c = CHANNEL_COLORS[(colorIdx ?? 5) % CHANNEL_COLORS.length];
  return <span className={`mt-1.5 inline-block h-2.5 w-2.5 flex-none rounded-full ${c}`} />;
}

export function Bars({ rows, unit = "건" }: { rows: { label: string; value: number }[]; unit?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="grid gap-2.5">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[88px_1fr_56px] items-center gap-2.5 text-[13px]">
          <span className="truncate text-slate-700" title={r.label}>{r.label}</span>
          <span className="h-3.5 overflow-hidden rounded bg-slate-100">
            <span className="block h-full rounded bg-emerald-700" style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="text-right font-mono tabular-nums text-slate-700">{r.value}{unit}</span>
        </div>
      ))}
    </div>
  );
}

export const inputCls =
  "w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[15px] text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20";
export const labelCls = "grid gap-1 text-[13px] font-medium text-slate-500";
export const btn =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:border-emerald-600 disabled:opacity-50 disabled:hover:border-slate-200";
export const btnPri =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-800 bg-emerald-800 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-50";
export const btnChalk =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-400 bg-amber-400 px-3 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-300 disabled:opacity-50";
export const btnSm = "!px-2.5 !py-1.5 !text-[13px]";
