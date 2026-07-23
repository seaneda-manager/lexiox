'use client';

import React, { useState, useMemo } from 'react';
import type { LearningWord } from './learning.types';

type TabType = 'spelling' | 'meaning' | 'quiz';

interface VocabSessionLearningStageProps {
  words: LearningWord[];
  onFinish: () => void;
  trackTitle?: string | null;
  dayIndex?: number | null;
  totalDays?: number | null;
}

export default function VocabSessionLearningStage({
  words,
  onFinish,
  trackTitle,
  dayIndex,
  totalDays,
}: VocabSessionLearningStageProps) {
  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [currentTab, setCurrentTab] = useState<TabType>('spelling');
  const [spellingInput, setSpellingInput] = useState('');

  const currentWord = useMemo(() => {
    return words[currentWordIdx];
  }, [words, currentWordIdx]);

  const progress = `${currentWordIdx + 1}/${words.length}`;

  const handleNextWord = () => {
    if (currentWordIdx + 1 < words.length) {
      setCurrentWordIdx(currentWordIdx + 1);
      setCurrentTab('spelling');
      setSpellingInput('');
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
    <div className="flex gap-6 w-full min-h-screen">
      {/* 왼쪽 메인 콘텐츠 */}
      <div className="flex-[1.5] space-y-6 overflow-y-scroll" style={{ scrollbarGutter: 'stable' }}>
        {/* 진도 헤더 */}
        <div className="bg-teal-500 text-white rounded-2xl p-6 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-4xl font-bold">{progress}</h2>
            <p className="text-sm opacity-90 mt-1">
              {trackTitle || '단어 학습'}
              {dayIndex != null && totalDays != null && ` - Day ${dayIndex} / ${totalDays}`}
            </p>
          </div>
          <button className="bg-white/20 hover:bg-white/30 border-0 p-3 rounded-lg cursor-pointer text-2xl transition">
            🔔
          </button>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex gap-2 bg-white p-2 rounded-2xl border-2 border-gray-300">
          <button
            onClick={() => setCurrentTab('spelling')}
            className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition cursor-pointer ${
              currentTab === 'spelling'
                ? 'bg-teal-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-300'
            }`}
          >
            1️⃣ Spelling
          </button>
          <button
            onClick={() => setCurrentTab('meaning')}
            className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition cursor-pointer ${
              currentTab === 'meaning'
                ? 'bg-teal-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-300'
            }`}
          >
            2️⃣ Meaning
          </button>
          <button
            onClick={() => setCurrentTab('quiz')}
            className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition cursor-pointer ${
              currentTab === 'quiz'
                ? 'bg-teal-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-300'
            }`}
          >
            3️⃣ Quiz
          </button>
        </div>

        {/* 탭 컨텐츠 */}
        <div className="bg-white rounded-2xl border-4 border-teal-300 p-8 flex-shrink-0">
          {currentTab === 'spelling' && (
            <SpellingTabContent word={currentWord} input={spellingInput} setInput={setSpellingInput} onNext={() => setCurrentTab('meaning')} />
          )}

          {currentTab === 'meaning' && (
            <MeaningTabContent word={currentWord} onNext={() => setCurrentTab('quiz')} />
          )}

          {currentTab === 'quiz' && (
            <QuizTabContent word={currentWord} onNext={handleNextWord} />
          )}
        </div>
      </div>

      {/* 오른쪽 사이드바 */}
      <div className="w-80 flex flex-col overflow-y-scroll flex-shrink-0 gap-4" style={{ scrollbarGutter: 'stable', height: '100%' }}>
        {/* 오늘의 진도 */}
        <div className="bg-white rounded-lg p-4 border-2 border-green-400 flex-shrink-0" style={{ minHeight: '600px' }}>
          <div className="text-sm font-bold text-gray-700 mb-3">🏆 오늘의 진도</div>
          <div className="bg-green-50 rounded-lg p-3 mb-3">
            <div className="font-bold text-green-700 text-lg">{currentWord.text}</div>
            <div className="text-xs text-gray-600 mt-1">{currentWord.meanings_ko?.[0] || '—'}</div>
          </div>
          <div className="bg-orange-100 rounded-lg p-4 text-center">
            <div className="text-xs text-gray-600 mb-2">연속 학습 중!</div>
            <div className="flex items-center justify-center gap-1">
              <span className="text-2xl">🔥</span>
              <span className="text-2xl font-bold text-orange-600">7일</span>
            </div>
          </div>
        </div>

        {/* 학습 진행률 */}
        <div className="bg-white rounded-lg p-4 border-2 border-blue-400 flex-shrink-0" style={{ minHeight: '180px' }}>
          <div className="text-sm font-bold text-gray-700 mb-4">학습 진행률</div>

          <div className="mb-3">
            <div className="text-xs font-bold text-gray-600 mb-1">오늘</div>
            <div className="bg-gray-300 rounded-full h-2 overflow-hidden">
              <div className="bg-teal-500 h-full rounded-full" style={{ width: '30%' }}></div>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-gray-600 mb-1">이번 주</div>
            <div className="bg-gray-300 rounded-full h-2 overflow-hidden">
              <div className="bg-teal-500 h-full rounded-full" style={{ width: '60%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Spelling Tab
// ============================================

function SpellingTabContent({
  word,
  input,
  setInput,
  onNext,
}: {
  word: LearningWord;
  input: string;
  setInput: (val: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-xs font-bold text-gray-600 pb-6 border-b-2 border-gray-300">
        STEP 1: 철자 입력
      </div>

      <div className="space-y-6">
        {/* 주어진 철자 */}
        <div>
          <div className="text-center text-xs font-bold text-gray-500 mb-2">주어진 철자</div>
          <div className="text-center text-3xl font-light tracking-widest text-gray-300 bg-gray-100 rounded-lg p-4 mb-4">
            {word.text}
          </div>
        </div>

        {/* 당신의 철자 */}
        <div>
          <div className="text-center text-xs font-bold text-gray-600 mb-2">당신의 철자</div>
          <div className="text-center text-6xl font-bold text-teal-600 bg-teal-50 border-2 border-teal-300 rounded-xl p-8 min-h-[120px] flex items-center justify-center">
            {input || '_'}
          </div>
        </div>

        {/* 입력 섹션 */}
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && onNext()}
            placeholder="Type the word..."
            className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-center text-lg mb-3 focus:outline-none focus:border-orange-500"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={onNext}
              className="flex-1 border-2 border-gray-300 rounded-lg p-2.5 font-bold cursor-pointer hover:bg-gray-100 bg-white text-sm"
            >
              Check
            </button>
            <button
              onClick={onNext}
              className="flex-1 border-2 border-gray-300 rounded-lg p-2.5 font-bold cursor-pointer hover:bg-gray-100 bg-white text-sm"
            >
              🔊 Hear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Meaning Tab
// ============================================

function MeaningTabContent({
  word,
  onNext,
}: {
  word: LearningWord;
  onNext: () => void;
}) {
  const meanings = word.meanings_ko || [];

  return (
    <div className="space-y-6">
      <div className="text-xs font-bold text-gray-600 pb-6 border-b-2 border-gray-300">
        STEP 2: 뜻 학습
      </div>

      {/* 단어 표시 */}
      <div className="bg-teal-50 border-2 border-teal-300 rounded-xl p-5 text-center mb-4">
        <div className="text-xs font-bold text-gray-600 mb-2">단어</div>
        <div className="text-4xl font-bold">
          <span className="text-teal-600">{word.text?.substring(0, word.text.length - 2)}</span>
          <span className="text-orange-500">{word.text?.substring(word.text.length - 2)}</span>
        </div>
      </div>

      {/* 뜻들 */}
      {meanings.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {meanings.slice(0, 2).map((meaning, idx) => (
            <div key={idx} className="bg-gray-100 border-l-4 border-orange-500 p-4 rounded-lg">
              <div className="text-xs font-bold text-gray-600 mb-1">뜻 {idx + 1}</div>
              <div className="font-bold text-orange-500 text-sm mb-2">동사 (verb)</div>
              <div className="text-sm text-gray-700 mb-1 font-medium">{meaning}</div>
              <div className="text-xs text-gray-500 italic">to {meaning.toLowerCase()}</div>
            </div>
          ))}
        </div>
      )}

      {/* Related Words */}
      <div className="bg-gray-100 p-4 rounded-lg">
        <div className="text-xs font-bold text-gray-600 mb-3">RELATED WORDS</div>
        <div className="flex gap-2 flex-wrap">
          <span className="bg-yellow-200 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">
            be grateful
          </span>
          <span className="bg-yellow-200 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">
            thank
          </span>
          <span className="bg-yellow-200 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">
            recognize
          </span>
        </div>
      </div>

      {/* Definition */}
      <div className="bg-blue-100 border-l-4 border-blue-500 p-4 rounded">
        <div className="text-xs font-bold text-blue-900 mb-2">ENGLISH DEFINITION</div>
        <div className="text-sm text-blue-900 italic">
          "To recognize the value or quality of someone or something; to feel grateful for or to rise in
          value over time."
        </div>
      </div>

      {/* Report Broken */}
      <div className="bg-red-300 border-2 border-red-400 rounded-lg p-3 text-center">
        <button className="border-0 bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-xs cursor-pointer hover:bg-red-700">
          ⚠️ Report Broken Content
        </button>
      </div>

      <button
        onClick={onNext}
        className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 transition cursor-pointer"
      >
        이해했어요 → 다음
      </button>
    </div>
  );
}

// ============================================
// Quiz Tab
// ============================================

function QuizTabContent({
  word,
  onNext,
}: {
  word: LearningWord;
  onNext: () => void;
}) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  const choices = [
    `${word.meanings_ko?.[0] || '—'}, 고마워하다`,
    '결정하다, 판단하다',
    '거부하다, 반대하다',
    '무시하다, 간과하다',
  ];

  return (
    <div className="space-y-6">
      <div className="text-xs font-bold text-gray-600 pb-6 border-b-2 border-gray-300">
        STEP 3: 이해도 확인
      </div>

      <div className="bg-teal-50 border-2 border-teal-300 rounded-lg p-4 text-center text-teal-600 font-bold">
        맞는 뜻을 고르세요
      </div>

      {/* 동의어 */}
      <div className="bg-gray-100 p-4 rounded-lg">
        <div className="text-xs font-bold text-gray-600 mb-3">동의어/유의어</div>
        <div className="flex gap-2 flex-wrap">
          <span className="bg-yellow-200 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">
            be grateful
          </span>
          <span className="bg-yellow-200 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">
            thank
          </span>
          <span className="bg-yellow-200 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">
            recognize
          </span>
        </div>
      </div>

      {/* 예문 */}
      <div className="bg-gray-100 p-4 rounded-lg">
        <div className="text-xs font-bold text-gray-600 mb-3">예문</div>
        <div className="text-sm text-gray-800">
          <p>
            I really <span className="font-bold">appreciate</span> your help with this project.
          </p>
          <p className="text-xs text-gray-600 mt-2">나는 이 프로젝트에서 당신의 도움에 정말 감사합니다.</p>
        </div>
      </div>

      {/* 문제 제목 */}
      <div className="text-xs font-bold text-gray-600 pb-4 border-b-2 border-gray-300">
        다음 중 "{word.text}"의 뜻으로 가장 적절한 것은?
      </div>

      {/* 선택지 */}
      <div className="space-y-2.5">
        {choices.map((choice, idx) => {
          let btnClass = 'border-2 border-gray-300 bg-white text-gray-900';
          if (showResult) {
            if (idx === 0) btnClass = 'border-2 border-green-400 bg-green-200 text-green-900';
            else if (selectedIdx === idx) btnClass = 'border-2 border-red-400 bg-red-200 text-red-900';
          }
          return (
            <button
              key={idx}
              onClick={() => {
                if (!showResult) {
                  setSelectedIdx(idx);
                  setShowResult(true);
                }
              }}
              disabled={showResult}
              className={`w-full rounded-lg p-3.5 font-medium text-sm cursor-pointer text-left transition ${btnClass} ${
                showResult ? 'cursor-default' : 'hover:bg-gray-100'
              }`}
            >
              {idx + 1}️⃣ {choice}
            </button>
          );
        })}
      </div>

      {showResult && (
        <button
          onClick={onNext}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition cursor-pointer"
        >
          다음 단어로
        </button>
      )}
    </div>
  );
}
