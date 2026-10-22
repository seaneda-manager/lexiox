"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { selectOrg } from "../actions";

const TABS = [
  ["/promo", "오늘"],
  ["/promo/review", "컨펌"],
  ["/promo/write", "문구 생성"],
  ["/promo/calendar", "홍보 캘린더"],
  ["/promo/leads", "상담·문의"],
  ["/promo/stats", "성과"],
  ["/promo/trends", "트렌드"],
  ["/promo/channels", "채널·자동화"],
  ["/promo/settings", "학원 정보"],
] as const;

export function PromoNav({ pendingCount = 0 }: { pendingCount?: number }) {
  const path = usePathname();
  return (
    <nav className="-mb-px flex gap-0.5 overflow-x-auto [scrollbar-width:none]" aria-label="홍보센터 메뉴">
      {TABS.map(([href, label]) => {
        const active = href === "/promo" ? path === "/promo" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex-none border-b-[3px] px-3 pb-2.5 pt-2 text-sm font-semibold ${
              active ? "border-amber-400 text-white" : "border-transparent text-emerald-100/70 hover:text-white"
            }`}
          >
            {label}
            {href === "/promo/review" && pendingCount > 0 && (
              <span className="ml-1 rounded-full bg-amber-400 px-1.5 text-[11px] font-bold text-amber-950">{pendingCount}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function OrgSwitcher({ orgs, current }: { orgs: { id: string; name: string }[]; current: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (orgs.length < 2) return null;
  return (
    <select
      id="promo_org"
      aria-label="가맹점 선택"
      disabled={pending}
      value={current}
      onChange={(e) =>
        start(async () => {
          await selectOrg(e.target.value);
          router.refresh();
        })
      }
      className="max-w-[180px] rounded-md border border-emerald-700 bg-emerald-900 px-2 py-1 text-xs text-white"
    >
      {orgs.map((o) => (
        <option key={o.id} value={o.id}>{o.name}</option>
      ))}
    </select>
  );
}
