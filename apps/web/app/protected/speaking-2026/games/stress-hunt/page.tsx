'use client';

import { useState } from 'react';
import StressHuntGame from '@/components/speaking-game/StressHuntGame';

const questions = [
  {
    id: '1',
    word: 'photograph',
    sentence: 'She took a beautiful photograph of the sunset.',
    options: [
      { syllables: 'PHO-to-graph', label: '1st' },
      { syllables: 'pho-TO-graph', label: '2nd' },
      { syllables: 'pho-to-GRAPH', label: '3rd' },
    ],
    correct: 0, // PHO-to-graph
    difficulty: 'easy',
  },
  {
    id: '2',
    word: 'present',
    sentence: 'I will present my research tomorrow.',
    options: [
      { syllables: 'PRE-sent', label: '1st' },
      { syllables: 'pre-SENT', label: '2nd' },
    ],
    correct: 1, // pre-SENT (verb)
    difficulty: 'easy',
  },
  {
    id: '3',
    word: 'refuse',
    sentence: 'I refuse to accept this offer.',
    options: [
      { syllables: 'RE-fuse', label: '1st' },
      { syllables: 're-FUSE', label: '2nd' },
    ],
    correct: 1, // re-FUSE (verb)
    difficulty: 'medium',
  },
  {
    id: '4',
    word: 'record',
    sentence: 'This is a new world record.',
    options: [
      { syllables: 'RE-cord', label: '1st' },
      { syllables: 're-CORD', label: '2nd' },
    ],
    correct: 0, // RE-cord (noun)
    difficulty: 'medium',
  },
  {
    id: '5',
    word: 'develop',
    sentence: 'Children develop at different rates.',
    options: [
      { syllables: 'DE-vel-op', label: '1st' },
      { syllables: 'de-VEL-op', label: '2nd' },
      { syllables: 'de-vel-OP', label: '3rd' },
    ],
    correct: 1, // de-VEL-op
    difficulty: 'medium',
  },
  {
    id: '6',
    word: 'education',
    sentence: 'Education is important for your future.',
    options: [
      { syllables: 'ED-u-ca-tion', label: '1st' },
      { syllables: 'ed-u-CA-tion', label: '3rd' },
      { syllables: 'ed-u-ca-TION', label: '4th' },
    ],
    correct: 1, // ed-u-CA-tion
    difficulty: 'medium',
  },
  {
    id: '7',
    word: 'communicate',
    sentence: 'It is important to communicate clearly.',
    options: [
      { syllables: 'COM-mu-ni-cate', label: '1st' },
      { syllables: 'com-MU-ni-cate', label: '2nd' },
      { syllables: 'com-mu-NI-cate', label: '3rd' },
    ],
    correct: 0, // COM-mu-ni-cate
    difficulty: 'hard',
  },
  {
    id: '8',
    word: 'competition',
    sentence: 'The competition was very intense.',
    options: [
      { syllables: 'COM-pe-ti-tion', label: '1st' },
      { syllables: 'com-pe-TI-tion', label: '3rd' },
      { syllables: 'com-pe-ti-TION', label: '4th' },
    ],
    correct: 2, // com-pe-ti-TION
    difficulty: 'hard',
  },
];

export default function StressHuntPage() {
  const [stats, setStats] = useState({
    completed: 0,
    correct: 0,
    streak: 0,
    bestStreak: 0,
    totalScore: 0,
  });

  const handleComplete = (result: {
    correct: boolean;
    score: number;
  }) => {
    setStats((prev) => {
      const newStreak = result.correct ? prev.streak + 1 : 0;
      return {
        completed: prev.completed + 1,
        correct: prev.correct + (result.correct ? 1 : 0),
        streak: newStreak,
        bestStreak: Math.max(prev.bestStreak, newStreak),
        totalScore: prev.totalScore + result.score,
      };
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-50 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🎯 Game 1: Stress Hunt
          </h1>
          <p className="text-gray-600">
            Master syllable stress. Wrong stress = AI won't recognize the word.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
            <div className="text-sm text-gray-600">Total Words</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600">
              {stats.completed > 0
                ? Math.round((stats.correct / stats.completed) * 100)
                : 0}
              %
            </div>
            <div className="text-sm text-gray-600">Accuracy</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-purple-600">
              {stats.streak}
            </div>
            <div className="text-sm text-gray-600">Current Streak</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-orange-600">
              {stats.bestStreak}
            </div>
            <div className="text-sm text-gray-600">Best Streak</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-pink-600">
              {stats.totalScore}
            </div>
            <div className="text-sm text-gray-600">Total Score</div>
          </div>
        </div>

        {/* Game */}
        <StressHuntGame questions={questions} onComplete={handleComplete} />

        {/* Educational Info */}
        <div className="grid grid-cols-2 gap-4 mt-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-bold text-blue-900 mb-2">📚 Learn</h4>
            <p className="text-sm text-blue-800 mb-2">
              <strong>Noun vs Verb:</strong> Many words change stress by part of speech.
            </p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>✅ PREsent (noun: gift)</li>
              <li>✅ preSENT (verb: show)</li>
            </ul>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-bold text-green-900 mb-2">🎤 Why It Matters</h4>
            <p className="text-sm text-green-800">
              Wrong stress → AI speech recognition fails → Score penalty. Correct stress allows
              AI to recognize every word.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
