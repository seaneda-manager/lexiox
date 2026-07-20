'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, Play, Pause } from 'lucide-react';

type Mode = 'study' | 'practice' | 'review';

interface ListeningSessionClientProps {
  session: any;
  mode: Mode;
}

export default function ListeningSessionClient({
  session,
  mode,
}: ListeningSessionClientProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  if (!session) return <div>콘텐츠를 불러올 수 없습니다</div>;

  const content = session.content || {};
  const vocabulary = content.vocabulary || [];
  const questions = content.comprehensionQuestions || [];
  const keyPhrases = content.keyPhrases || [];

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="border-b bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/jr" className="p-2 hover:bg-slate-100 rounded">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="text-sm text-slate-500">🎧 Listening</div>
              <h1 className="text-xl font-bold text-slate-900">{session.title}</h1>
            </div>
          </div>
          <div className="text-sm font-semibold text-slate-700">
            Level {session.level}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* 오디오 플레이어 */}
        {session.audio_url && (
          <section className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-lg font-bold text-slate-900 mb-4">🎵 음성</h2>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-4 bg-blue-600 text-white rounded-full hover:bg-blue-700"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6" />
                )}
              </button>
              <audio
                src={session.audio_url}
                controls
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className="flex-1"
              />
            </div>
          </section>
        )}

        {/* 스크립트 */}
        {session.audio_transcript && (
          <section className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-lg font-bold text-slate-900 mb-4">📝 스크립트</h2>
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
              {session.audio_transcript}
            </p>
            {session.korean_transcript && (
              <div className="bg-slate-50 rounded p-4 mt-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-2">
                  한글 번역
                </h3>
                <p className="text-slate-700 whitespace-pre-wrap">
                  {session.korean_transcript}
                </p>
              </div>
            )}
          </section>
        )}

        {/* 주요 표현 */}
        {keyPhrases.length > 0 && (
          <section className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              💬 주요 표현
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {keyPhrases.map((phrase: any, idx: number) => (
                <div key={idx} className="border border-slate-200 rounded p-4">
                  <div className="font-semibold text-slate-900">
                    {phrase.phrase}
                  </div>
                  <div className="text-sm text-slate-600 mt-1">
                    {phrase.meaning}
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    {phrase.usage}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 어휘 */}
        {vocabulary.length > 0 && (
          <section className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-lg font-bold text-slate-900 mb-4">📚 어휘</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vocabulary.map((v: any, idx: number) => (
                <div key={idx} className="border border-slate-200 rounded p-4">
                  <div className="font-semibold text-slate-900">{v.word}</div>
                  <div className="text-sm text-slate-600 mt-1">
                    {v.meaning}
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    {v.context}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 문제 */}
        {questions.length > 0 && (
          <section className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-lg font-bold text-slate-900 mb-4">❓ 문제</h2>
            <div className="space-y-6">
              {questions.map((q: any, idx: number) => (
                <div key={idx} className="border border-slate-200 rounded-lg p-4">
                  <div className="font-semibold text-slate-900 mb-3">
                    {idx + 1}. {q.question}
                  </div>

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
              href={`/content/listening/${session.id}/practice`}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              연습하기 <ChevronRight className="w-4 h-4" />
            </Link>
          )}

          {mode === 'practice' && (
            <Link
              href={`/content/listening/${session.id}/review`}
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
