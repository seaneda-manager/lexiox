"use client";

import React from "react";

type Props = {
  readingSessions: any[];
  grammarSessions: any[];
  listeningSessions: any[];
  speakingSubmissions: any[];
  teacherId: string;
};

export default function JrDashboardSection({
  readingSessions,
  grammarSessions,
  listeningSessions,
  speakingSubmissions,
}: Props) {
  const studentStats = new Map<
    string,
    { reading: number; grammar: number; listening: number; speaking: number }
  >();

  readingSessions.forEach((s) => {
    if (!studentStats.has(s.student_id)) {
      studentStats.set(s.student_id, { reading: 0, grammar: 0, listening: 0, speaking: 0 });
    }
    if (s.completed_at) studentStats.get(s.student_id)!.reading++;
  });

  grammarSessions.forEach((s) => {
    if (!studentStats.has(s.student_id)) {
      studentStats.set(s.student_id, { reading: 0, grammar: 0, listening: 0, speaking: 0 });
    }
    if (s.completed_at) studentStats.get(s.student_id)!.grammar++;
  });

  listeningSessions.forEach((s) => {
    if (!studentStats.has(s.student_id)) {
      studentStats.set(s.student_id, { reading: 0, grammar: 0, listening: 0, speaking: 0 });
    }
    if (s.completed_at) studentStats.get(s.student_id)!.listening++;
  });

  speakingSubmissions.forEach((s) => {
    if (!studentStats.has(s.student_id)) {
      studentStats.set(s.student_id, { reading: 0, grammar: 0, listening: 0, speaking: 0 });
    }
    if (s.teacher_feedback) studentStats.get(s.student_id)!.speaking++;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow text-center">
          <div className="text-3xl font-bold text-emerald-600">
            {readingSessions.filter((s) => s.completed_at).length}
          </div>
          <p className="text-xs text-slate-600 mt-1">Reading 완료</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow text-center">
          <div className="text-3xl font-bold text-blue-600">
            {grammarSessions.filter((s) => s.completed_at).length}
          </div>
          <p className="text-xs text-slate-600 mt-1">Grammar 완료</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow text-center">
          <div className="text-3xl font-bold text-amber-600">
            {listeningSessions.filter((s) => s.completed_at).length}
          </div>
          <p className="text-xs text-slate-600 mt-1">Listening 완료</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow text-center">
          <div className="text-3xl font-bold text-purple-600">
            {speakingSubmissions.filter((s) => s.teacher_feedback).length}
          </div>
          <p className="text-xs text-slate-600 mt-1">Speaking 피드백</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-bold text-slate-900">학생별 진도</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-900">학생</th>
                <th className="px-4 py-3 text-center font-semibold text-emerald-600">RC</th>
                <th className="px-4 py-3 text-center font-semibold text-blue-600">GR</th>
                <th className="px-4 py-3 text-center font-semibold text-amber-600">LC</th>
                <th className="px-4 py-3 text-center font-semibold text-purple-600">SPK</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-900">진도</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(studentStats.entries()).map(([studentId, stats]) => {
                const total = stats.reading + stats.grammar + stats.listening + stats.speaking;
                const progress = Math.round((total / 4) * 100);
                return (
                  <tr key={studentId} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-900 font-medium">{studentId}</td>
                    <td className="px-4 py-3 text-center text-emerald-600 font-semibold">{stats.reading}</td>
                    <td className="px-4 py-3 text-center text-blue-600 font-semibold">{stats.grammar}</td>
                    <td className="px-4 py-3 text-center text-amber-600 font-semibold">{stats.listening}</td>
                    <td className="px-4 py-3 text-center text-purple-600 font-semibold">{stats.speaking}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-slate-600">{progress}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
