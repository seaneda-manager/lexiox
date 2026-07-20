"use client";

import React, { useState } from "react";
import JrReadingTab from "./tabs/JrReadingTab";
import JrGrammarTab from "./tabs/JrGrammarTab";
import JrListeningTab from "./tabs/JrListeningTab";
import JrSpeakingWritingTab from "./tabs/JrSpeakingWritingTab";

type TabType = "reading" | "grammar" | "listening" | "speaking";

type Props = {
  readingSessions: any[];
  grammarSessions: any[];
  listeningSessions: any[];
  speakingWritingSubmissions: any[];
  teacherId: string;
};

export default function JrDashboardClient({
  readingSessions,
  grammarSessions,
  listeningSessions,
  speakingWritingSubmissions,
  teacherId,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabType>("reading");

  const tabs = [
    { id: "reading", label: "RC", icon: "📖" },
    { id: "grammar", label: "GR", icon: "📚" },
    { id: "listening", label: "LC", icon: "🎧" },
    { id: "speaking", label: "SPK&WRT", icon: "🎤" },
  ];

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="border-b bg-white p-4">
        <div className="mx-auto max-w-7xl px-6">
          <h1 className="text-3xl font-bold text-slate-900">Jr. Learning Dashboard</h1>
          <p className="text-slate-600 mt-1">
            학생들의 Reading · Grammar · Listening · Speaking & Writing 진도 추적
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8 border-b border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-4 py-3 font-semibold transition ${
                activeTab === tab.id
                  ? "border-b-2 border-emerald-600 text-emerald-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "reading" && (
          <JrReadingTab sessions={readingSessions} />
        )}
        {activeTab === "grammar" && (
          <JrGrammarTab sessions={grammarSessions} />
        )}
        {activeTab === "listening" && (
          <JrListeningTab sessions={listeningSessions} />
        )}
        {activeTab === "speaking" && (
          <JrSpeakingWritingTab submissions={speakingWritingSubmissions} teacherId={teacherId} />
        )}
      </div>
    </main>
  );
}
