"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteUnitButton({ unitId, label }: { unitId: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onDelete = async () => {
    if (!confirm(`"${label}" 삭제 — 설명·드릴·학생 진행기록까지 전부 삭제되고 되돌릴 수 없습니다. 계속할까요?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/grammar-2026/unit/${unitId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (e: any) {
      alert("삭제 실패: " + (e?.message ?? e));
      setBusy(false);
    }
  };

  return (
    <button
      onClick={onDelete}
      disabled={busy}
      className="rounded-lg border border-red-200 bg-white px-2 py-1.5 text-[11px] font-medium text-red-500 hover:border-red-400 hover:bg-red-50 disabled:opacity-40"
    >
      {busy ? "…" : "삭제"}
    </button>
  );
}
