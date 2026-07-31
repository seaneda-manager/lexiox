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

// 음성 재생 함수
const playAudio = async (text: string) => {
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error('Speech synthesis error:', err);
  }
};

const playKoreanAudio = async (text: string) => {
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error('Speech synthesis error:', err);
  }
};

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
  const [spellingDone, setSpellingDone] = useState(false);
  const [meaningDone, setMeaningDone] = useState(false);
  const [exampleDone, setExampleDone] = useState(false);
  const [meaningInput, setMeaningInput] = useState('');

  const currentWord = useMemo(() => {
    return words[currentWordIdx];
  }, [words, currentWordIdx]);

  const progress = `${currentWordIdx + 1}/${words.length}`;

  const canProceedToNextWord = spellingDone && meaningDone && exampleDone;

  const handleNextWord = () => {
    if (!canProceedToNextWord) return;
    if (currentWordIdx + 1 < words.length) {
      setCurrentWordIdx(currentWordIdx + 1);
      setCurrentTab('spelling');
      setSpellingInput('');
      setMeaningInput('');
      setSpellingDone(false);
      setMeaningDone(false);
      setExampleDone(false);
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
            1️⃣ Spelling {spellingDone ? '✅' : ''}
          </button>
          <button
            onClick={() => setCurrentTab('meaning')}
            className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition cursor-pointer ${
              currentTab === 'meaning'
                ? 'bg-teal-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-300'
            }`}
          >
            2️⃣ Meaning {meaningDone ? '✅' : ''}
          </button>
          <button
            onClick={() => setCurrentTab('quiz')}
            className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition cursor-pointer ${
              currentTab === 'quiz'
                ? 'bg-teal-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-300'
            }`}
          >
            3️⃣ Quiz {exampleDone ? '✅' : ''}
          </button>
        </div>

        {/* 탭 컨텐츠 */}
        <div className="bg-white rounded-2xl border-4 border-teal-300 p-8 flex-shrink-0">
          {currentTab === 'spelling' && (
            <SpellingTabContent
              word={currentWord}
              input={spellingInput}
              setInput={setSpellingInput}
              isDone={spellingDone}
              setIsDone={setSpellingDone}
              onNext={() => setCurrentTab('meaning')}
            />
          )}

          {currentTab === 'meaning' && (
            <MeaningTabContent
              word={currentWord}
              input={meaningInput}
              setInput={setMeaningInput}
              isDone={meaningDone}
              setIsDone={setMeaningDone}
              onNext={() => setCurrentTab('quiz')}
            />
          )}

          {currentTab === 'quiz' && (
            <QuizTabContent
              word={currentWord}
              isDone={exampleDone}
              setIsDone={setExampleDone}
              onNext={handleNextWord}
              canProceed={canProceedToNextWord}
            />
          )}
        </div>
      </div>

      {/* 오른쪽 사이드바 - 태블릿에서는 아래로 */}
      <div className="w-full lg:w-80 flex flex-col overflow-y-scroll flex-shrink-0 gap-4 px-4 lg:px-0" style={{ scrollbarGutter: 'stable' }}>
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
  isDone,
  setIsDone,
  onNext,
}: {
  word: LearningWord;
  input: string;
  setInput: (val: string) => void;
  isDone: boolean;
  setIsDone: (val: boolean) => void;
  onNext: () => void;
}) {
  const handlePlayPronunciation = () => {
    playAudio(word.text);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-6 border-b-2 border-gray-300">
        <div className="text-xs font-bold text-gray-600">STEP 1: 철자 입력</div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isDone}
            onChange={(e) => setIsDone(e.target.checked)}
            className="w-5 h-5"
          />
          <span className="text-sm font-bold text-gray-600">완료</span>
        </label>
      </div>

      <div className="space-y-6">
        {/* 주어진 철자 + 발음 */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <div className="text-xs font-bold text-gray-500">주어진 철자</div>
            <button
              onClick={handlePlayPronunciation}
              className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-lg font-bold"
            >
              🔊 발음 듣기
            </button>
          </div>
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
              onClick={handlePlayPronunciation}
              className="flex-1 border-2 border-gray-300 rounded-lg p-2.5 font-bold cursor-pointer hover:bg-gray-100 bg-white text-sm"
            >
              🔊 다시 듣기
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
  input,
  setInput,
  isDone,
  setIsDone,
  onNext,
}: {
  word: LearningWord;
  input: string;
  setInput: (val: string) => void;
  isDone: boolean;
  setIsDone: (val: boolean) => void;
  onNext: () => void;
}) {
  const meanings = word.meanings_ko || [];
  const koreanMeaning = meanings[0] || '';

  const handlePlayKoreanMeaning = () => {
    if (koreanMeaning) {
      playKoreanAudio(koreanMeaning);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-6 border-b-2 border-gray-300">
        <div className="text-xs font-bold text-gray-600">STEP 2: 뜻 학습</div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isDone}
            onChange={(e) => setIsDone(e.target.checked)}
            className="w-5 h-5"
          />
          <span className="text-sm font-bold text-gray-600">완료</span>
        </label>
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

      {/* 한글 뜻 입력 */}
      <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-5">
        <div className="flex justify-between items-center mb-3">
          <div className="text-xs font-bold text-gray-600">한글 뜻 받아 쓰기</div>
          <button
            onClick={handlePlayKoreanMeaning}
            className="text-sm bg-purple-200 hover:bg-purple-300 text-purple-700 px-3 py-1 rounded-lg font-bold"
          >
            🔊 듣기
          </button>
        </div>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="한글 뜻을 입력하세요..."
          className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-center text-lg focus:outline-none focus:border-purple-500"
        />
        <div className="text-xs text-gray-500 mt-2 text-center">
          정답: <span className="font-bold">{koreanMeaning}</span>
        </div>
      </div>

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
  isDone,
  setIsDone,
  onNext,
  canProceed,
}: {
  word: LearningWord;
  isDone: boolean;
  setIsDone: (val: boolean) => void;
  onNext: () => void;
  canProceed: boolean;
}) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  // 오답 선택지 다양화
  const incorrectChoices = [
    '결정하다, 판단하다',
    '거부하다, 반대하다',
    '무시하다, 간과하다',
    '예상하다, 기대하다',
    '제안하다, 제시하다',
    '받아들이다, 수용하다',
  ];

  // 정답 + 랜덤 오답 3개
  const correctChoice = `${word.meanings_ko?.[0] || '—'}, 고마워하다`;
  const shuffledIncorrect = incorrectChoices.sort(() => Math.random() - 0.5).slice(0, 3);
  const allChoices = [correctChoice, ...shuffledIncorrect].sort(() => Math.random() - 0.5);
  const correctIdx = allChoices.indexOf(correctChoice);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-6 border-b-2 border-gray-300">
        <div className="text-xs font-bold text-gray-600">STEP 3: 이해도 확인</div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isDone}
            onChange={(e) => setIsDone(e.target.checked)}
            className="w-5 h-5"
          />
          <span className="text-sm font-bold text-gray-600">완료</span>
        </label>
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

      {/* 선택지 (랜덤화됨) */}
      <div className="space-y-2.5">
        {allChoices.map((choice, idx) => {
          let btnClass = 'border-2 border-gray-300 bg-white text-gray-900';
          if (showResult) {
            if (idx === correctIdx) btnClass = 'border-2 border-green-400 bg-green-200 text-green-900';
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
          disabled={!canProceed}
          className={`w-full py-3 rounded-lg font-bold transition cursor-pointer ${
            canProceed
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {canProceed ? '다음 단어로' : '모든 단계 완료 후 진행 가능'}
        </button>
      )}
    </div>
  );
}
