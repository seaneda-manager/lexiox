'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getWordMeaning, getPartOfSpeech } from '@/lib/dictionary/words';

interface ReviewQuestion {
  id: string;
  number: number;
  stem: string;
  paragraph?: string;
  blanks?: Array<{ id: string; index: number; correctToken: string }>;
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

  const saveStageProgress = async (stage: string, data: any) => {
    try {
      await fetch(
        `/api/updated-reading/review/${reviewData.testId}/${selectedQuestionId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stage,
            stageData: data,
          }),
        }
      );
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  };

  const loadStageProgress = async () => {
    try {
      const response = await fetch(
        `/api/updated-reading/review/${reviewData.testId}/${selectedQuestionId}`
      );
      const { progress } = await response.json();

      if (progress) {
        setStageStates((prev) => ({
          ...prev,
          [selectedQuestionId]: {
            vocabulary: progress.vocabulary_analysis?.vocabulary || [],
            interpretation: progress.interpretation?.text || '',
            highlightedEvidence: progress.evidence_finding?.evidence || [],
            questionType: progress.question_type?.type || '',
            explanationFills: progress.explanation_fill?.fills || {},
          },
        }));
      }
    } catch (error) {
      console.error('Failed to load progress:', error);
    }
  };

  const toggleVocabularyWord = (word: string) => {
    const lowerWord = word.toLowerCase();
    const exists = currentState.vocabulary.find(
      (v) => v.word.toLowerCase() === lowerWord
    );

    if (exists) {
      updateState({
        vocabulary: currentState.vocabulary.filter(
          (v) => v.word.toLowerCase() !== lowerWord
        ),
      });
    } else {
      const pos = getPartOfSpeech(word);
      const meaning = getWordMeaning(word);
      updateState({
        vocabulary: [
          ...currentState.vocabulary,
          {
            word,
            pos,
            meaning,
          },
        ],
      });
    }
  };


  const getQuestionTypeGuide = (type: string) => {
    const guides: Record<string, { title: string; description: string; strategy: string[] }> = {
      'main_idea': {
        title: 'Main Idea (주요 아이디어)',
        description: '지문 전체의 중심 주제를 파악하는 문제입니다.',
        strategy: [
          '지문의 첫 번째와 마지막 문장에 주의하세요',
          '반복되는 키워드를 찾아보세요',
          '저자의 주장이나 관점을 파악하세요'
        ]
      },
      'detail': {
        title: 'Detail (세부사항)',
        description: '지문에서 구체적인 정보를 찾는 문제입니다.',
        strategy: [
          '문제에서 키워드를 찾으세요',
          '지문에서 해당 키워드를 찾고 주변 문맥을 읽으세요',
          '정확한 정보를 확인하세요'
        ]
      },
      'inference': {
        title: 'Inference (추론)',
        description: '지문에서 직접 명시되지 않은 의미를 추론하는 문제입니다.',
        strategy: [
          '지문의 명시적 정보를 먼저 파악하세요',
          '논리적 연결고리를 찾으세요',
          '저자의 암시적 의도를 파악하세요'
        ]
      },
      'vocabulary_in_context': {
        title: 'Vocabulary in Context (문맥상 어휘)',
        description: '지문의 문맥에서 단어의 의미를 파악하는 문제입니다.',
        strategy: [
          '단어 주변의 문맥을 읽으세요',
          '같은 의미의 유사어들을 찾아보세요',
          '문맥에 맞는 의미를 선택하세요'
        ]
      },
      'complete_words': {
        title: 'Complete Words (빈칸 채우기)',
        description: '지문의 빈칸에 알맞은 단어를 채우는 문제입니다.',
        strategy: [
          '문장 구조를 파악하세요',
          '앞뒤 단어들의 관계를 이해하세요',
          '문법과 의미가 맞는 단어를 선택하세요'
        ]
      }
    };
    return guides[type] || guides['detail'];
  };

  const renderTextWithClickableWords = (text: string) => {
    if (!text) return '';

    // 단어 기준으로 분리 (공백, 구두점 기준)
    const words = text.match(/\b[\w'-]+\b|[.,!?;:]/g) || [];

    return words.map((word, idx) => {
      const isWord = /^[\w'-]+$/.test(word);
      const isSelected = currentState.vocabulary.some(
        (v) => v.word.toLowerCase() === word.toLowerCase()
      );

      if (!isWord) {
        return <span key={idx}>{word}</span>;
      }

      return (
        <button
          key={idx}
          onClick={() => toggleVocabularyWord(word)}
          className={`rounded px-1 transition ${
            isSelected
              ? 'bg-yellow-300 font-bold text-yellow-900 hover:bg-yellow-400'
              : 'hover:bg-yellow-100'
          }`}
        >
          {word}
        </button>
      );
    });
  };

  const moveToNextStage = async () => {
    // 현재 stage의 진행 상황 저장
    await saveCurrentStageProgress();

    if (currentStageIndex < REVIEW_WORKFLOW.length - 1) {
      setCurrentStageIndex(currentStageIndex + 1);
    }
  };

  const moveToPrevStage = () => {
    if (currentStageIndex > 0) {
      setCurrentStageIndex(currentStageIndex - 1);
    }
  };

  const saveCurrentStageProgress = async () => {
    const stageKey = currentStage.key;

    const stageDataMap: Record<string, any> = {
      vocabulary_analysis: {
        vocabulary: currentState.vocabulary,
      },
      interpretation: {
        text: currentState.interpretation,
      },
      evidence_finding: {
        evidence: currentState.highlightedEvidence,
      },
      question_type: {
        type: selectedQuestion?.type,
      },
      explanation_fill: {
        fills: currentState.explanationFills,
      },
    };

    if (stageDataMap[stageKey]) {
      await saveStageProgress(stageKey, stageDataMap[stageKey]);
    }
  };

  const getCircledNumber = (num: number): string => {
    const circledNumbers = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
    return circledNumbers[num - 1] || `${num}`;
  };

  const getSentenceWithBlanks = (showBlankNumber: boolean = false) => {
    const sentence = selectedQuestion.stem;
    const correctAnswer = selectedQuestion.correctAnswer;

    if (selectedQuestion.type !== 'complete_words' || !correctAnswer) {
      return sentence;
    }

    const lowerSentence = sentence.toLowerCase();
    const lowerCorrect = correctAnswer.toLowerCase();
    const idx = lowerSentence.indexOf(lowerCorrect);

    if (idx === -1) return sentence;

    const blankMarker = showBlankNumber ? `[${selectedQuestion.number}. ___]` : '[___]';

    return {
      before: sentence.substring(0, idx),
      after: sentence.substring(idx + correctAnswer.length),
      blankMarker,
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

            {/* 1-10번: Complete Words */}
            <div className="mb-4">
              <p className="text-xs font-bold text-slate-600 uppercase mb-2">1-10번 (빈칸채우기)</p>
              <div className="space-y-1">
                {reviewData.questions.filter((q) => q.number <= 10).map((q) => (
                  <div
                    key={q.id}
                    className={`rounded-lg border-2 p-2 transition flex items-center justify-between ${
                      selectedQuestionId === q.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <button
                      onClick={() => {
                        setSelectedQuestionId(q.id);
                        setCurrentStageIndex(0);
                      }}
                      className="flex-1 text-left text-xs"
                    >
                      <span className="font-bold">{q.number}.</span>
                      <span className={`ml-2 ${selectedQuestionId === q.id ? 'text-blue-700' : 'text-slate-700'}`}>
                        {q.stem?.substring(0, 40)}...
                      </span>
                      <span className={`float-right font-bold ${q.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                        {q.isCorrect ? '✓' : '✗'}
                      </span>
                    </button>
                    <Link
                      href={`/protected/student/reading/drill/${reviewData.testId}/${q.id}`}
                      className="ml-2 rounded-lg bg-cyan-500 px-2 py-1 text-xs font-semibold text-white hover:bg-cyan-600 whitespace-nowrap"
                    >
                      Drill
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* 11번 이상: 다른 문제 */}
            {reviewData.questions.some((q) => q.number > 10) && (
              <div>
                <p className="text-xs font-bold text-slate-600 uppercase mb-2">11번 이상</p>
                <div className="grid grid-cols-10 gap-2">
                  {reviewData.questions.filter((q) => q.number > 10).map((q) => (
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
                      title={`${q.isCorrect ? '정답' : '오답'}`}
                    >
                      {q.isCorrect ? '✓' : '✗'}{q.number}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 단계별 UI 렌더링 */}
          {currentStage.key === 'answer_check' && (
            <div className="space-y-4">
              {/* 지문 + 문제 */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                {selectedQuestion.type === 'complete_words' ? (
                  <>
                    <h3 className="mb-4 text-sm font-bold text-slate-900">
                      빈칸 채우기 (전체 지문)
                    </h3>

                    {/* 전체 지문 */}
                    <div className="mb-6 rounded-lg bg-slate-50 border border-slate-200 p-4">
                      <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                        {selectedQuestion.paragraph || selectedQuestion.stem}
                      </p>
                    </div>

                    {/* 빈칸별 정오 확인 */}
                    <div className="space-y-3">
                      {selectedQuestion.blanks && selectedQuestion.blanks.length > 0 ? (
                        selectedQuestion.blanks.map((blank) => {
                          const isThisCorrect = selectedQuestion.userAnswer === blank.correctToken && selectedQuestion.id === blank.id;
                          return (
                            <div key={blank.id} className="rounded-lg border-2 p-3">
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-lg text-blue-600">
                                  {getCircledNumber(blank.index)}
                                </span>
                                <div className="flex-1">
                                  <p className="text-xs text-slate-600 mb-1">정답: <span className="font-mono font-bold text-blue-700">{blank.correctToken}</span></p>
                                  <p className="text-xs text-slate-600">
                                    당신의 답: <span className={`font-mono font-bold ${isThisCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                                      {selectedQuestion.userAnswer || '(미답)'}
                                    </span>
                                  </p>
                                </div>
                                <span className={`text-lg font-bold ${selectedQuestion.id === blank.id && (selectedQuestion.userAnswer === blank.correctToken ? 'text-emerald-600' : 'text-rose-600')}`}>
                                  {selectedQuestion.id === blank.id && (selectedQuestion.userAnswer === blank.correctToken ? '✓' : '✗')}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-sm text-slate-500 italic">빈칸 정보가 없습니다</div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="mb-4 text-sm font-bold text-slate-900">지문</h3>
                    <div className="mb-6 rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                      {selectedQuestion.stem}
                    </div>

                    <h3 className="mb-4 text-sm font-bold text-slate-900">
                      문제 {selectedQuestion.number}
                    </h3>

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
                          {typeof selectedQuestion.explanation === 'string'
                            ? selectedQuestion.explanation
                            : selectedQuestion.explanation?.correct_choice_explanation || '설명이 없습니다'}
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
                지문에서 모르는 단어를 클릭하세요 (하이라이트되어 우측 리스트에 추가됩니다)
              </p>
              <div className="rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 mb-6 flex flex-wrap gap-1">
                {renderTextWithClickableWords(selectedQuestion.stem)}
              </div>

              <div className="text-xs text-slate-500">
                💡 클릭한 단어는 우측 패널의 "단어 리스트"에서 관리됩니다
              </div>
            </div>
          )}

          {currentStage.key === 'interpretation' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div>
                <h3 className="mb-4 text-sm font-bold text-slate-900">지문 해석</h3>
                <p className="text-sm text-slate-600 mb-4">
                  지문을 읽고 한글로 해석해보세요
                </p>
              </div>

              {/* 원문 */}
              <div>
                <p className="text-xs font-bold text-slate-600 uppercase mb-2">📝 원문</p>
                <div className="rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 max-h-32 overflow-y-auto">
                  {selectedQuestion.stem}
                </div>
              </div>

              {/* 해석 입력 */}
              <div>
                <p className="text-xs font-bold text-slate-600 uppercase mb-2">✍️ 당신의 해석</p>
                <textarea
                  value={currentState.interpretation}
                  onChange={(e) => updateState({ interpretation: e.target.value })}
                  placeholder="지문의 의미를 한글로 설명해보세요..."
                  className="w-full rounded-lg border border-slate-300 p-3 text-sm placeholder-slate-400 focus:border-blue-500 focus:outline-none resize-none"
                  rows={5}
                />
                <p className="text-xs text-slate-500 mt-2">
                  {currentState.interpretation.length}자
                </p>
              </div>

              {/* 팁 */}
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                <p className="text-xs font-bold text-blue-700 mb-2">💡 팁</p>
                <ul className="text-xs text-blue-900 space-y-1">
                  <li>• 주어와 동사를 먼저 파악하세요</li>
                  <li>• 주요 의미를 중심으로 해석하세요</li>
                  <li>• 문장 구조를 이해한 후 전체 의미를 파악하세요</li>
                </ul>
              </div>
            </div>
          )}

          {currentStage.key === 'evidence_finding' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-bold text-slate-900">
                근거 찾기
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                정답에 대한 근거를 지문에서 드래그하여 선택하세요
              </p>

              {/* 정답 안내 */}
              <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                <p className="text-xs font-bold text-emerald-700 uppercase mb-1">
                  정답을 뒷받침하는 문구
                </p>
                <p className="text-sm font-semibold text-emerald-900">
                  {selectedQuestion.correctAnswer}
                </p>
              </div>

              {/* 지문 (드래그 가능) */}
              <div
                className="rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 select-text mb-4"
                onMouseUp={() => {
                  const selectedText = window.getSelection()?.toString() || '';
                  if (selectedText.trim()) {
                    updateState({
                      highlightedEvidence: [
                        ...currentState.highlightedEvidence,
                        selectedText.trim(),
                      ],
                    });
                    window.getSelection()?.removeAllRanges();
                  }
                }}
              >
                {selectedQuestion.stem}
              </div>

              {/* 선택된 근거 */}
              {currentState.highlightedEvidence.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-600 uppercase mb-2">
                    선택한 근거 ({currentState.highlightedEvidence.length}개)
                  </p>
                  <div className="space-y-2">
                    {currentState.highlightedEvidence.map((evidence, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg bg-green-50 border border-green-200 p-2 text-xs"
                      >
                        <div className="flex items-start justify-between">
                          <p className="text-green-900 italic">"{evidence}"</p>
                          <button
                            onClick={() =>
                              updateState({
                                highlightedEvidence:
                                  currentState.highlightedEvidence.filter(
                                    (_, i) => i !== idx
                                  ),
                              })
                            }
                            className="text-green-600 hover:text-green-800 ml-2"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStage.key === 'question_type' && (() => {
            const guide = getQuestionTypeGuide(selectedQuestion.type);
            return (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="mb-4 text-sm font-bold text-slate-900">문제 유형 분석</h3>
                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                    <p className="text-sm font-bold text-blue-900 mb-2">{guide.title}</p>
                    <p className="text-sm text-blue-800">{selectedQuestion.itemType}</p>
                  </div>
                </div>

                {/* 문제 유형 설명 */}
                <div className="rounded-lg bg-cyan-50 border border-cyan-200 p-4">
                  <p className="text-xs font-bold text-cyan-700 uppercase mb-2">📖 문제 특징</p>
                  <p className="text-sm text-cyan-900">{guide.description}</p>
                </div>

                {/* 푸는 전략 */}
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
                  <p className="text-xs font-bold text-emerald-700 uppercase mb-3">💡 푸는 전략</p>
                  <ol className="space-y-2">
                    {guide.strategy.map((tip, idx) => (
                      <li key={idx} className="text-sm text-emerald-900 flex gap-2">
                        <span className="font-bold text-emerald-700">{idx + 1}.</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            );
          })()}

          {currentStage.key === 'explanation_fill' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-bold text-slate-900">설명 채우기</h3>
              <p className="text-sm text-slate-600 mb-4">
                다음 설명의 빈칸을 채우세요 (드롭다운 메뉴에서 선택)
              </p>

              {selectedQuestion.explanation ? (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm space-y-3">
                  {/* 설명 텍스트에서 빈칸 처리 (예: [BLANK] 형태) */}
                  <div className="text-purple-900 leading-relaxed">
                    {selectedQuestion.explanation.split(/\[BLANK\]/).map((part, idx, arr) => (
                      <span key={idx}>
                        {part}
                        {idx < arr.length - 1 && (
                          <select
                            value={currentState.explanationFills[`blank_${idx}`] || ''}
                            onChange={(e) =>
                              updateState({
                                explanationFills: {
                                  ...currentState.explanationFills,
                                  [`blank_${idx}`]: e.target.value,
                                },
                              })
                            }
                            className="mx-1 px-2 py-1 rounded bg-white border border-purple-300 text-purple-700 font-semibold cursor-pointer hover:border-purple-500"
                          >
                            <option value="">--- 선택 ---</option>
                            <option value="accountability">책임성</option>
                            <option value="transparency">투명성</option>
                            <option value="complexity">복잡성</option>
                            <option value="limitations">한계</option>
                            <option value="understanding">이해</option>
                          </select>
                        )}
                      </span>
                    ))}
                  </div>

                  {/* 채우기 진행도 */}
                  <div className="pt-3 border-t border-purple-200">
                    <p className="text-xs font-bold text-purple-700">
                      진행도: {Object.keys(currentState.explanationFills).filter((k) => currentState.explanationFills[k]).length} / {(selectedQuestion.explanation.match(/\[BLANK\]/g) || []).length}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">설명이 없습니다</p>
              )}
            </div>
          )}
        </div>

        {/* 사이드바 */}
        <div className="col-span-4 space-y-6">
          {/* 단어 리스트 (Stage 2에서만 표시) */}
          {currentStage.key === 'vocabulary_analysis' && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-bold text-amber-900">📝 단어 리스트</h3>
              {currentState.vocabulary.length === 0 ? (
                <p className="text-xs text-amber-700 italic">
                  지문에서 단어를 클릭하여 추가하세요
                </p>
              ) : (
                <div className="space-y-2">
                  {currentState.vocabulary.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg bg-white border border-amber-200 p-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-bold text-amber-900 text-sm">{item.word}</p>
                          <p className="text-xs text-amber-700">
                            {item.pos}
                          </p>
                          <p className="text-xs text-amber-600 italic">
                            {item.meaning}
                          </p>
                        </div>
                        <button
                          onClick={() => toggleVocabularyWord(item.word)}
                          className="ml-2 text-xs text-amber-500 hover:text-amber-700"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-amber-200">
                <p className="text-xs font-bold text-amber-700">
                  총 {currentState.vocabulary.length}개 단어
                </p>
              </div>
            </div>
          )}

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
