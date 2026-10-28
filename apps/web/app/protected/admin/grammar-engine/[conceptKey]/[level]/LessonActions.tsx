"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SectionInfo = { key: string; label: string; count: number; prompt: string };

type Props = {
  conceptKey: string;
  level: number;
  exists: boolean;
  isFinal: boolean;
  lessonJson: string;
  sections: SectionInfo[];
  reviewPrompt: string;
};

export default function LessonActions({ conceptKey, level, exists, isFinal, lessonJson, sections, reviewPrompt }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [json, setJson] = useState(lessonJson);
  const [pasted, setPasted] = useState<Record<string, string>>({});

  async function call(action: string, extra: Record<string, unknown> = {}, okText = "완료"): Promise<boolean> {
    setBusy(action + (extra.section ?? ""));
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
        return false;
      }
      setMsg({ ok: true, text: action === "finalize" ? `확정했습니다. 문항 ${data.itemCount}개를 문항 은행에 복사했습니다.` : okText });
      router.refresh();
      return true;
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message ?? "요청 실패" });
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMsg({ ok: true, text: `${label} 프롬프트를 복사했습니다. 외부 AI 채팅에 붙여 넣으세요.` });
    } catch {
      setMsg({ ok: false, text: "복사에 실패했습니다. 아래 프롬프트 칸에서 직접 선택해 복사하세요." });
    }
  }

  const btn = "rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50";
  const allFilled = sections.every((s) => s.count > 0);

  return (
    <div className="space-y-4">
      {!isFinal && (
        <div className="space-y-3">
          <p className="text-xs text-neutral-500">
            섹션마다 [프롬프트 복사] → 외부 AI(구독 중인 채팅)에 붙여 넣기 → 나온 JSON 을 아래 칸에 붙여 넣고 [적용]. 앞 섹션을 먼저 채우면 뒤 섹션 프롬프트에 그 규칙이 자동으로 들어갑니다.
          </p>
          {sections.map((s) => (
            <details key={s.key} open={s.count === 0} className="rounded-2xl border bg-white p-4">
              <summary className="cursor-pointer select-none text-sm font-bold text-neutral-700">
                {s.label}{" "}
                <span className={`ml-2 text-xs font-medium ${s.count > 0 ? "text-emerald-600" : "text-rose-500"}`}>
                  {s.count > 0 ? `채워짐 (${s.count})` : "비어 있음"}
                </span>
              </summary>
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => copy(s.prompt, s.label)} className={`${btn} border bg-white hover:bg-neutral-50`}>
                    프롬프트 복사
                  </button>
                </div>
                <textarea
                  value={pasted[s.key] ?? ""}
                  onChange={(e) => setPasted((p) => ({ ...p, [s.key]: e.target.value }))}
                  rows={6}
                  placeholder="외부 AI 가 만든 JSON 을 여기에 붙여 넣으세요"
                  className="w-full rounded-xl border px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-violet-200"
                />
                <button
                  disabled={!!busy || !(pasted[s.key] ?? "").trim()}
                  onClick={async () => {
                    const ok = await call("paste", { section: s.key, text: pasted[s.key] }, `${s.label} 적용했습니다.`);
                    if (ok) setPasted((p) => ({ ...p, [s.key]: "" }));
                  }}
                  className={`${btn} bg-violet-700 text-white hover:bg-violet-800`}
                >
                  {busy === `paste${s.key}` ? "적용 중…" : "적용"}
                </button>
                <details className="text-xs text-neutral-400">
                  <summary className="cursor-pointer">프롬프트 미리보기</summary>
                  <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-neutral-50 p-2 font-sans text-neutral-600">{s.prompt}</pre>
                </details>
              </div>
            </details>
          ))}

          {exists && (
            <details className="rounded-2xl border bg-white p-4">
              <summary className="cursor-pointer select-none text-sm font-bold text-neutral-700">
                5. 검수 (별도 AI 대화 권장){" "}
                {!allFilled && <span className="ml-2 text-xs font-normal text-neutral-400">섹션을 모두 채운 뒤 하세요</span>}
              </summary>
              <div className="mt-3 space-y-2">
                <button onClick={() => copy(reviewPrompt, "검수")} className={`${btn} border bg-white hover:bg-neutral-50`}>
                  검수 프롬프트 복사
                </button>
                <textarea
                  value={pasted.__review ?? ""}
                  onChange={(e) => setPasted((p) => ({ ...p, __review: e.target.value }))}
                  rows={5}
                  placeholder="검수 결과 JSON ({ issues: [...] }) 을 붙여 넣으세요"
                  className="w-full rounded-xl border px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-violet-200"
                />
                <button
                  disabled={!!busy || !(pasted.__review ?? "").trim()}
                  onClick={async () => {
                    const ok = await call("paste-review", { text: pasted.__review }, "검수 결과를 저장했습니다.");
                    if (ok) setPasted((p) => ({ ...p, __review: "" }));
                  }}
                  className={`${btn} bg-violet-700 text-white hover:bg-violet-800`}
                >
                  결과 저장
                </button>
              </div>
            </details>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
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
          <summary className="cursor-pointer select-none text-sm font-bold text-neutral-700">전체 수정 (JSON)</summary>
          <p className="mt-2 text-xs text-neutral-500">
            저장하면 <b>초안 상태로 돌아가고 검수 결과는 지워집니다</b>. 엄격한 형식 검사는 [확정] 때 합니다. (정답 위치는 questions[].answerIndex, 0부터)
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
