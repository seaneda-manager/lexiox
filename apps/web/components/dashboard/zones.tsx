/**
 * 홈 대시보드 "구역" 구성 요소 — 수업 / 숙제처럼 성격이 다른 일을 화면에서 확실히 나눠 보여 준다.
 *  - ZoneSection : 색 띠 + 이름이 있는 구역 틀 (구역마다 강조색이 달라 한눈에 구분)
 *  - ClickTile   : 누르면 처리 화면으로 가는 숫자 타일. 0이면 회색 + "다 처리했어요 ✓"
 *  - DdayBadge   : D-day를 글자 + 색 농도로 (D-3 이내 진한 빨강, D-7 주황, 그 밖은 회색)
 *  - PlannedCard : 아직 데이터/기능이 없는 위젯의 자리. 숫자·버튼 없이 흐리게 표시
 * 서버 컴포넌트에서 그대로 쓸 수 있다 (상태/이벤트 없음).
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { STATUS, tint, type Severity } from "./board";

export type ZoneTone = "class" | "homework" | "ops" | "system";

const ZONE: Record<ZoneTone, { accent: string; soft: string; label: string }> = {
  class: { accent: "#3b5bdb", soft: "#eef2ff", label: "수업" },
  homework: { accent: "#0f9d7a", soft: "#ecfdf5", label: "숙제" },
  ops: { accent: "#475569", soft: "#f1f5f9", label: "가맹점 운영" },
  system: { accent: "#7c3aed", soft: "#f5f3ff", label: "콘텐츠·시스템" },
};

export function ZoneSection({
  tone,
  title,
  hint,
  icon,
  children,
}: {
  tone: ZoneTone;
  title: string;
  hint: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  const z = ZONE[tone];
  return (
    <section
      aria-label={title}
      className="overflow-hidden rounded-3xl border"
      style={{ borderColor: tint(z.accent, "40"), background: tint(z.accent, "08") }}
    >
      <header
        className="flex items-center gap-3 px-5 py-3.5 sm:px-6"
        style={{ background: z.soft, borderBottom: `1px solid ${tint(z.accent, "30")}` }}
      >
        <span
          className="flex h-8 w-8 items-center justify-center rounded-xl text-white"
          style={{ background: z.accent }}
          aria-hidden
        >
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-neutral-900">{title}</h2>
          <p className="truncate text-xs text-neutral-500">{hint}</p>
        </div>
      </header>
      <div className="space-y-4 p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function ClickTile({
  label,
  count,
  unit = "건",
  sub,
  severity,
  href,
  cta,
  zeroText = "다 처리했어요",
}: {
  label: string;
  /** null = 집계 실패 */
  count: number | null;
  unit?: string;
  sub: string;
  severity: Severity;
  href: string;
  cta: string;
  /** 0일 때 보여 줄 문구 (기본: "다 처리했어요") */
  zeroText?: string;
}) {
  const failed = count == null;
  const zero = count === 0;
  const color = severity === "info" || failed || zero ? null : STATUS[severity].color;

  const body = (
    <div
      className={`h-full rounded-2xl border p-4 transition ${
        zero || failed ? "bg-neutral-50" : "bg-white hover:shadow-sm"
      }`}
      style={color ? { borderColor: tint(color, "66") } : { borderColor: "#e7e5e4" }}
    >
      <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500">
        {color ? (
          <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden />
        ) : null}
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span
          className={`text-3xl font-semibold tracking-tight ${zero || failed ? "text-neutral-400" : "text-neutral-900"}`}
          style={{ fontVariantNumeric: "proportional-nums" }}
        >
          {failed ? "—" : count}
        </span>
        {!failed ? <span className="text-sm font-semibold text-neutral-400">{unit}</span> : null}
      </div>
      {zero ? (
        <div className="mt-1.5 flex items-center gap-1 text-xs font-semibold" style={{ color: STATUS.good.color }}>
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          {zeroText}
        </div>
      ) : failed ? (
        <div className="mt-1.5 text-xs text-neutral-500">불러오지 못했어요</div>
      ) : (
        <>
          <div className="mt-1.5 text-xs leading-snug text-neutral-500">{sub}</div>
          <div className="mt-2 inline-flex items-center gap-0.5 text-xs font-semibold text-neutral-700">
            {cta}
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </div>
        </>
      )}
    </div>
  );

  if (zero || failed) return body;
  return (
    <Link
      href={href}
      className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
    >
      {body}
    </Link>
  );
}

/** 카드 틀: 제목 + (선택) 오른쪽 링크 */
export function Card({
  title,
  href,
  cta,
  children,
}: {
  title: string;
  href?: string;
  cta?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white">
      <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3.5">
        <h3 className="text-sm font-bold text-neutral-900">{title}</h3>
        {href && cta ? (
          <Link
            href={href}
            className="inline-flex items-center gap-0.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900"
          >
            {cta}
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function DdayBadge({ days }: { days: number }) {
  const label = days <= 0 ? (days === 0 ? "D-day" : "진행 중") : `D-${days}`;
  const style =
    days <= 3
      ? { background: "#b42318", color: "#fff" }
      : days <= 7
        ? { background: "#d97706", color: "#fff" }
        : { background: "#f1f1f0", color: "#57534e" };
  return (
    <span
      className="inline-flex min-w-[52px] shrink-0 justify-center rounded-lg px-2 py-1 text-xs font-bold tabular-nums"
      style={style}
    >
      {label}
    </span>
  );
}

/** 아직 기능/데이터가 없는 위젯의 자리 — 숫자·버튼·색 없이 흐리게 */
export function PlannedCard({ title, note }: { title: string; note: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/50 px-4 py-3.5">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-neutral-400">{title}</span>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-400">
          준비 중
        </span>
      </div>
      <p className="mt-1 text-xs text-neutral-400">{note}</p>
    </div>
  );
}
