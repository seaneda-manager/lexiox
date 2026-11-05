/**
 * 오늘 현황 보드 — 원장 홈 / 선생님 홈이 같이 쓰는 구성 요소.
 *
 * 설계 원칙 (dataviz):
 *  - 히어로 숫자는 화면에 하나. 나머지는 같은 무게의 지표 타일.
 *  - 상태 색은 아이콘 + 라벨과 함께만 쓴다 (색만으로 의미를 전하지 않는다). 숫자·글자는 기본 글자색.
 *  - 급한 일부터 정렬한 "처리할 일" 목록 → 바로 이동. 문제없는 항목은 한 줄로 접는다.
 * 서버 컴포넌트에서 그대로 쓸 수 있다 (상태/이벤트 없음).
 */

import Link from "next/link";
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronRight, Info } from "lucide-react";

// 상태 색 (고정 팔레트: good / warning / serious / critical)
export const STATUS = {
  good: { color: "#0ca30c", label: "정상" },
  warning: { color: "#fab219", label: "주의" },
  serious: { color: "#ec835a", label: "확인 필요" },
  critical: { color: "#d03b3b", label: "급함" },
} as const;

export type Severity = keyof typeof STATUS | "info";

export const SEVERITY_RANK: Record<Severity, number> = { critical: 0, serious: 1, warning: 2, info: 3, good: 4 };

export const tint = (hex: string, alpha = "1f") => `${hex}${alpha}`;

export type ActionItem = {
  key: string;
  /** null = 집계 실패 */
  count: number | null;
  title: string;
  desc: string;
  severity: Severity;
  href: string;
  cta: string;
  /** '문제 없음' 줄에 쓰는 짧은 이름 */
  okLabel: string;
  /** 개수 뒤에 붙는 단위 (개/건/명) */
  unit?: string;
};

/** 항목들을 "처리할 일(급한 순) / 문제없음 / 집계 실패"로 나눈다. */
export function splitActionItems(items: ActionItem[]) {
  const todo = items
    .filter((i) => i.count != null && i.count > 0)
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
  const failed = items.filter((i) => i.count == null);
  const clear = items.filter((i) => i.count === 0);
  return { todo, failed, clear };
}

