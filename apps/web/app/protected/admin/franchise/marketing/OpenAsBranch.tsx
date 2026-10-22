"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { selectOrg } from "@/app/promo/actions";

/** 본사 관리자가 특정 가맹점의 홍보센터를 열어본다 */
export function OpenAsBranch({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          await selectOrg(orgId);
          router.push("/promo");
        })
      }
      className="whitespace-nowrap rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-emerald-600"
    >
      홍보센터 보기
    </button>
  );
}
