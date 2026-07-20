'use client';

import { useState } from 'react';

interface Option {
  syllables: string;
  label: string;
}

interface Question {
  id: string;
  word: string;
  sentence: string;
  options: Option[];
  correct: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface StressHuntGameProps {
  questions: Question[];
  onComplete: (result: { correct: boolean; score: number }) => void;
}

type Phase = 'question' | 'answer' | 'explanation';

export default function StressHuntGame({
  questions,
  onComplete,
}: StressHuntGameProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('question');
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [result, setResult] = useState<{
    correct: boolean;
    score: number;
    explanation: string;
  } | null>(null);

  const currentQuestion = questions[currentQuestionIndex];

  const handleSelectAnswer = (index: number) => {
    if (phase !== 'question') return;

    setSelectedAnswer(index);
    const isCorrect = index === currentQuestion.correct;
    const score = isCorrect ? 10 : 0;

    // Generate explanation
    let explanation = '';
    if (isCorrect) {
      explanation = `✅ Correct! The stress is on the ${currentQuestion.options[index].label} syllable.`;
    } else {
      explanation = `❌ Incorrect. The correct stress is the ${currentQuestion.options[currentQuestion.correct].label} syllable: "${currentQuestion.options[currentQuestion.correct].syllables}"`;
    }

    setResult({
      correct: isCorrect,
      score,
      explanation,
    });
    setPhase('answer');
    onComplete({ correct: isCorrect, score });
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setPhase('question');
      setSelectedAnswer(null);
      setResult(null);
    } else {
      alert('🎉 Quiz complete! Great job mastering word stress.');
      setCurrentQuestionIndex(0);
      setPhase('question');
      setSelectedAnswer(null);
      setResult(null);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      {/* Progress */}
      <div className="mb-6">
        <p className="text-sm text-gray-500 mb-2">
          Question {currentQuestionIndex + 1} of {questions.length}
        </p>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-pink-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
            }}
          ></div>
        </div>
      </div>

      {/* Question Phase */}
      {phase === 'question' && (
        <>
          {/* Word and Context */}
          <div className="mb-8">
            <div className="text-center mb-4">
              <h2 className="text-4xl font-bold text-gray-900 mb-2">
                {currentQuestion.word}
              </h2>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getDifficultyColor(currentQuestion.difficulty)}`}>
                {currentQuestion.difficulty.toUpperCase()}
              </span>
            </div>

            <p className="text-center text-gray-600 text-lg italic mb-6">
              "{currentQuestion.sentence}"
            </p>

            <p className="text-center text-gray-500 text-sm">
              Which syllable has the stress?
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3 mb-8">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleSelectAnswer(index)}
                className={`w-full p-4 rounded-lg border-2 transition-all duration-200 text-left font-semibold ${
                  selectedAnswer === index
                    ? 'border-pink-600 bg-pink-50'
                    : 'border-gray-300 hover:border-pink-400 bg-white'
                }`}
              >
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-pink-600 text-white flex items-center justify-center mr-4 text-sm">
                    {String.fromCharCode(65 + index)}
                  </div>
                  <div>
                    <div className="text-lg">{option.syllables}</div>
                    <div className="text-sm text-gray-500">{option.label} syllable</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {selectedAnswer !== null && (
            <button
              onClick={nextQuestion}
              className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200"
            >
              {currentQuestionIndex < questions.length - 1
                ? 'Next Word →'
                : 'Complete Quiz ✓'}
            </button>
          )}
        </>
      )}

      {/* Answer Phase */}
      {phase === 'answer' && result && (
        <>
          {/* Result Card */}
          <div
            className={`rounded-lg p-8 mb-8 border-2 ${
              result.correct
                ? 'bg-green-50 border-green-400'
                : 'bg-orange-50 border-orange-400'
            }`}
          >
            <div className="text-center mb-4">
              <div className="text-5xl mb-4">
                {result.correct ? '✅' : '❌'}
              </div>
              <p
                className={`text-xl font-bold ${
                  result.correct ? 'text-green-800' : 'text-orange-800'
                }`}
              >
                {result.explanation}
              </p>
            </div>

            {/* Detailed Explanation */}
            <div className="bg-white rounded p-4 mt-4">
              <h4 className="font-bold mb-2">📖 Explanation</h4>
              <div className="space-y-2 text-sm">
                <p className="text-gray-700">
                  <strong>Word:</strong> {currentQuestion.word}
                </p>
                <p className="text-gray-700">
                  <strong>Correct Pronunciation:</strong> {currentQuestion.options[currentQuestion.correct].syllables}
                </p>
                <p className="text-gray-600">
                  Pay attention to the stress placement. AI speech recognition depends on
                  correct stress to identify the word.
                </p>
              </div>
            </div>
          </div>

          {/* Next Button */}
          <button
            onClick={nextQuestion}
            className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200"
          >
            {currentQuestionIndex < questions.length - 1
              ? 'Next Word →'
              : 'Complete Quiz ✓'}
          </button>
        </>
      )}
    </div>
  );
}
