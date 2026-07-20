"use client";

import React, { useState } from "react";

type Student = {
  student_id: string;
  students: { id: string; full_name: string; username: string };
};

type Props = {
  students: Student[];
  weeklyData: any;
  teacherId: string;
};

export default function PerformanceReportClient({ students, weeklyData }: Props) {
  const [reportType, setReportType] = useState<"weekly" | "monthly">("weekly");

  // 주간 통계 계산
  const weeklyStats = students.map((s) => {
    const reading = weeklyData.reading.filter(
      (r: any) => r.student_id === s.student_id
    );
    const grammar = weeklyData.grammar.filter(
      (g: any) => g.student_id === s.student_id
    );
    const listening = weeklyData.listening.filter(
      (l: any) => l.student_id === s.student_id
    );
    const speaking = weeklyData.speaking.filter(
      (sp: any) => sp.student_id === s.student_id
    );

    const totalActivities = reading.length + grammar.length + listening.length + speaking.length;
    const completedReading = reading.filter((r: any) => r.completed_at).length;
    const completedGrammar = grammar.filter((g: any) => g.completed_at).length;
    const completedListening = listening.filter((l: any) => l.completed_at).length;

    return {
      student: s.students,
      totalActivities,
      completed: completedReading + completedGrammar + completedListening,
      completionRate:
        totalActivities > 0
          ? Math.round(
              ((completedReading + completedGrammar + completedListening) / totalActivities) * 100
            )
          : 0,
      modules: {
        reading: `${completedReading}/${reading.length}`,
        grammar: `${completedGrammar}/${grammar.length}`,
        listening: `${completedListening}/${listening.length}`,
        speaking: speaking.length,
      },
    };
  });

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="border-b bg-white p-4">
        <div className="mx-auto max-w-7xl px-6">
          <h1 className="text-3xl font-bold text-slate-900">성과 리포트</h1>
          <p className="text-slate-600 mt-1">학생별 주간/월간 학습 성과</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Report Type Selector */}
        <div className="mb-8 flex gap-4">
          <button
            onClick={() => setReportType("weekly")}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              reportType === "weekly"
                ? "bg-emerald-600 text-white"
                : "bg-white text-slate-900 border border-slate-300 hover:bg-slate-50"
            }`}
          >
            주간 리포트
          </button>
          <button
            onClick={() => setReportType("monthly")}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              reportType === "monthly"
                ? "bg-emerald-600 text-white"
                : "bg-white text-slate-900 border border-slate-300 hover:bg-slate-50"
            }`}
          >
            월간 리포트
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 shadow text-center">
            <div className="text-3xl font-bold text-slate-900">{students.length}</div>
            <p className="text-xs text-slate-600 mt-1">전체 학생</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow text-center">
            <div className="text-3xl font-bold text-emerald-600">
              {weeklyStats.filter((s) => s.completionRate === 100).length}
            </div>
            <p className="text-xs text-slate-600 mt-1">100% 완료</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow text-center">
            <div className="text-3xl font-bold text-slate-900">
              {Math.round(weeklyStats.reduce((a, s) => a + s.completionRate, 0) / weeklyStats.length)}%
            </div>
            <p className="text-xs text-slate-600 mt-1">평균 진도율</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow text-center">
            <div className="text-3xl font-bold text-slate-900">
              {weeklyStats.reduce((a, s) => a + s.totalActivities, 0)}
            </div>
            <p className="text-xs text-slate-600 mt-1">총 활동</p>
          </div>
        </div>

        {/* Student Performance Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h2 className="font-bold text-slate-900">학생별 성과</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-900">학생명</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-900">RC</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-900">GR</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-900">LC</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-900">SPK</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-900">완료율</th>
                </tr>
              </thead>
              <tbody>
                {weeklyStats.map((stat) => (
                  <tr key={stat.student.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-900 font-medium">
                      {stat.student.full_name}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">{stat.modules.reading}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{stat.modules.grammar}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{stat.modules.listening}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{stat.modules.speaking}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              stat.completionRate === 100 ? "bg-emerald-500" : "bg-blue-500"
                            }`}
                            style={{ width: `${stat.completionRate}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-600">
                          {stat.completionRate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
