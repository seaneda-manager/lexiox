"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ScoreboardMetric, ScoreboardPeriod, ScoreboardResponse } from "@/models/vocab/scoreboard.types";

const PERIOD_LABEL: Record<ScoreboardPeriod, string> = {
  daily: "일간",
  weekly: "주간",
  monthly: "월간",
  "6month": "6개월",
  yearly: "연간",
};

const PERIODS: ScoreboardPeriod[] = ["daily", "weekly", "monthly", "6month", "yearly"];

const METRIC_LABEL: Record<ScoreboardMetric, string> = {
  words: "최다 정답 단어",
  points: "최고 점수",
};

const METRIC_UNIT: Record<ScoreboardMetric, string> = {
  words: "개",
  points: "점",
};

const MEDALS = ["🥇", "🥈", "🥉"];

export default function ScoreboardClient() {
  const [period, setPeriod] = useState<ScoreboardPeriod>("weekly");
  const [metric, setMetric] = useState<ScoreboardMetric>("points");
  const [data, setData] = useState<ScoreboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/vocab/scoreboard?period=${period}`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load scoreboard");
        return res.json();
      })
      .then((json: ScoreboardResponse) => {
        if (!cancelled) setData(json);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "랭킹을 불러오지 못했습니다");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [period]);

  const ranking = data?.[metric];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">🏆 Score Board</h1>
        <Link href="/vocab/test" className="text-sm text-blue-600 hover:underline">
          ← 시험으로 돌아가기
        </Link>
      </div>

      {/* 기간 선택 */}
      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
              period === p
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            }`}
          >
            {PERIOD_LABEL[p]}
          </button>
        ))}
      </div>

      {/* 지표 선택 */}
      <div className="flex gap-2">
        {(Object.keys(METRIC_LABEL) as ScoreboardMetric[]).map((m) => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition ${
              metric === m
                ? "bg-amber-500 text-white"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            }`}
          >
            {METRIC_LABEL[m]}
          </button>
        ))}
      </div>

      {/* 랭킹 목록 */}
      <div className="bg-white rounded-2xl border shadow-sm p-5">
        {loading ? (
          <div className="text-center text-sm text-gray-400 py-8">불러오는 중...</div>
        ) : error ? (
          <div className="text-center text-sm text-red-500 py-8">{error}</div>
        ) : !ranking || ranking.top.length === 0 ? (
          <div className="text-center text-sm text-gray-400 py-8">
            아직 기록이 없습니다. 첫 랭커가 되어보세요!
          </div>
        ) : (
          <div className="space-y-1.5">
            {ranking.top.map((row) => (
              <div
                key={row.rank}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                  row.is_me ? "bg-sky-50 ring-1 ring-sky-200" : "even:bg-gray-50"
                }`}
              >
                <span className="font-medium text-gray-800">
                  {MEDALS[row.rank - 1] ?? `${row.rank}.`} {row.name}
                  {row.is_me && <span className="ml-1 text-xs text-sky-600">(나)</span>}
                </span>
                <span className="text-gray-500">
                  {row.value.toLocaleString()}{METRIC_UNIT[metric]}
                </span>
              </div>
            ))}
            {ranking.me.rank && ranking.me.rank > ranking.top.length && (
              <div className="flex items-center justify-between rounded-lg bg-sky-50 px-3 py-2 text-sm mt-2">
                <span className="font-medium text-sky-700">내 순위: {ranking.me.rank}위</span>
                <span className="text-sky-600">
                  {ranking.me.value.toLocaleString()}{METRIC_UNIT[metric]}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
