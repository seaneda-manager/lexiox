"use client";

import React, { useState } from "react";

type StudentProgress = {
  studentId: string;
  studentName: string;
  totalAttempts: number;
  weakWordCount: number;
  averageSuccessRate: number;
  knowSuccessRate: number;
  spellingSuccessRate: number;
  speedSuccessRate: number;
  weakWords: Array<{ id: string; text: string }>;
  activeGoals: number;
  lastActivityDate: string | null;
};

type ClassStats = {
  className: string;
  studentCount: number;
  totalAttempts: number;
  averageProgress: number;
  averageSuccessRate: number;
};

export default function DashboardClient({
  students,
  classStats,
}: {
  students: StudentProgress[];
  classStats: ClassStats[];
}) {
  const [selectedStudent, setSelectedStudent] = useState<StudentProgress | null>(null);
  const [showWeakWords, setShowWeakWords] = useState<StudentProgress | null>(null);
  const [showSuccessRates, setShowSuccessRates] = useState<StudentProgress | null>(null);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900">선생님 대시보드</h1>
          <p className="mt-2 text-slate-600">학생들의 학습 진도를 한눈에 확인하세요</p>
        </div>

        {/* Class Stats */}
        {classStats.map((stat, idx) => (
          <div key={idx} className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="rounded-xl bg-white p-6 shadow">
              <div className="text-sm font-semibold text-slate-600">총 학생 수</div>
              <div className="mt-2 text-3xl font-bold text-blue-600">{stat.studentCount}</div>
            </div>
            <div className="rounded-xl bg-white p-6 shadow">
              <div className="text-sm font-semibold text-slate-600">전체 학습 시도</div>
              <div className="mt-2 text-3xl font-bold text-emerald-600">{stat.totalAttempts}</div>
            </div>
            <div className="rounded-xl bg-white p-6 shadow">
              <div className="text-sm font-semibold text-slate-600">평균 진도율</div>
              <div className="mt-2 text-3xl font-bold text-purple-600">{Math.min(stat.averageProgress, 100)}%</div>
            </div>
            <div className="rounded-xl bg-white p-6 shadow">
              <div className="text-sm font-semibold text-slate-600">평균 성공률</div>
              <div className="mt-2 text-3xl font-bold text-amber-600">{stat.averageSuccessRate}%</div>
            </div>
          </div>
        ))}

        {/* Student List */}
        <div className="rounded-xl bg-white p-6 shadow">
          <h2 className="mb-6 text-xl font-bold text-slate-900">학생별 진도</h2>

          {students.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b-2 border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">학생명</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">학습 횟수</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">약한 단어</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">성공률</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">활성 목표</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">마지막 활동</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {students.map((student) => (
                    <tr
                      key={student.studentId}
                      onClick={() => setSelectedStudent(student)}
                      className="hover:bg-slate-50 cursor-pointer transition"
                    >
                      <td className="px-4 py-3 font-semibold text-slate-900">{student.studentName}</td>
                      <td className="px-4 py-3 text-center text-slate-700">{student.totalAttempts}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowWeakWords(student);
                          }}
                          className={`inline-block rounded-full px-3 py-1 text-sm font-semibold cursor-pointer hover:opacity-80 ${
                            student.weakWordCount > 50 ? "bg-red-100 text-red-700" :
                            student.weakWordCount > 20 ? "bg-amber-100 text-amber-700" :
                            "bg-emerald-100 text-emerald-700"
                          }`}>
                          {student.weakWordCount}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowSuccessRates(student);
                          }}
                          className="flex items-center justify-center gap-2 cursor-pointer hover:opacity-80"
                        >
                          <div className="h-2 w-24 rounded-full bg-slate-200">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                              style={{ width: `${student.averageSuccessRate}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-slate-700">{student.averageSuccessRate}%</span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                          {student.activeGoals}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-slate-600">
                        {student.lastActivityDate || "활동 없음"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg bg-slate-50 p-6 text-center text-slate-600">
              아직 학습 기록이 없습니다.
            </div>
          )}
        </div>

        {/* Student Detail Modal */}
        {selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-lg">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{selectedStudent.studentName}</h2>
                  <p className="mt-1 text-sm text-slate-600">상세 학습 현황</p>
                </div>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="text-2xl text-slate-500 hover:text-slate-700"
                >
                  ✕
                </button>
              </div>

              <div className="mb-6 grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-blue-50 p-4">
                  <div className="text-sm font-semibold text-blue-700">학습 시도</div>
                  <div className="mt-2 text-2xl font-bold text-blue-900">{selectedStudent.totalAttempts}</div>
                </div>
                <div className="rounded-lg bg-red-50 p-4">
                  <div className="text-sm font-semibold text-red-700">약한 단어</div>
                  <div className="mt-2 text-2xl font-bold text-red-900">{selectedStudent.weakWordCount}</div>
                </div>
                <div className="rounded-lg bg-emerald-50 p-4">
                  <div className="text-sm font-semibold text-emerald-700">성공률</div>
                  <div className="mt-2 text-2xl font-bold text-emerald-900">{selectedStudent.averageSuccessRate}%</div>
                </div>
                <div className="rounded-lg bg-purple-50 p-4">
                  <div className="text-sm font-semibold text-purple-700">활성 목표</div>
                  <div className="mt-2 text-2xl font-bold text-purple-900">{selectedStudent.activeGoals}</div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <div className="text-sm font-semibold text-slate-700 mb-2">마지막 활동</div>
                <p className="text-slate-600">
                  {selectedStudent.lastActivityDate || "아직 학습한 적이 없습니다"}
                </p>
              </div>

              <button
                onClick={() => setSelectedStudent(null)}
                className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-3 text-white font-semibold hover:bg-slate-800 transition"
              >
                닫기
              </button>
            </div>
          </div>
        )}

        {/* 약한 단어 모달 */}
        {showWeakWords && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">약한 단어</h2>
                <button
                  onClick={() => setShowWeakWords(null)}
                  className="text-2xl text-slate-500 hover:text-slate-700"
                >
                  ✕
                </button>
              </div>
              <div className="mb-4 text-sm text-slate-600">
                {showWeakWords.studentName} - {showWeakWords.weakWordCount}개
              </div>
              <div className="max-h-96 overflow-y-auto rounded-lg bg-slate-50 p-4">
                <div className="space-y-2">
                  {showWeakWords.weakWords.map((word) => (
                    <div
                      key={word.id}
                      className="flex items-center gap-2 rounded-lg bg-white p-2 text-sm text-slate-700"
                    >
                      <span className="font-medium">{word.text}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setShowWeakWords(null)}
                className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-2 text-white font-semibold hover:bg-slate-800"
              >
                닫기
              </button>
            </div>
          </div>
        )}

        {/* 단계별 성공률 모달 */}
        {showSuccessRates && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">성공률 상세</h2>
                <button
                  onClick={() => setShowSuccessRates(null)}
                  className="text-2xl text-slate-500 hover:text-slate-700"
                >
                  ✕
                </button>
              </div>
              <div className="mb-6 text-sm text-slate-600">
                {showSuccessRates.studentName}
              </div>
              <div className="space-y-4">
                <div className="rounded-lg bg-blue-50 p-4">
                  <div className="mb-2 text-sm font-semibold text-blue-700">뜻 (Meaning)</div>
                  <div className="text-2xl font-bold text-blue-900">{showSuccessRates.knowSuccessRate}%</div>
                </div>
                <div className="rounded-lg bg-amber-50 p-4">
                  <div className="mb-2 text-sm font-semibold text-amber-700">철자 (Spelling)</div>
                  <div className="text-2xl font-bold text-amber-900">{showSuccessRates.spellingSuccessRate}%</div>
                </div>
                <div className="rounded-lg bg-purple-50 p-4">
                  <div className="mb-2 text-sm font-semibold text-purple-700">발음 (Pronunciation)</div>
                  <div className="text-2xl font-bold text-purple-900">{showSuccessRates.speedSuccessRate}%</div>
                </div>
              </div>
              <button
                onClick={() => setShowSuccessRates(null)}
                className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-2 text-white font-semibold hover:bg-slate-800"
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
