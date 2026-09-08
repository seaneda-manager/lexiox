"use client";

import { useState } from "react";
import { SLOT_KIND_LABEL, ZONE_EMOJI, hhmm, type RoutineSlot } from "@/lib/planner/types";

const WEEKDAY_LABEL = ["일", "월", "화", "수", "목", "금", "토"];

type Draft = {
  zone: "school" | "home";
  weekday: number;
  start_time: string;
  end_time: string;
  kind: string;
  label: string;
};

const SCHOOL_KINDS = ["break", "lunch", "self_study"];
const HOME_KINDS = ["study", "homework", "meal", "rest"];

export default function RoutineEditor({
  slots,
  onSaved,
}: {
  slots: RoutineSlot[];
  onSaved: () => Promise<void> | void;
}) {
  const [local, setLocal] = useState<RoutineSlot[]>(slots);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Draft>({
    zone: "school",
    weekday: 1,
    start_time: "12:30",
    end_time: "13:10",
    kind: "lunch",
    label: "",
  });

  const addSlot = () => {
    if (draft.start_time >= draft.end_time) {
      alert("끝 시간이 시작보다 늦어야 해요");
      return;
    }
    const next: RoutineSlot = {
      id: `tmp-${Date.now()}-${Math.random()}`,
      zone: draft.zone,
      weekday: draft.weekday,
      start_time: draft.start_time,
      end_time: draft.end_time,
      kind: draft.kind,
      label: draft.label || null,
    };
    setLocal((p) => [...p, next]);
    setDirty(true);
  };

  const removeSlot = (id: string) => {
    setLocal((p) => p.filter((s) => s.id !== id));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/student/planner/routine", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slots: local.map((s) => ({
            zone: s.zone,
            weekday: s.weekday,
            start_time: s.start_time,
            end_time: s.end_time,
            kind: s.kind,
            label: s.label,
          })),
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        alert(j?.error ?? "저장 실패");
        return;
      }
      setLocal(Array.isArray(j.routineSlots) ? j.routineSlots : local);
      setDirty(false);
      await onSaved();
    } finally {
      setSaving(false);
    }
  };

  const kinds = draft.zone === "school" ? SCHOOL_KINDS : HOME_KINDS;

  return (
    <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-4">
      <div>
        <h2 className="text-sm font-bold text-neutral-800">주간 루틴</h2>
        <p className="mt-0.5 text-[11px] text-neutral-400">
          매주 반복되는 학교 가용 시간(쉬는시간·점심·자습)과 집 루틴(공부·숙제·식사·휴식)을
          등록하면, 시험공부 스케줄이 이 시간에 맞춰 자동 배치돼요.
        </p>
      </div>

      {/* 추가 폼 */}
      <div className="space-y-2 rounded-xl bg-neutral-50 p-3">
        <div className="flex flex-wrap gap-1.5">
          <select
            value={draft.zone}
            onChange={(e) => {
              const zone = e.target.value as "school" | "home";
              setDraft((d) => ({ ...d, zone, kind: zone === "school" ? "lunch" : "study" }));
            }}
            className="rounded border border-neutral-200 px-2 py-1 text-xs"
          >
            <option value="school">🏫 학교</option>
            <option value="home">🏠 집</option>
          </select>
          <select
            value={draft.weekday}
            onChange={(e) => setDraft((d) => ({ ...d, weekday: Number(e.target.value) }))}
            className="rounded border border-neutral-200 px-2 py-1 text-xs"
          >
            {WEEKDAY_LABEL.map((w, i) => (
              <option key={i} value={i}>
                {w}요일
              </option>
            ))}
          </select>
          <select
            value={draft.kind}
            onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value }))}
            className="rounded border border-neutral-200 px-2 py-1 text-xs"
          >
            {kinds.map((k) => (
              <option key={k} value={k}>
                {SLOT_KIND_LABEL[k] ?? k}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            type="time"
            value={draft.start_time}
            onChange={(e) => setDraft((d) => ({ ...d, start_time: e.target.value }))}
            className="rounded border border-neutral-200 px-2 py-1 text-xs"
          />
          <span className="text-xs text-neutral-400">–</span>
          <input
            type="time"
            value={draft.end_time}
            onChange={(e) => setDraft((d) => ({ ...d, end_time: e.target.value }))}
            className="rounded border border-neutral-200 px-2 py-1 text-xs"
          />
          <input
            value={draft.label}
            onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
            placeholder="메모 (선택)"
            className="w-28 rounded border border-neutral-200 px-2 py-1 text-xs"
          />
          <button
            onClick={addSlot}
            className="rounded-lg bg-neutral-800 px-3 py-1 text-[11px] font-medium text-white"
          >
            ＋ 추가
          </button>
        </div>
      </div>

      {/* 요일별 목록 */}
      <div className="space-y-2">
        {WEEKDAY_LABEL.map((w, wd) => {
          const daySlots = local
            .filter((s) => s.weekday === wd)
            .sort((a, b) => a.start_time.localeCompare(b.start_time));
          if (daySlots.length === 0) return null;
          return (
            <div key={wd} className="rounded-xl border border-neutral-100 px-3 py-2">
              <p className="mb-1 text-[11px] font-bold text-neutral-500">{w}요일</p>
              <div className="flex flex-wrap gap-1.5">
                {daySlots.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-1 text-[10px] text-neutral-600"
                  >
                    {ZONE_EMOJI[s.zone]} {hhmm(s.start_time)}–{hhmm(s.end_time)}{" "}
                    {s.label || SLOT_KIND_LABEL[s.kind] || s.kind}
                    <button
                      onClick={() => removeSlot(s.id)}
                      className="ml-0.5 text-neutral-400 hover:text-rose-500"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
        {local.length === 0 && (
          <p className="py-4 text-center text-[11px] text-neutral-400">
            아직 등록된 루틴이 없어요. 위에서 추가해 보세요.
          </p>
        )}
      </div>

      {dirty && (
        <button
          onClick={save}
          disabled={saving}
          className="w-full rounded-xl bg-blue-600 py-2 text-xs font-bold text-white disabled:opacity-40"
        >
          {saving ? "저장 중…" : "변경사항 저장"}
        </button>
      )}
    </section>
  );
}
