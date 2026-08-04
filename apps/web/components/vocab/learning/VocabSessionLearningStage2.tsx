'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { LearningWord } from './learning.types';

type TabType = 'synonym' | 'antonym' | 'example';

interface VocabSessionLearningStage2Props {
  words: LearningWord[];
  onFinish: () => void;
  trackTitle?: string | null;
  dayIndex?: number | null;
  totalDays?: number | null;
  learningOption?: number;
}

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

export default function VocabSessionLearningStage2({
  words,
  onFinish,
  trackTitle,
  dayIndex,
  totalDays,
  learningOption,
}: VocabSessionLearningStage2Props) {
  console.log("🎓 Stage 2 loaded with learningOption:", learningOption, {
    "1": "Traditional (원내학습)",
    "2": "Advanced (집예습)",
    "3": "Simple (간략학습)",
    "4": "BookOnly (책학습)"
  }[learningOption ?? 1]);

  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [currentTab, setCurrentTab] = useState<TabType>('synonym');
  const [synonymInput, setSynonymInput] = useState('');
  const [synonymDone, setSynonymDone] = useState(false);
  const [antonymInput, setAntonymInput] = useState('');
  const [antonymDone, setAntonymDone] = useState(false);
  const [exampleInput, setExampleInput] = useState('');
  const [exampleDone, setExampleDone] = useState(false);

  const currentWord = useMemo(() => {
    return words[currentWordIdx];
  }, [words, currentWordIdx]);

  const progress = `${currentWordIdx + 1}/${words.length}`;

  // learningOption에 따라 필수 탭 결정
  const requiredTabs = (() => {
    switch (learningOption) {
      case 2: // Advanced
        return ['synonym', 'antonym', 'example'];
      case 3: // Simple
        return ['synonym']; // 동의어만 필수
      case 4: // BookOnly
        return []; // 최소 학습
      default: // Traditional
        return ['synonym', 'antonym', 'example'];
    }
  })();

  const canProceedToNextWord = requiredTabs.every(tab => {
    if (tab === 'synonym') return synonymDone;
    if (tab === 'antonym') return antonymDone;
    if (tab === 'example') return exampleDone;
    return true;
  });

  const handleNextWord = () => {
    if (!canProceedToNextWord) return;
    if (currentWordIdx + 1 < words.length) {
      setCurrentWordIdx(currentWordIdx + 1);
      setCurrentTab(requiredTabs.length > 0 ? (requiredTabs[0] as TabType) : 'synonym');
      setSynonymInput('');
      setAntonymInput('');
      setExampleInput('');
      setSynonymDone(false);
      setAntonymDone(false);
      setExampleDone(false);
    } else {
      onFinish();
    }
  };

  // BookOnly (Option 4)인 경우 자동으로 모든 탭 완료 처리
  useEffect(() => {
    if (requiredTabs.length === 0) {
      setSynonymDone(true);
      setAntonymDone(true);
      setExampleDone(true);
    }
  }, [requiredTabs.length]);

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
        <div className="bg-purple-500 text-white rounded-2xl p-6 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-4xl font-bold">{progress}</h2>
            <p className="text-sm opacity-90 mt-1">
              {trackTitle || '단어 학습'} - Stage 2 (심화)
              {dayIndex != null && totalDays != null && ` (Day ${dayIndex} / ${totalDays})`}
            </p>
          </div>
          <button className="bg-white/20 hover:bg-white/30 border-0 p-3 rounded-lg cursor-pointer text-2xl transition">
            🔔
          </button>
        </div>

        {/* 탭 네비게이션 */}
        {requiredTabs.length > 0 && (
          <div className="flex gap-2 bg-white p-2 rounded-2xl border-2 border-gray-300">
            {requiredTabs.includes('synonym') && (
              <button
                onClick={() => setCurrentTab('synonym')}
                className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition cursor-pointer ${
                  currentTab === 'synonym'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-300'
                }`}
              >
                1️⃣ Synonym {synonymDone ? '✅' : ''}
              </button>
            )}
            {requiredTabs.includes('antonym') && (
              <button
                onClick={() => setCurrentTab('antonym')}
                className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition cursor-pointer ${
                  currentTab === 'antonym'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-300'
                }`}
              >
                2️⃣ Antonym {antonymDone ? '✅' : ''}
              </button>
            )}
            {requiredTabs.includes('example') && (
              <button
                onClick={() => setCurrentTab('example')}
                className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition cursor-pointer ${
                  currentTab === 'example'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-300'
                }`}
              >
                3️⃣ Example {exampleDone ? '✅' : ''}
              </button>
            )}
          </div>
        )}

        {/* 탭 컨텐츠 */}
        <div className="bg-white rounded-2xl border-4 border-purple-300 p-8 flex-shrink-0">
          {currentTab === 'synonym' && (
            <SynonymTabContent
              word={currentWord}
              input={synonymInput}
              setInput={setSynonymInput}
              isDone={synonymDone}
              setIsDone={setSynonymDone}
              onNext={() => setCurrentTab('antonym')}
            />
          )}

          {currentTab === 'antonym' && (
            <AntonymTabContent
              word={currentWord}
              input={antonymInput}
              setInput={setAntonymInput}
              isDone={antonymDone}
              setIsDone={setAntonymDone}
              onNext={() => setCurrentTab('example')}
            />
          )}

          {currentTab === 'example' && (
            <ExampleTabContent
              word={currentWord}
              input={exampleInput}
              setInput={setExampleInput}
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
        <div className="bg-white rounded-lg p-4 border-2 border-purple-400 flex-shrink-0" style={{ minHeight: '600px' }}>
          <div className="text-sm font-bold text-gray-700 mb-3">🧠 Stage 2 심화학습</div>
          <div className="bg-purple-50 rounded-lg p-3 mb-3">
            <div className="font-bold text-purple-700 text-lg">{currentWord.text}</div>
            <div className="text-xs text-gray-600 mt-1">{currentWord.meanings_ko?.[0] || '—'}</div>
          </div>
          <div className="bg-blue-100 rounded-lg p-4 text-center">
            <div className="text-xs text-gray-600 mb-2">심화 학습 중</div>
            <div className="flex items-center justify-center gap-1">
              <span className="text-2xl">💡</span>
              <span className="text-2xl font-bold text-blue-600">상급</span>
            </div>
          </div>
        </div>

        {/* 학습 진행률 */}
        <div className="bg-white rounded-lg p-4 border-2 border-indigo-400 flex-shrink-0" style={{ minHeight: '180px' }}>
          <div className="text-sm font-bold text-gray-700 mb-4">진행 상황</div>

          <div className="mb-3">
            <div className="text-xs font-bold text-gray-600 mb-1">Stage 2</div>
            <div className="bg-gray-300 rounded-full h-2 overflow-hidden">
              <div className="bg-purple-500 h-full rounded-full" style={{ width: `${((currentWordIdx + 1) / words.length) * 100}%` }}></div>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-gray-600 mb-1">전체 과정</div>
            <div className="bg-gray-300 rounded-full h-2 overflow-hidden">
              <div className="bg-indigo-500 h-full rounded-full" style={{ width: '60%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Synonym Tab
// ============================================

function SynonymTabContent({
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
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-6 border-b-2 border-gray-300">
        <div className="text-xs font-bold text-gray-600">STEP 1: 동의어 입력</div>
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
        {/* 단어 표시 */}
        <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-5 text-center">
          <div className="text-xs font-bold text-gray-600 mb-2">기본 단어</div>
          <div className="text-4xl font-bold text-purple-600">{word.text}</div>
          <div className="text-sm text-gray-600 mt-2">{word.meanings_ko?.[0] || '—'}</div>
        </div>

        {/* 동의어 입력 */}
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-5">
          <div className="text-xs font-bold text-gray-600 mb-3">동의어를 입력하세요</div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="예: similar, alike, comparable..."
            className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-center text-lg focus:outline-none focus:border-blue-500 mb-3"
            autoFocus
          />
          <div className="text-xs text-gray-500">
            여러 동의어는 쉼표로 구분하세요
          </div>
        </div>

        {/* 참고 동의어 */}
        {word.synonyms_ko && word.synonyms_ko.length > 0 && (
          <div className="bg-gray-100 p-4 rounded-lg">
            <div className="text-xs font-bold text-gray-600 mb-3">참고 동의어</div>
            <div className="flex gap-2 flex-wrap">
              {word.synonyms_ko.slice(0, 3).map((syn, idx) => (
                <span key={idx} className="bg-blue-200 text-blue-900 text-xs font-bold px-3 py-1 rounded-full">
                  {syn}
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onNext}
          className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 transition cursor-pointer"
        >
          다음 단계로 →
        </button>
      </div>
    </div>
  );
}

// ============================================
// Antonym Tab
// ============================================

function AntonymTabContent({
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
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-6 border-b-2 border-gray-300">
        <div className="text-xs font-bold text-gray-600">STEP 2: 반의어 입력</div>
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
        {/* 단어 표시 */}
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-5 text-center">
          <div className="text-xs font-bold text-gray-600 mb-2">기본 단어</div>
          <div className="text-4xl font-bold text-red-600">{word.text}</div>
          <div className="text-sm text-gray-600 mt-2">{word.meanings_ko?.[0] || '—'}</div>
        </div>

        {/* 반의어 입력 */}
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-5">
          <div className="text-xs font-bold text-gray-600 mb-3">반의어를 입력하세요</div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="예: opposite, contrary, different..."
            className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-center text-lg focus:outline-none focus:border-red-500 mb-3"
            autoFocus
          />
          <div className="text-xs text-gray-500">
            여러 반의어는 쉼표로 구분하세요
          </div>
        </div>

        {/* 참고 반의어 */}
        <div className="bg-gray-100 p-4 rounded-lg">
          <div className="text-xs font-bold text-gray-600 mb-3">💡 팁</div>
          <div className="text-sm text-gray-700">
            "{word.text}"의 반의어를 생각해보세요. 의미가 완전히 반대인 단어를 찾으면 됩니다.
          </div>
        </div>

        <button
          onClick={onNext}
          className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 transition cursor-pointer"
        >
          다음 단계로 →
        </button>
      </div>
    </div>
  );
}

// ============================================
// Example Tab
// ============================================

function ExampleTabContent({
  word,
  input,
  setInput,
  isDone,
  setIsDone,
  onNext,
  canProceed,
}: {
  word: LearningWord;
  input: string;
  setInput: (val: string) => void;
  isDone: boolean;
  setIsDone: (val: boolean) => void;
  onNext: () => void;
  canProceed: boolean;
}) {
  const exampleSentence = word.example_en || `The word "${word.text}" is commonly used in English.`;
  const exampleKorean = word.example_ko || '이 단어는 영어에서 자주 사용됩니다.';

  const handlePlayExample = () => {
    playAudio(exampleSentence);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-6 border-b-2 border-gray-300">
        <div className="text-xs font-bold text-gray-600">STEP 3: 예문 이해</div>
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
        {/* 예문 표시 */}
        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-5">
          <div className="flex justify-between items-start mb-3">
            <div className="text-xs font-bold text-gray-600">예문 (영어)</div>
            <button
              onClick={handlePlayExample}
              className="text-sm bg-green-200 hover:bg-green-300 text-green-700 px-3 py-1 rounded-lg font-bold"
            >
              🔊 들으기
            </button>
          </div>
          <div className="text-lg text-gray-800 leading-relaxed bg-white rounded-lg p-4 border border-green-200">
            <span className="font-bold text-green-600">{word.text}</span>의 뜻을 생각하며 읽어보세요.
          </div>
          <div className="text-base italic text-gray-700 mt-3">
            "{exampleSentence}"
          </div>
        </div>

        {/* 해석 입력 */}
        <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-5">
          <div className="text-xs font-bold text-gray-600 mb-3">이 예문을 한글로 해석하세요</div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="한글로 예문을 해석해주세요..."
            className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-orange-500 mb-3 min-h-[80px]"
            autoFocus
          />
          <div className="text-xs text-gray-500 text-center">
            정확한 해석보다는 의미를 이해하는 것이 중요합니다
          </div>
        </div>

        {/* 정답 표시 */}
        <div className="bg-gray-100 p-4 rounded-lg">
          <div className="text-xs font-bold text-gray-600 mb-2">📚 참고 해석</div>
          <div className="text-sm text-gray-700 bg-white rounded p-3 border border-gray-200">
            {exampleKorean}
          </div>
        </div>

        {/* 다음 버튼 */}
        <button
          onClick={onNext}
          disabled={!canProceed}
          className={`w-full py-3 rounded-lg font-bold transition cursor-pointer ${
            canProceed
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {canProceed ? '모든 단계 완료 → 다음으로' : '모든 단계 완료 후 진행 가능'}
        </button>
      </div>
    </div>
  );
}
