'use client';

import { useState } from 'react';

interface ReviewQuestion {
  id: string;
  number: number;
  conversationNumber: number;
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
  correctCount: number;
  totalCount: number;
  score: number;
  questions: ReviewQuestion[];
}

interface ReviewProgressProps {
  reviewData: ReviewData;
}

interface ReviewStageState {
  vocabulary: { word: string; pos: string; meaning: string }[];
  interpretation: string;
  highlightedNotes: string[];
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
    key: 'listen_again',
    label: '2. 다시 듣기',
    description: '오디오를 반복 재생합니다'
  },
  {
    key: 'transcript_study',
    label: '3. 스크립트 학습',
    description: '지문을 읽고 해석합니다'
  },
  {
    key: 'vocabulary_analysis',
    label: '4. 단어 분석',
    description: '모르는 단어와 표현을 정리합니다'
  },
  {
    key: 'question_type',
    label: '5. 문제 유형',
    description: '문제의 유형을 확인합니다'
  },
  {
    key: 'shadowing',
    label: '6. 쉐도윙',
    description: '문장을 따라 말하기 연습'
  },
];

export function ListeningReviewClient({ reviewData }: ReviewProgressProps) {
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
    highlightedNotes: [],
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

  const moveToNextStage = async () => {
    if (currentStageIndex < REVIEW_WORKFLOW.length - 1) {
      setCurrentStageIndex(currentStageIndex + 1);
    }
  };

  const moveToPrevStage = () => {
    if (currentStageIndex > 0) {
      setCurrentStageIndex(currentStageIndex - 1);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* 헤더 */}
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Listening 리뷰
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

          {/* 단계별 UI */}
          {currentStage.key === 'answer_check' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900">정답/오답 확인</h3>
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <p className="text-sm text-blue-900 mb-2">Conversation {selectedQuestion.conversationNumber}</p>
                <p className="text-sm font-bold text-blue-700">{selectedQuestion.stem}</p>
              </div>

              <div className="space-y-2">
                <div className="mb-3">
                  <p className="text-sm font-semibold text-slate-700 mb-2">당신의 답:</p>
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
            </div>
          )}

          {currentStage.key === 'listen_again' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-bold text-slate-900">다시 듣기</h3>
              <div className="rounded-lg bg-purple-50 border border-purple-200 p-6 flex flex-col items-center gap-4">
                <p className="text-sm text-purple-900">Conversation {selectedQuestion.conversationNumber}</p>
                <button className="rounded-full bg-purple-600 p-4 text-white hover:bg-purple-700">
                  ▶ 재생 (오디오 기능)
                </button>
                <p className="text-xs text-purple-600">* 오디오 재생 기능 개발 중</p>
              </div>
            </div>
          )}

          {currentStage.key === 'transcript_study' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h3 className="mb-4 text-sm font-bold text-slate-900">스크립트 학습</h3>
              <div className="rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 max-h-48 overflow-y-auto mb-4">
                {selectedQuestion.stem}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-600 uppercase mb-2">✍️ 해석</p>
                <textarea
                  value={currentState.interpretation}
                  onChange={(e) => updateState({ interpretation: e.target.value })}
                  placeholder="지문을 해석해보세요..."
                  className="w-full rounded-lg border border-slate-300 p-3 text-sm resize-none"
                  rows={4}
                />
              </div>
            </div>
          )}

          {currentStage.key === 'vocabulary_analysis' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-bold text-slate-900">단어 분석</h3>
              <p className="text-sm text-slate-600 mb-4">주요 단어와 표현을 정리하세요</p>
              <div className="space-y-2">
                {currentState.vocabulary.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">선택된 단어가 없습니다</p>
                ) : (
                  currentState.vocabulary.map((item, idx) => (
                    <div key={idx} className="rounded-lg bg-amber-50 border border-amber-200 p-2">
                      <p className="font-bold text-amber-900 text-sm">{item.word}</p>
                      <p className="text-xs text-amber-700">{item.pos} - {item.meaning}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {currentStage.key === 'question_type' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-bold text-slate-900">문제 유형</h3>
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <p className="text-sm font-bold text-blue-900">{selectedQuestion.type}</p>
                <p className="text-sm text-blue-800">{selectedQuestion.itemType}</p>
              </div>
            </div>
          )}

          {currentStage.key === 'shadowing' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-bold text-slate-900">쉐도윙</h3>
              <div className="rounded-lg bg-cyan-50 border border-cyan-200 p-6 text-center">
                <p className="text-sm text-cyan-900 mb-4">오디오를 듣고 같은 속도로 따라 말하기</p>
                <button className="rounded-full bg-cyan-600 p-4 text-white hover:bg-cyan-700">
                  🎤 시작 (음성 녹음 기능)
                </button>
                <p className="text-xs text-cyan-600 mt-4">* 음성 녹음 기능 개발 중</p>
              </div>
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
                  <p className="text-xs text-blue-600">정답</p>
                  <p className="font-bold text-blue-700">
                    {reviewData.correctCount}/{reviewData.totalCount}
                  </p>
                </div>
                <div className="rounded-lg bg-purple-50 p-2">
                  <p className="text-xs text-purple-600">점수</p>
                  <p className="font-bold text-purple-700">{reviewData.score}%</p>
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
