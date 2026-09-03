"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ASSIGNMENT_KIND_LABEL,
  ASSIGNMENT_STATUS_LABEL,
  type AssignmentItem,
  type AssignmentKind,
  type AssignmentStatus,
} from "@/lib/assignments/types";

const WEEKDAY_LABEL = ["일", "월", "화", "수", "목", "금", "토"];

const KIND_COLOR: Record<AssignmentKind, string> = {
  homework: "bg-violet-100 text-violet-700",
  daily_test: "bg-sky-100 text-sky-700",
  toefl_section: "bg-blue-100 text-blue-700",
  toefl_group: "bg-indigo-100 text-indigo-700",
  vocab: "bg-amber-100 text-amber-700",
  jr: "bg-emerald-100 text-emerald-700",
  hi_naesin: "bg-rose-100 text-rose-700",
};

const STATUS_COLOR: Record<AssignmentStatus, string> = {
  pending: "bg-slate-100 text-slate-600",
  in_progress: "bg-amber-100 text-amber-700",
  submitted: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  graded: "bg-emerald-100 text-emerald-700",
  overdue: "bg-rose-100 text-rose-700",
};

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthGrid(year: number, month0: number) {
  const first = new Date(year, month0, 1);
  const gridStart = new Date(first);
  gridStart.setDate(gridStart.getDate() - first.getDay());
  const cells: { dateIso: string; day: number; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(d.getDate() + i);
    cells.push({ dateIso: toIsoDate(d), day: d.getDate(), inMonth: d.getMonth() === month0 });
  }
  const gridEnd = new Date(gridStart);
  gridEnd.setDate(gridEnd.getDate() + 41);
  return { cells, gridStartIso: toIsoDate(gridStart), gridEndIso: toIsoDate(gridEnd) };
}

type Props = {
  initialItems: AssignmentItem[];
  initialMonth: string; // YYYY-MM
  authId?: string | null;
  academyId?: string | null;
};

export default function AssignmentCalendar({ initialItems, initialMonth, authId, academyId }: Props) {
  const [ym, setYm] = useState(initialMonth);
  const [items, setItems] = useState<AssignmentItem[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string>(toIsoDate(new Date()));

  const [year, month0] = useMemo(() => {
    const [y, m] = ym.split("-").map(Number);
    return [y, m - 1];
  }, [ym]);

  const { cells, gridStartIso, gridEndIso } = useMemo(() => monthGrid(year, month0), [year, month0]);
  const todayIso = toIsoDate(new Date());

  const byDate = useMemo(() => {
    const m = new Map<string, AssignmentItem[]>();
    for (const it of items) {
      const list = m.get(it.date) ?? [];
      list.push(it);
      m.set(it.date, list);
    }
    return m;
  }, [items]);

  // 월 변경 시 재조회 (초기 월은 서버가 준 initialItems 사용)
  useEffect(() => {
    if (ym === initialMonth) {
      setItems(initialItems);
      return;
    }
    if (!authId && !academyId) return;
    const params = new URLSearchParams({ from: gridStartIso, to: gridEndIso });
    if (authId) params.set("authId", authId);
    if (academyId) params.set("academyId", academyId);
    setLoading(true);
    fetch(`/api/admin/student-assignments?${params}`)
      .then((r) => r.json())
      .then((j) => setItems(Array.isArray(j.items) ? j.items : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [ym, gridStartIso, gridEndIso, authId, academyId, initialMonth, initialItems]);

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month0 + delta, 1);
    setYm(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const selectedItems = byDate.get(selected) ?? [];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={() => shiftMonth(-1)} className="px-2 py-1 text-xs text-neutral-400 hover:text-neutral-700">
            ← 이전
          </button>
          <h2 className="text-sm font-bold text-neutral-800">
            {year}년 {month0 + 1}월 {loading && <span className="ml-1 text-[11px] font-normal text-neutral-400">불러오는 중…</span>}
          </h2>
          <button onClick={() => shiftMonth(1)} className="px-2 py-1 text-xs text-neutral-400 hover:text-neutral-700">
            다음 →
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1">
          {WEEKDAY_LABEL.map((label, i) => (
            <div
              key={label}
              className={`py-1 text-center text-[11px] font-semibold ${i === 0 ? "text-rose-500" : i === 6 ? "text-sky-600" : "text-neutral-400"}`}
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell) => {
            const dayItems = byDate.get(cell.dateIso) ?? [];
            const isSelected = cell.dateIso === selected;
            return (
              <button
                key={cell.dateIso}
                onClick={() => setSelected(cell.dateIso)}
                className={[
                  "min-h-[68px] rounded-lg border px-1 py-1 text-left transition",
                  cell.inMonth ? "bg-white border-neutral-100" : "bg-neutral-50 border-neutral-50",
                  cell.dateIso === todayIso ? "ring-1 ring-emerald-400" : "",
                  isSelected ? "ring-2 ring-blue-500" : "",
                ].join(" ")}
              >
                <span className={`text-[11px] ${cell.inMonth ? "text-neutral-700" : "text-neutral-300"}`}>{cell.day}</span>
                <div className="mt-0.5 space-y-0.5">
                  {dayItems.slice(0, 3).map((it) => (
                    <div
                      key={`${it.kind}:${it.id}`}
                      className={`truncate rounded px-1 py-0.5 text-[9px] font-medium ${KIND_COLOR[it.kind]} ${
                        it.status === "overdue" ? "ring-1 ring-rose-400" : ""
                      }`}
                      title={it.title}
                    >
                      {it.status === "completed" || it.status === "graded" ? "✓ " : ""}
                      {it.title}
                    </div>
                  ))}
                  {dayItems.length > 3 && <div className="px-1 text-[9px] text-neutral-400">+{dayItems.length - 3}</div>}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-neutral-400">
          {(Object.keys(ASSIGNMENT_KIND_LABEL) as AssignmentKind[]).map((k) => (
            <span key={k} className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded ${KIND_COLOR[k].split(" ")[0]}`} />
              {ASSIGNMENT_KIND_LABEL[k]}
            </span>
          ))}
        </div>
      </div>

      {/* 선택일 상세 */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-bold text-neutral-800">
          {selected} <span className="font-normal text-neutral-400">· {selectedItems.length}건</span>
        </h3>
        {selectedItems.length === 0 ? (
          <p className="py-6 text-center text-xs text-neutral-400">이 날 배정된 항목이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {selectedItems.map((it) => (
              <div
                key={`${it.kind}:${it.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-neutral-100 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${KIND_COLOR[it.kind]}`}>
                      {ASSIGNMENT_KIND_LABEL[it.kind]}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[it.status]}`}>
                      {ASSIGNMENT_STATUS_LABEL[it.status]}
                    </span>
                    {typeof it.scorePct === "number" && (
                      <span className="text-[10px] font-semibold text-neutral-500">{it.scorePct}%</span>
                    )}
                    <span className="text-[10px] text-neutral-300">
                      {it.dateBasis === "due" ? "마감" : it.dateBasis === "completed" ? "완료일" : it.dateBasis === "available" ? "시작가능" : "배정"}
                    </span>
                  </div>
                  <p className="truncate text-sm text-neutral-800">{it.title}</p>
                </div>
                {it.href && (
                  <Link
                    href={it.href}
                    className="shrink-0 rounded-lg border border-neutral-200 px-2.5 py-1 text-[11px] text-neutral-500 hover:bg-neutral-50"
                  >
                    열기
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
