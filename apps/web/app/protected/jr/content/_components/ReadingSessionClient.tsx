'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronRight } from 'lucide-react';

type Mode = 'study' | 'practice' | 'review';

interface ReadingSessionClientProps {
  passage: any;
  mode: Mode;
}

export default function ReadingSessionClient({
  passage,
  mode,
}: ReadingSessionClientProps) {
  if (!passage) return <div>콘텐츠를 불러올 수 없습니다</div>;

  const content = passage.content || {};
  const vocabulary = content.vocabulary || [];
  const questions = content.comprehensionQuestions || [];
  const grammarPoints = content.grammarPoints || [];

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/jr" className="p-2 hover:bg-slate-100 rounded">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="text-sm text-slate-500">📖 Reading</div>
              <h1 className="text-xl font-bold text-slate-900">{passage.title}</h1>
            </div>
          </div>
          <div className="text-sm font-semibold text-slate-700">
            Level {passage.level}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* 1. 지문 */}
        <section className="bg-white rounded-lg p-6 shadow">
          <h2 className="text-lg font-bold text-slate-900 mb-4">📄 지문</h2>
          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
            {content.summary || '콘텐츠 준비 중...'}
          </p>
        </section>

        {/* 2. 어휘 */}
        {vocabulary.length > 0 && (
          <section className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-lg font-bold text-slate-900 mb-4">📚 어휘</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vocabulary.map((v: any, idx: number) => (
                <div key={idx} className="border border-slate-200 rounded p-4">
                  <div className="font-semibold text-slate-900">{v.word}</div>
                  <div className="text-sm text-slate-600 mt-1">{v.meaning}</div>
                  <div className="text-xs text-slate-500 mt-2">
                    예: {v.example}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 3. 문법 */}
        {grammarPoints.length > 0 && (
          <section className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-lg font-bold text-slate-900 mb-4">🔤 문법</h2>
            <div className="space-y-4">
              {grammarPoints.map((g: any, idx: number) => (
                <div key={idx} className="border border-slate-200 rounded p-4">
                  <div className="font-semibold text-slate-900">
                    {g.structure}
                  </div>
                  <div className="text-sm text-slate-700 mt-2">
                    {g.explanation}
                  </div>
                  <div className="text-xs text-slate-600 mt-2 font-mono">
                    예: {g.example}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 4. 문제 */}
        {questions.length > 0 && (
          <section className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-lg font-bold text-slate-900 mb-4">❓ 문제</h2>
            <div className="space-y-6">
              {questions.map((q: any, idx: number) => (
                <div
                  key={idx}
                  className="border border-slate-200 rounded-lg p-4"
                >
                  <div className="font-semibold text-slate-900 mb-3">
                    {idx + 1}. {q.question}
                  </div>

                  {/* 선택지 */}
                  <div className="space-y-2 mb-4">
                    {q.options?.map((opt: string, oidx: number) => (
                      <div
                        key={oidx}
                        className="p-3 border border-slate-200 rounded bg-slate-50 hover:bg-slate-100"
                      >
                        {String.fromCharCode(65 + oidx)}. {opt}
                      </div>
                    ))}
                  </div>

                  {/* Study 모드에서만 정답 표시 */}
                  {mode === 'study' && (
                    <div className="bg-green-50 border border-green-200 rounded p-3">
                      <div className="text-sm font-semibold text-green-900">
                        정답: {q.answer}
                      </div>
                      {q.explanation && (
                        <div className="text-sm text-green-800 mt-2">
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer Navigation */}
        <div className="flex gap-3 justify-between py-8">
          <Link
            href="/jr"
            className="px-6 py-3 border border-slate-300 rounded-lg font-semibold hover:bg-slate-50"
          >
            ← 돌아가기
          </Link>

          {mode === 'study' && (
            <Link
              href={`/content/reading/${passage.id}/practice`}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              연습하기 <ChevronRight className="w-4 h-4" />
            </Link>
          )}

          {mode === 'practice' && (
            <Link
              href={`/content/reading/${passage.id}/review`}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700"
            >
              결과 보기 <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
