"use client";

import { useState } from "react";
import { Panel, btn } from "../_components/ui";

export function InsightClient({ range }: { range: string }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Panel
      title="AI 마케팅 조언"
      right={
        <button
          className={btn}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const res = await fetch("/api/promo/insight", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ range }),
              });
              const j = await res.json();
              setText(j.ok ? j.text : j.error);
            } catch {
              setText("연결이 끊겼어요. 다시 시도해주세요.");
            }
            setBusy(false);
          }}
        >
          {busy ? "분석 중…" : "이 기간 분석 받기"}
        </button>
      }
    >
      {text ? (
        <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-[15px] leading-relaxed">{text}</p>
      ) : (
        <p className="py-2 text-sm text-slate-500">위 수치, 학습 데이터, 이번 달 시즌을 바탕으로 이번 주에 할 일 3가지를 제안해드려요.</p>
      )}
    </Panel>
  );
}
