'use client';

import { useEffect, useState } from 'react';
import { SentenceSprintsGame } from '../../_lib/games/SentenceSprintsGame';
import Link from 'next/link';

export default function SentenceSprintsPlay() {
  const [game, setGame] = useState<SentenceSprintsGame | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [level, setLevel] = useState(1);

  // 게임 초기화
  useEffect(() => {
    const newGame = new SentenceSprintsGame('user-id-placeholder', 'sentence-sprints-session');
    newGame.initialize(level);
    setGame(newGame);
  }, [level]);

  const handleStartGame = () => {
    if (!game) return;
    game.start();
    setGameStarted(true);
  };

  const handleAnswerSubmit = async () => {
    if (!game || !game.getCurrentSentence() || isAnswered) return;

    const isCorrect = await game.handleAnswer(
      selectedAnswer,
      game.getCurrentSentence()?.text || ''
    );

    setShowFeedback(true);
    setIsAnswered(true);
  };

  const handleNextQuestion = () => {
    if (!game) return;

    if (game.getRemainingCount() <= 0) {
      game.completeLevel();
      // TODO: 결과 페이지로 이동
    }

    setSelectedAnswer('');
    setShowFeedback(false);
    setIsAnswered(false);
  };

  if (!game) {
    return <div className="flex items-center justify-center h-screen">로딩 중...</div>;
  }

  const currentSentence = game.getCurrentSentence();

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🏃</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Sentence Sprints</h1>
          <p className="text-gray-600 mb-6">
            화면을 지나가는 문장의 핵심을 빠르게 파악하는 게임입니다.
          </p>

          {/* 난이도 선택 */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              난이도를 선택하세요
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map(l => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={`py-2 rounded-lg font-bold transition-all ${
                    level === l
                      ? 'bg-indigo-600 text-white scale-110'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* 시작 버튼 */}
          <button
            onClick={handleStartGame}
            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition-all transform hover:scale-105"
          >
            게임 시작 🎮
          </button>

          {/* 돌아가기 */}
          <Link
            href="/protected/langgym"
            className="block mt-4 text-indigo-600 hover:underline"
          >
            ← 게임 허브로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  if (!currentSentence) {
    // 게임 완료
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">게임 완료!</h2>
          <div className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg p-6 mb-6">
            <p className="text-sm text-gray-600 mb-2">최종 점수</p>
            <p className="text-5xl font-bold text-indigo-600">{game.gameState.score}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 text-left">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-xs text-gray-600">정답률</p>
              <p className="text-2xl font-bold text-blue-600">{game.getAccuracy()}%</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-xs text-gray-600">소요 시간</p>
              <p className="text-2xl font-bold text-purple-600">
                {Math.round(game.gameState.timeElapsed / 1000)}s
              </p>
            </div>
          </div>

          <Link
            href="/protected/langgym"
            className="w-full block bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition-all"
          >
            게임 허브로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* 진행 바 */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-2xl font-bold text-gray-800">Sentence Sprints</h2>
            <span className="text-lg font-semibold text-indigo-600">
              {game.gameState.level + (5 - game.getRemainingCount())} / 5
            </span>
          </div>
          <div className="w-full bg-gray-300 rounded-full h-3">
            <div
              className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
              style={{
                width: `${((5 - game.getRemainingCount()) / 5) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* 게임 카드 */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
          {/* 문장 이동 애니메이션 */}
          <div className="relative h-32 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl mb-8 overflow-hidden flex items-center justify-center border-2 border-indigo-200">
            <div
              className={`text-2xl font-bold text-gray-800 animate-bounce whitespace-nowrap px-4`}
              style={{
                animation: `slide${currentSentence.direction} 8s linear infinite`,
              }}
            >
              {currentSentence.text}
            </div>
          </div>

          {/* 답변 입력 */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              문장의 핵심 의미를 선택하세요:
            </label>
            <div className="space-y-2">
              {currentSentence.keyWords.map((kw, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedAnswer(kw)}
                  disabled={isAnswered}
                  className={`w-full p-4 rounded-lg font-semibold transition-all text-left ${
                    selectedAnswer === kw
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  } ${isAnswered ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {kw}
                </button>
              ))}
            </div>
          </div>

          {/* 피드백 */}
          {showFeedback && (
            <div
              className={`p-4 rounded-lg mb-6 font-semibold ${
                game.feedback.isCorrect
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {game.feedback.message}
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-4">
            {!isAnswered ? (
              <button
                onClick={handleAnswerSubmit}
                disabled={!selectedAnswer}
                className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                답변 제출
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="flex-1 bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-all"
              >
                다음 문장 →
              </button>
            )}
          </div>
        </div>

        {/* 점수 및 통계 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-sm text-gray-600">현재 점수</p>
            <p className="text-3xl font-bold text-indigo-600">{game.gameState.score}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-sm text-gray-600">정답률</p>
            <p className="text-3xl font-bold text-blue-600">{game.getAccuracy()}%</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-sm text-gray-600">연속 정답</p>
            <p className="text-3xl font-bold text-green-600">
              {game.rewardSystem.streakBonus}
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideLeft {
          from {
            transform: translateX(100vw);
          }
          to {
            transform: translateX(-100vw);
          }
        }
        @keyframes slideRight {
          from {
            transform: translateX(-100vw);
          }
          to {
            transform: translateX(100vw);
          }
        }
      `}</style>
    </div>
  );
}
