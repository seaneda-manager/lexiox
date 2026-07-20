"use client";

import React, { useState } from "react";
import { assignReadingSessionAction, assignGrammarSessionAction } from "../actions";

type Props = {
  students: any[];
  readingPassages: any[];
  grammarChapters: any[];
  listeningAudio: any[];
  speakingTasks: any[];
  teacherId: string;
};

type TabType = "reading" | "grammar" | "listening" | "speaking";

export default function AssignmentManagerClient({
  students,
  readingPassages,
  grammarChapters,
  teacherId,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabType>("reading");
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [assigningTo, setAssigningTo] = useState<Record<string, boolean>>({});

  const handleAssignReading = async (passageId: string) => {
    if (!selectedStudent) {
      alert("학생을 선택하세요");
      return;
    }

    const key = `reading-${selectedStudent}-${passageId}`;
    setAssigningTo((prev) => ({ ...prev, [key]: true }));

    const result = await assignReadingSessionAction({
      studentId: selectedStudent,
      passageId,
      teacherId,
    });

    if (result.ok) {
      alert("Reading 과제가 할당되었습니다");
    } else {
      alert("할당 실패: " + result.error);
    }
    setAssigningTo((prev) => ({ ...prev, [key]: false }));
  };

  const handleAssignGrammar = async (chapterId: string) => {
    if (!selectedStudent) {
      alert("학생을 선택하세요");
      return;
    }

    const key = `grammar-${selectedStudent}-${chapterId}`;
    setAssigningTo((prev) => ({ ...prev, [key]: true }));

    const result = await assignGrammarSessionAction({
      studentId: selectedStudent,
      chapterId,
      teacherId,
    });

    if (result.ok) {
      alert("Grammar 과제가 할당되었습니다");
    } else {
      alert("할당 실패: " + result.error);
    }
    setAssigningTo((prev) => ({ ...prev, [key]: false }));
  };

  const tabs = [
    { id: "reading", label: "📖 Reading", icon: "Reading" },
    { id: "grammar", label: "📚 Grammar", icon: "Grammar" },
    { id: "listening", label: "🎧 Listening", icon: "Listening (준비중)" },
    { id: "speaking", label: "🎤 Speaking", icon: "Speaking (준비중)" },
  ];

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="border-b bg-white p-4">
        <div className="mx-auto max-w-7xl px-6">
          <h1 className="text-3xl font-bold text-slate-900">Jr. 과제 할당</h1>
          <p className="text-slate-600 mt-1">학생에게 학습 과제를 할당합니다</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Student Selector */}
        <div className="mb-8 bg-white rounded-lg p-6 shadow">
          <label className="block text-sm font-semibold text-slate-900 mb-3">
            학생 선택
          </label>
          <select
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            className="w-full max-w-sm rounded-lg border border-slate-300 px-4 py-2"
          >
            <option value="">-- 학생을 선택하세요 --</option>
            {students.map((s) => (
              <option key={s.student_id} value={s.student_id}>
                {s.students.full_name}
              </option>
            ))}
          </select>
        </div>

        {selectedStudent && (
          <>
            {/* Tab Navigation */}
            <div className="flex gap-2 mb-8 border-b border-slate-200">
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
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Reading Tab */}
            {activeTab === "reading" && (
              <div className="space-y-4">
                {readingPassages.map((p) => (
                  <div key={p.id} className="bg-white rounded-lg p-4 shadow flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">{p.title}</h3>
                      <p className="text-sm text-slate-600">
                        난이도:{" "}
                        {p.difficulty === "easy"
                          ? "쉬움"
                          : p.difficulty === "medium"
                          ? "중간"
                          : "어려움"}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAssignReading(p.id)}
                      disabled={assigningTo[`reading-${selectedStudent}-${p.id}`]}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:bg-slate-300"
                    >
                      할당
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Grammar Tab */}
            {activeTab === "grammar" && (
              <div className="space-y-4">
                {grammarChapters.map((c) => (
                  <div key={c.id} className="bg-white rounded-lg p-4 shadow flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">{c.title}</h3>
                    </div>
                    <button
                      onClick={() => handleAssignGrammar(c.id)}
                      disabled={assigningTo[`grammar-${selectedStudent}-${c.id}`]}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-slate-300"
                    >
                      할당
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Listening & Speaking Tabs */}
            {(activeTab === "listening" || activeTab === "speaking") && (
              <div className="text-center py-12 text-slate-500">
                준비 중입니다
              </div>
            )}
          </>
        )}

        {!selectedStudent && (
          <div className="text-center py-12 text-slate-500">
            학생을 선택하여 과제를 할당하세요
          </div>
        )}
      </div>
    </main>
  );
}
