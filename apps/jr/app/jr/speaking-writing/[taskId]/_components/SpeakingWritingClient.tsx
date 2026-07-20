'use client';

import React, { useState } from 'react';
import { ChevronRight, Mic, RotateCcw } from 'lucide-react';

type Props = {
  task: any;
};

type Mode = 'study' | 'practice' | 'review';

export default function SpeakingWritingClient({ task }: Props) {
  const [mode, setMode] = useState<Mode>('study');
  const [response, setResponse] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleStartRecording = () => {
    setIsRecording(true);
    // 실제 음성 녹음은 MediaRecorder API를 사용해야 함
  };

  const handleStopRecording = () => {
    setIsRecording(false);
  };

  const handleSubmit = () => {
    if (response.trim() || isRecording) {
      setSubmitted(true);
      setMode('review');
    }
  };

  const isSpeaking = task.task_type === 'speaking';
  const isWriting = task.task_type === 'writing';

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-slate-100">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-slate-900">{task.title}</h1>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
              {isSpeaking ? '🎤 Speaking' : '✍️ Writing'}
            </span>
          </div>

          {/* Mode Tabs */}
          <div className="flex gap-2">
            {[
              { id: 'study', label: '📖 과제 읽기' },
              { id: 'practice', label: isSpeaking ? '🎤 녹음' : '✍️ 작성' },
              { id: 'review', label: '📊 제출' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setMode(tab.id as Mode)}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  mode === tab.id
                    ? 'bg-purple-600 text-white'
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
            {/* Task Prompt */}
            <div className="bg-white rounded-lg shadow-md p-8 space-y-6">
              <h2 className="text-2xl font-bold text-purple-900">📝 과제</h2>
              <div className="text-lg leading-relaxed text-slate-800">
                {task.prompt}
              </div>
            </div>

            {/* Korean Translation */}
            {task.korean_prompt && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-8">
                <h3 className="text-lg font-bold text-blue-900 mb-4">🇰🇷 과제 (한국어)</h3>
                <p className="text-lg leading-relaxed text-blue-900">{task.korean_prompt}</p>
              </div>
            )}

            {/* Timing Info */}
            <div className="bg-slate-100 border border-slate-300 rounded-lg p-8 grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-700">⏱️ 준비 시간</div>
                <div className="text-3xl font-bold text-slate-900">{task.preparation_time || 15}초</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-700">🎤/✍️ 응답 시간</div>
                <div className="text-3xl font-bold text-slate-900">{task.response_time || 45}초</div>
              </div>
            </div>

            {/* Sample Answer */}
            {task.sample_answer && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-8 space-y-4">
                <h3 className="text-lg font-bold text-green-900">⭐ 모범 답안</h3>
                <p className="text-lg leading-relaxed text-green-900">{task.sample_answer}</p>
                {task.sample_answer_korean && (
                  <p className="text-sm text-green-800 italic">{task.sample_answer_korean}</p>
                )}
              </div>
            )}

            {/* Rubric */}
            {task.rubric && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-8 space-y-4">
                <h3 className="text-lg font-bold text-orange-900">📊 평가 기준</h3>
                <p className="text-lg leading-relaxed text-orange-900">{task.rubric}</p>
              </div>
            )}

            {/* Next Button */}
            <button
              onClick={() => setMode('practice')}
              className="w-full py-4 bg-purple-600 text-white rounded-lg font-bold text-lg hover:bg-purple-700 flex items-center justify-center gap-2"
            >
              {isSpeaking ? '녹음 시작' : '작성 시작'} <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* PRACTICE MODE */}
        {mode === 'practice' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-8">
              {isSpeaking ? (
                <div className="space-y-6">
                  <h2 className="text-lg font-bold text-slate-900">🎤 음성 녹음</h2>

                  {/* Timer */}
                  <div className="text-center">
                    <div className="text-5xl font-bold text-purple-600 mb-4">00:00</div>
                    <p className="text-slate-600">최대 {task.response_time || 45}초</p>
                  </div>

                  {/* Recording Controls */}
                  <div className="flex gap-3 justify-center">
                    {!isRecording ? (
                      <button
                        onClick={handleStartRecording}
                        className="px-8 py-4 bg-red-600 text-white rounded-lg font-bold text-lg hover:bg-red-700 flex items-center gap-2"
                      >
                        <Mic className="w-6 h-6" />
                        녹음 시작
                      </button>
                    ) : (
                      <button
                        onClick={handleStopRecording}
                        className="px-8 py-4 bg-slate-600 text-white rounded-lg font-bold text-lg hover:bg-slate-700 flex items-center gap-2"
                      >
                        <span className="animate-pulse">●</span>
                        녹음 중지
                      </button>
                    )}
                    <button
                      onClick={() => setResponse('')}
                      className="px-8 py-4 bg-slate-300 text-slate-900 rounded-lg font-bold hover:bg-slate-400 flex items-center gap-2"
                    >
                      <RotateCcw className="w-5 h-5" />
                      재시도
                    </button>
                  </div>

                  {response && (
                    <div className="p-4 bg-slate-50 rounded text-sm text-slate-600">
                      재생 시간: {response}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <h2 className="text-lg font-bold text-slate-900">✍️ 답변 작성</h2>
                  <textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder={`최대 ${task.response_time || 45}초 분량으로 작성하세요...`}
                    rows={10}
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-lg"
                  />
                  <div className="text-sm text-slate-600">
                    글자수: {response.length}자
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-8">
                <button
                  onClick={handleSubmit}
                  disabled={!response && !isRecording}
                  className="flex-1 py-4 bg-purple-600 text-white rounded-lg font-bold text-lg hover:bg-purple-700 disabled:bg-slate-400"
                >
                  {isSpeaking ? '녹음 제출' : '답변 제출'}
                </button>
                <button
                  onClick={() => setMode('study')}
                  className="flex-1 py-4 bg-slate-300 text-slate-900 rounded-lg font-bold hover:bg-slate-400"
                >
                  뒤로가기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* REVIEW MODE */}
        {mode === 'review' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-8 text-center space-y-4">
              <div className="text-6xl">✅</div>
              <h2 className="text-2xl font-bold text-slate-900">제출 완료!</h2>
              <p className="text-lg text-slate-600">
                선생님의 피드백을 기다리는 중입니다.
              </p>
            </div>

            {/* Rubric Preview */}
            {task.rubric && (
              <div className="bg-slate-50 rounded-lg p-8 space-y-4">
                <h3 className="text-lg font-bold text-slate-900">📊 평가 기준</h3>
                <p className="text-slate-700">{task.rubric}</p>
              </div>
            )}

            {/* Response Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 space-y-4">
              <h3 className="text-lg font-bold text-blue-900">📝 제출 내용</h3>
              <div className="bg-white p-4 rounded text-slate-800">
                {isSpeaking ? (
                  <p className="text-sm italic text-slate-600">[음성 녹음 제출됨]</p>
                ) : (
                  <p className="whitespace-pre-wrap">{response}</p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setMode('practice');
                  setResponse('');
                  setSubmitted(false);
                }}
                className="flex-1 py-4 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700"
              >
                다시 작성
              </button>
              <button
                onClick={() => window.history.back()}
                className="flex-1 py-4 bg-slate-300 text-slate-900 rounded-lg font-bold hover:bg-slate-400"
              >
                목록으로
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
