'use client';

import React, { useState } from 'react';
import { ChevronRight, BookOpen, BarChart3, Volume2 } from 'lucide-react';

type Props = {
  chapter: any;
};

type Mode = 'study' | 'practice' | 'review';

export default function GrammarSessionClient({ chapter }: Props) {
  const [mode, setMode] = useState<Mode>('study');
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const exercises = chapter.exercises || [
    {
      id: 'e1',
      text: '_____ you finish your homework, you can go outside.',
      options: ['Unless', 'If', 'When', 'Although'],
      correct: 'If',
      explanation: '"If"는 조건을 나타낼 때 사용합니다.',
    },
    {
      id: 'e2',
      text: 'She has been living here _____ 2020.',
      options: ['since', 'for', 'during', 'while'],
      correct: 'since',
      explanation: '"Since"는 특정 시점부터를 나타냅니다.',
    },
  ];

  const handleAnswerChange = (exerciseId: string, answer: string) => {
    setAnswers({ ...answers, [exerciseId]: answer });
  };

  const submitAnswers = () => {
    setMode('review');
  };

  const correctCount = Object.entries(answers).filter(
    ([eId, answer]) => exercises.find(e => e.id === eId)?.correct === answer
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-slate-100">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-slate-900">{chapter.title}</h1>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
              레벨 {chapter.level}
            </span>
          </div>

          {/* Mode Tabs */}
          <div className="flex gap-2">
            {[
              { id: 'study', label: '📖 학습', icon: BookOpen },
              { id: 'practice', label: '✏️ 연습', icon: BarChart3 },
              { id: 'review', label: '📊 복습', icon: Volume2 },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setMode(tab.id as Mode)}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  mode === tab.id
                    ? 'bg-indigo-600 text-white'
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
            {/* Explanation */}
            <div className="bg-white rounded-lg shadow-md p-8 space-y-6">
              <h2 className="text-2xl font-bold text-indigo-900">📚 문법 설명</h2>
              <div className="prose prose-sm max-w-none text-lg leading-relaxed text-slate-800">
                {chapter.explanation ? (
                  chapter.explanation.split('\n').map((para: string, idx: number) => (
                    <p key={idx} className="mb-4">
                      {para}
                    </p>
                  ))
                ) : (
                  <p className="italic text-slate-500">설명이 없습니다.</p>
                )}
              </div>
            </div>

            {/* Korean Explanation */}
            {chapter.korean_explanation && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-8">
                <h3 className="text-lg font-bold text-blue-900 mb-4">🇰🇷 한국어 설명</h3>
                <p className="text-lg leading-relaxed text-blue-900">{chapter.korean_explanation}</p>
              </div>
            )}

            {/* Key Points */}
            {chapter.key_points && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-8">
                <h3 className="text-lg font-bold text-green-900 mb-4">⭐ 핵심 포인트</h3>
                <p className="text-lg leading-relaxed text-green-900">{chapter.key_points}</p>
              </div>
            )}

            {/* Examples */}
            {chapter.examples && chapter.examples.length > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-8 space-y-4">
                <h3 className="text-lg font-bold text-purple-900">📝 예제</h3>
                <div className="space-y-4">
                  {chapter.examples.map((example: any, idx: number) => (
                    <div key={idx} className="bg-white rounded p-4 border border-purple-200">
                      <div className="font-semibold text-purple-900 mb-2">{example.sentence}</div>
                      {example.translation && (
                        <div className="text-sm text-purple-800">{example.translation}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next Button */}
            <button
              onClick={() => setMode('practice')}
              className="w-full py-4 bg-indigo-600 text-white rounded-lg font-bold text-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
            >
              연습 문제로 진행 <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* PRACTICE MODE */}
        {mode === 'practice' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-lg font-bold text-slate-900 mb-6">연습 문제</h2>

              <div className="space-y-6">
                {exercises.map((exercise, idx) => (
                  <div key={exercise.id} className="border-b pb-6 last:border-b-0">
                    <div className="text-lg font-semibold text-slate-900 mb-4">
                      {idx + 1}. {exercise.text}
                    </div>

                    <div className="space-y-2">
                      {exercise.options.map((option: string, optIdx: number) => (
                        <label
                          key={optIdx}
                          className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition ${
                            answers[exercise.id] === option
                              ? 'border-indigo-600 bg-indigo-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name={exercise.id}
                            value={option}
                            checked={answers[exercise.id] === option}
                            onChange={(e) => handleAnswerChange(exercise.id, e.target.value)}
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
                disabled={Object.keys(answers).length < exercises.length}
                className="w-full mt-8 py-4 bg-indigo-600 text-white rounded-lg font-bold text-lg hover:bg-indigo-700 disabled:bg-slate-400"
              >
                제출 {Object.keys(answers).length}/{exercises.length}
              </button>
            </div>
          </div>
        )}

        {/* REVIEW MODE */}
        {mode === 'review' && (
          <div className="space-y-6">
            {/* Score */}
            <div className="bg-white rounded-lg shadow-md p-8 text-center space-y-2">
              <div className="text-5xl font-bold text-indigo-600">{correctCount}</div>
              <div className="text-xl text-slate-600">
                {exercises.length}개 중 {correctCount}개 정답
              </div>
              <div className="text-lg font-semibold text-slate-900">
                {Math.round((correctCount / exercises.length) * 100)}%
              </div>
            </div>

            {/* Review Exercises */}
            <div className="bg-white rounded-lg shadow-md p-8 space-y-6">
              <h2 className="text-lg font-bold text-slate-900">오답 분석</h2>

              {exercises.map((exercise, idx) => {
                const isCorrect = answers[exercise.id] === exercise.correct;
                return (
                  <div
                    key={exercise.id}
                    className={`border-l-4 p-4 rounded ${
                      isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
                    }`}
                  >
                    <div className="text-lg font-semibold text-slate-900 mb-3">
                      {idx + 1}. {exercise.text}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className={`font-semibold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                          내 답변:
                        </span>{' '}
                        {answers[exercise.id] || '미제출'}
                      </div>
                      {!isCorrect && (
                        <div>
                          <span className="font-semibold text-green-700">정답:</span> {exercise.correct}
                        </div>
                      )}
                      {exercise.explanation && (
                        <div>
                          <span className="font-semibold text-indigo-700">해설:</span>{' '}
                          {exercise.explanation}
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
                className="flex-1 py-4 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700"
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
