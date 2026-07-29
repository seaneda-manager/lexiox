"use client";

import { useState } from "react";
import Link from "next/link";

type TabKey = "ongoing" | "todo" | "recent" | "recommended";

type Tab = {
  key: TabKey;
  label: string;
  count: number;
};

type Activity = {
  id: string;
  title: string;
  date: string;
  detail?: string;
  href?: string;
  type: "ongoing" | "todo" | "recent" | "recommended";
};

type Props = {
  activities: Activity[];
  totals: Record<TabKey, number>;
};

export default function ActivityTabsCard({ activities, totals }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("ongoing");

  const tabs: Tab[] = [
    { key: "ongoing", label: "진행 중", count: totals.ongoing },
    { key: "todo", label: "해야 할 것", count: totals.todo },
    { key: "recent", label: "최근 활동", count: totals.recent },
    { key: "recommended", label: "추천 학습", count: totals.recommended },
  ];

  const filteredActivities = activities.filter((a) => a.type === activeTab);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
      {/* 탭 헤더 */}
      <div className="flex border-b border-neutral-100 bg-neutral-50">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 py-3 text-xs font-semibold transition border-b-2 ${
              activeTab === tab.key
                ? "border-b-2 border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              <span>{tab.label}</span>
              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-neutral-200 text-[10px] font-bold text-neutral-700">
                {tab.count}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="min-h-[120px] p-4">
        {filteredActivities.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-neutral-400 mb-3">
              {activeTab === "ongoing" && "진행 중인 활동이 없습니다."}
              {activeTab === "todo" && "할 일이 없습니다. 좋은 일입니다! 🎉"}
              {activeTab === "recent" && "최근 활동이 없습니다."}
              {activeTab === "recommended" && "추천 학습이 없습니다."}
            </p>
            {activeTab === "ongoing" && (
              <Link
                href="/vocab"
                className="inline-flex text-xs font-semibold text-emerald-600 hover:underline"
              >
                새로 시작하기 →
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredActivities.map((activity) => (
              <div
                key={activity.id}
                className="p-3 rounded-xl border border-neutral-100 bg-neutral-50 hover:bg-neutral-100 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {activity.href ? (
                      <Link
                        href={activity.href}
                        className="text-sm font-semibold text-neutral-900 hover:underline line-clamp-1"
                      >
                        {activity.title}
                      </Link>
                    ) : (
                      <p className="text-sm font-semibold text-neutral-900 line-clamp-1">
                        {activity.title}
                      </p>
                    )}
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {activity.date}
                      {activity.detail && ` • ${activity.detail}`}
                    </p>
                  </div>
                  {activity.href && (
                    <Link
                      href={activity.href}
                      className="shrink-0 px-3 py-1 rounded-lg text-xs font-semibold bg-neutral-200 text-neutral-700 hover:bg-neutral-300 transition"
                    >
                      진행
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
