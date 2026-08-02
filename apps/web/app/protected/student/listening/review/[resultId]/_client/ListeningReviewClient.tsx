'use client';

import { useState } from 'react';

interface ReviewQuestion {
  id: string;
  number: number;
  stem: string;
  audioUrl?: string;
  choices: any[];
  isCorrect: boolean;
  userAnswer: string | null;
  correctAnswer: string;
  correctChoiceId?: string;
}

interface ReviewData {
  testId: string;
  testLabel: string;
  score: number;
  correct: number;
  total: number;
  questions: ReviewQuestion[];
}

export function ListeningReviewClient({ reviewData }: { reviewData: ReviewData }) {
  const [selectedId, setSelectedId] = useState(reviewData.questions[0]?.id || '');
  const [stage, setStage] = useState(0);
  const [dictationMarked, setDictationMarked] = useState<Set<number>>(new Set());
  const [noteText, setNoteText] = useState('');

  const selected = reviewData.questions.find((q) => q.id === selectedId);
  if (!selected) return <div className="p-6 text-rose-700">문제가 없습니다</div>;

  const STAGES = [
    '1. 정답/오답 확인',
    '2. Dictation',
    '3. Note-taking',
    '4. 단어 분석',
    '5. 해석하기',
    '6. 설명 채우기',
  ];

  const handleDictationClick = (idx: number) => {
    const newSet = new Set(dictationMarked);
    if (newSet.has(idx)) {
      newSet.delete(idx);
    } else {
      newSet.add(idx);
    }
    setDictationMarked(newSet);
  };

  const words = selected.stem?.split(' ') || [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <h2 className="text-xl font-bold">Listening 리뷰</h2>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <p className="text-xs font-bold uppercase mb-2">질문</p>
        <div className="grid grid-cols-10 gap-2">
          {reviewData.questions.map((q) => (
            <button
              key={q.id}
              onClick={() => { setSelectedId(q.id); setStage(0); setDictationMarked(new Set()); setNoteText(''); }}
              className={`rounded border-2 py-2 text-xs font-semibold ${
                selectedId === q.id
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {q.isCorrect ? '✓' : '✗'}{q.number}
            </button>
          ))}
        </div>
      </div>

      <div className="border-b overflow-x-auto">
        <div className="flex gap-1 px-6">
          {STAGES.map((s, i) => (
            <button
              key={i}
              onClick={() => setStage(i)}
              className={`px-4 py-3 text-sm font-semibold whitespace-nowrap ${
                i === stage
                  ? 'border-b-2 border-blue-500 text-blue-700'
                  : 'text-slate-600'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 rounded-lg border border-slate-200 bg-white p-6">
          {/* Stage 0: 정답/오답 확인 */}
          {stage === 0 && (
            <>
              {selected.audioUrl && (
                <div className="mb-6">
                  <p className="text-xs text-slate-600 mb-2">🎧 오디오</p>
                  <audio controls className="w-full rounded" src={selected.audioUrl} />
                </div>
              )}
              <p className="mb-4 text-sm">{selected.stem}</p>
              <div className="space-y-2">
                {selected.choices.map((c, i) => (
                  <div
                    key={c.id}
                    className={`rounded border-2 p-3 text-sm ${
                      c.id === selected.correctChoiceId
                        ? 'border-green-500 bg-green-50'
                        : c.id === selected.userAnswer
                        ? 'border-red-500 bg-red-50'
                        : 'border-slate-200'
                    }`}
                  >
                    {String.fromCharCode(65 + i)}. {c.text}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Stage 1: Dictation */}
          {stage === 1 && (
            <>
              <div className="mb-6">
                <p className="text-xs text-slate-600 mb-2">🎧 오디오 (듣기)</p>
                <audio controls className="w-full rounded" src={selected.audioUrl} />
              </div>

              <div className="mb-4">
                <p className="text-xs font-bold text-slate-600 mb-2">❌ 안들리는 부분 표시</p>
                <p className="text-xs text-slate-500 mb-3">(클릭: 단어 | 홀드+드래그: 블록)</p>
                
                <div className="rounded-lg bg-slate-50 p-4 text-sm leading-relaxed">
                  {words.map((word, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleDictationClick(idx)}
                      className={`px-2 py-1 rounded mr-1 ${
                        dictationMarked.has(idx)
                          ? 'bg-red-400 text-white'
                          : 'bg-white border border-slate-300 hover:bg-red-50'
                      }`}
                    >
                      {dictationMarked.has(idx) ? '___' : word}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs text-slate-600">
                  ✅ 표시된 부분: {dictationMarked.size}개 단어
                </p>
              </div>
            </>
          )}

          {/* Stage 2: Note-taking */}
          {stage === 2 && (
            <>
              <div className="mb-6">
                <p className="text-sm font-bold mb-2">📝 노트 작성</p>
                <p className="text-xs text-slate-600 mb-4">
                  💡 팁: 먼저 종이에 주요 내용을 정리한 후, 아래에 옮겨 쓰세요.
                </p>
              </div>

              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="오디오에서 들은 주요 내용을 정리하세요..."
                className="w-full h-48 p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
              
              <p className="text-xs text-slate-500 mt-2">
                {noteText.length}자
              </p>
            </>
          )}

          {/* Stage 3-5: 준비 중 */}
          {stage > 2 && (
            <p className="text-slate-600">준비 중...</p>
          )}
        </div>

        <div className="col-span-4 rounded-lg border border-slate-200 bg-white p-6">
          <p className="text-xs font-bold uppercase mb-2">테스트</p>
          <p className="text-sm">{reviewData.testLabel}</p>
          <p className="mt-4 font-bold text-blue-700">
            {reviewData.correct}/{reviewData.total} ({reviewData.score}%)
          </p>
        </div>
      </div>
    </div>
  );
}
