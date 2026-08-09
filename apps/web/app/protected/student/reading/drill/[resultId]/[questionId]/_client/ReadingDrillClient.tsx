'use client';

import { useState } from 'react';
import Link from 'next/link';

interface ReviewQuestion {
  id: string;
  number: number;
  stem: string;
  paragraph?: string;
  type: string;
  choices?: { id: string; text: string; isCorrect: boolean }[];
  userAnswer: string | null;
  userAnswerId?: string | null;
  correctAnswer: string;
  isCorrect: boolean;
}

interface ReviewStageState {
  vocabulary: { word: string; pos: string; meaning: string; loading?: boolean }[];
  interpretation: string;
  highlightedEvidence: string[];
  questionType: string;
  explanationFills: Record<string, string>;
}

function findContextSentence(text: string, word: string): string {
  const sentences = text.split(/(?<=[.!?])\s+/);
  return sentences.find((s) => new RegExp(`\\b${word}\\b`, "i").test(s)) ?? text.slice(0, 200);
}

const BASE_DRILL_WORKFLOW = [
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

// 오답/무응답 문제에는 유사 문제로 한 번 더 연습하는 단계를 추가한다.
// 정답 문제는 이해도 강화가 목적이라 다섯 단계로 끝난다.
function getDrillWorkflow(isCorrect: boolean) {
  if (isCorrect) return BASE_DRILL_WORKFLOW;
  return [
    ...BASE_DRILL_WORKFLOW,
    {
      key: 'similar_questions',
      label: '6. 유사 문제',
      description: '같은 유형의 문제를 다시 풀어봅니다',
    },
  ];
}

export function ReadingDrillClient({
  questionData,
  resultId,
}: {
  questionData: ReviewQuestion;
  resultId: string;
}) {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [stageStates, setStageStates] = useState<ReviewStageState>({
    vocabulary: [],
    interpretation: '',
    highlightedEvidence: [],
    questionType: '',
    explanationFills: {},
  });

  const workflow = getDrillWorkflow(questionData.isCorrect);
  const currentStage = workflow[currentStageIndex];

  const updateState = (updates: Partial<ReviewStageState>) => {
    setStageStates((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  const moveToNextStage = () => {
    if (currentStageIndex < workflow.length - 1) {
      setCurrentStageIndex(currentStageIndex + 1);
    }
  };

  const moveToPrevStage = () => {
    if (currentStageIndex > 0) {
      setCurrentStageIndex(currentStageIndex - 1);
    }
  };

  const toggleVocabularyWord = async (word: string) => {
    const lowerWord = word.toLowerCase();
    const exists = stageStates.vocabulary.find(
      (v) => v.word.toLowerCase() === lowerWord
    );

    if (exists) {
      setStageStates((prev) => ({
        ...prev,
        vocabulary: prev.vocabulary.filter((v) => v.word.toLowerCase() !== lowerWord),
      }));
      return;
    }

    // 먼저 로딩 상태로 추가해서 클릭 반응이 바로 보이게 한다.
    setStageStates((prev) => ({
      ...prev,
      vocabulary: [...prev.vocabulary, { word, pos: '', meaning: '뜻을 찾는 중...', loading: true }],
    }));

    const context = findContextSentence(questionData.paragraph || questionData.stem, word);

    try {
      const res = await fetch('/api/reading/ai-explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'vocab', content: word, context }),
      });
      const data = await res.json();
      setStageStates((prev) => ({
        ...prev,
        vocabulary: prev.vocabulary.map((v) =>
          v.word.toLowerCase() === lowerWord
            ? { word, pos: data.pos ?? '', meaning: data.meaning ?? '뜻을 찾지 못했습니다', loading: false }
            : v
        ),
      }));
    } catch {
      setStageStates((prev) => ({
        ...prev,
        vocabulary: prev.vocabulary.map((v) =>
          v.word.toLowerCase() === lowerWord
            ? { word, pos: '', meaning: '뜻을 찾지 못했습니다', loading: false }
            : v
        ),
      }));
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
        <Link
          href={`/student/review/reading/${resultId}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-600"
        >
          ← 리뷰로 돌아가기
        </Link>
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
          {/* 문제 — 모든 단계에서 계속 보여야 지문에서 뭘 찾는지 알 수 있다 */}
          <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
            <h3 className="mb-2 text-sm font-bold text-blue-900">문제</h3>
            <p className="text-sm leading-relaxed text-blue-900">{questionData.stem}</p>

            {questionData.choices && questionData.choices.length > 0 && (
              <div className="mt-4 space-y-2">
                {questionData.choices.map((c, idx) => {
                  const isChosen = c.id === questionData.userAnswerId;
                  const cls = c.isCorrect
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                    : isChosen
                      ? 'border-rose-300 bg-rose-50 text-rose-900'
                      : 'border-blue-100 bg-white text-blue-900';
                  return (
                    <div key={c.id} className={`flex items-start gap-2 rounded-lg border p-2.5 text-xs ${cls}`}>
                      <span className="font-bold shrink-0">{String.fromCharCode(65 + idx)}.</span>
                      <span className="flex-1 leading-snug">{c.text}</span>
                      {c.isCorrect && (
                        <span className="shrink-0 rounded bg-emerald-200 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">정답</span>
                      )}
                      {isChosen && !c.isCorrect && (
                        <span className="shrink-0 rounded bg-rose-200 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">내 답</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 지문 — 근거 찾기 단계에서는 이 박스 자체가 드래그 선택 가능해진다 */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-900">지문</h3>
            <div
              className={`rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 max-h-48 overflow-y-auto ${
                currentStage.key === 'evidence_finding' ? 'select-text ring-2 ring-amber-300' : ''
              }`}
              onMouseUp={
                currentStage.key === 'evidence_finding'
                  ? () => {
                      const selectedText = window.getSelection()?.toString() || '';
                      if (selectedText.trim()) {
                        updateState({
                          highlightedEvidence: [...stageStates.highlightedEvidence, selectedText.trim()],
                        });
                        window.getSelection()?.removeAllRanges();
                      }
                    }
                  : undefined
              }
            >
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

          {currentStage.key === 'similar_questions' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-bold text-slate-900">유사 문제로 연습하기</h3>
              <p className="text-sm text-slate-600 mb-4">
                이 문제와 같은 유형({questionData.type})의 문제를 하나 더 풀어보며 제대로 이해했는지 확인합니다.
              </p>
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-sm">
                <p className="text-rose-900">유사 문제 자동 생성은 아직 준비 중입니다. (곧 추가될 예정)</p>
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
                    <div
                      key={idx}
                      className={`rounded-lg bg-white border border-amber-200 p-2 ${item.loading ? 'opacity-60' : ''}`}
                    >
                      <p className="font-bold text-amber-900 text-sm">{item.word}</p>
                      {item.pos && <p className="text-xs text-amber-700">{item.pos}</p>}
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
              {workflow.map((stage, idx) => (
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
              disabled={currentStageIndex === workflow.length - 1}
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
