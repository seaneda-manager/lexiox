"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  conceptKey: string;
  level: number;
  exists: boolean;
  isFinal: boolean;
  lessonJson: string;
};

export default function LessonActions({ conceptKey, level, exists, isFinal, lessonJson }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [json, setJson] = useState(lessonJson);

  async function call(action: string, extra: Record<string, unknown> = {}, okText = "완료") {
    setBusy(action);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/grammar-engine/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, conceptKey, level, ...extra }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setMsg({ ok: false, text: data.error ?? `실패 (${res.status})` });
      } else {
        setMsg({ ok: true, text: action === "finalize" ? `확정했습니다. 문항 ${data.itemCount}개를 문항 은행에 복사했습니다.` : okText });
        router.refresh();
      }
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message ?? "요청 실패" });
    } finally {
      setBusy(null);
    }
  }

  const btn = "rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {!isFinal && (
          <button
            disabled={!!busy}
            onClick={() => {
              if (exists && !confirm("현재 초안을 버리고 새로 생성할까요?")) return;
              void call("generate", {}, "초안을 생성했습니다.");
            }}
            className={`${btn} bg-violet-700 text-white hover:bg-violet-800`}
          >
            {busy === "generate" ? "생성 중… (1~2분)" : exists ? "다시 생성 (초안 덮어쓰기)" : "AI 생성"}
          </button>
        )}
        {exists && !isFinal && (
          <button disabled={!!busy} onClick={() => call("review", {}, "AI 검수를 마쳤습니다.")} className={`${btn} border bg-white hover:bg-neutral-50`}>
            {busy === "review" ? "검수 중…" : "AI 검수 (별도 패스)"}
          </button>
        )}
        {exists && !isFinal && (
          <button disabled={!!busy} onClick={() => call("finalize")} className={`${btn} bg-emerald-700 text-white hover:bg-emerald-800`}>
            {busy === "finalize" ? "확정 중…" : "✓ 확정"}
          </button>
        )}
        {exists && isFinal && (
          <button disabled={!!busy} onClick={() => call("revert", {}, "초안으로 되돌렸습니다.")} className={`${btn} bg-neutral-500 text-white hover:bg-neutral-600`}>
            초안으로 되돌리기
          </button>
        )}
      </div>

      {msg && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${msg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          {msg.ok ? "" : "⚠️ "}
          {msg.text}
        </div>
      )}

      {exists && !isFinal && (
        <details className="rounded-2xl border bg-white p-5">
          <summary className="cursor-pointer select-none text-sm font-bold text-neutral-700">수정 (JSON)</summary>
          <p className="mt-2 text-xs text-neutral-500">
            저장하면 <b>초안 상태로 돌아가고 AI 검수 결과는 지워집니다</b>. 형식이 틀리면 저장되지 않고 어디가 틀렸는지 알려 줍니다. (정답 위치는 questions[].answerIndex, 0부터)
          </p>
          <textarea
            value={json}
            onChange={(e) => setJson(e.target.value)}
            rows={24}
            className="mt-2 w-full rounded-xl border px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-violet-200"
          />
          <button
            disabled={!!busy}
            onClick={() => {
              let parsed: unknown;
              try {
                parsed = JSON.parse(json);
              } catch (e: any) {
                setMsg({ ok: false, text: `JSON 형식이 올바르지 않습니다: ${e.message}` });
                return;
              }
              void call("save", { lesson: parsed }, "저장했습니다. (초안 상태 — 확인 후 확정하세요)");
            }}
            className={`${btn} mt-2 bg-neutral-900 text-white hover:bg-neutral-800`}
          >
            {busy === "save" ? "저장 중…" : "초안으로 저장"}
          </button>
        </details>
      )}
    </div>
  );
}
