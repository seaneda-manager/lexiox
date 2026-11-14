"use client";
// 리뷰 관리 표: 선택해서 초안 한꺼번에 만들기(한 건씩 순서대로) · 미리보기 · 공개 / 공개 취소
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type ReviewState = "none" | "draft" | "published";

export interface ManagedRow {
  id: string;
  student: string;
  test: string;
  detail: string;
  at: string;
  state: ReviewState;
  canGenerate: boolean;
  short: boolean;
}

const COST_PER: Record<"writing" | "speaking", { usd: number; krw: number }> = {
  writing: { usd: 0.25, krw: 350 },
  speaking: { usd: 0.13, krw: 180 },
};

const STATE_LABEL: Record<ReviewState, { text: string; cls: string }> = {
  none: { text: "미생성", cls: "bg-slate-100 text-slate-600" },
  draft: { text: "초안", cls: "bg-amber-100 text-amber-800" },
  published: { text: "공개", cls: "bg-emerald-100 text-emerald-800" },
};

async function post(action: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/staff/reviews/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) throw new Error(json.error || "처리하지 못했습니다");
  return json;
}

export default function ReviewManager({ kind, rows }: { kind: "writing" | "speaking"; rows: ManagedRow[] }) {
  const router = useRouter();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState<{ done: number; total: number; current: string } | null>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectable = rows.filter((r) => r.state === "none" && r.canGenerate);
  const toggle = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const allSelected = selectable.length > 0 && selectable.every((r) => sel.has(r.id));

  const generateMany = async (ids: string[]) => {
    if (ids.length === 0) return;
    const cost = COST_PER[kind];
    const ok = window.confirm(
      `${ids.length}건의 초안을 만듭니다. (AI 비용 약 $${(cost.usd * ids.length).toFixed(2)} / 약 ${(cost.krw * ids.length).toLocaleString()}원)\n한 건에 30~60초씩 걸리고, 만든 초안은 학생에게 공개되기 전까지 보이지 않아요.\n\n진행할까요?`,
    );
    if (!ok) return;
    setErrors({});
    for (let i = 0; i < ids.length; i++) {
      const row = rows.find((r) => r.id === ids[i]);
      setRunning({ done: i, total: ids.length, current: row?.student ?? "" });
      try {
        await post("generate", { kind, id: ids[i] });
      } catch (e) {
        setErrors((er) => ({ ...er, [ids[i]]: e instanceof Error ? e.message : "실패" }));
      }
    }
    setRunning(null);
    setSel(new Set());
    router.refresh();
  };

  const rowAction = async (id: string, fn: () => Promise<unknown>) => {
    setRowBusy(id);
    setErrors((er) => ({ ...er, [id]: "" }));
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setErrors((er) => ({ ...er, [id]: e instanceof Error ? e.message : "실패" }));
    } finally {
      setRowBusy(null);
    }
  };

  const previewHref = (id: string) => (kind === "writing" ? `/writing-2026/review/${id}` : `/student/review/speaking/${id}`);

  if (rows.length === 0) {
    return <div className="rounded-xl border bg-white px-6 py-10 text-center text-sm text-slate-400">해당하는 결과가 없습니다.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white px-4 py-3">
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={allSelected}
            disabled={selectable.length === 0 || !!running}
            onChange={() => setSel(allSelected ? new Set() : new Set(selectable.map((r) => r.id)))}
          />
          미생성 전체 선택 ({selectable.length})
        </label>
        <button
          disabled={sel.size === 0 || !!running}
          onClick={() => generateMany([...sel])}
          className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-30"
        >
          선택한 {sel.size}건 초안 만들기
        </button>
        <span className="text-[11px] text-slate-500">
          1건당 약 ${COST_PER[kind].usd.toFixed(2)} (≈{COST_PER[kind].krw}원) · 리뷰{kind === "writing" ? "와 Drill" : ", Drill, 단어시험"}을 한 번에 만들어요
        </span>
        {running && (
          <span className="ml-auto text-xs font-semibold text-amber-700">
            만드는 중 {running.done + 1} / {running.total} · {running.current}
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        {rows.map((r) => {
          const st = STATE_LABEL[r.state];
          const busy = rowBusy === r.id;
          return (
            <div key={r.id} className="flex flex-wrap items-center gap-3 border-b px-4 py-3 text-xs last:border-0">
              <input
                type="checkbox"
                disabled={!(r.state === "none" && r.canGenerate) || !!running}
                checked={sel.has(r.id)}
                onChange={() => toggle(r.id)}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{r.student}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${st.cls}`}>{st.text}</span>
                </div>
                <div className="truncate text-[11px] text-slate-500">
                  {r.test} · {r.at}
                  {r.detail && <> · {r.detail}</>}
                </div>
                {errors[r.id] && <div className="text-[11px] text-rose-600">{errors[r.id]}</div>}
              </div>
              <div className="flex shrink-0 gap-2">
                {r.state === "none" && (
                  <button
                    disabled={busy || !!running || !r.canGenerate}
                    onClick={() => generateMany([r.id])}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    {busy ? "만드는 중…" : "초안 만들기"}
                  </button>
                )}
                {r.state !== "none" && (
                  <Link href={previewHref(r.id)} className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">
                    {r.state === "draft" ? "미리보기·수정" : "보기"}
                  </Link>
                )}
                {r.state === "draft" && (
                  <button
                    disabled={busy || !!running}
                    onClick={() => rowAction(r.id, () => post("publish", { kind, id: r.id, publish: true }))}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
                  >
                    공개
                  </button>
                )}
                {r.state === "published" && (
                  <button
                    disabled={busy || !!running}
                    onClick={() => rowAction(r.id, () => post("publish", { kind, id: r.id, publish: false }))}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    공개 취소
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
