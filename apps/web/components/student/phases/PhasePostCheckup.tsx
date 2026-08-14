'use client';

import { useState, useMemo } from 'react';

export type PostCheckupCategory = 'vocab' | 'grammar' | 'translation' | 'writing' | 'listening';

export interface PostCheckupQuestion {
  id: string;
  category: PostCheckupCategory;
  question: string;
  audioUrl?: string; // for listening
  type: 'multiple_choice' | 'short_answer' | 'text_input';
  choices?: string[]; // for multiple choice
  correctAnswer: string;
  explanation: string;
}

interface PostCheckupProps {
  studentId: string;
  questions: PostCheckupQuestion[];
  onComplete: (score: number, results: any) => void;
}

export function PhasePostCheckup({
  studentId,
  questions,
  onComplete,
}: PostCheckupProps) {
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const currentQuestion = questions[currentQuestionIdx];
  const progress = ((currentQuestionIdx + 1) / questions.length) * 100;

  const categoryLabels: Record<PostCheckupCategory, string> = {
    vocab: '🔤 단어',
    grammar: '✏️ 문법',
    translation: '📖 해석',
    writing: '✍️ 작문',
    listening: '🎧 듣기',
  };

  const categoryColors: Record<PostCheckupCategory, string> = {
    vocab: 'from-blue-500 to-blue-600',
    grammar: 'from-amber-500 to-amber-600',
    translation: 'from-purple-500 to-purple-600',
    writing: 'from-green-500 to-green-600',
    listening: 'from-pink-500 to-pink-600',
  };

  const handleAnswer = (value: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
  };

  const handleNext = () => {
    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    // 채점
    let correctCount = 0;
    const results = questions.map(q => {
      const studentAnswer = answers[q.id] || '';
      const isCorrect = studentAnswer.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim();
      if (isCorrect) correctCount++;
      return {
        questionId: q.id,
        category: q.category,
        question: q.question,
        studentAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation,
      };
    });

    const score = Math.round((correctCount / questions.length) * 100);
    setShowResults(true);
    onComplete(score, results);
  };

  const handlePrevious = () => {
    if (currentQuestionIdx > 0) {
      setCurrentQuestionIdx(prev => prev - 1);
    }
  };

  const isAnswered = !!answers[currentQuestion?.id];

  // Results View
  if (showResults) {
    const correctCount = Object.entries(answers).filter(([qId, answer]) => {
      const question = questions.find(q => q.id === qId);
      return question && answer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
    }).length;

    const score = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="space-y-6">
        {/* Score Card */}
        <div className={`rounded-lg bg-gradient-to-r ${categoryColors.vocab} p-8 text-center text-white`}>
          <p className="text-sm font-semibold opacity-90 mb-2">지난 수업 복습 결과</p>
          <p className="text-5xl font-bold">{score}점</p>
          <p className="text-sm opacity-75 mt-2">{correctCount}개 정답 / {questions.length}개 문제</p>
        </div>

        {/* Results by Category */}
        <div className="space-y-3">
          <h3 className="font-bold text-slate-900">분야별 성과</h3>
          {Object.entries(
            questions.reduce((acc, q, idx) => {
              const answer = answers[q.id] || '';
              const isCorrect = answer.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim();
              if (!acc[q.category]) {
                acc[q.category] = { total: 0, correct: 0 };
              }
              acc[q.category].total++;
              if (isCorrect) acc[q.category].correct++;
              return acc;
            }, {} as Record<PostCheckupCategory, { total: number; correct: number }>)
          ).map(([category, stats]) => (
            <div key={category} className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{categoryLabels[category as PostCheckupCategory]}</span>
                <span className={`font-bold ${stats.correct === stats.total ? 'text-emerald-600' : stats.correct > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                  {stats.correct}/{stats.total}
                </span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${(stats.correct / stats.total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Incorrect Answers */}
        <div className="space-y-3">
          <h3 className="font-bold text-slate-900">오답 확인</h3>
          {questions.map(q => {
            const answer = answers[q.id] || '';
            const isCorrect = answer.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim();

            if (isCorrect) return null;

            return (
              <div key={q.id} className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="font-semibold text-red-900 mb-2">{categoryLabels[q.category]}</p>
                <p className="text-sm text-slate-700 mb-3">{q.question}</p>
                <div className="space-y-1 text-sm">
                  <div className="text-red-600">
                    <span className="font-semibold">✗ 당신의 답:</span> {answer || '(답변 없음)'}
                  </div>
                  <div className="text-emerald-600">
                    <span className="font-semibold">✓ 정답:</span> {q.correctAnswer}
                  </div>
                </div>
                {q.explanation && (
                  <div className="mt-2 border-t border-red-200 pt-2">
                    <p className="text-xs font-semibold text-slate-600 mb-1">💡 설명</p>
                    <p className="text-xs text-slate-600">{q.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          onClick={() => window.location.href = '/student/home'}
          className="w-full rounded-lg bg-slate-900 px-6 py-3 font-semibold text-white hover:bg-slate-800 transition"
        >
          대시보드로 돌아가기
        </button>
      </div>
    );
  }

  // Question View
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`rounded-lg bg-gradient-to-r ${categoryColors[currentQuestion?.category]} p-6 text-white`}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold opacity-90">
            {categoryLabels[currentQuestion?.category]}
          </span>
          <span className="text-sm opacity-75">
            {currentQuestionIdx + 1}/{questions.length}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-white/20 overflow-hidden">
          <div
            className="h-full bg-white transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          {currentQuestion?.question}
        </h2>

        {/* Listening Audio */}
        {currentQuestion?.category === 'listening' && currentQuestion?.audioUrl && (
          <div className="mb-6 flex items-center gap-3 rounded-lg bg-slate-50 p-4">
            <button
              onClick={() => {
                setIsPlayingAudio(!isPlayingAudio);
                // TODO: Play audio
              }}
              className="flex-shrink-0 rounded-full bg-blue-600 p-3 text-white hover:bg-blue-700 transition"
            >
              🔊
            </button>
            <div>
              <p className="text-sm font-semibold text-slate-700">음성 듣기</p>
              <p className="text-xs text-slate-500">스크립트를 보고 문제에 답하세요</p>
            </div>
          </div>
        )}

        {/* Multiple Choice */}
        {currentQuestion?.type === 'multiple_choice' && (
          <div className="space-y-2">
            {currentQuestion?.choices?.map((choice, idx) => (
              <label
                key={idx}
                className={`flex items-center gap-3 rounded-lg border-2 p-3 cursor-pointer transition ${
                  answers[currentQuestion.id] === choice
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-blue-300'
                }`}
              >
                <input
                  type="radio"
                  name={`question-${currentQuestion.id}`}
                  value={choice}
                  checked={answers[currentQuestion.id] === choice}
                  onChange={() => handleAnswer(choice)}
                  className="h-4 w-4"
                />
                <span className="text-sm text-slate-700">{choice}</span>
              </label>
            ))}
          </div>
        )}

        {/* Text Input */}
        {(currentQuestion?.type === 'short_answer' || currentQuestion?.type === 'text_input') && (
          <input
            type="text"
            value={answers[currentQuestion?.id] || ''}
            onChange={(e) => handleAnswer(e.target.value)}
            placeholder="답을 입력하세요..."
            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          onClick={handlePrevious}
          disabled={currentQuestionIdx === 0}
          className="flex-1 rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
        >
          ← 이전
        </button>
        <button
          onClick={handleNext}
          disabled={!isAnswered}
          className={`flex-1 rounded-lg px-4 py-2 font-medium text-white transition ${
            isAnswered
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-slate-400 cursor-not-allowed opacity-50'
          }`}
        >
          {currentQuestionIdx === questions.length - 1 ? '완료 ✓' : '다음 →'}
        </button>
      </div>
    </div>
  );
}
