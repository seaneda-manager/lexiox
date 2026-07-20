'use client';

import { useState } from 'react';
import BrainstormingChallenge from '@/components/speaking-game/BrainstormingChallenge';

const questions = [
  {
    id: '1',
    text: 'Do you prefer studying alone or with others?',
    type: 'preference',
  },
  {
    id: '2',
    text: 'What is your most memorable travel experience?',
    type: 'experience',
  },
  {
    id: '3',
    text: 'How would you spend a day off from school?',
    type: 'hypothetical',
  },
  {
    id: '4',
    text: 'What skills do you want to develop in the future?',
    type: 'preference',
  },
  {
    id: '5',
    text: 'Describe a time when you overcame a challenge.',
    type: 'experience',
  },
];

export default function BrainstormingDrillPage() {
  const [stats, setStats] = useState({
    completed: 0,
    totalScore: 0,
    successCount: 0,
    bestInitiationTime: Infinity,
  });

  const handleComplete = (result: {
    success: boolean;
    initiationDelay: number;
    score: number;
  }) => {
    setStats((prev) => ({
      completed: prev.completed + 1,
      totalScore: prev.totalScore + result.score,
      successCount: prev.successCount + (result.success ? 1 : 0),
      bestInitiationTime: Math.min(prev.bestInitiationTime, result.initiationDelay),
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🚀 Drill 3: 10-Second Brainstorming
          </h1>
          <p className="text-gray-600">
            Master the critical 3-second rule: Start speaking immediately after you hear the question.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
            <div className="text-sm text-gray-600">Questions Done</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600">{stats.successCount}</div>
            <div className="text-sm text-gray-600">Successful (≤3s)</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-purple-600">
              {stats.totalScore}
            </div>
            <div className="text-sm text-gray-600">Total Score</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-orange-600">
              {stats.bestInitiationTime === Infinity
                ? '-'
                : `${stats.bestInitiationTime.toFixed(1)}s`}
            </div>
            <div className="text-sm text-gray-600">Best Time</div>
          </div>
        </div>

        {/* Game */}
        <BrainstormingChallenge
          questions={questions}
          onComplete={handleComplete}
        />

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-blue-900 mb-2">🎯 Why This Matters</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>✅ Starting within 3 seconds = Fluency score boost</li>
            <li>❌ 4+ second delay = Major fluency penalty</li>
            <li>💡 Practice immediate response without hesitation</li>
            <li>🎓 Transfers directly to TOEFL Task 2 (Interview)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
