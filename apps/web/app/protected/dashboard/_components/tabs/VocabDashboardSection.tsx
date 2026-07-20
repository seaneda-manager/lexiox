"use client";

import React from "react";

type Props = {
  assignments: any[];
  teacherId: string;
};

export default function VocabDashboardSection({ assignments }: Props) {
  const completedCount = assignments.filter((a) => a.completed_at).length;
  const progress = assignments.length > 0 ? Math.round((completedCount / assignments.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 shadow text-center">
          <div className="text-3xl font-bold text-blue-600">{assignments.length}</div>
          <p className="text-xs text-slate-600 mt-1">할당된 과정</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow text-center">
          <div className="text-3xl font-bold text-emerald-600">{completedCount}</div>
          <p className="text-xs text-slate-600 mt-1">완료</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow text-center">
          <div className="text-3xl font-bold text-slate-600">{progress}%</div>
          <p className="text-xs text-slate-600 mt-1">전체 진도</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-bold text-slate-900">학생별 VOCAB 진도</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-900">학생명</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-900">상태</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-900">완료일</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-900 font-medium">
                    {a.students?.full_name || "Unknown"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {a.completed_at ? (
                      <span className="inline-block px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded">
                        ✓ 완료
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded">
                        진행 중
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600 text-xs">
                    {a.completed_at ? new Date(a.completed_at).toLocaleDateString("ko-KR") : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
