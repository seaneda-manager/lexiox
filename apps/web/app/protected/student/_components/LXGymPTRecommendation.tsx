'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  analyzeWeaknesses,
  recommendGames,
  generateWeaknessInsight,
  type Weakness,
  type LXGymRecommendation,
} from '@/lib/review/weaknessAnalyzer';
import { ReviewAttempt } from '@/lib/review/reviewTracker';

interface PTRecommendationProps {
  sectionType: 'writing' | 'speaking' | 'reading' | 'listening';
  reviewAttempts: ReviewAttempt[];
  resultId: string;
}

export function LXGymPTRecommendation({
  sectionType,
  reviewAttempts,
  resultId,
}: PTRecommendationProps) {
  const [weaknesses, setWeaknesses] = useState<Weakness[]>([]);
  const [recommendations, setRecommendations] = useState<LXGymRecommendation[]>([]);
  const [insight, setInsight] = useState('');

  useEffect(() => {
    // 약점 분석
    const analyzedWeaknesses = analyzeWeaknesses(reviewAttempts);
    setWeaknesses(analyzedWeaknesses);

    // 게임 추천
    const recommendedGames = recommendGames(analyzedWeaknesses);
    setRecommendations(recommendedGames);

    // 인사이트 생성
    const weaknessInsight = generateWeaknessInsight(analyzedWeaknesses);
    setInsight(weaknessInsight);
  }, [reviewAttempts]);

  if (weaknesses.length === 0) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-emerald-900">🎊 PT 추천</h3>
        <p className="text-sm text-emerald-800">{insight}</p>
      </div>
    );
  }

  const sectionLabel =
    {
      writing: 'Writing',
      speaking: 'Speaking',
      reading: 'Reading',
      listening: 'Listening',
    }[sectionType] || 'Study';

  return (
    <div className="space-y-4">
      {/* 약점 분석 */}
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-amber-900">⚠️ 약점 분석</h3>
        <p className="mb-4 text-sm text-amber-800">{insight}</p>

        <div className="space-y-2">
          {weaknesses.slice(0, 5).map((weakness) => {
            const severityColor =
              {
                high: 'bg-rose-100 text-rose-700 border-rose-300',
                medium: 'bg-orange-100 text-orange-700 border-orange-300',
                low: 'bg-yellow-100 text-yellow-700 border-yellow-300',
              }[weakness.severity] || 'bg-slate-100 text-slate-700 border-slate-300';

            const typeLabel =
              {
                grammar: '문법',
                pronunciation: '발음',
                expression: '표현',
                vocabulary: '어휘',
              }[weakness.type] || '오류';

            return (
              <div
                key={`${weakness.type}:${weakness.skill}`}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold ${severityColor}`}
              >
                <span className="font-bold">{typeLabel}</span> - {weakness.skill}{' '}
                ({weakness.count}회)
              </div>
            );
          })}
        </div>
      </div>

      {/* LXGym 게임 추천 */}
      {recommendations.length > 0 && (
        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-blue-900">
            🎮 맞춤형 LXGym PT ({recommendations.length}개)
          </h3>
          <p className="mb-4 text-xs text-blue-700">
            약점을 보완하기 위한 게임을 선택했습니다. 각 게임을 해보고 실력을 높이세요!
          </p>

          <div className="space-y-3">
            {recommendations.map((game, idx) => (
              <div
                key={game.gameId}
                className="rounded-lg border border-blue-300 bg-white p-4"
              >
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {idx + 1}. {game.gameName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {game.category} • {game.targetSkill}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      {
                        easy: 'bg-emerald-100 text-emerald-700',
                        normal: 'bg-blue-100 text-blue-700',
                        hard: 'bg-rose-100 text-rose-700',
                      }[game.difficulty]
                    }`}
                  >
                    {
                      {
                        easy: '쉬움',
                        normal: '보통',
                        hard: '어려움',
                      }[game.difficulty]
                    }
                  </span>
                </div>

                <p className="mb-3 text-sm text-slate-700">
                  {game.description}
                </p>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    ⏱️ {game.estimatedMinutes}분
                  </p>
                  <Link
                    href={`/games/lxgym/${game.gameId}`}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    게임 시작 →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* 학습 흐름 */}
          <div className="mt-4 rounded-lg bg-blue-100 p-3">
            <p className="text-xs font-semibold text-blue-900">📚 추천 학습 흐름</p>
            <ol className="mt-2 space-y-1 text-xs text-blue-800">
              <li>1️⃣ 위의 게임들을 각각 플레이하기</li>
              <li>2️⃣ 게임 완료 후 같은 {sectionLabel} 리뷰 다시 시도</li>
              <li>3️⃣ 약점이 개선되었는지 확인</li>
              <li>4️⃣ 필요시 게임 반복 연습</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
