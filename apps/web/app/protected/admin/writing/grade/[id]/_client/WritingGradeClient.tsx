"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { calcWritingRawScore, calcWritingBandScore } from "@/lib/writing/rubric";

type Props = {
  sessionId: string;
  gradingStatus: string;
  rawAnswers?: Record<string, any>;
  aiScores: { buildASentence: number | null; email: number | null; discussion: number | null; feedback: string | null };
  finalScores: { buildASentence: number | null; email: number | null; discussion: number | null; feedback: string | null };
};

function ScoreSelector({
  label,
  value,
  onChange,
  disabled,
  max = 5,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  max?: number;
}) {
  const range = Array.from({ length: max + 1 }, (_, i) => i);
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-slate-600">{label}</p>
      <div className="flex gap-2">
        {range.map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onChange(n)}
            className={`h-9 w-9 rounded-lg border text-sm font-bold transition-colors disabled:opacity-50 ${
              value === n
                ? "border-teal-500 bg-teal-600 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function WritingGradeClient({ sessionId, gradingStatus, rawAnswers = {}, aiScores, finalScores }: Props) {
  const router = useRouter();

  const initial = finalScores.email != null ? finalScores : {
    buildASentence: aiScores.buildASentence ?? 5,
    email: aiScores.email ?? 3,
    discussion: aiScores.discussion ?? 3,
    feedback: aiScores.feedback ?? "",
  };

  const [buildASentence, setBuildASentence] = useState<number>(initial.buildASentence ?? 5);
  const [email, setEmail] = useState<number>(initial.email ?? 3);
  const [discussion, setDiscussion] = useState<number>(initial.discussion ?? 3);
  const [feedback, setFeedback] = useState<string>(initial.feedback ?? "");

  const [aiLoading, setAiLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 가중치 공식: (Build × 0.5) + (Email × 2.5) + (Discussion × 2.5)
  const rawScore = calcWritingRawScore({ buildASentence, email, discussion });
  const bandScore = calcWritingBandScore(rawScore);

  const handleAiGrade = async () => {
    setAiLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/writing-2026/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json() as {
        ok: boolean;
        grading?: { scores: { buildASentence: number; email: number; discussion: number }; feedback: string };
        error?: string;
      };

      if (!data.ok) { setError(data.error ?? "AI 채점 실패"); return; }

      if (data.grading) {
        setBuildASentence(data.grading.scores.buildASentence);
        setEmail(data.grading.scores.email);
        setDiscussion(data.grading.scores.discussion);
        setFeedback(data.grading.feedback ?? "");
      }
      router.refresh();
    } catch {
      setError("AI 채점 요청 중 오류가 발생했습니다.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/writing-2026/finalize-grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, buildASentence, email, discussion, feedback }),
      });
      const data = await res.json() as { ok: boolean; bandScore?: number; error?: string };

      if (!data.ok) { setError(data.error ?? "채점 저장 실패"); return; }

      setSuccess(true);
      router.refresh();
    } catch {
      setError("채점 저장 중 오류가 발생했습니다.");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {gradingStatus === "ungraded" && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 px-4 py-4">
          <p className="mb-3 text-sm font-semibold text-blue-800">아직 AI 채점이 완료되지 않았습니다.</p>
          <button
            type="button"
            onClick={() => void handleAiGrade()}
            disabled={aiLoading}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {aiLoading ? "AI 채점 중..." : "AI 초안 채점 요청"}
          </button>
        </div>
      )}

      {gradingStatus === "ai_graded" && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50/40 px-4 py-3">
          <p className="text-sm text-blue-700">AI 초안이 반영됐습니다. 점수 수정 후 최종 확정하세요.</p>
          <button
            type="button"
            onClick={() => void handleAiGrade()}
            disabled={aiLoading}
            className="mt-2 text-xs text-blue-600 underline disabled:opacity-60"
          >
            {aiLoading ? "재채점 중..." : "AI 채점 다시 요청"}
          </button>
        </div>
      )}

      <div className="space-y-5 rounded-2xl border border-slate-200 bg-white px-5 py-5">
        <h3 className="text-sm font-bold text-slate-900">Updated TOEFL 2026 Writing 채점 (3 Sections)</h3>

        {/* 학생 답변 미리보기 */}
        <div className="space-y-3 rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-600">📝 학생 답변 미리보기</p>

          {/* Build a Sentence */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-700">1. Build a Sentence</p>
            {rawAnswers?.task_1_score_raw !== undefined ? (
              <p className="rounded-lg bg-white px-3 py-2 text-xs text-slate-700">
                점수: <span className="font-bold text-teal-600">{rawAnswers.task_1_score_raw}점</span>
              </p>
            ) : (
              <p className="text-xs text-slate-400">제출 없음</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-700">2. Email</p>
            {rawAnswers?.task_2_submission ? (
              <p className="rounded-lg bg-white px-3 py-2 text-xs leading-relaxed text-slate-700">
                {rawAnswers.task_2_submission}
              </p>
            ) : (
              <p className="text-xs text-slate-400">제출 없음</p>
            )}
          </div>

          {/* Discussion */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-700">3. Discussion</p>
            {rawAnswers?.task_3_submission ? (
              <p className="rounded-lg bg-white px-3 py-2 text-xs leading-relaxed text-slate-700 line-clamp-3">
                {rawAnswers.task_3_submission}
              </p>
            ) : (
              <p className="text-xs text-slate-400">제출 없음</p>
            )}
          </div>
        </div>

        {/* 채점 입력 */}
        <div className="space-y-3 border-t border-slate-200 pt-4">
          <p className="text-xs font-semibold text-slate-600">🎯 채점 입력</p>
          <ScoreSelector label="1. Choose a Response (Build a Sentence)" value={buildASentence} onChange={setBuildASentence} max={10} />
          <ScoreSelector label="2. Write an Email (이메일 / Integrated)" value={email} onChange={setEmail} max={5} />
          <ScoreSelector label="3. Academic Discussion (학문적 토론)" value={discussion} onChange={setDiscussion} max={5} />
        </div>

        <div className="space-y-2 rounded-xl bg-blue-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-600">원점수 (Raw Score: 0~30)</span>
            <span className="text-xl font-bold text-blue-900">{rawScore.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-600">밴드 점수 (Band Score: 1.0~6.0)</span>
            <span className="text-2xl font-bold text-blue-900">{bandScore.toFixed(1)}</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">피드백 (학생에게 표시됩니다)</label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
            placeholder="구체적인 개선 포인트를 한국어로 작성하세요..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-400 focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
      )}
      {success && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          채점이 완료됐습니다. 학생에게 결과가 공개됩니다.
        </p>
      )}

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={submitLoading || success}
        className="w-full rounded-xl bg-teal-600 py-3 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-60"
      >
        {submitLoading ? "저장 중..." : success ? "채점 완료" : "최종 채점 확정"}
      </button>
    </div>
  );
}
