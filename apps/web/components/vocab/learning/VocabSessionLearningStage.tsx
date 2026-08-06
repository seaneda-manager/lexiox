'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { LearningWord } from './learning.types';

interface VocabSessionLearningStageProps {
  words: LearningWord[];
  onFinish: () => void;
  trackTitle?: string | null;
  dayIndex?: number | null;
  totalDays?: number | null;
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

export default function VocabSessionLearningStage({
  words,
  onFinish,
  trackTitle,
  dayIndex,
  totalDays,
}: VocabSessionLearningStageProps) {
  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [spellingInput, setSpellingInput] = useState('');
  const [spellingDone, setSpellingDone] = useState(false);
  const [meaning1Input, setMeaning1Input] = useState('');
  const [meaning2Input, setMeaning2Input] = useState('');
  const [meaningDone, setMeaningDone] = useState(false);
  const [completedWords, setCompletedWords] = useState<LearningWord[]>([]);
  const [streakDays] = useState(7);

  const currentWord = useMemo(() => {
    return words[currentWordIdx];
  }, [words, currentWordIdx]);

  const progress = `${currentWordIdx + 1}/${words.length}`;
  const canProceedToNextWord = spellingDone && meaningDone;

  // Auto-play pronunciation when spelling complete
  useEffect(() => {
    if (spellingDone && currentWord?.text) {
      playAudio(currentWord.text);
    }
  }, [spellingDone, currentWord?.text]);

  // Auto-play Korean meaning when meaning inputs filled
  useEffect(() => {
    if (meaningDone && currentWord?.meanings_ko?.[0]) {
      playKoreanAudio(currentWord.meanings_ko[0]);
    }
  }, [meaningDone, currentWord?.meanings_ko]);

  const handleSpellingKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && spellingInput.length > 0) {
      setSpellingDone(true);
    }
  };

  const handleMeaningComplete = () => {
    if (meaning1Input.trim() || meaning2Input.trim()) {
      setMeaningDone(true);
    }
  };

  const handleNextWord = () => {
    if (!canProceedToNextWord) return;
    if (currentWord) {
      setCompletedWords([...completedWords, currentWord]);
    }
    if (currentWordIdx + 1 < words.length) {
      setCurrentWordIdx(currentWordIdx + 1);
      setSpellingInput('');
      setMeaning1Input('');
      setMeaning2Input('');
      setSpellingDone(false);
      setMeaningDone(false);
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
    <div className="flex flex-col lg:flex-row w-full min-h-screen gap-0">
      {/* 좌측 메인 콘텐츠 (70%) */}
      <div className="flex-[7] flex flex-col px-6 py-8 lg:pr-4 overflow-y-auto">
        {/* 헤더: 진도 + 스트릭 */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-semibold">
              {trackTitle || '단어 학습'}
              {dayIndex != null && totalDays != null && ` - Day ${dayIndex} / ${totalDays}`}
            </p>
            <h1 className="text-4xl font-bold text-slate-900 mt-1">{progress}</h1>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end mb-2">
              <span className="text-3xl">🔥</span>
              <div>
                <p className="text-sm text-slate-600">연속 학습</p>
                <p className="text-2xl font-bold text-orange-600">{streakDays}일째</p>
              </div>
            </div>
          </div>
        </div>

        {/* 메인 학습 카드 */}
        <div className="bg-white rounded-3xl border-2 border-slate-200 p-8 space-y-8 flex-1">
          {/* Spelling Section */}
          <div className="space-y-4">
            <div className="text-sm font-bold text-slate-600">📚 단어 학습 (통합 Step)</div>

            {!spellingDone && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600 text-center italic">
                  (아래 흐릿한 철자를 따라 타이핑 하세요)
                </p>

                {/* Interactive Spelling Input */}
                <div className="relative">
                  <div className="text-5xl font-light tracking-[0.3em] text-gray-300 text-center py-6">
                    {currentWord.text}
                  </div>
                  <input
                    type="text"
                    value={spellingInput}
                    onChange={(e) => setSpellingInput(e.target.value.toLowerCase())}
                    onKeyDown={handleSpellingKeyDown}
                    placeholder=""
                    className="absolute inset-0 text-center text-5xl tracking-[0.3em] bg-transparent outline-none border-none opacity-0 cursor-text"
                    autoFocus
                  />
                  {/* Overlay effect: show typed characters */}
                  <div className="text-center text-5xl font-light tracking-[0.3em] py-6 pointer-events-none">
                    {currentWord.text.split('').map((char, idx) => (
                      <span
                        key={idx}
                        className={idx < spellingInput.length ? 'text-slate-900' : 'text-gray-300'}
                      >
                        {char}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-slate-500 text-center">
                  (완료 시 원어민 음성 자동 재생 🔊)
                </p>
              </div>
            )}

            {spellingDone && (
              <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-4 text-center">
                <p className="text-sm font-semibold text-emerald-700">✅ 철자 학습 완료!</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{currentWord.text}</p>
              </div>
            )}
          </div>

          {/* Meaning Section */}
          {spellingDone && (
            <div className="space-y-4 border-t-2 border-slate-200 pt-8">
              <div className="text-sm font-bold text-slate-600">뜻 입력</div>

              <div className="space-y-3">
                <input
                  type="text"
                  value={meaning1Input}
                  onChange={(e) => setMeaning1Input(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleMeaningComplete()}
                  placeholder={currentWord.meanings_ko?.[0] || '한국어 뜻을 입력하세요...'}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg placeholder-slate-400 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={meaning2Input}
                  onChange={(e) => setMeaning2Input(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleMeaningComplete()}
                  placeholder={currentWord.meanings_ko?.[1] || '또 다른 뜻을 입력하세요...'}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg placeholder-slate-400 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <p className="text-xs text-slate-500 text-center">
                (완료 시 한국어 뜻 음성 자동 재생 🔊)
              </p>

              {!meaningDone && (
                <button
                  onClick={handleMeaningComplete}
                  disabled={!meaning1Input.trim() && !meaning2Input.trim()}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-lg transition"
                >
                  뜻 입력 완료
                </button>
              )}

              {meaningDone && (
                <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 text-center">
                  <p className="text-sm font-semibold text-blue-700">✅ 뜻 학습 완료!</p>
                </div>
              )}
            </div>
          )}

          {/* Next Button */}
          {canProceedToNextWord && (
            <button
              onClick={handleNextWord}
              className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition text-lg"
            >
              다음 단어 ➔
            </button>
          )}
        </div>
      </div>

      {/* 우측 사이드바 (30%) */}
      <div className="flex-[3] bg-slate-50 border-l border-slate-200 px-6 py-8 lg:pl-4 overflow-y-auto space-y-6">
        {/* 오늘 완료한 단어 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <h3 className="text-sm font-bold text-slate-700">🏆 오늘 완료한 단어</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {completedWords.length === 0 ? (
              <p className="text-xs text-slate-500 italic">아직 완료한 단어가 없습니다</p>
            ) : (
              completedWords.map((word) => (
                <div key={word.id} className="flex items-start gap-2 p-2 bg-emerald-50 rounded-lg">
                  <span className="text-lg">✅</span>
                  <div className="flex-1 text-xs">
                    <p className="font-semibold text-slate-900">{word.text}</p>
                    <p className="text-slate-600">
                      {word.meanings_ko?.[0] || '—'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 학습 진행률 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <h3 className="text-sm font-bold text-slate-700">📊 학습 진행률</h3>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-600">오늘</span>
                <span className="text-xs font-bold text-slate-700">{Math.round((completedWords.length / words.length) * 100)}%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${(completedWords.length / words.length) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-600">이번 주</span>
                <span className="text-xs font-bold text-slate-700">60%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-teal-500" style={{ width: '60%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        input:focus {
          outline: none;
        }
      `}</style>
    </div>
  );
}
