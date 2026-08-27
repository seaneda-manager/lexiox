"use client";

import { useEffect, useMemo, useState } from "react";
import { getOrInitReadinessAction, advanceStageAction, type ReadinessRow } from "../actions";
import { ELEMENT_LABELS, ALL_ELEMENTS, type ReadinessElement } from "@/lib/naesinReadiness/subElements";

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  not_started: { label: "시작 전", className: "bg-neutral-100 text-neutral-500" },
  in_progress: { label: "진행 중", className: "bg-amber-100 text-amber-700" },
  done: { label: "완료", className: "bg-emerald-100 text-emerald-700" },
};

function StagePill({
  status,
  onClick,
}: {
  status: "not_started" | "in_progress" | "done";
  onClick: () => void;
}) {
  const s = STATUS_STYLE[status];
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-semibold transition hover:opacity-80 ${s.className}`}
    >
      {s.label}
    </button>
  );
}

export default function ReadinessClient({ unitId }: { unitId: string }) {
  const [rows, setRows] = useState<ReadinessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    getOrInitReadinessAction({ unitId }).then((res) => {
      if (res.ok) setRows(res.rows);
      else setMsg(`❌ ${res.error}`);
      setLoading(false);
    });
  }, [unitId]);

  const grouped = useMemo(() => {
    const map = new Map<ReadinessElement, ReadinessRow[]>();
    for (const el of ALL_ELEMENTS) map.set(el, []);
    for (const r of rows) {
      if (!map.has(r.element)) map.set(r.element, []);
      map.get(r.element)!.push(r);
    }
    return map;
  }, [rows]);

  const totalReady = rows.filter((r) => r.test_status === "done").length;

  async function handleAdvance(readinessId: string, stage: "perform" | "check" | "test") {
    // optimistic update
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== readinessId) return r;
        const col = `${stage}_status` as const;
        const cur = r[col];
        const next = cur === "not_started" ? "in_progress" : cur === "in_progress" ? "done" : "not_started";
        return { ...r, [col]: next };
      })
    );
    const res = await advanceStageAction({ readinessId, stage });
    if (!res.ok) setMsg(`❌ ${res.error}`);
  }

  if (loading) {
    return <div className="text-sm text-neutral-400">불러오는 중...</div>;
  }

  return (
    <div className="space-y-5">
      {msg && <div className="text-sm text-rose-600">{msg}</div>}

      <div className="rounded-2xl border bg-white p-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-neutral-700">준비 완료(readiness)</span>
        <span className="text-lg font-bold text-sky-700">
          {totalReady} / {rows.length}
        </span>
      </div>

      {ALL_ELEMENTS.map((element) => {
        const items = grouped.get(element) ?? [];
        if (items.length === 0) return null;
        return (
          <section key={element} className="rounded-2xl border bg-white overflow-hidden">
            <div className="px-4 py-3 bg-neutral-50 border-b text-sm font-bold text-neutral-800">
              {ELEMENT_LABELS[element]}
            </div>
            <div className="divide-y">
              {items.map((r) => (
                <div key={r.id} className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-sm text-neutral-700 min-w-[8rem]">{r.sub_element}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-neutral-400 w-10">수행</span>
                    <StagePill status={r.perform_status} onClick={() => handleAdvance(r.id, "perform")} />
                    <span className="text-[11px] text-neutral-400 w-10 text-center">check</span>
                    <StagePill status={r.check_status} onClick={() => handleAdvance(r.id, "check")} />
                    <span className="text-[11px] text-neutral-400 w-10 text-center">test</span>
                    <StagePill status={r.test_status} onClick={() => handleAdvance(r.id, "test")} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
