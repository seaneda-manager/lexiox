"use client";

import React, { useState } from "react";

type Session = {
  id: string;
  student_id: string;
  stage: string;
  completed_at: string | null;
  students: { id: string; full_name: string; username: string };
};

const READING_STAGES = ["vocabulary", "grammar", "reading", "comprehension", "discussion"];

export default function JrReadingTab({ sessions }: { sessions: Session[] }) {
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  // 학생별로 그룹화
  const sessionsByStudent = sessions.reduce(
    (acc, session) => {
      const studentId = session.student_id;
      if (!acc[studentId]) {
        acc[studentId] = { student: session.students, sessions: [] };
      }
      acc[studentId].sessions.push(session);
      return acc;
    },
    {} as Record<string, { student: any; sessions: Session[] }>
  );

  return (
    <div className="space-y-4">
      {Object.entries(sessionsByStudent).map(([studentId, data]) => {
        const completedCount = data.sessions.filter((s) => s.completed_at).length;
        const progressPercent = Math.round((completedCount / data.sessions.length) * 100);

        return (
          <div key={studentId} className="bg-white rounded-lg p-4 shadow">
            <button
              onClick={() =>
                setExpandedStudent(expandedStudent === studentId ? null : studentId)
              }
              className="w-full text-left flex items-center justify-between hover:bg-slate-50 p-2 rounded transition"
            >
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">
                  {data.student.full_name}
                </h3>
                <p className="text-xs text-slate-500">@{data.student.username}</p>
              </div>
              <div className="text-right mr-4">
                <div className="text-lg font-bold text-emerald-600">
                  {completedCount}/{data.sessions.length}
                </div>
                <div className="text-xs text-slate-600">{progressPercent}%</div>
              </div>
              <div className="text-xl text-slate-400">
                {expandedStudent === studentId ? "▼" : "▶"}
              </div>
            </button>

            {/* Progress Bar */}
            <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Expanded Sessions */}
            {expandedStudent === studentId && (
              <div className="mt-4 space-y-2">
                {data.sessions.map((session, idx) => {
                  const stageIndex = READING_STAGES.indexOf(session.stage);
                  const nextStage =
                    stageIndex >= 0 && stageIndex < READING_STAGES.length - 1
                      ? READING_STAGES[stageIndex + 1]
                      : null;

                  return (
                    <div
                      key={session.id}
                      className="bg-slate-50 rounded p-3 text-sm border border-slate-200"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">
                          Session {idx + 1}
                        </span>
                        {session.completed_at ? (
                          <span className="text-xs font-bold text-emerald-600">
                            ✓ 완료
                          </span>
                        ) : (
                          <span className="text-xs text-slate-600">
                            진행 중: {
                              READING_STAGES[stageIndex]
                                ?.replace("vocabulary", "단어")
                                .replace("grammar", "문법")
                                .replace("reading", "해석")
                                .replace("comprehension", "이해")
                                .replace("discussion", "토론") || session.stage
                            }
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        {stageIndex >= 0 && (
                          <>
                            {stageIndex + 1} / {READING_STAGES.length} 단계
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {Object.keys(sessionsByStudent).length === 0 && (
        <div className="text-center py-12 text-slate-500">
          할당된 학생이 없습니다
        </div>
      )}
    </div>
  );
}
