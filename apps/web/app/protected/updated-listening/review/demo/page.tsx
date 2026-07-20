'use client';

import { useState } from 'react';
import Link from 'next/link';
import AudioScriptSync from '@/components/listening/AudioScriptSync';
import TrapIndicator from '@/components/listening/TrapIndicator';
import { demoSession } from '../demo-session';

export default function ListeningReviewPage() {
  const { track, responses } = demoSession;
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const currentQuestion = track.questions[currentQuestionIndex];
  const currentResponse = responses.find((r) => r.questionId === currentQuestion.id);
  const questionAnalysis = track.questionAnalysis?.find((qa) => qa.questionId === currentQuestion.id);

  const correctChoiceIndex = currentQuestion.correctIndices[0];
  const selectedChoiceIndex = currentResponse?.choiceIndex;
  const isCorrect = currentResponse?.isCorrect ?? false;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900">Listening Review</h1>
          <p className="text-sm text-gray-600 mt-1">
            Score: <span className="font-semibold text-lg">{demoSession.scorePercent}%</span> (
            {responses.filter((r) => r.isCorrect).length}/{responses.length})
          </p>
        </div>
      </div>

      {/* Main Content - 3단 레이아웃 */}
      <div className="flex-1 overflow-hidden">
        <div className="flex h-full max-w-7xl mx-auto gap-4 p-4">
          {/* LEFT: 문항 네비게이션 */}
          <div className="w-32 overflow-y-auto rounded-lg border bg-white shadow-sm p-2 space-y-1">
            <p className="text-xs font-semibold text-gray-400 px-2 py-1 uppercase">Questions</p>
            {track.questions.map((q, i) => {
              const resp = responses.find((r) => r.questionId === q.id);
              const isActive = currentQuestionIndex === i;

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(i)}
                  className={`w-full rounded-lg px-3 py-2 text-xs font-medium transition text-left ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : resp?.isCorrect
                        ? 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
                        : 'bg-rose-50 text-rose-900 hover:bg-rose-100 border border-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{resp?.isCorrect ? '✓' : '✗'}</span>
                    <span>Q{q.number}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* CENTER: Waveform + 스크립트 + 문제 */}
          <div className="flex-1 overflow-y-auto rounded-lg border bg-white shadow-sm p-4 space-y-4">
            {/* Waveform */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <AudioScriptSync audioUrl={track.audioUrl} scriptSegments={track.scriptSegments || []} />
            </div>

            {/* 문제 */}
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Question {currentQuestion.number}</p>
                <p className="text-sm font-medium text-gray-900 mt-2">{currentQuestion.stem}</p>
              </div>

              {/* 선택지 */}
              <div className="space-y-2">
                {currentQuestion.choices.map((choice, choiceIdx) => {
                  const isChoosen = selectedChoiceIndex === choiceIdx;
                  const isCorrectChoice = correctChoiceIndex === choiceIdx;

                  return (
                    <div
                      key={choice.id}
                      className={`rounded-lg border-2 p-3 transition ${
                        isChoosen && isCorrect
                          ? 'border-emerald-400 bg-emerald-50'
                          : isChoosen && !isCorrect
                            ? 'border-rose-400 bg-rose-50'
                            : isCorrectChoice
                              ? 'border-indigo-400 bg-indigo-50'
                              : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{choice.text}</p>
                        </div>
                        <div className="shrink-0 text-xs font-semibold">
                          {isChoosen && isCorrect && <span className="text-emerald-600">✓ Your answer</span>}
                          {isChoosen && !isCorrect && (
                            <>
                              <span className="text-rose-600 block">✗ Your answer</span>
                              <span className="text-gray-400 block">(Wrong)</span>
                            </>
                          )}
                          {isCorrectChoice && !isChoosen && <span className="text-indigo-600">✓ Correct</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: AI Insight 패널 */}
          <div className="w-72 overflow-y-auto rounded-lg border bg-white shadow-sm p-4 space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Your Answer</p>
              <div
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  isCorrect ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
                }`}
              >
                {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
              </div>
            </div>

            {/* Signal Tokens */}
            {questionAnalysis?.mainSignalTokens && questionAnalysis.mainSignalTokens.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Key Signals</p>
                <div className="flex flex-wrap gap-1">
                  {questionAnalysis.mainSignalTokens.map((token) => (
                    <span
                      key={token}
                      className="inline-block rounded-full bg-indigo-100 px-2.5 py-1 text-xs text-indigo-700 font-semibold"
                    >
                      "{token}"
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Trap Analysis */}
            {!isCorrect && questionAnalysis?.trapChoices && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase">Why you got it wrong</p>
                {questionAnalysis.trapChoices
                  .filter((trap) => trap.choiceIndex === selectedChoiceIndex && trap.trapType)
                  .map((trap, i) => (
                    <TrapIndicator
                      key={i}
                      trap={trap}
                      isSelected={true}
                      isCorrect={isCorrect}
                    />
                  ))}
              </div>
            )}

            {/* 정답 설명 */}
            {!isCorrect && questionAnalysis?.trapChoices && (
              <div className="space-y-2 pt-3 border-t">
                <p className="text-xs font-semibold text-gray-500 uppercase">Correct Answer Explained</p>
                {questionAnalysis.trapChoices
                  .filter((trap) => trap.choiceIndex === correctChoiceIndex)
                  .map((trap, i) => (
                    <div key={i} className="rounded-lg bg-indigo-50 border border-indigo-200 p-3">
                      <p className="text-xs text-indigo-900">
                        <span className="font-semibold">✓ Why this is correct:</span> This choice avoids the
                        trap and directly addresses the question.
                      </p>
                    </div>
                  ))}
              </div>
            )}

            {/* 응답 시간 */}
            <div className="pt-3 border-t text-xs text-gray-500">
              <p>Response time: {((currentResponse?.responseTime ?? 0) / 1000).toFixed(1)}s</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t bg-white px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
              className="px-4 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 text-sm font-medium"
            >
              ← Previous
            </button>
            <span className="text-sm text-gray-600 flex items-center">
              Question {currentQuestionIndex + 1} of {track.questions.length}
            </span>
            <button
              onClick={() => setCurrentQuestionIndex(Math.min(track.questions.length - 1, currentQuestionIndex + 1))}
              disabled={currentQuestionIndex === track.questions.length - 1}
              className="px-4 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 text-sm font-medium"
            >
              Next →
            </button>
          </div>

          {/* Practice Again Button */}
          <Link
            href="/updated-listening/practice"
            className="px-6 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition"
          >
            📚 Practice Again
          </Link>
        </div>
      </div>
    </div>
  );
}
