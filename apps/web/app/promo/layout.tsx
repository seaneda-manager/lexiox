import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPromoContext } from "@/lib/promo/context";
import { OrgSwitcher, PromoNav } from "./_components/PromoNav";

export const dynamic = "force-dynamic";
export const metadata = { title: "학원 홍보센터 | LEXiOX" };

// 가맹점 원장용 홍보센터. 학생 학습 화면과 분리된 가벼운 레이아웃을 쓴다.
export default async function PromoLayout({ children }: { children: ReactNode }) {
  const ctx = await getPromoContext();
  if (!ctx) redirect("/auth/login?next=/promo");

  if (!ctx.org) {
    return (
      <main className="mx-auto grid min-h-screen max-w-lg place-content-center gap-3 px-4 text-center">
        <h1 className="text-xl font-extrabold text-slate-900">연결된 가맹점이 없어요</h1>
        <p className="text-sm text-slate-500">
          홍보센터는 가맹점 원장·실장 계정으로 쓸 수 있어요. 본사에 가맹점 연결을 요청해주세요.
        </p>
        {ctx.isHq && (
          <Link href="/admin/franchise/marketing/branches" className="text-sm font-semibold text-emerald-700 underline">
            가맹점 만들러 가기
          </Link>
        )}
      </main>
    );
  }

  const { count: pendingCount } = await ctx.supabase
    .from("promo_posts")
    .select("id", { count: "exact", head: true })
    .eq("org_id", ctx.org.id)
    .eq("status", "pending");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 bg-emerald-950 text-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pb-1 pt-3">
            <span className="text-base font-extrabold tracking-tight">{ctx.org.name}</span>
            <span className="text-xs text-emerald-200/80">홍보센터</span>
            <div className="ml-auto flex items-center gap-2">
              <OrgSwitcher orgs={ctx.orgs} current={ctx.org.id} />
              {ctx.isHq && (
                <Link href="/admin/franchise/marketing" className="rounded-md border border-emerald-700 px-2 py-1 text-xs text-emerald-100 hover:text-white">
                  본사 화면
                </Link>
              )}
            </div>
          </div>
          <PromoNav pendingCount={pendingCount ?? 0} />
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl gap-5 px-4 pb-16 pt-5">{children}</main>
    </div>
  );
}
