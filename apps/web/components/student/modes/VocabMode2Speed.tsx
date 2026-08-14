"use client";

import { useState } from "react";
import type {
  Mode2SpeedSession,
  Mode2Result,
  VocabWord,
  PartOfSpeech,
} from "@/lib/types/vocab-learning-mode";
import { POS_LABELS } from "@/lib/types/vocab-test";

interface VocabMode2SpeedProps {
  words: VocabWord[];
  onComplete: (session: Mode2SpeedSession) => void;
  onCancel?: () => void;
}

export default function VocabMode2Speed({
  words,
  onComplete,
  onCancel,
}: VocabMode2SpeedProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<
    Record<
      string,
      {
        spelling: string;
        pos: PartOfSpeech;
        meaning: string;
      }
    >
  >({});
  const [results, setResults] = useState<Mode2Result[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [spelling, setSpelling] = useState("");
  const [pos, setPos] = useState<PartOfSpeech>("noun");
  const [meaning, setMeaning] = useState("");

  const currentWord = words[currentIndex];
  const totalWords = words.length;
  const progress = ((currentIndex + 1) / totalWords) * 100;

  const handleAnswer = () => {
    if (!currentWord) return;

    const answer = {
      spelling: spelling.trim().toLowerCase(),
      pos: pos as PartOfSpeech,
      meaning: meaning.trim().toLowerCase(),
    };

    setAnswers((prev) => ({
      ...prev,
      [currentWord.id]: answer,
    }));

    // 다음 단어로
    if (currentIndex < totalWords - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSpelling("");
      setPos("noun");
      setMeaning("");
    } else {
      // 모든 단어 완료 - 채점
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    // 모든 단어에 대해 채점
    const submittedAnswers = answers;
    const newResults: Mode2Result[] = words.map((word) => {
      const answer = submittedAnswers[word.id] || {
        spelling: "",
        pos: "noun" as PartOfSpeech,
        meaning: "",
      };

      const spellingCorrect =
        answer.spelling === word.text.toLowerCase();
      const posCorrect = answer.pos === word.pos;
      const meaningCorrect =
        answer.meaning ===
        word.meaning_ko.toLowerCase();

      return {
        wordId: word.id,
        correct:
          spellingCorrect && posCorrect && meaningCorrect,
        spelling: {
          correct: spellingCorrect,
          expected: word.text,
          got: answer.spelling || "(입력 없음)",
        },
        pos: {
          correct: posCorrect,
          expected: word.pos,
          got: answer.pos,
        },
        meaning: {
          correct: meaningCorrect,
          expected: word.meaning_ko,
          got: answer.meaning || "(입력 없음)",
        },
      };
    });

    setResults(newResults);

    const correctCount = newResults.filter((r) => r.correct).length;
    const score = Math.round((correctCount / totalWords) * 100);

    const session: Mode2SpeedSession = {
      mode: 2,
      dayId: "", // 서버에서 설정
      words,
      answers: submittedAnswers,
      results: newResults,
      score,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      correctCount,
      totalCount: totalWords,
    };

    setSubmitted(true);
    onComplete(session);
  };

  if (submitted) {
    return (
      <div className="min-h-screen p-6 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">채점 결과</h2>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">정답</p>
                <p className="text-3xl font-bold text-green-600">
                  {results.filter((r) => r.correct).length}
                </p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">오답</p>
                <p className="text-3xl font-bold text-orange-600">
                  {results.filter((r) => !r.correct).length}
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">점수</p>
                <p className="text-3xl font-bold text-blue-600">
                  {Math.round(
                    (results.filter((r) => r.correct).length /
                      totalWords) *
                      100
                  )}
                  %
                </p>
              </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto mb-6">
              {results.map((result) => (
                <div
                  key={result.wordId}
                  className={`p-4 rounded-lg ${
                    result.correct
                      ? "bg-green-50 border border-green-200"
                      : "bg-orange-50 border border-orange-200"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-gray-900">
                        {words.find((w) => w.id === result.wordId)
                          ?.text}
                      </p>
                      <div className="text-sm mt-2 space-y-1">
                        <p
                          className={
                            result.spelling.correct
                              ? "text-green-700"
                              : "text-red-700"
                          }
                        >
                          철자: {result.spelling.got} →{" "}
                          {result.spelling.expected}
                        </p>
                        <p
                          className={
                            result.meaning.correct
                              ? "text-green-700"
                              : "text-red-700"
                          }
                        >
                          뜻: {result.meaning.got} →{" "}
                          {result.meaning.expected}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-2xl font-bold ${
                        result.correct
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {result.correct ? "✓" : "✗"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentWord) {
    return <div className="text-center p-4">로딩 중...</div>;
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">⚡ Speed Challenge</h2>
          <p className="text-sm text-gray-600 mt-1">
            {currentIndex + 1} / {totalWords}
          </p>
        </div>

        {/* 진행률 바 */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* 메인 카드 */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          {/* 단어 */}
          <div className="mb-8">
            <p className="text-gray-600 text-sm mb-2">단어</p>
            <p className="text-4xl font-bold text-blue-600">
              {currentWord.text}
            </p>
            {currentWord.meaning_ko && (
              <p className="text-lg text-gray-600 mt-2">
                뜻: {currentWord.meaning_ko}
              </p>
            )}
          </div>

          {/* 입력 폼 */}
          <div className="space-y-4">
            {/* 철자 */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                철자를 입력하세요
              </label>
              <input
                type="text"
                value={spelling}
                onChange={(e) => setSpelling(e.target.value)}
                placeholder="예: ability"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                onKeyPress={(e) => {
                  if (e.key === "Enter" && spelling && pos && meaning) {
                    handleAnswer();
                  }
                }}
              />
            </div>

            {/* 품사 */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                품사를 선택하세요
              </label>
              <select
                value={pos}
                onChange={(e) => setPos(e.target.value as PartOfSpeech)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              >
                {Object.entries(POS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* 뜻 */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                뜻을 입력하세요
              </label>
              <input
                type="text"
                value={meaning}
                onChange={(e) => setMeaning(e.target.value)}
                placeholder="예: 능력, 재능"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                onKeyPress={(e) => {
                  if (e.key === "Enter" && spelling && pos && meaning) {
                    handleAnswer();
                  }
                }}
              />
            </div>
          </div>

          {/* 버튼 */}
          <div className="mt-8">
            <button
              onClick={handleAnswer}
              disabled={!spelling || !meaning}
              className="w-full py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg"
            >
              {currentIndex === totalWords - 1 ? "완료" : "다음"}
            </button>
          </div>
        </div>

        {/* 취소 버튼 */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            취소
          </button>
        )}
      </div>
    </div>
  );
}
