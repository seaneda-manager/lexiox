"use client";

import React from "react";

type Props = {
  studentName: string;
  readingSessions: any[];
  grammarSessions: any[];
  listeningSessions: any[];
  speakingSubmissions: any[];
};

export default function StudentDashboardClient({
  studentName,
  readingSessions,
  grammarSessions,
  listeningSessions,
  speakingSubmissions,
}: Props) {
  const readingCompleted = readingSessions.filter((s) => s.completed_at).length;
  const grammarCompleted = grammarSessions.filter((s) => s.completed_at).length;
  const listeningCompleted = listeningSessions.filter((s) => s.completed_at).length;
  const speakingWithFeedback = speakingSubmissions.filter((s) => s.teacher_feedback).length;

  const totalCompleted = readingCompleted + grammarCompleted + listeningCompleted + speakingWithFeedback;
  const totalAssigned = readingSessions.length + grammarSessions.length + listeningSessions.length + speakingSubmissions.length;
  const completionRate = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="border-b bg-white p-4">
        <div className="mx-auto max-w-7xl px-6">
          <h1 className="text-3xl font-bold text-slate-900">{studentName}의 학습 진도</h1>
          <p className="text-slate-600 mt-1">Jr. Learning 모듈 진행 현황을 확인합니다</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-12">
        {/* Overall Progress */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 shadow text-center">
            <div className="text-3xl font-bold text-slate-900">{completionRate}%</div>
            <p className="text-xs text-slate-600 mt-1">전체 완료율</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow text-center">
            <div className="text-3xl font-bold text-emerald-600">{readingCompleted}</div>
            <p className="text-xs text-slate-600 mt-1">Reading</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow text-center">
            <div className="text-3xl font-bold text-blue-600">{grammarCompleted}</div>
            <p className="text-xs text-slate-600 mt-1">Grammar</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow text-center">
            <div className="text-3xl font-bold text-amber-600">{listeningCompleted}</div>
            <p className="text-xs text-slate-600 mt-1">Listening</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow text-center">
            <div className="text-3xl font-bold text-purple-600">{speakingWithFeedback}</div>
            <p className="text-xs text-slate-600 mt-1">Speaking</p>
          </div>
        </div>

        {/* Progress Visualization */}
        <div className="bg-white rounded-lg p-6 shadow mb-8">
          <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 transition-all"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <p className="text-sm text-slate-600 mt-3">
            {totalCompleted} / {totalAssigned} 과제 완료
          </p>
        </div>

        {/* Module Details */}
        <div className="grid grid-cols-2 gap-6">
          {/* Reading */}
          <div className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-lg font-bold text-emerald-600 mb-4">📚 Reading</h2>
            <p className="text-sm text-slate-600 mb-2">
              {readingCompleted} / {readingSessions.length} 완료
            </p>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500"
                style={{
                  width: `${readingSessions.length > 0 ? (readingCompleted / readingSessions.length) * 100 : 0}%`,
                }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-3">
              {readingSessions.length > 0 ? "학습 중" : "할당된 과제 없음"}
            </p>
          </div>

          {/* Grammar */}
          <div className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-lg font-bold text-blue-600 mb-4">🔤 Grammar</h2>
            <p className="text-sm text-slate-600 mb-2">
              {grammarCompleted} / {grammarSessions.length} 완료
            </p>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500"
                style={{
                  width: `${grammarSessions.length > 0 ? (grammarCompleted / grammarSessions.length) * 100 : 0}%`,
                }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-3">
              {grammarSessions.length > 0 ? "학습 중" : "할당된 단원 없음"}
            </p>
          </div>

          {/* Listening */}
          <div className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-lg font-bold text-amber-600 mb-4">🔊 Listening</h2>
            <p className="text-sm text-slate-600 mb-2">
              {listeningCompleted} / {listeningSessions.length} 완료
            </p>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500"
                style={{
                  width: `${listeningSessions.length > 0 ? (listeningCompleted / listeningSessions.length) * 100 : 0}%`,
                }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-3">
              {listeningSessions.length > 0 ? "학습 중" : "할당된 음성 없음"}
            </p>
          </div>

          {/* Speaking */}
          <div className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-lg font-bold text-purple-600 mb-4">🎤 Speaking</h2>
            <p className="text-sm text-slate-600 mb-2">
              {speakingWithFeedback} / {speakingSubmissions.length} 피드백 완료
            </p>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500"
                style={{
                  width: `${speakingSubmissions.length > 0 ? (speakingWithFeedback / speakingSubmissions.length) * 100 : 0}%`,
                }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-3">
              {speakingSubmissions.length > 0 ? "검수 중" : "할당된 과제 없음"}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
