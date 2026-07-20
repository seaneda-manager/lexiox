"use client";

import React, { useState } from "react";
import Link from "next/link";
import JrDashboardSection from "./tabs/JrDashboardSection";
import VocabDashboardSection from "./tabs/VocabDashboardSection";

type TabType = "jr" | "vocab" | "toefl" | "naesin";

type Props = {
  jrData: any;
  vocabData: any;
  teacherId: string;
};

export default function TeacherDashboardClient({ jrData, vocabData, teacherId }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>("jr");

  const tabs = [
    { id: "jr", label: "Jr.", icon: "📚" },
    { id: "vocab", label: "VOCAB", icon: "📝" },
    { id: "toefl", label: "TOEFL", icon: "🎯", disabled: true },
    { id: "naesin", label: "내신", icon: "🏆", disabled: true },
  ];

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="border-b bg-white p-4">
        <div className="mx-auto max-w-7xl px-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">학습 진도 대시보드</h1>
            <p className="text-slate-600 mt-1">학생들의 학습 현황을 한눈에 확인합니다</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/jr/assignments"
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
            >
              ➕ 과제할당
            </Link>
            <Link
              href="/admin"
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-900 font-semibold hover:bg-slate-50"
            >
              ⚙️ 관리
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex gap-2 mb-8 border-b border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id as TabType)}
              disabled={tab.disabled}
              className={`px-4 py-3 font-semibold transition ${
                tab.disabled
                  ? "text-slate-300 cursor-not-allowed"
                  : activeTab === tab.id
                  ? "border-b-2 border-emerald-600 text-emerald-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.icon} {tab.label}
              {tab.disabled && <span className="ml-1 text-[10px] font-bold text-slate-400">SOON</span>}
            </button>
          ))}
        </div>

        {activeTab === "jr" && (
          <JrDashboardSection
            readingSessions={jrData.readingSessions}
            grammarSessions={jrData.grammarSessions}
            listeningSessions={jrData.listeningSessions}
            speakingSubmissions={jrData.speakingSubmissions}
            teacherId={teacherId}
          />
        )}

        {activeTab === "vocab" && (
          <VocabDashboardSection assignments={vocabData.assignments} teacherId={teacherId} />
        )}
      </div>
    </main>
  );
}
