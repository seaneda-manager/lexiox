"use client";

import { useState, useEffect } from "react";
import { Zap, Check, X, RotateCcw, TrendingUp } from "lucide-react";
import type { VocabWordCore } from "@/models/vocab";
import {
  generateSynonymQuestion,
  calculatePoints,
  updateGameStats,
  type SynonymGameQuestion,
  type SynonymGameStats,
} from "@/lib/vocab/synonym-game";

interface Props {
  words: VocabWordCore[];
}

const INITIAL_STATS: SynonymGameStats = {
  correct: 0,
  incorrect: 0,
  streak: 0,
  maxStreak: 0,
  points: 0,
  level: 1,
};

export default function SynonymGameClient({ words }: Props) {
  const [stats, setStats] = useState<SynonymGameStats>(INITIAL_STATS);
  const [gameWords, setGameWords] = useState<typeof words>([]);
  const [allWordsForAnswers, setAllWordsForAnswers] = useState<typeof words>([]);
  const [question, setQuestion] = useState<SynonymGameQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // 게임 시작 (동의어 로드)
  useEffect(() => {
    loadSynonymsAndStart();
  }, []);

  const loadSynonymsAndStart = async () => {
    setLoading(true);
    console.log("🎮 Synonym game loading started with", words.length, "words");

    try {
      // 각 단어의 동의어를 API로 로드 (DB 기반)
      console.log("📡 Fetching synonyms for all words...");
      const updatedWords = await Promise.all(
        words.map(async (word) => {
          try {
            const res = await fetch(
              `/api/vocab/synonym-game/get-synonyms?wordId=${encodeURIComponent(word.id)}&limit=10`
            );
            if (res.ok) {
              const data = await res.json();
              return {
                ...word,
                synonyms: data.synonyms || [],
              };
            }
          } catch (error) {
            console.error(`❌ Failed to load synonyms for ${word.text}:`, error);
          }
          return word;
        })
      );

      console.log("✅ Synonym fetch completed");

      // 동의어가 있는 단어만 필터링 (1개 이상)
      let wordsWithSynonyms = updatedWords.filter(
        (w) => (w.synonyms?.length ?? 0) > 0
      );

      console.log(`📊 Words with synonyms: ${wordsWithSynonyms.length} / ${updatedWords.length}`);

      setGameWords(wordsWithSynonyms);

      // 정답 단어와 오답 후보용 모든 단어 생성
      // Datamuse API 동의어들은 synonyms를 가지고 있지 않으므로, 품사 정보만 있는 상태
      const allWordsForGame = [
        ...wordsWithSynonyms,
        ...wordsWithSynonyms.flatMap(w => w.synonyms || []),
      ];

      console.log(`🎯 Total words for game: ${allWordsForGame.length}`);

      // wordsWithSynonyms만 사용 (정답 선택용)
      // allWordsForGame는 오답 후보 찾기용
      setAllWordsForAnswers(allWordsForGame);
      loadNextQuestion(wordsWithSynonyms, allWordsForGame);
    } catch (error) {
      console.error("💥 Error loading synonyms:", error);
      setGameOver(true);
      setLoading(false);
    }
  };

  const loadNextQuestion = (
    wordsForSelection: typeof words = gameWords,
    allWordsForAnswers: typeof words = gameWords
  ) => {
    console.log("🔄 loadNextQuestion called with", wordsForSelection.length, "selection words, gameOver=", gameOver);

    if (gameOver || wordsForSelection.length === 0) {
      console.log("⏸️ Returning early: gameOver=", gameOver, "wordsLength=", wordsForSelection.length);
      return;
    }

    setSelectedOption(null);
    setShowResult(false);

    // 다음 질문 생성 (최대 10번 시도)
    let newQuestion = null;
    for (let i = 0; i < 10; i++) {
      const randomWord = wordsForSelection[Math.floor(Math.random() * wordsForSelection.length)];
      newQuestion = generateSynonymQuestion(randomWord, allWordsForAnswers);
      if (newQuestion) {
        console.log(`✨ Question generated (attempt ${i + 1}): ${randomWord.text}`);
        break;
      }
    }

    if (!newQuestion) {
      console.error("❌ Failed to generate question after 10 attempts");
      setGameOver(true);
      return;
    }

    console.log("🎮 Setting question:", newQuestion.targetWord.text);
    setQuestion(newQuestion);
    setLoading(false);
  };

  const handleSelectOption = (optionId: string) => {
    if (showResult || !question) return;

    setSelectedOption(optionId);
    const isAnswerCorrect = optionId === question.correctAnswer.id;
    setIsCorrect(isAnswerCorrect);
    setShowResult(true);

    // 통계 업데이트
    const points = calculatePoints(isAnswerCorrect, question.difficulty, stats.streak);
    const result = {
      questionId: question.id,
      targetWord: question.targetWord.text,
      selectedWord: question.options.find(o => o.id === optionId)?.text || "",
      correct: isAnswerCorrect,
      pointsGained: points,
    };

    const newStats = updateGameStats(stats, result);
    setStats(newStats);
    setResults([...results, result]);
  };

  const saveGameResults = async () => {
    if (isSaving || results.length === 0) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/vocab/synonym-game/save-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          results,
          totalPoints: stats.points,
          finalLevel: stats.level,
        }),
      });

      if (!response.ok) {
        console.error("Failed to save game results");
      }
    } catch (error) {
      console.error("Error saving game results:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">게임 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (gameOver || !question) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-5xl font-bold text-purple-600 mb-4">{stats.points}</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">게임 종료!</h2>
          <p className="text-gray-600 mb-6">
            {stats.correct}개 맞음 / {stats.incorrect}개 틀림
            <br />
            최대 연승: {stats.maxStreak}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setStats(INITIAL_STATS);
                setResults([]);
                setGameOver(false);
                loadNextQuestion(gameWords, allWordsForAnswers);
              }}
              className="flex-1 bg-purple-600 text-white py-2 rounded-lg font-semibold hover:bg-purple-700"
              disabled={isSaving}
            >
              <RotateCcw className="w-4 h-4 inline mr-2" />
              다시 하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 p-4">
      {/* 헤더 */}
      <div className="max-w-2xl mx-auto mb-6">
        <div className="flex items-center justify-between bg-white rounded-xl shadow p-4">
          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-xs text-gray-600">레벨</div>
              <div className="text-2xl font-bold text-purple-600">{stats.level}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600">포인트</div>
              <div className="text-2xl font-bold text-indigo-600">{stats.points}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600">연승</div>
              <div className="text-2xl font-bold text-emerald-600">{stats.streak}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 게임 */}
      <div className="max-w-2xl mx-auto">
        {/* 질문 */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="text-center mb-8">
            <div className="text-sm text-gray-600 mb-2">다음 단어의 동의어를 고르세요</div>
            <div className="text-4xl font-bold text-purple-600">{question.targetWord.text}</div>
            <div className="text-sm text-gray-500 mt-2">
              {question.targetWord.pos} · Level {question.targetWord.difficulty}
            </div>
          </div>

          {/* 보기 */}
          <div className="grid gap-3">
            {question.options.map((option) => {
              const isSelected = selectedOption === option.id;
              const isCorrectOption = option.id === question.correctAnswer.id;
              let bgColor = "bg-white";
              let borderColor = "border-gray-200 hover:border-purple-400";
              let textColor = "text-gray-900";

              if (showResult) {
                if (isCorrectOption) {
                  bgColor = "bg-emerald-50";
                  borderColor = "border-emerald-500";
                  textColor = "text-emerald-900";
                } else if (isSelected && !isCorrect) {
                  bgColor = "bg-red-50";
                  borderColor = "border-red-500";
                  textColor = "text-red-900";
                }
              }

              return (
                <button
                  key={option.id}
                  onClick={() => handleSelectOption(option.id)}
                  disabled={showResult}
                  className={`
                    p-4 rounded-lg border-2 text-left transition-all
                    ${bgColor} ${borderColor} ${textColor}
                    ${showResult ? "cursor-default" : "cursor-pointer"}
                    disabled:opacity-75
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{option.text}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {option.pos} · Level {option.difficulty}
                      </div>
                    </div>
                    {showResult && (
                      <>
                        {isCorrectOption && (
                          <Check className="w-6 h-6 text-emerald-600" />
                        )}
                        {isSelected && !isCorrect && (
                          <X className="w-6 h-6 text-red-600" />
                        )}
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* 결과 메시지 */}
          {showResult && (
            <div className={`mt-6 p-4 rounded-lg text-center font-semibold ${
              isCorrect ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
            }`}>
              {isCorrect ? (
                <>
                  <Check className="w-5 h-5 inline mr-2" />
                  정답입니다! +{calculatePoints(isCorrect, question.difficulty, stats.streak - 1)} 포인트
                </>
              ) : (
                <>
                  <X className="w-5 h-5 inline mr-2" />
                  오답입니다. 정답: <span className="font-bold">{question.correctAnswer.text}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* 다음 버튼 */}
        {showResult && (
          <div className="flex justify-center">
            <button
              onClick={() => loadNextQuestion(gameWords, allWordsForAnswers)}
              className="bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <TrendingUp className="w-5 h-5" />
              다음 문제
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
