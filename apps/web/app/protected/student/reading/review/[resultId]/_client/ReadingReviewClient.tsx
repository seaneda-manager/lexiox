'use client';

import { useState } from 'react';

interface ReviewQuestion {
  id: string;
  number: number;
  stem: string;
  type: string;
  itemType: string;
  userAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: any | null;
}

interface ReviewData {
  testId: string;
  testLabel: string;
  stage1: { correct: number; total: number; score: number };
  stage2: { correct: number; total: number; score: number };
  questions: ReviewQuestion[];
}

interface ReviewProgressProps {
  reviewData: ReviewData;
}

interface ReviewStageState {
  vocabulary: { word: string; pos: string; meaning: string }[];
  interpretation: string;
  highlightedEvidence: string[];
  questionType: string;
  explanationFills: Record<string, string>;
}

const REVIEW_WORKFLOW = [
  {
    key: 'answer_check',
    label: '1. 정답/오답 확인',
    description: '문제의 정답과 오답을 확인합니다'
  },
  {
    key: 'vocabulary_analysis',
    label: '2. 단어 분석',
    description: '모르는 단어와 표현을 찾아 정리합니다'
  },
  {
    key: 'interpretation',
    label: '3. 해석하기',
    description: '지문을 한글로 해석합니다'
  },
  {
    key: 'evidence_finding',
    label: '4. 근거 찾기',
    description: '정답에 대한 근거를 지문에서 찾습니다'
  },
  {
    key: 'question_type',
    label: '5. 문제 유형',
    description: '문제의 유형을 확인합니다'
  },
  {
    key: 'explanation_fill',
    label: '6. 설명 채우기',
    description: '설명에서 빈칸을 채웁니다'
  },
];

