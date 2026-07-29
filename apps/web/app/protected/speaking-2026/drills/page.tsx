'use client';

import { useState } from 'react';
import Link from 'next/link';

const drills = [
  {
    number: 1,
    title: '3-Second Cheat Key',
    description: 'Master question templates. Respond within 3 seconds.',
    description_ko: '질문 템플릿을 마스터하세요. 3초 내에 답변하세요.',
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
    description_ko: '4단계 구조를 배우세요: 도입 → 이유1 → 사례 → 결론.',
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
    description_ko: '질문을 듣고 3초 내에 즉시 말하기를 시작하세요.',
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
    description_ko: '긴 쉼 없이 계속 말하세요. 목표: 분당 130-150 단어.',
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
    description_ko: '같은 질문을 여러 방식으로 답변하세요. 창의성과 다양성을 측정합니다.',
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
    description_ko: '올바른 음절 강세를 찾으세요. 잘못된 강세 = AI가 단어를 인식하지 못함.',
    href: '/speaking-2026/games/stress-hunt',
    color: 'from-rose-500 to-rose-600',
    icon: '🎯',
    focus: 'Syllable Stress',
  },
  {
    number: 2,
    title: 'Intonation Wave',
    description: 'Match pitch variation. Compare your intonation curve to the native speaker.',
    description_ko: '음정 변화를 맞추세요. 당신의 억양 곡선을 원어민과 비교하세요.',
    href: '/speaking-2026/games/intonation-wave',
    color: 'from-cyan-500 to-cyan-600',
    icon: '📈',
    focus: 'Pitch & Prosody',
  },
  {
    number: 3,
    title: 'Emphasis Challenge',
    description: 'Say the same sentence with different emphasis. Understand how stress changes meaning.',
    description_ko: '같은 문장을 다른 강조로 말하세요. 강세가 의미를 어떻게 바꾸는지 이해하세요.',
    href: '/speaking-2026/games/emphasis-challenge',
    color: 'from-amber-500 to-amber-600',
    icon: '🎬',
    focus: 'Word Emphasis',
  },
  {
    number: 4,
    title: 'Prosody Race',
    description: 'Match speed and rhythm. Slow → Normal → Fast → Native.',
    description_ko: '속도와 리듬을 맞추세요. 느림 → 보통 → 빠름 → 원어민 속도.',
    href: '/speaking-2026/games/prosody-race',
    color: 'from-indigo-500 to-indigo-600',
    icon: '🏃',
    focus: 'Speech Rhythm',
  },
];

const readingGames = [
  {
    number: 1,
    title: 'Sentence Sprints',
    description: 'Read fast-moving sentences and capture the key idea before they disappear.',
    description_ko: '빠르게 이동하는 문장을 읽고 사라지기 전에 핵심 아이디어를 포착하세요.',
    href: '#',
    color: 'from-blue-500 to-cyan-600',
    icon: '⚡',
    focus: 'Speed & Comprehension',
  },
  {
    number: 2,
    title: 'Vocabulary Archery',
    description: 'Shoot arrows at target words matching synonyms, antonyms, or definitions.',
    description_ko: '동의어, 반의어, 정의와 일치하는 단어에 화살을 쏘세요.',
    href: '#',
    color: 'from-amber-500 to-orange-600',
    icon: '🎯',
    focus: 'Vocabulary & Context',
  },
  {
    number: 3,
    title: 'Inference Detectives',
    description: 'Read short passages and deduce implied facts. Solve the mystery through close reading.',
    description_ko: '짧은 지문을 읽고 암시된 사실을 추론하세요. 정밀한 읽기로 수수께끼를 풀어보세요.',
    href: '#',
    color: 'from-purple-500 to-pink-600',
    icon: '🔍',
    focus: 'Critical Reading',
  },
  {
    number: 4,
    title: 'Bubble Pop',
    description: 'Tap floating word bubbles in the correct order to complete sentences.',
    description_ko: '떠다니는 단어 버블을 올바른 순서대로 터치하여 문장을 완성하세요.',
    href: '#',
    color: 'from-green-500 to-emerald-600',
    icon: '💭',
    focus: 'Sentence Assembly',
  },
];

export default function DrillsDashboard() {
  const [language, setLanguage] = useState<'EN' | 'KOR'>('EN');

  const getDescription = (en: string, ko: string) => {
    return language === 'EN' ? en : ko;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with Language Toggle */}
        <div className="flex justify-between items-start mb-12">
          <div>
            <h1 className="text-5xl font-bold text-white mb-4">
              🏋️ LXGym
            </h1>
            <p className="text-xl text-slate-300">
              Master Speaking, Reading, and Language skills through interactive games. All 4 skills, one platform.
            </p>
          </div>

          {/* Language Toggle Button */}
          <div className="flex gap-2">
            <button
              onClick={() => setLanguage('EN')}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                language === 'EN'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('KOR')}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                language === 'KOR'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              KOR
            </button>
          </div>
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
            {getDescription(
              'Each drill targets a specific aspect of speaking like gym equipment trains different muscles.',
              '각 드릴은 마치 헬스 장비가 다른 근육을 단련하듯이 말하기의 특정 측면을 목표로 합니다.'
            )}
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
                    {getDescription(drill.description, drill.description_ko)}
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
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-6">🎯 Pronunciation Games (Stress Challenge)</h2>
          <p className="text-slate-300 mb-8">
            {getDescription(
              'Master pronunciation elements: stress, intonation, prosody, clarity. AI recognizes words based on these.',
              '발음 요소를 마스터하세요: 강세, 음정, 리듬감, 명확성. AI는 이를 기반으로 단어를 인식합니다.'
            )}
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
                    {getDescription(game.description, game.description_ko)}
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

        {/* Reading Games Section */}
        <div className="mb-12 mt-16 border-t border-slate-600 pt-12">
          <h2 className="text-3xl font-bold text-white mb-6">📖 Reading Games (Language Mastery)</h2>
          <p className="text-slate-300 mb-8">
            {getDescription(
              'Develop reading comprehension, vocabulary, and inferential thinking through engaging games.',
              '재미있는 게임을 통해 독해 이해력, 어휘, 추론 능력을 개발하세요.'
            )}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {readingGames.map((game) => (
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
                    {getDescription(game.description, game.description_ko)}
                  </p>
                  <div className="border-t border-white border-opacity-30 pt-3">
                    <div className="text-xs text-white text-opacity-80">
                      Focus: {game.focus}
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
