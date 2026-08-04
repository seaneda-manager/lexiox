'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { LearningWord } from './learning.types';

interface VocabSessionLearningStage1Props {
  words: LearningWord[];
  onFinish: () => void;
  trackTitle?: string | null;
  dayIndex?: number | null;
  totalDays?: number | null;
  learningOption?: number;
}

const playAudio = async (text: string, lang: string = 'en-US') => {
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error('Speech synthesis error:', err);
  }
};

export default function VocabSessionLearningStage1({
  words,
  onFinish,
  trackTitle,
  dayIndex,
  totalDays,
  learningOption,
}: VocabSessionLearningStage1Props) {
  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [spellingInput, setSpellingInput] = useState('');
  const [meaning1Input, setMeaning1Input] = useState('');
  const [meaning2Input, setMeaning2Input] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'success' | 'error' | null>(null);

  const currentWord = useMemo(() => {
    return words[currentWordIdx];
  }, [words, currentWordIdx]);

  const progress = `${currentWordIdx + 1}/${words.length}`;
  const meanings = currentWord?.meanings_ko || [];
  const meaning1 = meanings[0] || '';
  const meaning2 = meanings[1] || '';

  // 자동 발음 재생 (첫 로드 시)
  useEffect(() => {
    if (currentWord) {
      setTimeout(() => {
        playAudio(currentWord.text, 'en-US');
      }, 500);
    }
  }, [currentWord]);

  const handleSubmit = () => {
    if (!spellingInput.trim() || !meaning1Input.trim() || !meaning2Input.trim()) {
      setFeedback('모든 항목을 입력해주세요');
      setFeedbackType('error');
      return;
    }

    const spellingCorrect = spellingInput.trim().toLowerCase() === currentWord.text.toLowerCase();
    const meaning1Correct = meaning1Input.trim().toLowerCase() === meaning1.toLowerCase();
    const meaning2Correct = meaning2Input.trim().toLowerCase() === meaning2.toLowerCase();

    if (spellingCorrect && meaning1Correct && meaning2Correct) {
      setFeedbackType('success');
      setFeedback('완벽합니다! 다음 단어로 이동합니다.');
      setTimeout(() => {
        handleNextWord();
      }, 1500);
    } else {
      setFeedbackType('error');
      let errorMsg = '다시 확인해주세요:\n';
      if (!spellingCorrect) errorMsg += `• 스펠링: ${currentWord.text}\n`;
      if (!meaning1Correct) errorMsg += `• 뜻 1: ${meaning1}\n`;
      if (!meaning2Correct) errorMsg += `• 뜻 2: ${meaning2}`;
      setFeedback(errorMsg);
    }
  };

  const handleNextWord = () => {
    if (currentWordIdx + 1 < words.length) {
      setCurrentWordIdx(currentWordIdx + 1);
      setSpellingInput('');
      setMeaning1Input('');
      setMeaning2Input('');
      setFeedback(null);
      setFeedbackType(null);
    } else {
      onFinish();
    }
  };

  if (!currentWord) {
    return (
      <div className="rounded-2xl border bg-white p-6 text-center text-slate-700">
        <div className="text-lg font-bold mb-2">학습 완료!</div>
        <button
          onClick={onFinish}
          className="mt-4 rounded-lg bg-emerald-600 py-2 px-4 text-white font-bold"
        >
          확인
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full min-h-screen">
      {/* 왼쪽 메인 콘텐츠 */}
      <div className="flex-1 lg:flex-[1.5] space-y-6 overflow-y-scroll px-4 lg:px-0" style={{ scrollbarGutter: 'stable' }}>
        {/* 진도 헤더 */}
        <div className="bg-teal-500 text-white rounded-2xl p-6 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-4xl font-bold">{progress}</h2>
            <p className="text-sm opacity-90 mt-1">
              {trackTitle || '단어 학습'} - Stage 1 (기본)
              {dayIndex != null && totalDays != null && ` (Day ${dayIndex} / ${totalDays})`}
            </p>
          </div>
          <button className="bg-white/20 hover:bg-white/30 border-0 p-3 rounded-lg cursor-pointer text-2xl transition">
            🔔
          </button>
        </div>

        {/* 메인 학습 영역 */}
        <div className="bg-white rounded-2xl border-4 border-teal-300 p-8 flex-shrink-0 space-y-6">
          {/* 단어 및 발음 */}
          <div className="text-center space-y-4">
            <div className="text-5xl font-bold text-teal-600">{currentWord.text}</div>
            <button
              onClick={() => playAudio(currentWord.text, 'en-US')}
              className="mx-auto bg-blue-500 text-white px-6 py-3 rounded-full font-bold hover:bg-blue-600 transition flex items-center gap-2"
            >
              🔊 발음 듣기
            </button>
          </div>

          <hr className="border-gray-300" />

          {/* Spelling 입력 */}
          <div className="space-y-3">
            <label className="block text-lg font-bold text-gray-700">
              1️⃣ 스펠링 입력
            </label>
            <input
              type="text"
              value={spellingInput}
              onChange={(e) => setSpellingInput(e.target.value)}
              placeholder="단어를 입력하세요"
              className="w-full border-2 border-gray-300 rounded-lg p-4 text-lg font-semibold focus:outline-none focus:border-teal-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          {/* Meaning 1 입력 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-lg font-bold text-gray-700">
                2️⃣ 뜻 1 입력
              </label>
              <button
                onClick={() => playAudio(meaning1, 'ko-KR')}
                className="text-sm bg-orange-500 text-white px-3 py-1 rounded-full hover:bg-orange-600 transition"
              >
                🔊 발음
              </button>
            </div>
            <div className="text-sm text-gray-600 mb-2">예: {meaning1}</div>
            <input
              type="text"
              value={meaning1Input}
              onChange={(e) => setMeaning1Input(e.target.value)}
              placeholder="첫 번째 뜻을 입력하세요"
              className="w-full border-2 border-gray-300 rounded-lg p-4 text-lg font-semibold focus:outline-none focus:border-teal-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          {/* Meaning 2 입력 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-lg font-bold text-gray-700">
                3️⃣ 뜻 2 입력
              </label>
              <button
                onClick={() => playAudio(meaning2, 'ko-KR')}
                className="text-sm bg-orange-500 text-white px-3 py-1 rounded-full hover:bg-orange-600 transition"
              >
                🔊 발음
              </button>
            </div>
            <div className="text-sm text-gray-600 mb-2">예: {meaning2}</div>
            <input
              type="text"
              value={meaning2Input}
              onChange={(e) => setMeaning2Input(e.target.value)}
              placeholder="두 번째 뜻을 입력하세요"
              className="w-full border-2 border-gray-300 rounded-lg p-4 text-lg font-semibold focus:outline-none focus:border-teal-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          {/* 피드백 */}
          {feedback && (
            <div className={`p-4 rounded-lg ${
              feedbackType === 'success'
                ? 'bg-green-100 border-2 border-green-500 text-green-800'
                : 'bg-red-100 border-2 border-red-500 text-red-800'
            }`}>
              <div className="whitespace-pre-wrap font-semibold text-sm">
                {feedbackType === 'success' ? '✅ ' : '❌ '}{feedback}
              </div>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSubmit}
              className="flex-1 bg-teal-500 text-white py-4 rounded-lg font-bold hover:bg-teal-600 transition text-lg"
            >
              {feedbackType === 'success' ? '다음 단어로' : '확인'}
            </button>
          </div>
        </div>
      </div>

      {/* 오른쪽 사이드바 */}
      <div className="w-full lg:w-80 flex flex-col overflow-y-scroll flex-shrink-0 gap-4 px-4 lg:px-0" style={{ scrollbarGutter: 'stable' }}>
        <div className="bg-white rounded-lg p-4 border-2 border-green-400 flex-shrink-0" style={{ minHeight: '600px' }}>
          <div className="text-sm font-bold text-gray-700 mb-3">🏆 오늘의 단어</div>
          <div className="bg-green-50 rounded-lg p-3 mb-3">
            <div className="font-bold text-green-700 text-lg">{currentWord.text}</div>
            <div className="text-xs text-gray-600 mt-1">{meaning1}</div>
          </div>
          <div className="bg-orange-100 rounded-lg p-4 text-center">
            <div className="text-xs text-gray-600 mb-2">연속 학습 중!</div>
            <div className="flex items-center justify-center gap-1">
              <span className="text-2xl">🔥</span>
              <span className="text-2xl font-bold text-orange-600">7일</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
