"use client";

import { useEffect, useState } from "react";

type ResultData = {
  testId: string;
  testLabel: string;
  stage1: {
    correct: number;
    total: number;
    score: number;
  };
  stage2: {
    correct: number;
    total: number;
    score: number;
  };
  questions: Array<{
    id: string;
    number: number;
    stem: string;
    type: "complete_words" | "daily_life" | "academic_passage";
    userAnswer: string | null;
    correctAnswer: string;
    isCorrect: boolean;
    itemType: string;
    explanation: {
      question_interpretation: string | null;
      evidence_interpretation: string | null;
      correct_choice_explanation: string | null;
      incorrect_choices: Array<{
        choiceId: string;
        interpretation: string;
        whyWrong: string;
      }> | null;
      vocabulary_notes: Record<string, string> | null;
    } | null;
  }>;
};

export default function ReadingResultPage({ params }: { params: Promise<{ resultId: string }> }) {
  const [result, setResult] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const { resultId } = await params;
        const res = await fetch(`/api/updated-reading/result/${resultId}`);
        if (!res.ok) throw new Error("결과를 불러올 수 없습니다");
        const data = await res.json();
        setResult(data);
      } catch (e) {
        console.error("Result fetch error:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [params]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">📊</div>
          <p className="text-gray-600">결과를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">결과를 불러올 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const totalCorrect = result.stage1.correct + result.stage2.correct;
  const totalQuestions = result.stage1.total + result.stage2.total;
  const totalScore = Math.round((totalCorrect / totalQuestions) * 100);

  const typeLabels: Record<string, string> = {
    complete_words: "단어 채우기",
    daily_life: "일상 읽기",
    academic_passage: "학술 지문",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {/* 헤더 */}
        <div className="mb-8 rounded-2xl border border-emerald-200 bg-white p-8 shadow-md">
          <div className="mb-4 flex items-center gap-3">
            <div className="text-5xl">🏆</div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Reading 완료!</h1>
              <p className="text-sm text-gray-500">{result.testLabel}</p>
            </div>
          </div>

          {/* 총점 */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-50 p-4 text-center">
              <div className="text-4xl font-bold text-emerald-700">{totalScore}%</div>
              <div className="text-xs text-emerald-600">총점</div>
            </div>
            <div className="rounded-lg bg-blue-100 p-4 text-center">
              <div className="text-2xl font-bold text-blue-700">
                {result.stage1.correct}/{result.stage1.total}
              </div>
              <div className="text-xs text-blue-600">Stage 1</div>
            </div>
            <div className="rounded-lg bg-purple-100 p-4 text-center">
              <div className="text-2xl font-bold text-purple-700">
                {result.stage2.correct}/{result.stage2.total}
              </div>
              <div className="text-xs text-purple-600">Stage 2</div>
            </div>
          </div>
        </div>

        {/* 문제별 결과 */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-gray-900">문제별 결과</h2>
          {result.questions.map((q) => (
            <div
              key={q.id}
              className={`rounded-lg border-l-4 p-4 ${
                q.isCorrect
                  ? "border-l-emerald-500 bg-emerald-50"
                  : "border-l-red-500 bg-red-50"
              }`}
            >
              {/* 문제 헤더 */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-gray-700">
                      {q.number}. {typeLabels[q.type]} ({q.itemType})
                    </span>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                        q.isCorrect
                          ? "bg-emerald-200 text-emerald-800"
                          : "bg-red-200 text-red-800"
                      }`}
                    >
                      {q.isCorrect ? "정답" : "오답"}
                    </span>
                  </div>
                  <p className="mb-3 text-sm text-gray-700 line-clamp-2">
                    {q.stem}
                  </p>
                  <div className="space-y-1 text-xs">
                    {q.userAnswer && (
                      <div className="text-gray-600">
                        <span className="font-semibold">내 답:</span> {q.userAnswer}
                      </div>
                    )}
                    <div className={`font-semibold ${q.isCorrect ? "text-emerald-700" : "text-red-700"}`}>
                      <span>정답:</span> {q.correctAnswer}
                    </div>
                  </div>
                </div>
                <div className="ml-4 text-3xl">{q.isCorrect ? "✅" : "❌"}</div>
              </div>

              {/* 리뷰 섹션 */}
              {q.explanation && (
                <div className="mt-4 border-t pt-4 space-y-3">
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                    📚 해설
                  </h3>

                  {/* 문제 해석 */}
                  {q.explanation.question_interpretation && (
                    <div className="text-xs">
                      <p className="font-semibold text-gray-700 mb-1">
                        • 문제 해석
                      </p>
                      <p className="text-gray-600 leading-relaxed">
                        {q.explanation.question_interpretation}
                      </p>
                    </div>
                  )}

                  {/* 근거 해석 */}
                  {q.explanation.evidence_interpretation && (
                    <div className="text-xs">
                      <p className="font-semibold text-gray-700 mb-1">
                        • 근거 해석
                      </p>
                      <p className="text-gray-600 leading-relaxed">
                        {q.explanation.evidence_interpretation}
                      </p>
                    </div>
                  )}

                  {/* 정답 설명 */}
                  {q.explanation.correct_choice_explanation && (
                    <div className="text-xs">
                      <p className="font-semibold text-emerald-700 mb-1">
                        • 정답 설명
                      </p>
                      <p className="text-gray-600 leading-relaxed">
                        {q.explanation.correct_choice_explanation}
                      </p>
                    </div>
                  )}

                  {/* 오답 선택지 설명 */}
                  {q.explanation.incorrect_choices &&
                    q.explanation.incorrect_choices.length > 0 && (
                      <div className="text-xs">
                        <p className="font-semibold text-red-700 mb-1">
                          • 오답 분석
                        </p>
                        <div className="space-y-2">
                          {q.explanation.incorrect_choices.map((ic, idx) => (
                            <div
                              key={idx}
                              className="rounded-md bg-red-50 p-2"
                            >
                              <p className="font-semibold text-red-800 mb-0.5">
                                {ic.choiceId}:
                              </p>
                              <p className="text-gray-600">
                                {ic.interpretation}
                              </p>
                              <p className="text-red-600 text-[10px] mt-1">
                                ❌ {ic.whyWrong}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* 단어 정의 */}
                  {q.explanation.vocabulary_notes &&
                    Object.keys(q.explanation.vocabulary_notes).length > 0 && (
                      <div className="text-xs">
                        <p className="font-semibold text-blue-700 mb-1">
                          • 핵심 단어
                        </p>
                        <div className="space-y-1">
                          {Object.entries(
                            q.explanation.vocabulary_notes
                          ).map(([word, def]) => (
                            <div key={word} className="text-gray-600">
                              <span className="font-semibold text-blue-600">
                                {word}:
                              </span>{" "}
                              {def}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 하단 버튼 */}
        <div className="mt-8 flex gap-3">
          <button
            onClick={() => window.history.back()}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            ← 돌아가기
          </button>
          <button
            onClick={() => window.location.href = "/updated-reading"}
            className="flex-1 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            새 시험 풀기 →
          </button>
        </div>
      </div>
    </div>
  );
}
