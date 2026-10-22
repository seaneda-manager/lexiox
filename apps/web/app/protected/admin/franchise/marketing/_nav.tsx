import Link from "next/link";

const TABS = [
  ["/admin/franchise/marketing", "가맹점 홍보 현황"],
  ["/admin/franchise/marketing/branches", "가맹점·원장 관리"],
  ["/admin/franchise/marketing/brand", "브랜드 가이드"],
  ["/admin/franchise/marketing/campaigns", "시즌 캠페인"],
] as const;

export function HqNav({ active }: { active: string }) {
  return (
    <div className="space-y-3">
      <div>
        <Link href="/admin/franchise" className="text-xs text-slate-500 hover:underline">← 가맹점 관리</Link>
        <h1 className="mt-1 text-xl font-bold">홍보센터 (본사)</h1>
        <p className="mt-1 text-sm text-neutral-500">가맹점 원장님들이 쓰는 홍보센터(/promo)의 본사 관리 화면이에요.</p>
      </div>
      <nav className="flex flex-wrap gap-2">
        {TABS.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              active === href ? "border-emerald-900 bg-emerald-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
