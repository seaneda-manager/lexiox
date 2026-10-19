"use client";

import { useEffect, useState } from "react";

type Task = { id: string; day_index: number; phase: "study" | "retest" };

/** 허브 상단 안내: 해야 할 필수 재학습 / 복습시험이 있을 때만 보인다 */
export default function RemedialNotice() {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/vocab/remedial", { cache: "no-store" });
        if (!res.ok) return;
        const d = await res.json();
        if (!cancelled) setTasks(d.tasks ?? []);
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (tasks.length === 0) return null;
  const study = tasks.filter((t) => t.phase === "study");
  const retest = tasks.filter((t) => t.phase === "retest");

  return (
    <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4">
      <p className="text-sm font-semibold text-rose-900">
        {study.length > 0
          ? `📌 필수 재학습 ${study.length}건이 있어요 (Day ${study.map((t) => t.day_index).join(", ")})`
          : `📝 복습시험 ${retest.length}건을 준비하세요 (Day ${retest.map((t) => t.day_index).join(", ")})`}
      </p>
      <a
        href="/vocab/remedial"
        className="mt-2 block w-full rounded-lg bg-rose-600 py-2 text-center text-sm font-semibold text-white hover:bg-rose-700"
      >
        {study.length > 0 ? "재학습 하러 가기 →" : "복습시험 보러 가기 →"}
      </a>
    </div>
  );
}