export function ReadingReviewClient({ reviewData }: ReviewProgressProps) {
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>(
    reviewData.questions[0]?.id || ''
  );
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [stageStates, setStageStates] = useState<Record<string, ReviewStageState>>({});

  const selectedQuestion = reviewData.questions.find((q) => q.id === selectedQuestionId);
  if (!selectedQuestion) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          문제가 없습니다
        </div>
      </div>
    );
  }

  const isCorrect = selectedQuestion.isCorrect;
  const currentStage = REVIEW_WORKFLOW[currentStageIndex];
  const currentState = stageStates[selectedQuestionId] || {
    vocabulary: [],
    interpretation: '',
    highlightedEvidence: [],
    questionType: '',
    explanationFills: {},
  };

  const updateState = (updates: Partial<ReviewStageState>) => {
    setStageStates((prev) => ({
      ...prev,
      [selectedQuestionId]: {
        ...currentState,
        ...updates,
      },
    }));
  };

  const moveToNextStage = () => {
    if (currentStageIndex < REVIEW_WORKFLOW.length - 1) {
      setCurrentStageIndex(currentStageIndex + 1);
    }
  };

  const moveToPrevStage = () => {
    if (currentStageIndex > 0) {
      setCurrentStageIndex(currentStageIndex - 1);
    }
  };

  const getSentenceWithBlanks = () => {
    const sentence = selectedQuestion.stem;
    const correctAnswer = selectedQuestion.correctAnswer;

    if (selectedQuestion.type !== 'complete_words' || !correctAnswer) {
      return sentence;
    }

    const lowerSentence = sentence.toLowerCase();
    const lowerCorrect = correctAnswer.toLowerCase();
    const idx = lowerSentence.indexOf(lowerCorrect);

    if (idx === -1) return sentence;

    return {
      before: sentence.substring(0, idx),
      after: sentence.substring(idx + correctAnswer.length),
    };
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* 헤더 */}
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Reading 리뷰
        </h2>
        <p className="text-sm text-slate-500">
          {currentStage.label} - {currentStage.description}
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* 메인 콘텐츠 */}
        <div className="col-span-8 space-y-6">
          {/* 문제 선택기 */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-slate-900">문제 선택</h2>
            <div className="grid grid-cols-10 gap-2">
              {reviewData.questions.map((q) => (
                <button
                  key={q.id}
                  onClick={() => {
                    setSelectedQuestionId(q.id);
                    setCurrentStageIndex(0);
                  }}
                  className={`rounded-lg border-2 py-1.5 text-xs font-semibold transition ${
                    selectedQuestionId === q.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {q.number}
                </button>
              ))}
            </div>
          </div>

          {/* 단계별 UI 렌더링 */}
          {currentStage.key === 'answer_check' && (
            <div className="space-y-4">
              {/* 지문 + 문제 */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                {selectedQuestion.type === 'complete_words' ? (
                  <>
                    <h3 className="mb-4 text-sm font-bold text-slate-900">
                      #{selectedQuestion.number} 빈칸 채우기
                    </h3>

                    {/* 빈칸이 있는 문장 - 사용자 답변 */}
                    <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-4">
                      <p className="text-xs font-semibold text-rose-700 uppercase mb-2">
                        {isCorrect ? '✓ 정답 - 당신의 답' : '✗ 오답 - 당신의 답'}
                      </p>
                      <p className="text-sm leading-relaxed text-slate-700">
                        {typeof getSentenceWithBlanks() === 'string' ? (
                          getSentenceWithBlanks()
                        ) : (
                          <>
                            {getSentenceWithBlanks().before}
                            <span className={`font-bold px-1 rounded ${
                              isCorrect
                                ? 'bg-emerald-300 text-emerald-900'
                                : 'bg-rose-300 text-rose-900'
                            }`}>
                              {selectedQuestion.userAnswer || '(미답)'}
                            </span>
                            {getSentenceWithBlanks().after}
                          </>
                        )}
                      </p>
                    </div>

                    {/* 빈칸이 있는 문장 - 정답 */}
                    <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                      <p className="text-xs font-semibold text-blue-700 uppercase mb-2">정답</p>
                      <p className="text-sm leading-relaxed text-slate-700">
                        {typeof getSentenceWithBlanks() === 'string' ? (
                          getSentenceWithBlanks()
                        ) : (
                          <>
                            {getSentenceWithBlanks().before}
                            <span className="font-bold px-1 rounded bg-blue-400 text-blue-900">
                              {selectedQuestion.correctAnswer}
                            </span>
                            {getSentenceWithBlanks().after}
                          </>
                        )}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="mb-4 text-sm font-bold text-slate-900">지문</h3>
                    <div className="mb-6 rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                      {selectedQuestion.stem}
                    </div>

                    <h3 className="mb-3 text-sm font-bold text-slate-900">
                      문제 {selectedQuestion.number}
                    </h3>
                    <div className="mb-4 rounded-lg bg-gray-50 p-3">
                      <p className="text-sm text-slate-700">{selectedQuestion.type}</p>
                      <p className="text-xs text-slate-500">{selectedQuestion.itemType}</p>
                    </div>

                    <div className="space-y-2">
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-slate-700 mb-2">답안:</p>
                        <div className={`rounded-lg border-2 p-3 text-sm font-mono ${
                          isCorrect
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-rose-500 bg-rose-50 text-rose-700'
                        }`}>
                          {selectedQuestion.userAnswer || '(미답)'}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700 mb-2">정답:</p>
                        <div className="rounded-lg border-2 border-blue-500 bg-blue-50 p-3 text-sm font-mono text-blue-700">
                          {selectedQuestion.correctAnswer}
                        </div>
                      </div>
                    </div>

                    {selectedQuestion.explanation && (
                      <div className="mt-4 rounded-lg border border-purple-200 bg-purple-50 p-3">
                        <p className="text-xs font-semibold text-purple-700 uppercase">설명</p>
                        <p className="mt-1 text-sm text-purple-900">
                          {selectedQuestion.explanation}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {currentStage.key === 'vocabulary_analysis' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-bold text-slate-900">
                단어 및 표현 분석
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                지문에서 모르는 단어나 표현을 선택하세요 (클릭하면 추가됩니다)
              </p>
              <div className="rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 mb-6">
                {selectedQuestion.stem}
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-600 uppercase mb-3">
                  선택한 단어 ({currentState.vocabulary.length}개)
                </h4>
                {currentState.vocabulary.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">선택된 단어가 없습니다</p>
                ) : (
                  <div className="space-y-2">
                    {currentState.vocabulary.map((item, idx) => (
                      <div key={idx} className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs">
                        <p className="font-bold text-amber-900">{item.word}</p>
                        <p className="text-amber-700">{item.pos} - {item.meaning}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStage.key === 'interpretation' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-bold text-slate-900">지문 해석</h3>
              <p className="text-sm text-slate-600 mb-4">
                다음 지문을 한글로 해석해보세요
              </p>
              <div className="rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 mb-4">
                {selectedQuestion.stem}
              </div>
              <textarea
                value={currentState.interpretation}
                onChange={(e) => updateState({ interpretation: e.target.value })}
                placeholder="여기에 한글 해석을 입력하세요..."
                className="w-full rounded-lg border border-slate-300 p-3 text-sm placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                rows={6}
              />
            </div>
          )}

          {currentStage.key === 'evidence_finding' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-bold text-slate-900">
                근거 찾기
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                정답에 대한 근거를 지문에서 찾아 하이라이트하세요
              </p>
              <div className="rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                {selectedQuestion.stem}
              </div>
              <div className="mt-4">
                <p className="text-xs font-bold text-slate-600 uppercase mb-2">
                  정답: {selectedQuestion.correctAnswer}
                </p>
                <p className="text-xs text-slate-500">
                  지문에서 드래그하여 근거를 선택하세요 (현재 기능 개발 중)
                </p>
              </div>
            </div>
          )}

          {currentStage.key === 'question_type' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-bold text-slate-900">문제 유형 분석</h3>
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <p className="text-sm font-bold text-blue-900 mb-2">{selectedQuestion.type}</p>
                <p className="text-sm text-blue-800">{selectedQuestion.itemType}</p>
              </div>
            </div>
          )}

          {currentStage.key === 'explanation_fill' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-bold text-slate-900">설명 채우기</h3>
              <p className="text-sm text-slate-600 mb-4">
                다음 설명의 빈칸을 채우세요
              </p>
              {selectedQuestion.explanation ? (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm">
                  <p className="text-purple-900">{selectedQuestion.explanation}</p>
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">설명이 없습니다</p>
              )}
            </div>
          )}
        </div>

        {/* 사이드바 */}
        <div className="col-span-4 space-y-6">
          {/* 테스트 정보 */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-900">테스트 정보</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-slate-600">테스트:</p>
                <p className="font-semibold text-slate-900">{reviewData.testLabel}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-blue-50 p-2">
                  <p className="text-xs text-blue-600">Stage 1</p>
                  <p className="font-bold text-blue-700">
                    {reviewData.stage1.correct}/{reviewData.stage1.total}
                  </p>
                </div>
                <div className="rounded-lg bg-purple-50 p-2">
                  <p className="text-xs text-purple-600">Stage 2</p>
                  <p className="font-bold text-purple-700">
                    {reviewData.stage2.correct}/{reviewData.stage2.total}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 진행도 */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-900">학습 진행도</h3>
            <div className="space-y-2">
              {REVIEW_WORKFLOW.map((stage, idx) => (
                <div
                  key={stage.key}
                  className={`rounded-lg border-2 p-2 text-xs transition ${
                    idx === currentStageIndex
                      ? 'border-blue-500 bg-blue-50'
                      : idx < currentStageIndex
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                        idx < currentStageIndex
                          ? 'bg-emerald-500 text-white'
                          : idx === currentStageIndex
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-300 text-slate-600'
                      }`}
                    >
                      {idx < currentStageIndex ? '✓' : idx + 1}
                    </div>
                    <span className="font-semibold text-slate-900">{stage.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 네비게이션 버튼 */}
          <div className="space-y-2">
            <button
              onClick={moveToPrevStage}
              disabled={currentStageIndex === 0}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              ← 이전 단계
            </button>
            <button
              onClick={moveToNextStage}
              disabled={currentStageIndex === REVIEW_WORKFLOW.length - 1}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
            >
              다음 단계 →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
