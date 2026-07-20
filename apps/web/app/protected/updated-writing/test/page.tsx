'use client';

import Link from 'next/link';
import { BookOpen, Clock, Zap } from 'lucide-react';

export default function WritingTestListPage() {
  const tests = [
    {
      id: '1',
      title: 'Practice Test 1',
      description: 'Build a Sentence (45s) + Integrated Writing (7m) + Academic Discussion (10m)',
      difficulty: 'Medium',
      duration: '18 minutes',
      questions: 3,
      icon: '✍️',
    },
    {
      id: '2',
      title: 'Practice Test 2',
      description: 'Full TOEFL Writing section with time limits',
      difficulty: 'Hard',
      duration: '25 minutes',
      questions: 3,
      icon: '📝',
      comingSoon: true,
    },
    {
      id: '3',
      title: 'Practice Test 3',
      description: 'Custom Writing Assessment',
      difficulty: 'Medium',
      duration: '25 minutes',
      questions: 3,
      icon: '📋',
      comingSoon: true,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Writing Test Mode</h1>
        <p className="text-sm text-gray-600 mt-1">Select a writing test to begin</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {tests.map((test) => (
          <Link
            key={test.id}
            href={test.comingSoon ? '#' : `/updated-writing/test/${test.id}`}
            onClick={(e) => test.comingSoon && e.preventDefault()}
            className={`rounded-lg border p-6 transition ${
              test.comingSoon
                ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                : 'bg-white hover:border-indigo-400 hover:shadow-md cursor-pointer'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="text-3xl">{test.icon}</div>
                {test.comingSoon && (
                  <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-1 rounded">
                    Coming Soon
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold">{test.title}</h3>
                <p className="text-xs text-gray-600 mt-1">{test.description}</p>
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-600 pt-2 border-t">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{test.duration}</span>
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  <span>{test.questions} questions</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="w-4 h-4" />
                  <span>{test.difficulty}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 space-y-2">
        <p className="text-xs font-semibold text-indigo-700 uppercase">💡 Test Mode Tips</p>
        <ul className="text-xs text-indigo-900 space-y-1 list-inside list-disc">
          <li>Strict time limits: Once timer ends, essay is auto-submitted</li>
          <li>Copy/Paste disabled: Prevents external content</li>
          <li>AI scoring provides instant feedback on each task</li>
          <li>Review mode shows detailed analysis after submission</li>
        </ul>
      </div>
    </div>
  );
}
