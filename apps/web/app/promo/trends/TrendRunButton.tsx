"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "../_components/client-ui";
import { btnChalk } from "../_components/ui";

export function TrendRunButton() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button
        className={btnChalk}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          toast.show("검색 추이를 보고 플랜을 짜는 중이에요. 2~3분 걸려요.");
          try {
            const res = await fetch("/api/promo/trends", { method: "POST" });
            const j = await res.json();
            toast.show(j.ok ? j.message : j.error);
            if (j.ok) router.refresh();
          } catch {
            toast.show("연결이 끊겼어요. 다시 시도해주세요.");
          }
          setBusy(false);
        }}
      >
        {busy ? "분석 중…" : "지금 분석"}
      </button>
      {toast.node}
    </>
  );
}
