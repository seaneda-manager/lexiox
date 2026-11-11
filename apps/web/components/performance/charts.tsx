"use client";
// 의존성 없는 가벼운 SVG 차트 (레이더 / 추이선 / 스파크라인 / 링)
import React from "react";

export const SECTION_COLOR: Record<string, string> = {
  reading: "#2563eb",
  listening: "#0d9488",
  speaking: "#d97706",
  writing: "#7c3aed",
  vocab: "#db2777",
  grammar: "#4f46e5",
};

/* ───── Ring (원형 게이지) ───── */
export function Ring({ value, color, size = 64 }: { value: number | null; color: string; size?: number }) {
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  const v = value ?? 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={value === null ? "기록 없음" : `${value}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={6} />
      {value !== null && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={`${(v / 100) * c} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize={size * 0.26} fontWeight={700} fill="#0f172a">
        {value === null ? "–" : value}
      </text>
    </svg>
  );
}

/* ───── Sparkline ───── */
export function Sparkline({ values, color, width = 96, height = 28 }: { values: number[]; color: string; width?: number; height?: number }) {
  if (values.length < 2) return <div style={{ width, height }} className="text-[10px] text-slate-400 flex items-center">추이 없음</div>;
  const step = width / (values.length - 1);
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(height - 3 - (v / 100) * (height - 6)).toFixed(1)}`);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1].split(",")[0]} cy={pts[pts.length - 1].split(",")[1]} r={3} fill={color} />
    </svg>
  );
}

/* ───── Radar ───── */
export function Radar({ axes }: { axes: { label: string; value: number | null }[] }) {
  const size = 260;
  const cx = size / 2;
  const cy = size / 2;
  const R = 90;
  const n = axes.length;
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i: number, v: number) => [cx + Math.cos(angle(i)) * R * (v / 100), cy + Math.sin(angle(i)) * R * (v / 100)];
  const ring = (v: number) => axes.map((_, i) => pt(i, v).join(",")).join(" ");
  const poly = axes.map((a, i) => pt(i, a.value ?? 0).join(",")).join(" ");
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[300px] mx-auto" role="img" aria-label="분야별 레이더 차트">
      {[25, 50, 75, 100].map((v) => (
        <polygon key={v} points={ring(v)} fill="none" stroke="#e2e8f0" strokeWidth={1} />
      ))}
      {axes.map((_, i) => {
        const [x, y] = pt(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e2e8f0" />;
      })}
      <polygon points={poly} fill="rgba(37,99,235,0.18)" stroke="#2563eb" strokeWidth={2} strokeLinejoin="round" />
      {axes.map((a, i) => {
        const [x, y] = pt(i, a.value ?? 0);
        const [lx, ly] = pt(i, 128);
        return (
          <g key={a.label}>
            <circle cx={x} cy={y} r={3.5} fill={a.value === null ? "#cbd5e1" : "#2563eb"} />
            <text x={lx} y={ly} fontSize={11} fontWeight={600} fill="#334155" textAnchor="middle" dominantBaseline="central">
              {a.label}
            </text>
            <text x={lx} y={ly + 13} fontSize={10} fill="#64748b" textAnchor="middle" dominantBaseline="central">
              {a.value === null ? "–" : `${a.value}%`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ───── 시계열 추이선 (여러 시리즈) ───── */
export type TrendSeries = { key: string; label: string; color: string; points: { t: number; v: number }[] };

export function TrendChart({ series, height = 200 }: { series: TrendSeries[]; height?: number }) {
  const all = series.flatMap((s) => s.points);
  if (all.length < 2) {
    return <div className="h-32 grid place-items-center text-sm text-slate-400">추이를 그리려면 2회 이상의 기록이 필요합니다.</div>;
  }
  const W = 640;
  const padL = 32;
  const padR = 12;
  const padT = 10;
  const padB = 24;
  const tMin = Math.min(...all.map((p) => p.t));
  const tMax = Math.max(...all.map((p) => p.t));
  const span = Math.max(tMax - tMin, 1);
  const x = (t: number) => padL + ((t - tMin) / span) * (W - padL - padR);
  const y = (v: number) => padT + (1 - v / 100) * (height - padT - padB);
  const fmt = (t: number) => {
    const d = new Date(t);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full" role="img" aria-label="시계열 추이">
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeDasharray={v === 0 ? "" : "3 3"} />
          <text x={padL - 6} y={y(v)} fontSize={10} fill="#94a3b8" textAnchor="end" dominantBaseline="central">
            {v}
          </text>
        </g>
      ))}
      <text x={padL} y={height - 6} fontSize={10} fill="#94a3b8">{fmt(tMin)}</text>
      <text x={W - padR} y={height - 6} fontSize={10} fill="#94a3b8" textAnchor="end">{fmt(tMax)}</text>
      {series.map((s) => {
        const pts = [...s.points].sort((a, b) => a.t - b.t);
        return (
          <g key={s.key}>
            {pts.length > 1 && (
              <polyline
                points={pts.map((p) => `${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ")}
                fill="none"
                stroke={s.color}
                strokeWidth={2.25}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
            {pts.map((p, i) => (
              <circle key={i} cx={x(p.t)} cy={y(p.v)} r={3.25} fill="#fff" stroke={s.color} strokeWidth={2}>
                <title>{`${s.label} ${fmt(p.t)} · ${p.v}%`}</title>
              </circle>
            ))}
          </g>
        );
      })}
    </svg>
  );
}
