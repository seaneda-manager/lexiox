'use client';

import { useEffect, useState, useRef } from 'react';
import { SentenceSpeedTrainGame } from '../../_lib/games/SentenceSpeedTrainGame';
import Link from 'next/link';

export default function SentenceSpeedTrainPlay() {
  const [game, setGame] = useState<SentenceSpeedTrainGame | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [level, setLevel] = useState(1);
  const [trainPosition, setTrainPosition] = useState(0);
  const [trainScale, setTrainScale] = useState(1);
  const trainAnimationRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const newGame = new SentenceSpeedTrainGame('user-id-placeholder', 'speed-train-session');
    newGame.initialize(level);
    setGame(newGame);
  }, [level]);

  const handleStartGame = () => {
    if (!game) return;
    game.start();
    setGameStarted(true);
    animateTrain();
  };

  const animateTrain = () => {
    let pos = -500;
    const interval = setInterval(() => {
      pos += 3;
      setTrainPosition(pos);

      // Choplifter 스타일: 오른쪽으로 갈수록 기울어지고 스케일 변화
      const scale = 0.6 + (pos + 500) / 1000 * 0.8;
      setTrainScale(scale);

      if (pos > 1280) {
        clearInterval(interval);
        // 기차가 지나갔으니 문제 활성화
        setTimeout(() => {
          setShowFeedback(false);
        }, 500);
      }
    }, 30);
    trainAnimationRef.current = interval;
  };

  const handleAnswerSubmit = async () => {
    if (!game || !game.getCurrentQuestion() || isAnswered) return;

    const isCorrect = await game.submitAnswer(selectedAnswer);
    setShowFeedback(true);
    setIsAnswered(true);
  };

  const handleNextQuestion = () => {
    if (!game) return;

    if (game.getRemainingCount() <= 0) {
      game.completeLevel();
      setGameStarted(false);
      return;
    }

    setSelectedAnswer('');
    setShowFeedback(false);
    setIsAnswered(false);
    setTrainPosition(-500);
    setTrainScale(0.6);
    animateTrain();
  };

  if (!game) {
    return <div className="flex items-center justify-center h-screen">로딩 중...</div>;
  }

  const currentQuestion = game.getCurrentQuestion();

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-purple-900 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🚂</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Sentence Speed Train</h1>
          <p className="text-gray-600 mb-6">
            기차를 보며 단어들을 기억하고 올바른 순서로 배열하세요!
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
          <div className="bg-gradient-to-r from-orange-100 to-amber-100 rounded-lg p-6 mb-6">
            <p className="text-sm text-gray-600 mb-2">최종 점수</p>
            <p className="text-5xl font-bold text-orange-600">{game.gameState.score}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 text-left">
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-xs text-gray-600">정답률</p>
              <p className="text-2xl font-bold text-orange-600">{game.getAccuracy()}%</p>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg">
              <p className="text-xs text-gray-600">소요 시간</p>
              <p className="text-2xl font-bold text-amber-600">
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
    <div className="min-h-screen bg-gradient-to-b from-amber-100 via-orange-50 to-purple-950 p-8">
      <div className="max-w-6xl mx-auto">
        {/* HUD */}
        <div className="mb-8 bg-black/30 backdrop-blur rounded-lg p-4 text-white">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Sentence Speed Train</h2>
            <span className="text-lg font-semibold">
              {game.gameAnswers.length + 1} / {game.gameAnswers.length + game.getRemainingCount()}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div
              className="bg-orange-500 h-3 rounded-full transition-all duration-300"
              style={{
                width: `${((game.gameAnswers.length) / (game.gameAnswers.length + game.getRemainingCount())) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* 기차 애니메이션 영역 */}
        <div className="mb-12 relative h-64 bg-gradient-to-b from-orange-200 to-orange-100 rounded-xl overflow-hidden border-4 border-orange-300">
          {/* 선로 */}
          <div className="absolute bottom-16 w-full h-8 border-t-4 border-b-4 border-gray-700" />
          <div className="absolute bottom-12 w-full h-1 bg-gray-700" />

          {/* 기차 */}
          <div
            className="absolute bottom-20 transition-all duration-100"
            style={{
              left: `${trainPosition}px`,
              transform: `scale(${trainScale}) perspective(1000px) rotateY(${(trainPosition / 20) % 20}deg)`,
            }}
          >
            {/* 엔진 */}
            <div className="flex gap-1">
              <div className="w-10 h-10 bg-yellow-900 rounded shadow-lg flex-shrink-0" />

              {/* 객차들 */}
              {currentQuestion.trainCars.map((car, idx) => (
                <div
                  key={car.id}
                  className="w-12 h-10 bg-purple-800 rounded shadow-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                >
                  {car.text.substring(0, 4)}
                </div>
              ))}
            </div>
          </div>

          {/* 기차 진입 알림 */}
          {trainPosition < 200 && (
            <div className="absolute top-4 left-4 text-xl font-bold text-orange-600 animate-pulse">
              ▶▶ ALERT
            </div>
          )}
        </div>

        {/* 문제 카드 */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
          {/* 문제 */}
          <div className="mb-8 p-6 bg-gray-50 rounded-lg border-l-4 border-orange-600">
            <p className="text-lg font-semibold text-gray-800 mb-2">❓ {currentQuestion.question}</p>
            <p className="text-sm text-gray-600">기차가 지나간 순서대로 단어들을 읽었나요?</p>
          </div>

          {/* 선택지 */}
          <div className="mb-8 space-y-3">
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
                <span className="font-bold text-orange-600 mr-3">{String.fromCharCode(65 + idx)}.</span>
                {option.text}
              </button>
            ))}
          </div>

          {/* 피드백 */}
          {showFeedback && (
            <div
              className={`p-4 rounded-lg mb-6 font-semibold text-center ${
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

        {/* 통계 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-sm text-gray-600">점수</p>
            <p className="text-3xl font-bold text-orange-600">{game.gameState.score}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-sm text-gray-600">정답률</p>
            <p className="text-3xl font-bold text-amber-600">{game.getAccuracy()}%</p>
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