/** 히어로("오늘 확인할 일 N가지") + 처리할 일 목록 */
export function ActionBoard({
  heroLabel = "오늘 확인할 일",
  todo,
  failed,
  clear,
}: {
  heroLabel?: string;
  todo: ActionItem[];
  failed: ActionItem[];
  clear: ActionItem[];
}) {
  const top = todo[0];
  return (
    <section className="grid gap-4 lg:grid-cols-12">
      <div className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-6 lg:col-span-5">
        <div>
          <p className="text-sm font-semibold text-neutral-500">{heroLabel}</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className="text-[72px] font-semibold leading-none tracking-tight text-neutral-900"
              style={{ fontVariantNumeric: "proportional-nums" }}
            >
              {todo.length}
            </span>
            <span className="text-xl font-semibold text-neutral-500">가지</span>
          </div>
        </div>
        <div className="mt-5">
          {top ? (
            <p className="text-sm leading-relaxed text-neutral-600">
              가장 먼저 확인할 일
              <br />
              <span className="font-semibold text-neutral-900">
                {top.title} {top.count}
                {top.unit ?? ""}
              </span>
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-sm text-neutral-600">
              <CheckCircle2 className="h-4 w-4" style={{ color: STATUS.good.color }} aria-hidden />
              모두 처리했어요. 오늘은 여기까지!
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white lg:col-span-7">
        <div className="border-b border-neutral-100 px-5 py-3.5">
          <h2 className="text-sm font-bold text-neutral-900">지금 처리할 일</h2>
        </div>
        <ul className="divide-y divide-neutral-100">
          {todo.map((i) => (
            <li key={i.key}>
              <Link
                href={i.href}
                className="group flex items-center gap-3 px-5 py-3.5 hover:bg-neutral-50 focus:outline-none focus-visible:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
              >
                <SeverityIcon severity={i.severity} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-neutral-900">{i.title}</span>
                  <span className="block truncate text-xs text-neutral-500">{i.desc}</span>
                </span>
                <span className="shrink-0 text-lg font-semibold tabular-nums text-neutral-900">{i.count}</span>
                <span className="hidden shrink-0 items-center gap-0.5 text-xs font-semibold text-neutral-500 group-hover:text-neutral-900 sm:inline-flex">
                  {i.cta}
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
          {todo.length === 0 && failed.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-neutral-400">처리할 일이 없어요.</li>
          )}
          {failed.map((i) => (
            <li key={i.key} className="flex items-center gap-3 px-5 py-3 text-xs text-neutral-500">
              <Info className="h-4 w-4 shrink-0" aria-hidden />
              {i.title}: 불러오지 못했어요
            </li>
          ))}
        </ul>
        {clear.length > 0 && (
          <div className="flex items-start gap-2 border-t border-neutral-100 bg-neutral-50/60 px-5 py-3 text-xs text-neutral-500">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: STATUS.good.color }} aria-hidden />
            <span>문제 없음 · {clear.map((c) => c.okLabel).join(" · ")}</span>
          </div>
        )}
      </div>
    </section>
  );
}

export function SeverityIcon({ severity }: { severity: Severity }) {
  const base = "flex h-8 w-8 shrink-0 items-center justify-center rounded-full";
  if (severity === "info") {
    return (
      <span className={`${base} bg-neutral-100`}>
        <Info className="h-4 w-4 text-neutral-500" aria-hidden />
        <span className="sr-only">알림</span>
      </span>
    );
  }
  const s = STATUS[severity];
  const Icon = severity === "critical" ? AlertCircle : severity === "good" ? CheckCircle2 : AlertTriangle;
  return (
    <span className={base} style={{ background: tint(s.color) }}>
      <Icon className="h-4 w-4" style={{ color: s.color }} aria-hidden />
      <span className="sr-only">{s.label}</span>
    </span>
  );
}

/** 상태 칩: 아이콘 + 라벨 (색만으로 의미를 전하지 않는다). 글자는 기본 글자색. */
export function StatusChip({ severity, label }: { severity: Severity; label: string }) {
  const s = severity === "info" ? null : STATUS[severity];
  const Icon =
    severity === "critical" ? AlertCircle : severity === "good" ? CheckCircle2 : severity === "info" ? Info : AlertTriangle;
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold text-neutral-800"
      style={
        s ? { background: tint(s.color, "14"), borderColor: tint(s.color, "55") } : { background: "#f5f5f4", borderColor: "#e7e5e4" }
      }
    >
      <Icon className="h-3.5 w-3.5" style={s ? { color: s.color } : undefined} aria-hidden />
      {label}
    </span>
  );
}

/** 얇은 진행 막대: 채움은 상태 색, 비어 있는 부분은 같은 색의 옅은 단계 */
export function Meter({ pct, severity, label }: { pct: number; severity: Severity; label: string }) {
  const color = severity === "info" ? "#a8a29e" : STATUS[severity].color;
  return (
    <div
      className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full"
      style={{ background: tint(color, "2e") }}
      role="img"
      aria-label={label}
      title={label}
    >
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
    </div>
  );
}

export function StatTile({
  label,
  value,
  unit,
  sub,
  meter,
}: {
  label: string;
  value: string;
  unit?: string;
  sub: string;
  meter?: { pct: number; severity: Severity };
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="text-xs font-semibold text-neutral-500">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span
          className="text-3xl font-semibold tracking-tight text-neutral-900"
          style={{ fontVariantNumeric: "proportional-nums" }}
        >
          {value}
        </span>
        {unit ? <span className="text-sm font-semibold text-neutral-500">{unit}</span> : null}
      </div>
      {meter ? <Meter pct={meter.pct} severity={meter.severity} label={`${label} ${meter.pct}%`} /> : null}
      <div className="mt-1.5 text-xs leading-snug text-neutral-500">{sub}</div>
    </div>
  );
}

export function PanelHeader({ title, href, cta }: { title: string; href: string; cta: string }) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3.5">
      <h2 className="text-sm font-bold text-neutral-900">{title}</h2>
      <Link href={href} className="inline-flex items-center gap-0.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900">
        {cta}
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  );
}

export function Empty({ text, good = false }: { text: string; good?: boolean }) {
  return (
    <p className="flex items-center justify-center gap-1.5 px-5 py-10 text-sm text-neutral-400">
      {good ? <CheckCircle2 className="h-4 w-4" style={{ color: STATUS.good.color }} aria-hidden /> : null}
      {text}
    </p>
  );
}
