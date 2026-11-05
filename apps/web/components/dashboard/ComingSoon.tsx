/**
 * "준비 중" 안내 화면 — 아직 만들지 않은 기능을 가짜 데이터로 채우는 대신 솔직하게 보여준다.
 * 무엇이 생길지(예정 기능)와 지금 쓸 수 있는 대안을 알려 준다. 서버 컴포넌트.
 */

import Link from "next/link";
import { ArrowLeft, Check, type LucideIcon } from "lucide-react";

export default function ComingSoon({
  icon: Icon,
  title,
  description,
  features,
  backHref,
  backLabel,
  note,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  /** 예정 기능 목록 (2~4개) */
  features: string[];
  backHref: string;
  backLabel: string;
  /** 지금 상태나 대안 한 줄 */
  note?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-500 hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {backLabel}
      </Link>

      <div className="rounded-2xl border border-neutral-200 bg-white p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
            <Icon className="h-6 w-6 text-neutral-600" aria-hidden />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-neutral-900">{title}</h1>
              <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 text-xs font-semibold text-neutral-600">
                준비 중
              </span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">{description}</p>
          </div>
        </div>

        <div className="mt-6 border-t border-neutral-100 pt-5">
          <p className="text-xs font-semibold text-neutral-500">이런 기능이 들어와요</p>
          <ul className="mt-3 space-y-2.5">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-neutral-700">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {note ? <p className="mt-6 rounded-xl bg-neutral-50 px-4 py-3 text-xs leading-relaxed text-neutral-500">{note}</p> : null}
      </div>
    </div>
  );
}
