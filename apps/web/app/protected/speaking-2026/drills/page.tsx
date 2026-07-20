'use client';

import Link from 'next/link';

const drills = [
  {
    number: 1,
    title: '3-Second Cheat Key',
    description: 'Master question templates. Respond within 3 seconds.',
    href: '/speaking-2026/drills/templates',
    color: 'from-blue-500 to-blue-600',
    icon: '⚡',
    focus: 'Quick Response',
    targetMetric: '≤ 3 seconds',
  },
  {
    number: 2,
    title: '45-Second Structure',
    description: 'Learn the 4-part structure: intro → reason 1 → story → conclusion.',
    href: '/speaking-2026/drills/structure',
    color: 'from-purple-500 to-purple-600',
    icon: '📐',
    focus: 'Organization',
    targetMetric: '41-44 seconds',
  },
  {
    number: 3,
    title: '10-Second Brainstorming',
    description: 'Start speaking immediately within 3 seconds of hearing the question.',
    href: '/speaking-2026/drills/brainstorming',
    color: 'from-orange-500 to-orange-600',
    icon: '🚀',
    focus: 'Immediate Initiation',
    targetMetric: '≤ 3 seconds start',
  },
  {
    number: 4,
    title: 'Fluency Marathon',
    description: 'Speak continuously without long pauses. Target: 130-150 WPM.',
    href: '/speaking-2026/drills/fluency',
    color: 'from-green-500 to-green-600',
    icon: '🎙️',
    focus: 'Fluency & WPM',
    targetMetric: '130-150 WPM',
  },
  {
    number: 5,
    title: 'Improvisational Ranking',
    description: 'Answer the same question multiple ways. Measure creativity and diversity.',
    href: '/speaking-2026/drills/improvisation',
    color: 'from-pink-500 to-pink-600',
    icon: '🎭',
    focus: 'Variety & Depth',
    targetMetric: 'Diverse answers',
  },
];

const games = [
  {
    number: 1,
    title: 'Stress Hunt',
    description: 'Identify correct syllable stress. Wrong stress = AI won\'t recognize the word.',
    href: '/speaking-2026/games/stress-hunt',
    color: 'from-rose-500 to-rose-600',
    icon: '🎯',
    focus: 'Syllable Stress',
  },
  {
    number: 2,
    title: 'Intonation Wave',
    description: 'Match pitch variation. Compare your intonation curve to the native speaker.',
    href: '/speaking-2026/games/intonation-wave',
    color: 'from-cyan-500 to-cyan-600',
    icon: '📈',
    focus: 'Pitch & Prosody',
  },
  {
    number: 3,
    title: 'Emphasis Challenge',
    description: 'Say the same sentence with different emphasis. Understand how stress changes meaning.',
    href: '/speaking-2026/games/emphasis-challenge',
    color: 'from-amber-500 to-amber-600',
    icon: '🎬',
    focus: 'Word Emphasis',
  },
  {
    number: 4,
    title: 'Prosody Race',
    description: 'Match speed and rhythm. Slow → Normal → Fast → Native.',
    href: '/speaking-2026/games/prosody-race',
    color: 'from-indigo-500 to-indigo-600',
    icon: '🏃',
    focus: 'Speech Rhythm',
  },
];

export default function DrillsDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            🎮 Speaking Training Hub
          </h1>
          <p className="text-xl text-slate-300">
            Master the 5 training drills and 4 pronunciation games. Based on 2026 TOEFL AI scoring mechanics.
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-4 mb-12">
          <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
            <div className="text-sm text-slate-400 mb-2">Critical Success Factor</div>
            <div className="text-2xl font-bold text-red-400">3 Second Rule</div>
            <p className="text-xs text-slate-400 mt-2">Start speaking within 3s or lose fluency points</p>
          </div>
          <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
            <div className="text-sm text-slate-400 mb-2">Speaking Rate Target</div>
            <div className="text-2xl font-bold text-green-400">130-150 WPM</div>
            <p className="text-xs text-slate-400 mt-2">Too slow/fast = intelligibility penalty</p>
          </div>
          <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
            <div className="text-sm text-slate-400 mb-2">Time Management</div>
            <div className="text-2xl font-bold text-blue-400">41-44 Seconds</div>
            <p className="text-xs text-slate-400 mt-2">Optimal response length per question</p>
          </div>
          <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
            <div className="text-sm text-slate-400 mb-2">Catastrophic Penalty</div>
            <div className="text-2xl font-bold text-orange-400">3+ Sec Silence</div>
            <p className="text-xs text-slate-400 mt-2">Fluency score collapses with long pauses</p>
          </div>
        </div>

        {/* Drills Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-6">📚 Training Drills (Gym Equipment)</h2>
          <p className="text-slate-300 mb-8">
            Each drill targets a specific aspect of speaking like gym equipment trains different muscles.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {drills.map((drill) => (
              <Link
                key={drill.number}
                href={drill.href}
                className="group"
              >
                <div className={`bg-gradient-to-br ${drill.color} rounded-lg p-6 h-full transform transition-all duration-200 hover:scale-105 hover:shadow-2xl cursor-pointer`}>
                  <div className="text-4xl mb-3">{drill.icon}</div>
                  <div className="text-sm font-semibold text-white opacity-80 mb-1">
                    DRILL {drill.number}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    {drill.title}
                  </h3>
                  <p className="text-sm text-white text-opacity-90 mb-4">
                    {drill.description}
                  </p>
                  <div className="border-t border-white border-opacity-30 pt-3">
                    <div className="text-xs text-white text-opacity-80 mb-1">
                      Focus: {drill.focus}
                    </div>
                    <div className="text-sm font-bold text-white">
                      {drill.targetMetric}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Games Section */}
        <div>
          <h2 className="text-3xl font-bold text-white mb-6">🎯 Pronunciation Games (Stress Challenge)</h2>
          <p className="text-slate-300 mb-8">
            Master pronunciation elements: stress, intonation, prosody, clarity. AI recognizes words based on these.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {games.map((game) => (
              <Link
                key={game.number}
                href={game.href}
                className="group"
              >
                <div className={`bg-gradient-to-br ${game.color} rounded-lg p-6 h-full transform transition-all duration-200 hover:scale-105 hover:shadow-2xl cursor-pointer`}>
                  <div className="text-4xl mb-3">{game.icon}</div>
                  <div className="text-sm font-semibold text-white opacity-80 mb-1">
                    GAME {game.number}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    {game.title}
                  </h3>
                  <p className="text-sm text-white text-opacity-90 mb-4">
                    {game.description}
                  </p>
                  <div className="border-t border-white border-opacity-30 pt-3">
                    <div className="text-sm font-bold text-white">
                      🎓 {game.focus}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 bg-slate-700 border border-slate-600 rounded-lg p-8 text-center">
          <h3 className="text-2xl font-bold text-white mb-3">Ready to Improve?</h3>
          <p className="text-slate-300 mb-6">
            Start with Drill 3 (Immediate Initiation) - it directly transfers to the 3-second rule on test day.
          </p>
          <Link
            href="/speaking-2026/drills/brainstorming"
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-lg transition-all duration-200"
          >
            Start 10-Second Brainstorming →
          </Link>
        </div>
      </div>
    </div>
  );
}
