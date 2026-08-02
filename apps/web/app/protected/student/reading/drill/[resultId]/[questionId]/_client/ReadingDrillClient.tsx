'use client';

import { useState } from 'react';

interface ReviewQuestion {
  id: string;
  number: number;
  stem: string;
  paragraph?: string;
  type: string;
  userAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
}

interface ReviewStageState {
  vocabulary: { word: string; pos: string; meaning: string }[];
  interpretation: string;
  highlightedEvidence: string[];
  questionType: string;
  explanationFills: Record<string, string>;
}

const DRILL_WORKFLOW = [
  {
    key: 'vocabulary_analysis',
    label: '1. 단어 분석',
    description: '모르는 단어와 표현을 찾아 정리합니다'
  },
  {
    key: 'interpretation',
    label: '2. 해석하기',
    description: '지문을 한글로 해석합니다'
  },
  {
    key: 'evidence_finding',
    label: '3. 근거 찾기',
    description: '정답에 대한 근거를 지문에서 찾습니다'
  },
  {
    key: 'question_type',
    label: '4. 문제 유형',
    description: '문제의 유형을 확인합니다'
  },
  {
    key: 'explanation_fill',
    label: '5. 설명 채우기',
    description: '설명에서 빈칸을 채웁니다'
  },
];

export function ReadingDrillClient({
  questionData,
}: {
  questionData: ReviewQuestion;
}) {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [stageStates, setStageStates] = useState<ReviewStageState>({
    vocabulary: [],
    interpretation: '',
    highlightedEvidence: [],
    questionType: '',
    explanationFills: {},
  });

  const currentStage = DRILL_WORKFLOW[currentStageIndex];

  const updateState = (updates: Partial<ReviewStageState>) => {
    setStageStates((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  const moveToNextStage = () => {
    if (currentStageIndex < DRILL_WORKFLOW.length - 1) {
      setCurrentStageIndex(currentStageIndex + 1);
    }
  };

  const moveToPrevStage = () => {
    if (currentStageIndex > 0) {
      setCurrentStageIndex(currentStageIndex - 1);
    }
  };

  const detectPartOfSpeech = (word: string): string => {
    if (/^[A-Z]/.test(word)) return 'n.';
    if (word.endsWith('ing')) return 'v.';
    if (word.endsWith('ed')) return 'v.';
    if (word.endsWith('ly')) return 'adv.';
    return 'n.';
  };

  const getWordMeaning = (word: string): string => {
    const dictionary: Record<string, string> = {
      'rapid': '빠른, 신속한',
      'advancement': '진전, 발전',
      'transform': '변환하다, 바꾸다',
      'industry': '산업',
      'healthcare': '의료, 보건',
      'finance': '재정, 금융',
      'increasingly': '점점 더, 증가하는',
      'critical': '심각한, 중요한',
      'decision': '결정, 판단',
      'accountability': '책임성, 설명 책임',
      'transparency': '투명성, 명확성',
    };
    return dictionary[word.toLowerCase()] || '[사전에 없음]';
  };

  const toggleVocabularyWord = (word: string) => {
    const lowerWord = word.toLowerCase();
    const exists = stageStates.vocabulary.find(
      (v) => v.word.toLowerCase() === lowerWord
    );

    if (exists) {
      updateState({
        vocabulary: stageStates.vocabulary.filter(
          (v) => v.word.toLowerCase() !== lowerWord
        ),
      });
    } else {
      const pos = detectPartOfSpeech(word);
      const meaning = getWordMeaning(word);
      updateState({
        vocabulary: [
          ...stageStates.vocabulary,
          {
            word,
            pos,
            meaning,
          },
        ],
      });
    }
  };

  const renderTextWithClickableWords = (text: string) => {
    if (!text) return '';

    const words = text.match(/\b[\w'-]+\b|[.,!?;:]/g) || [];

    return words.map((word, idx) => {
      const isWord = /^[\w'-]+$/.test(word);
      const isSelected = stageStates.vocabulary.some(
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

  const getQuestionTypeGuide = (type: string) => {
    const guides: Record<string, { title: string; description: string; strategy: string[] }> = {
      'main_idea': {
        title: 'Main Idea',
        description: '지문 전체의 중심 주제를 파악하는 문제입니다.',
        strategy: ['첫 번째와 마지막 문장에 주의', '반복되는 키워드 찾기', '저자의 주장 파악']
      },
      'detail': {
        title: 'Detail',
        description: '지문에서 구체적인 정보를 찾는 문제입니다.',
        strategy: ['문제에서 키워드 찾기', '지문에서 해당 키워드 위치 확인', '정확한 정보 확인']
      },
      'complete_words': {
        title: 'Complete Words',
        description: '지문의 빈칸에 알맞은 단어를 채우는 문제입니다.',
        strategy: ['문장 구조 파악', '앞뒤 단어 관계 이해', '문법과 의미 확인']
      },
    };
    return guides[type] || guides['detail'];
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Reading Drill - 문제 {questionData.number}
        </h2>
        <p className="text-sm text-slate-500">
          {currentStage.label} - {currentStage.description}
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* 메인 콘텐츠 */}
        <div className="col-span-8 space-y-6">
          {/* 지문 */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-900">지문</h3>
            <div className="rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 max-h-48 overflow-y-auto">
              {questionData.paragraph || questionData.stem}
            </div>
          </div>

          {/* 단계별 콘텐츠 */}
          {currentStage.key === 'vocabulary_analysis' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-bold text-slate-900">
                단어 및 표현 분석
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                지문에서 모르는 단어를 클릭하세요
              </p>
              <div className="rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 mb-6 flex flex-wrap gap-1">
                {renderTextWithClickableWords(questionData.paragraph || questionData.stem)}
              </div>
            </div>
          )}

          {currentStage.key === 'interpretation' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h3 className="mb-4 text-sm font-bold text-slate-900">지문 해석</h3>
              <textarea
                value={stageStates.interpretation}
                onChange={(e) => updateState({ interpretation: e.target.value })}
                placeholder="지문의 의미를 한글로 설명해보세요..."
                className="w-full rounded-lg border border-slate-300 p-3 text-sm placeholder-slate-400 focus:border-blue-500 focus:outline-none resize-none"
                rows={6}
              />
            </div>
          )}

          {currentStage.key === 'evidence_finding' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-bold text-slate-900">근거 찾기</h3>
              <p className="text-sm text-slate-600 mb-4">
                정답에 대한 근거를 지문에서 드래그하여 선택하세요
              </p>
              <div
                className="rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 select-text mb-4"
                onMouseUp={() => {
                  const selectedText = window.getSelection()?.toString() || '';
                  if (selectedText.trim()) {
                    updateState({
                      highlightedEvidence: [
                        ...stageStates.highlightedEvidence,
                        selectedText.trim(),
                      ],
                    });
                    window.getSelection()?.removeAllRanges();
                  }
                }}
              >
                {questionData.paragraph || questionData.stem}
              </div>

              {stageStates.highlightedEvidence.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-600 uppercase mb-2">
                    선택한 근거 ({stageStates.highlightedEvidence.length}개)
                  </p>
                  <div className="space-y-2">
                    {stageStates.highlightedEvidence.map((evidence, idx) => (
                      <div key={idx} className="rounded-lg bg-green-50 border border-green-200 p-2 text-xs">
                        <div className="flex items-start justify-between">
                          <p className="text-green-900 italic">"{evidence}"</p>
                          <button
                            onClick={() =>
                              updateState({
                                highlightedEvidence:
                                  stageStates.highlightedEvidence.filter(
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
            const guide = getQuestionTypeGuide(questionData.type);
            return (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <h3 className="mb-4 text-sm font-bold text-slate-900">문제 유형 분석</h3>
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                  <p className="text-sm font-bold text-blue-900 mb-2">{guide.title}</p>
                  <p className="text-sm text-blue-800">{guide.description}</p>
                </div>

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
                설명의 빈칸을 채워보세요
              </p>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm">
                <p className="text-purple-900">이 기능은 추후 추가될 예정입니다.</p>
              </div>
            </div>
          )}
        </div>

        {/* 사이드바 */}
        <div className="col-span-4 space-y-6">
          {/* 단어 리스트 */}
          {currentStage.key === 'vocabulary_analysis' && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-bold text-amber-900">📝 단어 리스트</h3>
              {stageStates.vocabulary.length === 0 ? (
                <p className="text-xs text-amber-700 italic">
                  지문에서 단어를 클릭하여 추가하세요
                </p>
              ) : (
                <div className="space-y-2">
                  {stageStates.vocabulary.map((item, idx) => (
                    <div key={idx} className="rounded-lg bg-white border border-amber-200 p-2">
                      <p className="font-bold text-amber-900 text-sm">{item.word}</p>
                      <p className="text-xs text-amber-700">{item.pos}</p>
                      <p className="text-xs text-amber-600 italic">{item.meaning}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-amber-200">
                <p className="text-xs font-bold text-amber-700">
                  총 {stageStates.vocabulary.length}개 단어
                </p>
              </div>
            </div>
          )}

          {/* 정답 안내 */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-900">문제 정보</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-slate-600 text-xs">문제 번호:</p>
                <p className="font-semibold text-slate-900">#{questionData.number}</p>
              </div>
              <div>
                <p className="text-slate-600 text-xs">당신의 답:</p>
                <p className={`font-mono font-bold ${questionData.isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {questionData.userAnswer || '(미답)'}
                </p>
              </div>
              <div>
                <p className="text-slate-600 text-xs">정답:</p>
                <p className="font-mono font-bold text-blue-700">
                  {questionData.correctAnswer}
                </p>
              </div>
              <div>
                <span className={`inline-block px-3 py-1 rounded text-xs font-bold ${
                  questionData.isCorrect
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}>
                  {questionData.isCorrect ? '✓ 정답' : '✗ 오답'}
                </span>
              </div>
            </div>
          </div>

          {/* 진행도 */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-900">학습 진행도</h3>
            <div className="space-y-2">
              {DRILL_WORKFLOW.map((stage, idx) => (
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
              disabled={currentStageIndex === DRILL_WORKFLOW.length - 1}
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
