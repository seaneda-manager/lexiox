'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, Mic } from 'lucide-react';

type Mode = 'study' | 'practice' | 'review';

interface SpeakingWritingClientProps {
  task: any;
  mode: Mode;
}

export default function SpeakingWritingClient({
  task,
  mode,
}: SpeakingWritingClientProps) {
  if (!task) return <div>콘텐츠를 불러올 수 없습니다</div>;

  const content = task.content || {};
  const taskDescription = content.taskDescription || '';
  const grammarFocus = content.grammarFocus || [];
  const vocabularySuggestions = content.vocabularySuggestions || [];
  const sampleAnswer = content.sampleAnswer || '';
  const rubric = content.rubric || {};
  const tips = content.tips || [];

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="border-b bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/jr" className="p-2 hover:bg-slate-100 rounded">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="text-sm text-slate-500">🎤 Speaking & Writing</div>
              <h1 className="text-xl font-bold text-slate-900">{task.title}</h1>
            </div>
          </div>
          <div className="text-sm font-semibold text-slate-700">
            Level {task.level}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* 과제 설명 */}
        <section className="bg-white rounded-lg p-6 shadow">
          <h2 className="text-lg font-bold text-slate-900 mb-4">📋 과제</h2>
          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
            {taskDescription}
          </p>
        </section>

        {/* 문법 포인트 */}
        {grammarFocus.length > 0 && (
          <section className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              🔤 사용할 문법
            </h2>
            <ul className="space-y-2">
              {grammarFocus.map((grammar: string, idx: number) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold mt-1">•</span>
                  <span className="text-slate-700">{grammar}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 어휘 제안 */}
        {vocabularySuggestions.length > 0 && (
          <section className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              📚 추천 어휘
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vocabularySuggestions.map((v: any, idx: number) => (
                <div key={idx} className="border border-slate-200 rounded p-4">
                  <div className="font-semibold text-slate-900">{v.word}</div>
                  <div className="text-sm text-slate-600 mt-1">
                    {v.meaning}
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    {v.usage}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 모범 답안 */}
        {mode === 'study' && sampleAnswer && (
          <section className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              ✨ 모범 답안
            </h2>
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                {sampleAnswer}
              </p>
            </div>
          </section>
        )}

        {/* 평가 기준 */}
        {Object.keys(rubric).length > 0 && (
          <section className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              📊 평가 기준
            </h2>
            <div className="space-y-3">
              {Object.entries(rubric).map(([key, value]: [string, any]) => (
                <div key={key} className="border border-slate-200 rounded p-4">
                  <div className="font-semibold text-slate-900 capitalize">
                    {key === 'grammar' && '문법'}
                    {key === 'vocabulary' && '어휘'}
                    {key === 'content' && '내용'}
                    {key === 'fluency' && '유창성'}
                  </div>
                  <p className="text-sm text-slate-700 mt-2">{value}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 팁 */}
        {tips.length > 0 && (
          <section className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              💡 팁
            </h2>
            <ul className="space-y-2">
              {tips.map((tip: string, idx: number) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="text-amber-600 font-bold mt-1">•</span>
                  <span className="text-slate-700">{tip}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 제출 섹션 */}
        <section className="bg-white rounded-lg p-6 shadow">
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            📤 답변 제출
          </h2>
          <div className="space-y-4">
            {task.task_type !== 'writing' && (
              <button className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
                <Mic className="w-5 h-5" />
                음성 녹음 시작
              </button>
            )}
            {task.task_type !== 'speaking' && (
              <textarea
                placeholder="답변을 입력하세요..."
                className="w-full h-32 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            )}
          </div>
        </section>

        {/* Footer */}
        <div className="flex gap-3 justify-between py-8">
          <Link
            href="/jr"
            className="px-6 py-3 border border-slate-300 rounded-lg font-semibold hover:bg-slate-50"
          >
            ← 돌아가기
          </Link>

          {mode === 'study' && (
            <Link
              href={`/content/speaking-writing/${task.id}/practice`}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              연습하기 <ChevronRight className="w-4 h-4" />
            </Link>
          )}

          {mode === 'practice' && (
            <button className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700">
              제출 완료 <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
