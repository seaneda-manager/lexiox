'use client';

import React, { useState, useMemo, useEffect, useLayoutEffect, useRef } from 'react';
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
  const inputRef = useRef<HTMLInputElement>(null);
  const meaning1Ref = useRef<HTMLInputElement>(null);
  const meaning2Ref = useRef<HTMLInputElement>(null);

  const currentWord = useMemo(() => {
    return words[currentWordIdx];
  }, [words, currentWordIdx]);

  // Debug: log all words on mount
  useMemo(() => {
    console.log('[WORDS] Total:', words.length);
    console.log('[WORDS] List:', words.map((w, i) => `${i}: ${w.text}`).join(', '));
    const duplicates = words
      .map((w) => w.text.toLowerCase())
      .filter((text, idx, arr) => arr.indexOf(text) !== idx);
    if (duplicates.length > 0) {
      console.warn('[WORDS] ⚠️ DUPLICATES FOUND:', duplicates);
    }
  }, [words]);

  // Focus on input when component mounts or word changes (use useLayoutEffect for earlier execution)
  useLayoutEffect(() => {
    if (!spellingDone && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      // Force English input mode (clear any Korean/other language input state)
      try {
        inputRef.current.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
      } catch (e) {
        // Fallback: just ensure focus
      }
    }
  }, [spellingDone, currentWordIdx]);

  const progress = `${currentWordIdx + 1}/${words.length}`;
  const canProceedToNextWord = spellingDone && meaningDone;

  // Check if spelling is correct (independent of onChange)
  useEffect(() => {
    if (!spellingDone && spellingInput && currentWord?.text) {
      const wordTextNormalized = String(currentWord.text)
        .toLowerCase()
        .trim()
        .replace(/[^a-z]/g, '');
      const inputNormalized = spellingInput
        .toLowerCase()
        .trim()
        .replace(/[^a-z]/g, '');

      if (inputNormalized === wordTextNormalized) {
        setSpellingDone(true);
      }
    }
  }, [spellingInput, currentWord?.text, spellingDone]);

  // Auto-play pronunciation when spelling complete + auto focus meaning
  useEffect(() => {
    if (spellingDone && currentWord?.text) {
      playAudio(currentWord.text);
      // Auto focus to meaning field
      setTimeout(() => {
        meaning1Ref.current?.focus();
      }, 100);
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

    console.log('[NEXT] Before:', {
      currentWordIdx,
      totalWords: words.length,
      canProceed: canProceedToNextWord,
      currentWord: currentWord?.text,
    });

    if (currentWord) {
      setCompletedWords([...completedWords, currentWord]);
    }

    if (currentWordIdx + 1 < words.length) {
      const nextIdx = currentWordIdx + 1;
      console.log('[NEXT] Moving to word:', nextIdx, words[nextIdx]?.text);
      setCurrentWordIdx(nextIdx);
      setSpellingInput('');
      setMeaning1Input('');
      setMeaning2Input('');
      setSpellingDone(false);
      setMeaningDone(false);
    } else {
      console.log('[NEXT] Finished all words!');
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
    <div className="flex flex-col lg:flex-row w-full h-full gap-0 bg-slate-50" style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* 좌측 메인 콘텐츠 (70%) */}
      <div className="flex-[7] flex flex-col px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:pr-6 overflow-y-auto">
        {/* 헤더: 진도 + 스트릭 */}
        <div className="mb-6 sm:mb-8 flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs sm:text-sm text-slate-500 font-semibold">
              {trackTitle || '단어 학습'}
              {dayIndex != null && totalDays != null && ` - Day ${dayIndex} / ${totalDays}`}
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mt-1">{progress}</h1>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="flex items-center gap-1 sm:gap-2 justify-end mb-2">
              <span className="text-2xl sm:text-3xl">🔥</span>
              <div>
                <p className="text-xs sm:text-sm text-slate-600">연속 학습</p>
                <p className="text-lg sm:text-2xl font-bold text-orange-600">{streakDays}일째</p>
              </div>
            </div>
          </div>
        </div>

        {/* 메인 학습 카드 - 반응형 너비 */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border-2 border-slate-200 p-6 sm:p-8 lg:p-10 space-y-6 sm:space-y-8 flex-1" style={{ width: '100%' }}>
          {/* Spelling Section */}
          <div className="space-y-4">
            <div className="text-sm font-bold text-slate-600">📚 단어 학습 (통합 Step)</div>

            {!spellingDone && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-600">📝 철자 입력</p>
                  <p className="text-xs text-slate-500 italic">
                    아래에 단어의 철자를 입력하세요 (자동 진행)
                  </p>
                </div>

                {/* Clear letter display */}
                <div className="text-center py-8 bg-slate-100 rounded-xl">
                  <div style={{
                    fontSize: currentWord.text.length <= 7 ? '2.5rem' :
                             currentWord.text.length <= 11 ? '1.8rem' : '1.4rem',
                    fontWeight: 300,
                    letterSpacing: '0.1em',
                    color: '#1e293b',
                    fontFamily: 'monospace'
                  }}>
                    {currentWord.text.split('').map((char, idx) => (
                      <span key={`${currentWordIdx}-${idx}`} style={{ marginRight: '0.2em' }}>
                        {char}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Input field - auto advance on correct spelling */}
                <div className="space-y-2">
                  <input
                    key={`spelling-${currentWordIdx}`}
                    ref={inputRef}
                    type="text"
                    value={spellingInput}
                    onChange={(e) => {
                      const value = e.target.value.toLowerCase();
                      const cleaned = value.replace(/[^a-z]/g, '');
                      setSpellingInput(cleaned);

                      // 자동 진행: 철자가 올바르면 다음 단계로
                      if (currentWord?.text) {
                        // Remove all whitespace and special characters from word text too
                        const wordTextNormalized = String(currentWord.text)
                          .toLowerCase()
                          .trim()
                          .replace(/[^a-z]/g, '');
                        const isMatch = cleaned === wordTextNormalized;

                        if (isMatch) {
                          setSpellingDone(true);
                        }
                      }
                    }}
                    placeholder="철자를 입력하세요..."
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg text-center text-lg font-semibold placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <p className="text-xs text-slate-500 text-center">
                    올바르게 입력하면 자동으로 진행됩니다 ✨
                  </p>
                </div>
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
                  ref={meaning1Ref}
                  type="text"
                  value={meaning1Input}
                  onChange={(e) => {
                    setMeaning1Input(e.target.value);
                    // 자동 진행: 두 뜻이 모두 채워지면 다음 단계로
                    if (e.target.value.trim() && meaning2Input.trim()) {
                      setMeaningDone(true);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.preventDefault();
                    if (e.key === 'Tab') {
                      e.preventDefault();
                      meaning2Ref.current?.focus();
                    }
                  }}
                  placeholder={currentWord.meanings_ko?.[0] || '한국어 뜻을 입력하세요...'}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg placeholder-slate-400 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  ref={meaning2Ref}
                  type="text"
                  value={meaning2Input}
                  onChange={(e) => {
                    setMeaning2Input(e.target.value);
                    // 자동 진행: 두 뜻이 모두 채워지면 다음 단계로
                    if (meaning1Input.trim() && e.target.value.trim()) {
                      setMeaningDone(true);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleMeaningComplete();
                    }
                  }}
                  placeholder={currentWord.meanings_ko?.[1] || '또 다른 뜻을 입력하세요...'}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg placeholder-slate-400 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <p className="text-xs text-slate-500 text-center">
                (두 뜻을 입력하면 자동으로 진행됩니다 ✨)
              </p>

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

      {/* 우측 사이드바 (30%) - 반응형 */}
      <div className="flex-[3] bg-white border-t lg:border-t-0 lg:border-l border-slate-200 px-4 sm:px-6 py-6 sm:py-8 lg:pl-4 overflow-y-auto space-y-4 sm:space-y-6 lg:max-w-xs">
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
