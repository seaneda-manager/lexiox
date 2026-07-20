"use client";

import React, { useState, useEffect } from "react";

type Student = {
  student_id: string;
  students: { id: string; full_name: string; username: string };
};

type Props = {
  students: Student[];
  teacherId: string;
};

export default function JrAnalyticsClient({ students }: Props) {
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    if (!selectedStudent) return;

    const loadAnalytics = async () => {
      // TODO: Server action으로 데이터 로드
      setAnalytics({
        reading: [],
        grammar: [],
        listening: [],
        speaking: [],
      });
    };

    loadAnalytics();
  }, [selectedStudent]);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="border-b bg-white p-4">
        <div className="mx-auto max-w-7xl px-6">
          <h1 className="text-3xl font-bold text-slate-900">Jr. 학습 분석</h1>
          <p className="text-slate-600 mt-1">학생별 상세 학습 패턴 및 진도</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <label className="block text-sm font-semibold text-slate-900 mb-3">
            학생 선택
          </label>
          <select
            value={selectedStudent || ""}
            onChange={(e) => setSelectedStudent(e.target.value || null)}
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

        {!selectedStudent && (
          <div className="text-center py-12 text-slate-500">
            학생을 선택하여 상세 분석을 확인하세요
          </div>
        )}
      </div>
    </main>
  );
}
