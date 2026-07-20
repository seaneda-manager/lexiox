"use client";

import React, { useState } from "react";
import { submitFeedbackAction } from "../actions";

type Submission = {
  id: string;
  task_id: string;
  student_id: string;
  submitted_at: string;
  writing_text?: string;
  audio_url?: string;
  teacher_feedback?: string;
  students: { id: string; full_name: string; username: string };
  jr_speaking_writing_tasks: {
    id: string;
    task_type: "speaking" | "writing" | "speaking_and_writing";
    prompt: string;
    due_date: string;
  };
};

export default function JrSpeakingWritingTab({
  submissions,
  teacherId,
}: {
  submissions: Submission[];
  teacherId: string;
}) {
  const [expandedSubmission, setExpandedSubmission] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});

  const handleSubmitFeedback = async (submissionId: string) => {
    setSubmitting((prev) => ({ ...prev, [submissionId]: true }));
    const result = await submitFeedbackAction({
      submissionId,
      feedback: feedbackText[submissionId],
    });
    if (result.ok) {
      setFeedbackText((prev) => ({ ...prev, [submissionId]: "" }));
      setExpandedSubmission(null);
    }
    setSubmitting((prev) => ({ ...prev, [submissionId]: false }));
  };

  // 학생별로 그룹화
  const submissionsByStudent = submissions.reduce(
    (acc, sub) => {
      const studentId = sub.student_id;
      if (!acc[studentId]) {
        acc[studentId] = { student: sub.students, submissions: [] };
      }
      acc[studentId].submissions.push(sub);
      return acc;
    },
    {} as Record<string, { student: any; submissions: Submission[] }>
  );

  return (
    <div className="space-y-4">
      {Object.entries(submissionsByStudent).map(([studentId, data]) => {
        const pendingCount = data.submissions.filter((s) => !s.teacher_feedback).length;
        const completedCount = data.submissions.filter((s) => s.teacher_feedback).length;

        return (
          <div key={studentId} className="bg-white rounded-lg p-4 shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-900">
                  {data.student.full_name}
                </h3>
                <p className="text-xs text-slate-500">@{data.student.username}</p>
              </div>
              <div className="text-right">
                <div className="text-xs text-purple-600 font-semibold">
                  피드백 {completedCount}/{data.submissions.length}
                </div>
                {pendingCount > 0 && (
                  <div className="text-xs text-orange-600 mt-1">
                    대기 중: {pendingCount}개
                  </div>
                )}
              </div>
            </div>

            {/* Submissions List */}
            <div className="space-y-2">
              {data.submissions.map((sub) => (
                <div
                  key={sub.id}
                  className={`rounded p-3 border ${
                    sub.teacher_feedback
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-orange-50 border-orange-200"
                  }`}
                >
                  <button
                    onClick={() =>
                      setExpandedSubmission(
                        expandedSubmission === sub.id ? null : sub.id
                      )
                    }
                    className="w-full text-left flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-900">
                        {sub.jr_speaking_writing_tasks.task_type === "speaking"
                          ? "🎤"
                          : "✍️"}{" "}
                        {sub.jr_speaking_writing_tasks.task_type === "speaking"
                          ? "Speaking"
                          : sub.jr_speaking_writing_tasks.task_type === "writing"
                          ? "Writing"
                          : "Speaking & Writing"}
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        {sub.jr_speaking_writing_tasks.prompt.substring(0, 60)}...
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(sub.submitted_at).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                    <div className="text-right">
                      {sub.teacher_feedback ? (
                        <span className="text-xs font-bold text-emerald-600">
                          ✓ 완료
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-orange-600">
                          대기 중
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Expanded Submission */}
                  {expandedSubmission === sub.id && (
                    <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
                      {/* Student Content */}
                      {sub.writing_text && (
                        <div>
                          <p className="text-xs font-semibold text-slate-600 mb-2">
                            학생 작성
                          </p>
                          <div className="bg-white rounded p-3 text-sm text-slate-700 border border-slate-200 max-h-32 overflow-y-auto">
                            {sub.writing_text}
                          </div>
                        </div>
                      )}

                      {sub.audio_url && (
                        <div>
                          <p className="text-xs font-semibold text-slate-600 mb-2">
                            음성 녹음
                          </p>
                          <audio controls className="w-full">
                            <source src={sub.audio_url} />
                          </audio>
                        </div>
                      )}

                      {/* Feedback */}
                      <div>
                        <p className="text-xs font-semibold text-slate-600 mb-2">
                          선생님 피드백
                        </p>
                        <textarea
                          value={feedbackText[sub.id] || ""}
                          onChange={(e) =>
                            setFeedbackText((prev) => ({
                              ...prev,
                              [sub.id]: e.target.value,
                            }))
                          }
                          placeholder="피드백을 입력하세요..."
                          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                          rows={4}
                        />
                        <button
                          onClick={() => handleSubmitFeedback(sub.id)}
                          disabled={submitting[sub.id] || !feedbackText[sub.id]}
                          className="w-full mt-2 px-4 py-2 bg-purple-600 text-white text-sm rounded font-semibold hover:bg-purple-700 disabled:bg-slate-300"
                        >
                          {submitting[sub.id] ? "제출 중..." : "피드백 제출"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {Object.keys(submissionsByStudent).length === 0 && (
        <div className="text-center py-12 text-slate-500">
          제출물이 없습니다
        </div>
      )}
    </div>
  );
}
