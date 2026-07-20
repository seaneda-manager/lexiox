'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronRight } from 'lucide-react';

type Mode = 'study' | 'practice' | 'review';

interface GrammarSessionClientProps {
  chapter: any;
  mode: Mode;
}

export default function GrammarSessionClient({
  chapter,
  mode,
}: GrammarSessionClientProps) {
  if (!chapter) return <div>콘텐츠를 불러올 수 없습니다</div>;

  const content = chapter.content || {};
  const keyPoints = content.keyPoints || [];
  const examples = content.examples || [];
  const exercises = content.exercises || [];
  const commonMistakes = content.commonMistakes || [];

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="border-b bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/jr" className="p-2 hover:bg-slate-100 rounded">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="text-sm text-slate-500">📚 Grammar</div>
              <h1 className="text-xl font-bold text-slate-900">{chapter.title}</h1>
            </div>
          </div>
          <div className="text-sm font-semibold text-slate-700">
            Level {chapter.level}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* 설명 */}
        {content.explanation && (
          <section className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-lg font-bold text-slate-900 mb-4">📖 설명</h2>
            <p className="text-slate-700 leading-relaxed">
              {content.explanation}
            </p>
            {content.koreanExplanation && (
              <p className="text-slate-600 text-sm mt-4">
                {content.koreanExplanation}
              </p>
            )}
          </section>
        )}

        {/* 핵심 포인트 */}
        {keyPoints.length > 0 && (
          <section className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              ⭐ 핵심 포인트
            </h2>
            <ul className="space-y-2">
              {keyPoints.map((point: string, idx: number) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold mt-1">•</span>
                  <span className="text-slate-700">{point}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 예제 */}
        {examples.length > 0 && (
          <section className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              💡 예제
            </h2>
            <div className="space-y-4">
              {examples.map((ex: any, idx: number) => (
                <div key={idx} className="border border-slate-200 rounded p-4">
                  <div className="font-mono text-slate-900 mb-2">
                    {ex.sentence}
                  </div>
                  <div className="text-sm text-slate-600 mb-2">
                    {ex.translation}
                  </div>
                  <div className="text-xs text-slate-500">
                    {ex.explanation}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 연습 문제 */}
        {exercises.length > 0 && (
          <section className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              ✍️ 연습 문제
            </h2>
            <div className="space-y-4">
              {exercises.map((ex: any, idx: number) => (
                <div key={idx} className="border border-slate-200 rounded p-4">
                  <div className="font-semibold text-slate-900 mb-2">
                    {idx + 1}. {ex.text}
                  </div>
                  {mode === 'study' && (
                    <div className="bg-green-50 border border-green-200 rounded p-3 mt-2">
                      <div className="text-sm font-semibold text-green-900">
                        정답: {ex.correct}
                      </div>
                      <div className="text-sm text-green-800 mt-1">
                        {ex.explanation}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 흔한 실수 */}
        {commonMistakes.length > 0 && (
          <section className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              ⚠️ 흔한 실수
            </h2>
            <div className="space-y-4">
              {commonMistakes.map((mistake: any, idx: number) => (
                <div key={idx} className="border border-red-200 bg-red-50 rounded p-4">
                  <div className="text-sm">
                    <span className="font-semibold text-red-900">❌ 틀린 것:</span>
                    <div className="font-mono text-red-800 mt-1">
                      {mistake.mistake}
                    </div>
                  </div>
                  <div className="text-sm mt-3">
                    <span className="font-semibold text-green-900">✅ 맞는 것:</span>
                    <div className="font-mono text-green-800 mt-1">
                      {mistake.correction}
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 mt-3">
                    {mistake.explanation}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

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
              href={`/content/grammar/${chapter.id}/practice`}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              연습하기 <ChevronRight className="w-4 h-4" />
            </Link>
          )}

          {mode === 'practice' && (
            <Link
              href={`/content/grammar/${chapter.id}/review`}
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
