'use client';

import { useState } from 'react';
import FluencyMarathon from '@/components/speaking-game/FluencyMarathon';

const challenges = [
  {
    id: '1',
    text: 'Describe a place that is important to you.',
    difficulty: 'easy',
  },
  {
    id: '2',
    text: 'Explain how to prepare your favorite meal.',
    difficulty: 'easy',
  },
  {
    id: '3',
    text: 'Talk about a person who has influenced you.',
    difficulty: 'medium',
  },
  {
    id: '4',
    text: 'Discuss the advantages and disadvantages of social media.',
    difficulty: 'medium',
  },
  {
    id: '5',
    text: 'If you could travel anywhere, where would it be and why?',
    difficulty: 'hard',
  },
];

export default function FluencyMarathonPage() {
  const [stats, setStats] = useState({
    completed: 0,
    totalPoints: 0,
    bestDuration: 0,
    averageWPM: 0,
    longPauseCount: 0,
  });

  const handleComplete = (result: {
    duration: number;
    wpm: number;
    pauseCount: number;
    longPauses: number;
    score: number;
  }) => {
    setStats((prev) => ({
      completed: prev.completed + 1,
      totalPoints: prev.totalPoints + result.score,
      bestDuration: Math.max(prev.bestDuration, result.duration),
      averageWPM:
        prev.averageWPM === 0
          ? result.wpm
          : (prev.averageWPM + result.wpm) / 2,
      longPauseCount: prev.longPauseCount + result.longPauses,
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-50 p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🎙️ Drill 4: Fluency Marathon
          </h1>
          <p className="text-gray-600">
            Sustain continuous speech without long pauses. Target: 130-150 WPM, avoid 3s+ silence.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">
              {stats.averageWPM > 0 ? Math.round(stats.averageWPM) : '-'}
            </div>
            <div className="text-sm text-gray-600">Avg WPM</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-purple-600">
              {stats.bestDuration > 0 ? `${stats.bestDuration}s` : '-'}
            </div>
            <div className="text-sm text-gray-600">Best Duration</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-orange-600">
              {stats.longPauseCount}
            </div>
            <div className="text-sm text-gray-600">Long Pauses (3s+)</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-pink-600">
              {stats.totalPoints}
            </div>
            <div className="text-sm text-gray-600">Total Score</div>
          </div>
        </div>

        {/* Game */}
        <FluencyMarathon challenges={challenges} onComplete={handleComplete} />

        {/* Info Boxes */}
        <div className="grid grid-cols-3 gap-4 mt-8">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-bold text-green-900 mb-2">✅ Goal</h4>
            <p className="text-sm text-green-800">
              Speak continuously without hesitation breaks. Avoid pauses longer than 3 seconds.
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-bold text-blue-900 mb-2">🎯 Target</h4>
            <p className="text-sm text-blue-800">
              130-150 WPM. The fluency score is weighed most heavily in AI evaluation.
            </p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="font-bold text-orange-900 mb-2">⚠️ Critical</h4>
            <p className="text-sm text-orange-800">
              3+ second pause = catastrophic score penalty. Silence is worse than grammar errors.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
