"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Section = "reading" | "listening" | "speaking" | "writing";
export type TestRow = { id: string; label: string; createdAt: string | null; updatedAt: string | null; assigned: boolean };

type Issue = { severity: "error" | "warn"; where: string; message: string; source: "structure" | "ai" };
type Report = {
  verdict: "pass" | "warn" | "fail";
  errorCount: number;
  warnCount: number;
  blind: { total: number; correct: number } | null;
  aiError: string | null;
  issues: Issue[];
};

const TABS: { key: Section; label: string }[] = [
  { key: "reading", label: "Reading" },
  { key: "listening", label: "Listening" },
  { key: "speaking", label: "Speaking" },
  { key: "writing", label: "Writing" },
];

const VERDICT_STYLE = {
  pass: "bg-emerald-100 text-emerald-800",
  warn: "bg-amber-100 text-amber-800",
  fail: "bg-rose-100 text-rose-800",
} as const;
const VERDICT_LABEL = { pass: "통과", warn: "확인 필요", fail: "오류" } as const;

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "-");

export default function ReviewClient({ initial }: { initial: Record<Section, TestRow[]> }) {
  const router = useRouter();
  const [tab, setTab] = useState<Section>("reading");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reports, setReports] = useState<Record<string, Report | { error: string } | "loading">>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [before, setBefore] = useState("");

  const rows = initial[tab];

  const switchTab = (t: Section) => {
    setTab(t);
    setSelected(new Set());
    setOpenId(null);
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const selectBefore = () => {
    if (!before) return;
    setSelected(new Set(rows.filter((r) => (r.createdAt ?? "") < before).map((r) => r.id)));
  };

  const proof = async (id: string) => {
    setReports((p) => ({ ...p, [id]: "loading" }));
    setOpenId(id);
    try {
      const res = await fetch("/api/admin/updated-toefl/proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: tab, id }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "검수 실패");
      setReports((p) => ({ ...p, [id]: data }));
    } catch (e) {
      setReports((p) => ({ ...p, [id]: { error: e instanceof Error ? e.message : "검수 실패" } }));
    }
  };

  const proofSelected = async () => {
    // 동시에 너무 많이 보내지 않도록 2개씩
    const ids = [...selected];
    for (let i = 0; i < ids.length; i += 2) await Promise.all(ids.slice(i, i + 2).map(proof));
  };

  const remove = async () => {
    const targets = rows.filter((r) => selected.has(r.id));
    if (targets.length === 0) return;
    const names = targets.slice(0, 5).map((t) => `· ${t.label}${t.assigned ? " 📌배정됨" : ""}`).join("\n");
    const assignedCount = targets.filter((t) => t.assigned).length;
    const warn = assignedCount > 0 ? `\n\n⚠ 배정된 시험 ${assignedCount}개는 학생 배정이 자동으로 취소됩니다.` : "";
    if (!confirm(`${targets.length}개 시험을 삭제할까요? (되돌릴 수 없습니다)\n\n${names}${targets.length > 5 ? "\n…" : ""}${warn}`)) return;

    setDeleting(true);
    try {
      const res = await fetch("/api/admin/updated-toefl/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: tab, ids: targets.map((t) => t.id), unassign: true }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "삭제 실패");
      if (data.unassignedCount) alert(`학생 배정 ${data.unassignedCount}건을 취소하고 삭제했습니다.`);
      setSelected(new Set());
      router.refresh();
    } catch (e) {
      alert("삭제 실패: " + (e instanceof Error ? e.message : "Unknown error"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => switchTab(t.key)}
            className={`px-3 py-2 text-xs font-semibold ${
              tab === t.key ? "border-b-2 border-violet-600 text-violet-700" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {t.label} ({initial[t.key].length})
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <label className="flex items-center gap-1 text-gray-600">
          생성일이
          <input type="date" value={before} onChange={(e) => setBefore(e.target.value)} className="rounded border px-1.5 py-1" />
          이전
        </label>
        <button onClick={selectBefore} disabled={!before} className="rounded border px-2 py-1 font-medium disabled:opacity-40">
          해당 시험 선택
        </button>
        <button
          onClick={() => setSelected(new Set(rows.filter((r) => !r.assigned).map((r) => r.id)))}
          className="rounded border px-2 py-1 font-medium"
        >
          배정 안 된 시험 전체 선택
        </button>
        <div className="ml-auto flex gap-2">
          <button
            onClick={proofSelected}
            disabled={selected.size === 0}
            className="rounded-lg bg-violet-600 px-3 py-1.5 font-semibold text-white disabled:opacity-40"
          >
            선택 AI 검수 ({selected.size})
          </button>
          <button
            onClick={remove}
            disabled={selected.size === 0 || deleting}
            className="rounded-lg bg-rose-600 px-3 py-1.5 font-semibold text-white disabled:opacity-40"
          >
            {deleting ? "삭제 중…" : `선택 삭제 (${selected.size})`}
          </button>
        </div>
      </div>

      <div className="divide-y overflow-hidden rounded-xl border bg-white shadow-sm">
        {rows.length === 0 && <div className="px-4 py-8 text-center text-xs text-gray-500">시험이 없습니다.</div>}
        {rows.map((r) => {
          const rep = reports[r.id];
          const done = rep && rep !== "loading" && !("error" in rep) ? rep : null;
          return (
            <div key={r.id} className="px-4 py-3 text-xs">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selected.has(r.id)}
                  onChange={() => toggle(r.id)}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-gray-900">{r.label || "(제목 없음)"}</div>
                  <div className="font-mono text-[10px] text-gray-400">
                    {r.id.slice(0, 8)}… · 생성 {day(r.createdAt)} · 수정 {day(r.updatedAt)}
                  </div>
                </div>
                {r.assigned && <span className="rounded-full bg-gray-900 px-2 py-0.5 text-[10px] text-white">📌 배정됨</span>}
                {done && (
                  <button
                    onClick={() => setOpenId(openId === r.id ? null : r.id)}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${VERDICT_STYLE[done.verdict]}`}
                  >
                    {VERDICT_LABEL[done.verdict]} · 오류 {done.errorCount} / 확인 {done.warnCount}
                  </button>
                )}
                <button
                  onClick={() => proof(r.id)}
                  disabled={rep === "loading"}
                  className="rounded-lg border border-violet-300 px-2.5 py-1 font-medium text-violet-700 hover:bg-violet-50 disabled:opacity-50"
                >
                  {rep === "loading" ? "검수 중…" : done ? "다시 검수" : "AI 검수"}
                </button>
              </div>

              {openId === r.id && rep && rep !== "loading" && (
                <div className="mt-2 rounded-lg bg-gray-50 p-3">
                  {"error" in rep ? (
                    <p className="text-rose-600">{rep.error}</p>
                  ) : (
                    <>
                      {rep.blind && (
                        <p className="mb-2 text-gray-600">
                          AI 응시자 blind 풀이: {rep.blind.correct}/{rep.blind.total} 일치
                          <span className="text-gray-400"> (불일치 문항은 정답키 오류·모호한 문항 후보)</span>
                        </p>
                      )}
                      {rep.aiError && <p className="mb-2 text-amber-700">AI 단계 실패(구조 검사만 반영): {rep.aiError}</p>}
                      {rep.issues.length === 0 ? (
                        <p className="text-emerald-700">발견된 문제가 없습니다.</p>
                      ) : (
                        <ul className="space-y-1">
                          {rep.issues.map((i, n) => (
                            <li key={n} className="flex gap-2">
                              <span className={i.severity === "error" ? "text-rose-600" : "text-amber-600"}>
                                {i.severity === "error" ? "●" : "▲"}
                              </span>
                              <span>
                                <b className="text-gray-800">{i.where}</b>{" "}
                                <span className="text-gray-400">[{i.source === "ai" ? "AI" : "구조"}]</span> {i.message}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
