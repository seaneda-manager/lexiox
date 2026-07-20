'use client';

import Link from 'next/link';
import { BookOpen, Lightbulb, Video } from 'lucide-react';

export default function WritingStudyPage() {
  const modules = [
    {
      id: 1,
      title: 'Task 1: Build a Sentence',
      description: 'Learn how to construct grammatically correct sentences from word tokens in 35-45 seconds',
      lessons: 5,
      icon: '📝',
      topics: ['Sentence Structure', 'Grammar', 'Word Order', 'Punctuation'],
    },
    {
      id: 2,
      title: 'Task 2: Integrated Writing',
      description: 'Master synthesizing reading and listening information into cohesive essays',
      lessons: 6,
      icon: '🔗',
      topics: ['Summarization', 'Paraphrasing', 'Integration', 'Organization'],
    },
    {
      id: 3,
      title: 'Task 3: Academic Discussion',
      description: 'Develop skills for participating in scholarly conversations with clear arguments',
      lessons: 5,
      icon: '💬',
      topics: ['Argument Development', 'Evidence', 'Academic Tone', 'Counterarguments'],
    },
    {
      id: 4,
      title: 'Writing Strategies',
      description: 'Essential techniques for TOEFL writing: time management, revision, and scoring',
      lessons: 4,
      icon: '⚡',
      topics: ['Time Management', 'Essay Structure', 'Proofreading', 'Common Mistakes'],
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Writing Study Mode</h1>
        <p className="text-sm text-gray-600 mt-1">Learn writing strategies and techniques at your own pace</p>
      </div>

      <div className="grid gap-4">
        {modules.map((module) => (
          <div
            key={module.id}
            className="rounded-lg border bg-white p-6 hover:border-indigo-400 hover:shadow-md transition"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-3xl mb-2">{module.icon}</div>
                  <h3 className="text-lg font-semibold">{module.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                </div>
                <div className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full whitespace-nowrap">
                  {module.lessons} lessons
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {module.topics.map((topic) => (
                  <span key={topic} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                    {topic}
                  </span>
                ))}
              </div>

              <button className="w-full px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition">
                Start Learning
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
        <p className="text-xs font-semibold text-amber-700 uppercase">📚 Study Mode Advantage</p>
        <ul className="text-xs text-amber-900 space-y-1 list-inside list-disc">
          <li>Learn at your own pace with detailed explanations</li>
          <li>Practice exercises for each writing task</li>
          <li>Real examples from official TOEFL exams</li>
          <li>No time pressure: Focus on understanding</li>
        </ul>
      </div>
    </div>
  );
}
