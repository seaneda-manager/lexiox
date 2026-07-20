'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

type Question = { id: string; number: number; type: string; stem: string; choices: { id: string; text: string; correct: boolean }[] };
type Track = { id: string; taskKind: string; title: string; transcript: string; audioUrl: string; questions: Question[]; audioSeconds: number; testingSeconds: number };
type Test = { meta: { id: string; label: string }; hard: { tracks: Track[] }; easy: { tracks: Track[] } };

export default function Module2Page() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const testId = params.testId as string;
  const mode = (searchParams.get('mode') || 'hard') as 'hard' | 'easy';

  const [test, setTest] = useState<Test | null>(null);
  const [trackIdx, setTrackIdx] = useState(0);
  const [qIdx, setQIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const loadTest = async () => {
      const res = await fetch(`/api/admin/updated-listening/${testId}`);
      const data = await res.json();
      if (data.ok) setTest(data.payload);
    };
    loadTest();
  }, [testId]);

  const tracks = test?.[mode]?.tracks || [];
  const track = tracks[trackIdx];
  const question = track?.questions[qIdx];
  const totalQuestions = tracks.reduce((sum, t) => sum + t.questions.length, 0);

  useEffect(() => {
    if (!track || !audioRef.current) return;
    audioRef.current.src = track.audioUrl;
    audioRef.current.play();
    setTimeLeft(track.audioSeconds + track.testingSeconds);
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          handleNext();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [trackIdx, qIdx]);

  const selectAnswer = (idx: number) => {
    if (question) setAnswers(prev => ({ ...prev, [question.id]: idx }));
  };

  const handleNext = () => {
    if (!track) return;
    if (qIdx < track.questions.length - 1) {
      setQIdx(q => q + 1);
    } else if (trackIdx < tracks.length - 1) {
      setTrackIdx(t => t + 1);
      setQIdx(0);
    } else {
      submitModule2();
    }
  };

  const submitModule2 = async () => {
    let correct = 0;
    tracks.forEach(t =>
      t.questions.forEach(q => {
        const idx = answers[q.id];
        if (idx !== undefined && q.choices[idx]?.correct) correct++;
      })
    );
    const module1Data = JSON.parse(sessionStorage.getItem(`test-${testId}-module1`) || '{}');
    sessionStorage.setItem(`test-${testId}-results`, JSON.stringify({
      module1: module1Data,
      module2: { answers, correctCount: correct, totalQuestions, mode },
      combinedCorrect: (module1Data.correctCount || 0) + correct,
      combinedTotal: (module1Data.totalQuestions || 0) + totalQuestions,
    }));
    router.push(`/student/toefl/listening/${testId}/results`);
  };

  if (!test || !track || !question) return <div className="flex h-screen items-center justify-center">로딩 중...</div>;

  const selectedIdx = answers[question.id];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Module 2 {mode === 'hard' ? '(Hard)' : '(Easy)'}</h1>
            <p className="text-xs text-gray-500">{trackIdx + 1}/{tracks.length} · 문제 {Object.keys(answers).length}/{totalQuestions}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono font-bold text-indigo-600">{timeLeft}초</div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-1 flex items-center justify-center rounded-lg bg-gray-100 h-64">
            <div className="text-center text-gray-500">
              <p className="text-4xl">🎧</p>
              <p className="mt-2 text-sm">{track.taskKind}</p>
            </div>
          </div>

          <div className="col-span-2 space-y-6">
            <audio ref={audioRef} />
            <h2 className="text-lg font-semibold text-gray-900">{question.stem}</h2>
            <div className="space-y-2">
              {question.choices.map((choice, idx) => (
                <button
                  key={choice.id}
                  onClick={() => selectAnswer(idx)}
                  className={`w-full rounded-lg border-2 p-4 text-left transition ${
                    selectedIdx === idx
                      ? 'border-indigo-600 bg-indigo-50 font-semibold text-indigo-900'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <span className="text-sm">
                    <span className="font-semibold">({String.fromCharCode(65 + idx)})</span> {choice.text}
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={handleNext}
              disabled={selectedIdx === undefined}
              className="w-full rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              다음 →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
