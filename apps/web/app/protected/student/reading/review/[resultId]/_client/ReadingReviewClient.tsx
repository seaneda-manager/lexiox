'use client';

import { useState } from 'react';

interface ReadingResult {
  id: string;
  test_id: string;
  raw_result: any[];
  total_questions: number;
  review_attempts: any[];
  created_at: string;
}

interface ReviewProgressProps {
  resultId: string;
  initialResult: ReadingResult;
}

const READING_STAGES = [
  { key: 'explanation_read', label: '오답 설명 읽기', step: 1, onlyWrong: true },
  { key: 'evidence_highlight', label: '근거 찾기 (하일라이트)', step: 2 },
  { key: 'interpretation', label: '해석하기', step: 3 },
  { key: 'question_type', label: '문제유형 확인', step: 4 },
  { key: 'choices_interpretation', label: '문제/보기 해석', step: 5 },
];

// Mock 데이터 (실제로는 API에서 받아야 함)
const MOCK_PASSAGES: Record<string, string> = {
  '1': 'The rapid advancement of artificial intelligence has transformed numerous industries. From healthcare to finance, AI systems are increasingly making critical decisions that were previously handled by humans. However, this shift raises important questions about accountability and transparency. When an AI system makes a mistake, it is often unclear who bears the responsibility—the developers, the companies deploying the system, or the AI itself. Furthermore, the "black box" nature of many machine learning models means that even the developers cannot always explain why a particular decision was made.',
};

const MOCK_QUESTIONS: Record<string, { text: string; type: string; choices: string[] }> = {
  '1': {
    text: 'According to the passage, what is a major concern with AI decision-making systems?',
    type: 'Main Idea',
    choices: [
      'AI systems are not yet advanced enough for critical decisions',
      'It is unclear who is responsible when AI systems make errors',
      'AI systems are too expensive for most companies to implement',
      'Most people do not understand how AI technology works',
    ],
  },
};

export function ReadingReviewClient({
  resultId,
  initialResult,
}: ReviewProgressProps) {
  const [result, setResult] = useState<ReadingResult>(initialResult);
  const [selectedQuestion, setSelectedQuestion] = useState('1');
  const [currentStage, setCurrentStage] = useState('explanation_read');
  const [loading, setLoading] = useState(false);
  const [highlightedText, setHighlightedText] = useState<string[]>([]);

  const question = MOCK_QUESTIONS[selectedQuestion];
  const passage = MOCK_PASSAGES[selectedQuestion];
  const rawResult = result.raw_result?.[0] || {};
  const isCorrect = rawResult.isCorrect;

  const handleProgressStage = async (nextStageName: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/review/reading/add-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resultId,
          questionId: selectedQuestion,
          stage: nextStageName,
        }),
      });

      if (!response.ok) throw new Error('Failed to save attempt');

      const reviewResponse = await fetch(
        `/api/review/get-review-data?type=reading&resultId=${resultId}`
      );
      const reviewData = await reviewResponse.json();

      setResult({
        ...result,
        review_attempts: reviewData.attempts,
      });

      const nextIdx = READING_STAGES.findIndex((s) => s.key === nextStageName);
      if (nextIdx < READING_STAGES.length - 1) {
        setCurrentStage(READING_STAGES[nextIdx + 1].key);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const applicableStages = isCorrect
    ? READING_STAGES.filter((s) => !s.onlyWrong)
    : READING_STAGES;

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      {/* 헤더 */}
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Student / Reading / 리뷰
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Reading 리뷰
        </h1>
        <p className="text-sm text-slate-500">
          {isCorrect ? '정답' : '오답'}에 대해 학습하세요
        </p>
      </header>

      <div className="grid grid-cols-12 gap-6">
        {/* 메인 콘텐츠 */}
        <div className="col-span-8 space-y-6">
          {/* 문제 선택기 */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-slate-900">문제 선택</h2>
            <div className="grid grid-cols-10 gap-2">
              {Array.from({ length: 40 }, (_, i) => {
                const qNum = String(i + 1);
                return (
                  <button
                    key={qNum}
                    onClick={() => setSelectedQuestion(qNum)}
                    className={`rounded-lg border-2 py-1.5 text-xs font-semibold transition ${
                      selectedQuestion === qNum
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {qNum}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 지문 + 문제 */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-900">지문</h3>
            <div className="mb-6 rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
              {passage}
            </div>

            <h3 className="mb-3 text-sm font-bold text-slate-900">문제 {selectedQuestion}</h3>
            <p className="mb-4 text-sm text-slate-700">{question?.text}</p>

            <div className="space-y-2">
              {question?.choices.map((choice, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg border-2 p-3 text-sm ${
                    idx === 1 // 정답이 보기 2번이라고 가정
                      ? isCorrect
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-rose-500 bg-rose-50 text-rose-700'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <strong>{String.fromCharCode(65 + idx)}.</strong> {choice}
                </div>
              ))}
            </div>
          </div>

          {/* Stage 진행도 */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-900">
              리뷰 진행 - {applicableStages.find((s) => s.key === currentStage)?.label}
            </h3>

            <div className="space-y-3 mb-6">
              {applicableStages.map((stage) => {
                const stageIdx = applicableStages.findIndex((s) => s.key === stage.key);
                const currentIdx = applicableStages.findIndex((s) => s.key === currentStage);
                const isCompleted = stageIdx < currentIdx;
                const isCurrent = stage.key === currentStage;

                return (
                  <div
                    key={stage.key}
                    className={`rounded-lg border-2 p-3 ${
                      isCurrent
                        ? 'border-blue-500 bg-blue-50'
                        : isCompleted
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          isCurrent
                            ? 'bg-blue-500 text-white'
                            : isCompleted
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-300 text-slate-700'
                        }`}
                      >
                        {isCompleted ? '✓' : stage.step}
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{stage.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stage 컨텐츠 */}
            <div className="mb-6 rounded-lg bg-blue-50 p-4">
              <p className="text-center text-sm text-slate-600">
                {applicableStages.find((s) => s.key === currentStage)?.label} 컨텐츠
              </p>
            </div>

            {/* 다음 단계 버튼 */}
            {(() => {
              const currentIdx = applicableStages.findIndex((s) => s.key === currentStage);
              return currentIdx < applicableStages.length - 1 ? (
                <button
                  onClick={() => {
                    const nextStage = applicableStages[currentIdx + 1];
                    handleProgressStage(nextStage.key);
                  }}
                  disabled={loading}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
                >
                  {loading ? '저장 중...' : '다음 단계로 진행'}
                </button>
              ) : (
                <button
                  disabled
                  className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white"
                >
                  ✓ 이 문제 리뷰 완료!
                </button>
              );
            })()}
          </div>
        </div>

        {/* 사이드바 */}
        <div className="col-span-4 space-y-6">
          {/* 결과 상태 */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-900">이 문제</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">상태:</span>
                <span
                  className={`font-semibold ${
                    isCorrect ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {isCorrect ? '✓ 정답' : '✗ 오답'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">문제유형:</span>
                <span className="font-semibold">{question?.type}</span>
              </div>
            </div>
          </div>

          {/* 진행도 */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-900">리뷰 진행도</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">현재 문제:</span>
                <span className="font-semibold">{selectedQuestion}/40</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">리뷰 시도:</span>
                <span className="font-semibold">{result.review_attempts?.length || 0}회</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
