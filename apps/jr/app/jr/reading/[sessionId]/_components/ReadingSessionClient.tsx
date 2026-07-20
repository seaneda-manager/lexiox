'use client';

import React, { useState } from 'react';
import { ChevronRight, Volume2, BookOpen, BarChart3 } from 'lucide-react';

type Props = {
  passage: any;
};

type Mode = 'study' | 'practice' | 'review';

export default function ReadingSessionClient({ passage }: Props) {
  const [mode, setMode] = useState<Mode>('study');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showingVocab, setShowingVocab] = useState<number | null>(null);

  const questions = passage.questions || [
    {
      id: 'q1',
      text: '이 지문의 주제는?',
      options: ['A', 'B', 'C', 'D'],
      correct: 'A',
    },
    {
      id: 'q2',
      text: '저자의 의도는?',
      options: ['A', 'B', 'C', 'D'],
      correct: 'B',
    },
  ];

  const vocabulary = passage.vocabulary || [
    { word: 'comprehend', meaning: '이해하다', example: 'I can comprehend the text.' },
    { word: 'analyze', meaning: '분석하다', example: 'We need to analyze the results.' },
  ];

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const submitAnswers = () => {
    setMode('review');
  };

  const correctCount = Object.entries(answers).filter(
    ([qId, answer]) => questions.find(q => q.id === qId)?.correct === answer
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-slate-900">{passage.title}</h1>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
              레벨 {passage.level}
            </span>
          </div>

          {/* Mode Tabs */}
          <div className="flex gap-2">
            {[
              { id: 'study', label: '📖 학습', icon: BookOpen },
              { id: 'practice', label: '✏️ 문제풀이', icon: BarChart3 },
              { id: 'review', label: '📊 복습', icon: Volume2 },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setMode(tab.id as Mode)}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  mode === tab.id
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* STUDY MODE */}
        {mode === 'study' && (
          <div className="space-y-8">
            {/* Passage */}
            <div className="bg-white rounded-lg shadow-md p-8 space-y-6">
              <h2 className="text-lg font-bold text-slate-900">지문</h2>
              <div className="text-lg leading-relaxed text-slate-800 space-y-4">
                {passage.content ? (
                  passage.content.split('\n').map((para: string, idx: number) => (
                    <p key={idx}>{para}</p>
                  ))
                ) : (
                  <p className="italic text-slate-500">지문 내용이 없습니다.</p>
                )}
              </div>

              {/* Vocabulary */}
              <div className="border-t pt-6 mt-6">
                <h3 className="text-sm font-bold text-slate-900 mb-4">📚 주요 단어</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {vocabulary.map((vocab, idx) => (
                    <div
                      key={idx}
                      onClick={() => setShowingVocab(showingVocab === idx ? null : idx)}
                      className="bg-amber-50 border border-amber-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition"
                    >
                      <div className="font-bold text-amber-900">{vocab.word}</div>
                      {showingVocab === idx && (
                        <div className="mt-2 space-y-1 text-sm text-amber-800">
                          <div>
                            <span className="font-semibold">뜻:</span> {vocab.meaning}
                          </div>
                          <div>
                            <span className="font-semibold">예:</span> {vocab.example}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Korean Translation */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 space-y-4">
              <h2 className="text-lg font-bold text-blue-900">📖 한국어 해석</h2>
              <div className="text-lg leading-relaxed text-blue-900">
                {passage.korean_translation ? (
                  passage.korean_translation.split('\n').map((para: string, idx: number) => (
                    <p key={idx} className="mb-4">
                      {para}
                    </p>
                  ))
                ) : (
                  <p className="italic text-blue-700">해석이 없습니다.</p>
                )}
              </div>
            </div>

            {/* Grammar Analysis */}
            {passage.grammar_analysis && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-8 space-y-4">
                <h2 className="text-lg font-bold text-green-900">🔍 문법 분석</h2>
                <p className="text-green-900">{passage.grammar_analysis}</p>
              </div>
            )}

            {/* Next Button */}
            <button
              onClick={() => setMode('practice')}
              className="w-full py-4 bg-amber-600 text-white rounded-lg font-bold text-lg hover:bg-amber-700 flex items-center justify-center gap-2"
            >
              문제풀이로 진행 <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* PRACTICE MODE */}
        {mode === 'practice' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-lg font-bold text-slate-900 mb-6">문제 풀이</h2>

              <div className="space-y-6">
                {questions.map((question, idx) => (
                  <div key={question.id} className="border-b pb-6 last:border-b-0">
                    <div className="text-lg font-semibold text-slate-900 mb-4">
                      {idx + 1}. {question.text}
                    </div>

                    <div className="space-y-2">
                      {question.options.map((option: string, optIdx: number) => (
                        <label
                          key={optIdx}
                          className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition ${
                            answers[question.id] === option
                              ? 'border-amber-600 bg-amber-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name={question.id}
                            value={option}
                            checked={answers[question.id] === option}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                            className="w-4 h-4"
                          />
                          <span className="ml-3 font-semibold text-slate-900">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={submitAnswers}
                disabled={Object.keys(answers).length < questions.length}
                className="w-full mt-8 py-4 bg-amber-600 text-white rounded-lg font-bold text-lg hover:bg-amber-700 disabled:bg-slate-400"
              >
                제출 {Object.keys(answers).length}/{questions.length}
              </button>
            </div>
          </div>
        )}

        {/* REVIEW MODE */}
        {mode === 'review' && (
          <div className="space-y-6">
            {/* Score */}
            <div className="bg-white rounded-lg shadow-md p-8 text-center space-y-2">
              <div className="text-5xl font-bold text-amber-600">{correctCount}</div>
              <div className="text-xl text-slate-600">
                {questions.length}개 중 {correctCount}개 정답
              </div>
              <div className="text-lg font-semibold text-slate-900">
                {Math.round((correctCount / questions.length) * 100)}%
              </div>
            </div>

            {/* Review Questions */}
            <div className="bg-white rounded-lg shadow-md p-8 space-y-6">
              <h2 className="text-lg font-bold text-slate-900">오답 분석</h2>

              {questions.map((question, idx) => {
                const isCorrect = answers[question.id] === question.correct;
                return (
                  <div
                    key={question.id}
                    className={`border-l-4 p-4 rounded ${
                      isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
                    }`}
                  >
                    <div className="text-lg font-semibold text-slate-900 mb-3">
                      {idx + 1}. {question.text}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className={`font-semibold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                          내 답변:
                        </span>{' '}
                        {answers[question.id] || '미제출'}
                      </div>
                      {!isCorrect && (
                        <div>
                          <span className="font-semibold text-green-700">정답:</span> {question.correct}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setMode('practice');
                  setAnswers({});
                }}
                className="flex-1 py-4 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700"
              >
                다시 풀기
              </button>
              <button
                onClick={() => window.history.back()}
                className="flex-1 py-4 bg-slate-300 text-slate-900 rounded-lg font-bold hover:bg-slate-400"
              >
                돌아가기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
