'use client';

import { useEffect, useState } from 'react';
import { ArcheryGame } from '../../_lib/games/ArcheryGame';
import Link from 'next/link';

export default function ArcheryPlay() {
  const [game, setGame] = useState<ArcheryGame | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [level, setLevel] = useState(1);

  useEffect(() => {
    const newGame = new ArcheryGame('user-id-placeholder', 'archery-session');
    newGame.initialize(level);
    setGame(newGame);
  }, [level]);

  const handleStartGame = () => {
    if (!game) return;
    game.start();
    setGameStarted(true);
  };

  const handleAnswerSubmit = async () => {
    if (!game || !game.getCurrentQuestion() || isAnswered) return;

    const isCorrect = await game.handleAnswer(
      selectedAnswer,
      game.getCurrentQuestion()?.word || ''
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

  const currentQuestion = game.getCurrentQuestion();

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Vocabulary Archery</h1>
          <p className="text-gray-600 mb-6">
            활을 쏘아 올바른 단어의 의미를 맞추세요!
          </p>

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
                      ? 'bg-orange-600 text-white scale-110'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleStartGame}
            className="w-full bg-orange-600 text-white font-bold py-3 rounded-lg hover:bg-orange-700 transition-all transform hover:scale-105"
          >
            게임 시작 🎮
          </button>

          <Link
            href="/protected/langgym"
            className="block mt-4 text-orange-600 hover:underline"
          >
            ← 게임 허브로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">게임 완료!</h2>
          <div className="bg-gradient-to-r from-orange-100 to-yellow-100 rounded-lg p-6 mb-6">
            <p className="text-sm text-gray-600 mb-2">최종 점수</p>
            <p className="text-5xl font-bold text-orange-600">{game.gameState.score}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 text-left">
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-xs text-gray-600">정답률</p>
              <p className="text-2xl font-bold text-orange-600">{game.getAccuracy()}%</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-xs text-gray-600">소요 시간</p>
              <p className="text-2xl font-bold text-yellow-600">
                {Math.round(game.gameState.timeElapsed / 1000)}s
              </p>
            </div>
          </div>

          <Link
            href="/protected/langgym"
            className="w-full block bg-orange-600 text-white font-bold py-3 rounded-lg hover:bg-orange-700 transition-all"
          >
            게임 허브로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* 진행 바 */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-2xl font-bold text-gray-800">Vocabulary Archery</h2>
            <span className="text-lg font-semibold text-orange-600">
              {game.gameAnswers.length + 1} / {game.gameAnswers.length + game.getRemainingCount()}
            </span>
          </div>
          <div className="w-full bg-gray-300 rounded-full h-3">
            <div
              className="bg-orange-600 h-3 rounded-full transition-all duration-300"
              style={{
                width: `${((game.gameAnswers.length) / (game.gameAnswers.length + game.getRemainingCount())) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* 게임 카드 */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
          {/* 활쏘기 시각화 */}
          <div className="relative h-32 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl mb-8 flex items-center justify-center border-2 border-orange-200">
            <div className="text-center">
              <div className="text-5xl mb-2">🎯</div>
              <div className="text-2xl font-bold text-gray-800">{currentQuestion.word}</div>
            </div>
          </div>

          {/* 정의 표시 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border-l-4 border-orange-600">
            <p className="text-sm text-gray-600 mb-2">의미를 선택하세요:</p>
            <p className="text-lg font-semibold text-gray-800">{currentQuestion.definition}</p>
          </div>

          {/* 선택지 */}
          <div className="mb-6 space-y-3">
            {currentQuestion.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedAnswer(option.text)}
                disabled={isAnswered}
                className={`w-full p-4 rounded-lg font-semibold transition-all text-left border-2 ${
                  selectedAnswer === option.text
                    ? 'border-orange-600 bg-orange-50 text-gray-800'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-orange-300'
                } ${isAnswered ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="font-bold text-orange-600 mr-2">{String.fromCharCode(65 + idx)}.</span>
                {option.text}
              </button>
            ))}
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
                className="flex-1 bg-orange-600 text-white font-bold py-3 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                답 제출
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="flex-1 bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-all"
              >
                다음 문제 →
              </button>
            )}
          </div>
        </div>

        {/* 점수 및 통계 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-sm text-gray-600">현재 점수</p>
            <p className="text-3xl font-bold text-orange-600">{game.gameState.score}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-sm text-gray-600">정답률</p>
            <p className="text-3xl font-bold text-yellow-600">{game.getAccuracy()}%</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-sm text-gray-600">레벨</p>
            <p className="text-3xl font-bold text-orange-400">{game.gameState.level}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
