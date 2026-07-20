'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';

type Question = { id: string; number: number; type: string; stem: string; choices: { id: string; text: string; correct: boolean }[] };
type Track = { id: string; taskKind: string; title: string; transcript: string; audioUrl: string; questions: Question[] };
type Test = { meta: { id: string; label: string }; hard: { tracks: Track[] }; easy: { tracks: Track[] } };
type Result = { module1: { answers: Record<string, number> }; module2: { answers: Record<string, number>; mode: string } };

export default function ReviewPage() {
  const params = useParams();
  const testId = params.testId as string;

  const [test, setTest] = useState<Test | null>(null);
  const [results, setResults] = useState<Result | null>(null);
  const [selectedQ, setSelectedQ] = useState<{ q: Question; track: Track } | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const loadData = async () => {
      const testRes = await fetch(`/api/admin/updated-listening/${testId}`);
      const testData = await testRes.json();
      setTest(testData.payload);
      const resultData = sessionStorage.getItem(`test-${testId}-results`);
      if (resultData) setResults(JSON.parse(resultData));
    };
    loadData();
  }, [testId]);

  if (!test || !results) return <div className="flex h-screen items-center justify-center">로딩 중...</div>;

  const allQs = [
    ...test.hard.tracks.flatMap(t => t.questions.map(q => ({ q, track: t, module: 1 }))),
    ...test[results.module2.mode as 'hard' | 'easy'].tracks.flatMap(t => t.questions.map(q => ({ q, track: t, module: 2 }))),
  ];

  const correct = allQs.filter(({ q }) => {
    const answers = q.module === 1 ? results.module1.answers : results.module2.answers;
    const idx = answers[q.q.id];
    return idx !== undefined && q.q.choices[idx]?.correct;
  });

  const incorrect = allQs.filter(({ q }) => {
    const answers = q.module === 1 ? results.module1.answers : results.module2.answers;
    const idx = answers[q.q.id];
    return idx !== undefined && !q.q.choices[idx]?.correct;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-bold text-gray-900">📖 오답 리뷰</h1>
          <p className="text-sm text-gray-500 mt-1">정답: {correct.length} · 오답: {incorrect.length}</p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8 space-y-8">
        {correct.length > 0 && (
          <div>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">✅ 정답한 문제 ({correct.length})</h2>
            <div className="space-y-2 bg-emerald-50 p-3 rounded-lg border border-emerald-200">
              {correct.map(({ q }) => (
                <div key={q.id} className="rounded-lg bg-white p-2 flex justify-between items-center">
                  <div className="text-sm text-gray-900">{q.number}. {q.stem.substring(0, 40)}...</div>
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">{q.type}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {incorrect.length > 0 && (
          <div>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">❌ 오답한 문제 ({incorrect.length})</h2>
            <div className="space-y-2">
              {incorrect.map(({ q, track }) => (
                <button
                  key={q.id}
                  onClick={() => setSelectedQ({ q, track })}
                  className="w-full rounded-lg bg-white p-3 border-2 border-rose-200 hover:border-rose-400 hover:bg-rose-50 transition text-left"
                >
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-900">{q.number}. {q.stem.substring(0, 40)}...</div>
                    <span className="text-xs bg-rose-100 text-rose-700 px-2 py-1 rounded">{q.type}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedQ && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedQ(null)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 border-b bg-white p-6 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">문제 {selectedQ.q.number}</h2>
                <p className="text-sm text-gray-500">{selectedQ.track.title}</p>
              </div>
              <button onClick={() => setSelectedQ(null)} className="text-2xl text-gray-400">×</button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">문제</h3>
                <p className="text-gray-700">{selectedQ.q.stem}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">다시 듣기</h3>
                <audio ref={audioRef} src={selectedQ.track.audioUrl} controls className="w-full rounded-lg" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">스크립트</h3>
                <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">{selectedQ.track.transcript}</div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">해설</h3>
                <div className="space-y-2">
                  {selectedQ.q.choices.map((c, i) => (
                    <div key={c.id} className={`p-3 rounded-lg text-sm ${c.correct ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50 border border-gray-200'}`}>
                      <p className="font-medium text-gray-900">({String.fromCharCode(65 + i)}) {c.text} {c.correct && '✅'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
