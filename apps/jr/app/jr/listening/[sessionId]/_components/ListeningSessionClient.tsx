'use client';

import React, { useState, useRef } from 'react';
import { ChevronRight, Play, Pause, RotateCcw } from 'lucide-react';

type Props = {
  session: any;
};

type Mode = 'study' | 'practice' | 'review';

export default function ListeningSessionClient({ session }: Props) {
  const [mode, setMode] = useState<Mode>('study');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const questions = session.questions || [
    {
      id: 'q1',
      text: '이 대화는 어디서 일어나고 있나요?',
      options: ['A. 카페', 'B. 도서관', 'C. 학교', 'D. 병원'],
      correct: 'A',
    },
    {
      id: 'q2',
      text: '여자가 주문한 음료는?',
      options: ['A. 커피', 'B. 차', 'C. 주스', 'D. 물'],
      correct: 'C',
    },
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
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-slate-100">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-slate-900">{session.title}</h1>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-800">
              {session.listening_type === 'conversation' && '🗣️ 대화'}
              {session.listening_type === 'announcement' && '📢 공지'}
              {session.listening_type === 'lecture' && '🎓 강의'}
              {session.listening_type === 'news' && '📰 뉴스'}
            </span>
          </div>

          {/* Mode Tabs */}
          <div className="flex gap-2">
            {[
              { id: 'study', label: '🎧 학습' },
              { id: 'practice', label: '✏️ 문제' },
              { id: 'review', label: '📊 복습' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setMode(tab.id as Mode)}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  mode === tab.id
                    ? 'bg-cyan-600 text-white'
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
            {/* Audio Player */}
            {session.audio_url && (
              <div className="bg-white rounded-lg shadow-md p-8 space-y-4">
                <h2 className="text-lg font-bold text-slate-900">🎧 음원 듣기</h2>
                <audio
                  ref={audioRef}
                  src={session.audio_url}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  controls
                  className="w-full"
                />
              </div>
            )}

            {/* Script */}
            <div className="bg-white rounded-lg shadow-md p-8 space-y-4">
              <h2 className="text-lg font-bold text-slate-900">📝 스크립트</h2>
              <div className="bg-slate-50 p-4 rounded text-lg leading-relaxed text-slate-800">
                {session.audio_transcript || 'No script available'}
              </div>
            </div>

            {/* Korean Translation */}
            {session.korean_transcript && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 space-y-4">
                <h2 className="text-lg font-bold text-blue-900">🇰🇷 한국어 해석</h2>
                <p className="text-lg leading-relaxed text-blue-900">{session.korean_transcript}</p>
              </div>
            )}

            {/* Keywords */}
            {session.keywords && session.keywords.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-8 space-y-4">
                <h2 className="text-lg font-bold text-green-900">💡 주요 키워드</h2>
                <div className="flex flex-wrap gap-2">
                  {session.keywords.map((keyword: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-green-200 text-green-900 rounded-full font-semibold text-sm"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Next Button */}
            <button
              onClick={() => setMode('practice')}
              className="w-full py-4 bg-cyan-600 text-white rounded-lg font-bold text-lg hover:bg-cyan-700 flex items-center justify-center gap-2"
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

              {session.audio_url && (
                <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                  <audio ref={audioRef} src={session.audio_url} controls className="w-full" />
                </div>
              )}

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
                              ? 'border-cyan-600 bg-cyan-50'
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
                className="w-full mt-8 py-4 bg-cyan-600 text-white rounded-lg font-bold text-lg hover:bg-cyan-700 disabled:bg-slate-400"
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
              <div className="text-5xl font-bold text-cyan-600">{correctCount}</div>
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
                className="flex-1 py-4 bg-cyan-600 text-white rounded-lg font-bold hover:bg-cyan-700"
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
