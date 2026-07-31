'use client';

import { useState } from 'react';
import Link from 'next/link';
import { GAMES, PHASE_1_GAMES, PHASE_2_GAMES } from '../_lib/games';
import type { GameMetadata } from '../_types';

export default function GameHub() {
  const [selectedPhase, setSelectedPhase] = useState<1 | 2 | 3>(1);

  const getGamesByPhase = (phase: 1 | 2 | 3): GameMetadata[] => {
    let gameIds: string[] = [];
    if (phase === 1) gameIds = PHASE_1_GAMES;
    else if (phase === 2) gameIds = PHASE_2_GAMES;
    else gameIds = Object.keys(GAMES).filter(id => GAMES[id].phase === 3);

    return gameIds.map(id => GAMES[id]);
  };

  const currentPhaseGames = getGamesByPhase(selectedPhase);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      {/* 헤더 */}
      <div className="max-w-6xl mx-auto mb-12">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gray-800 mb-2">🎮 LXGym</h1>
          <p className="text-xl text-gray-600">
            재미있게 영어를 배워보세요!
          </p>
        </div>

        {/* 난이도 선택 */}
        <div className="flex justify-center gap-4 mb-8">
          {[1, 2, 3].map(phase => (
            <button
              key={phase}
              onClick={() => setSelectedPhase(phase as 1 | 2 | 3)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                selectedPhase === phase
                  ? 'bg-indigo-600 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200'
              }`}
            >
              {phase === 1 ? '🟢 초급' : phase === 2 ? '🟡 중급' : '🔴 고급'}
            </button>
          ))}
        </div>
      </div>

      {/* 게임 그리드 */}
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentPhaseGames.map(game => (
            <Link
              key={game.id}
              href={`/protected/langgym/play/${game.id}`}
              className="group"
            >
              <div className="bg-white rounded-xl shadow-md hover:shadow-2xl transition-all transform hover:scale-105 p-6 h-full flex flex-col">
                {/* 게임 아이콘 */}
                <div className="text-6xl mb-4">{game.emoji}</div>

                {/* 게임 제목 */}
                <h3 className="text-2xl font-bold text-gray-800 mb-2 group-hover:text-indigo-600 transition-colors">
                  {game.title}
                </h3>

                {/* 게임 설명 */}
                <p className="text-gray-600 mb-4 flex-grow">
                  {game.description}
                </p>

                {/* 난이도와 예상 시간 */}
                <div className="flex justify-between items-center text-sm text-gray-500 border-t pt-4">
                  <span className={`px-3 py-1 rounded-full font-semibold ${
                    game.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                    game.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {game.difficulty === 'easy' ? '쉬움' :
                     game.difficulty === 'medium' ? '보통' : '어려움'}
                  </span>
                  <span>⏱️ {game.estimatedDuration}분</span>
                </div>

                {/* 시작 버튼 */}
                <button className="mt-4 w-full bg-indigo-600 text-white font-semibold py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                  게임 시작 →
                </button>
              </div>
            </Link>
          ))}
        </div>

        {/* Phase 2/3 준비중 메시지 */}
        {selectedPhase > 1 && (
          <div className="text-center mt-12 p-8 bg-blue-50 rounded-xl">
            <p className="text-lg text-gray-700">
              🚀 {selectedPhase === 2 ? '중급' : '고급'} 게임은 곧 출시됩니다!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
