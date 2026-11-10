'use client';

import { normEnglish, cleanTypedEnglish } from '@/lib/vocab/test/englishMatch';
import { playWordAudio } from '@/lib/vocab/audio/wordAudio';
import React, { useState, useMemo, useEffect, useLayoutEffect, useRef } from 'react';
import type { LearningWord } from './learning.types';
import LetterTiles from './LetterTiles';
import { flattenMeanings, groupMeaningsByPos, matchMeaning, coreMeaning } from '@/lib/vocab/learning/meaningMatch';

interface VocabSessionLearningStageProps {
  words: LearningWord[];
  onFinish: () => void;
  trackTitle?: string | null;
  dayIndex?: number | null;
  totalDays?: number | null;
}

const playAudio = async (text: string) => {
  playWordAudio(text);
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
  const [meaningDone, setMeaningDone] = useState(false);
  const [completedWords, setCompletedWords] = useState<LearningWord[]>([]);
  const [streakDays] = useState(7);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Check if spelling is correct (independent of onChange)
  useEffect(() => {
    if (!spellingDone && spellingInput && currentWord?.text) {
      const wordTextNormalized = normEnglish(currentWord.text);
      const inputNormalized = normEnglish(spellingInput);

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
        (pronRef.current ?? meaningRefs.current[0])?.focus();
      }, 100);
    }
  }, [spellingDone, currentWord?.text]);

  // Auto-play Korean meaning when meaning inputs filled
  useEffect(() => {
    if (meaningDone && currentWord?.meanings_ko?.[0]) {
      playKoreanAudio(currentWord.meanings_ko[0]);
    }
  }, [meaningDone, currentWord?.meanings_ko]);

  // 글자 타일: 단어 글자를 섞어 두고 눌러서 입력할 수도 있다 (타이핑과 같은 입력창을 공유)
  const [showTiles, setShowTiles] = useState(false);
  const handleSpellingKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && spellingInput.length > 0) {
      setSpellingDone(true);
    }
  };

  // 한글 발음 따라쓰기 (데이터가 없으면 이 단계는 건너뜀)
  const pron = (currentWord?.pronunciation_ko ?? '').trim();
  const [pronInput, setPronInput] = useState('');
  const [pronDone, setPronDone] = useState(false);
  const pronRef = useRef<HTMLInputElement>(null);
  const pronStepDone = !pron || pronDone;
  const canProceedToNextWord = spellingDone && pronStepDone && meaningDone;

  // 뜻 채점: 괄호 안 설명·~ 는 무시, 엉뚱한 글자는 통과 못 함
  const meaningList = useMemo(() => flattenMeanings(currentWord?.meanings_ko), [currentWord]);
  // 품사 데이터가 있으면 같은 품사끼리 한 칸, 품사가 다르면 칸을 나눈다
  const posGroups = useMemo(
    () => groupMeaningsByPos(currentWord?.meanings_ko, currentWord?.meaning_pos),
    [currentWord],
  );
  const boxes = useMemo(() => {
    if (posGroups) {
      return posGroups.slice(0, 3).map((g) => ({ pos: g.pos, items: g.items, required: true }));
    }
    // 품사 데이터가 없으면 기존처럼 두 칸. 뜻이 하나뿐이면 둘째 칸은 비워도 된다
    return [
      { pos: '', items: meaningList, required: true },
      { pos: '', items: meaningList, required: meaningList.length >= 2 },
    ];
  }, [posGroups, meaningList]);

  const [meaningInputs, setMeaningInputs] = useState<string[]>(['', '', '']);
  const [meaningMsg, setMeaningMsg] = useState('');
  const meaningRefs = useRef<(HTMLInputElement | null)[]>([]);

  const evaluateMeanings = (inputs: string[]) => {
    let ok = true;
    let exact = true;
    const cores: string[] = [];
    boxes.forEach((b, i) => {
      const t = (inputs[i] ?? '').trim();
      if (!t) {
        if (b.required) {
          ok = false;
          exact = false;
        }
        return;
      }
      const r = matchMeaning(t, b.items);
      if (r === 'none') {
        ok = false;
        exact = false;
      } else if (r === 'close') exact = false;
      cores.push(coreMeaning(t));
    });
    // 같은 답을 여러 칸에 넣는 꼼수 방지
    if (new Set(cores).size !== cores.length) {
      ok = false;
      exact = false;
    }
    if (!(inputs[0] ?? '').trim()) {
      ok = false;
      exact = false;
    }
    return { ok, exact };
  };

  const allRequired = boxes.every((b) => b.required);

  const handleMeaningComplete = () => {
    if (evaluateMeanings(meaningInputs).ok) {
      setMeaningMsg('');
      setMeaningDone(true);
    } else {
      setMeaningMsg('뜻이 아직 달라요. 단어의 뜻을 다시 확인해서 써 보세요.');
    }
  };

  const changeMeaning = (i: number, v: string) => {
    const next = [...meaningInputs];
    next[i] = v;
    setMeaningInputs(next);
    setMeaningMsg('');
    // 자동 진행은 모든 칸이 필수이고 전부 정확할 때만 (선택 칸이 있으면 Enter로 확정)
    if (allRequired && evaluateMeanings(next).exact) setMeaningDone(true);
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
      setMeaningInputs(['', '', '']);
      setPronInput('');
      setPronDone(false);
      setMeaningMsg('');
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
    <div className="flex flex-col lg:flex-row w-full h-full min-h-0 gap-0 bg-slate-50" style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* 좌측 메인 콘텐츠 (70%) — 한 화면에 다 들어오게: 카드가 남는 높이를 쓰고, 넘칠 때만 카드 안에서 스크롤 */}
      <div className="flex-[7] min-h-0 flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:pr-6">
        {/* 헤더: 진도 + 스트릭 */}
        <div className="mb-2 sm:mb-3 flex shrink-0 items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm sm:text-base text-slate-500 font-semibold">
              {trackTitle || '단어 학습'}
              {dayIndex != null && totalDays != null && ` - Day ${dayIndex} / ${totalDays}`}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{progress}</h1>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="flex items-center gap-2 justify-end">
              <span className="text-2xl sm:text-3xl">🔥</span>
              <div>
                <p className="text-xs sm:text-sm text-slate-600">연속 학습</p>
                <p className="text-lg sm:text-xl font-bold text-orange-600">{streakDays}일째</p>
              </div>
            </div>
          </div>
        </div>

        {/* 메인 학습 카드 - 남는 높이를 채움 */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border-2 border-slate-200 p-4 sm:p-6 space-y-4 shrink min-h-0 overflow-y-auto" style={{ width: '100%' }}>
          {/* Spelling Section */}
          <div className="space-y-3">
            <div className="text-base font-bold text-slate-600">📚 단어 학습</div>

            {!spellingDone && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-lg font-bold text-slate-700">📝 철자 입력</p>
                  <p className="text-sm text-slate-500">
                    아래 단어를 그대로 입력하세요 (맞으면 자동으로 넘어가요)
                  </p>
                </div>

                {/* Clear letter display */}
                <div className="text-center py-3 sm:py-5 bg-slate-100 rounded-xl">
                  <div style={{
                    fontSize: currentWord.text.length <= 8 ? 'clamp(38px, 9vh, 80px)' :
                             currentWord.text.length <= 12 ? 'clamp(30px, 7vh, 60px)' : 'clamp(24px, 5.2vh, 46px)',
                    fontWeight: 400,
                    color: '#1e293b',
                    fontFamily: 'monospace'
                  }}>
                    {/* 글자 사이에만 간격을 둔다. (예전엔 마지막 글자 뒤에도 여백이 남아 단어가 왼쪽으로 치우쳐 보였다) */}
                    {currentWord.text.split('').map((char, idx, arr) => (
                      <span
                        key={`${currentWordIdx}-${idx}`}
                        style={{ marginRight: idx < arr.length - 1 ? '0.3em' : 0 }}
                      >
                        {char}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 입력한 철자 피드백: 맞는 글자는 초록, 틀린/남는 글자는 빨강 */}
                <div className="min-h-[2.5rem] text-center" aria-live="polite">
                  <span style={{ fontFamily: 'monospace', fontSize: '1.6rem', letterSpacing: '0.15em' }}>
                    {spellingInput.split('').map((ch, i) => {
                      const target = currentWord.text[i];
                      const ok = target !== undefined && ch.toLowerCase() === target.toLowerCase();
                      return (
                        <span key={i} className={ok ? 'font-bold text-emerald-600' : 'font-bold text-rose-600 underline decoration-rose-400'}>
                          {ch === ' ' ? ' ' : ch}
                        </span>
                      );
                    })}
                  </span>
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
                      const cleaned = cleanTypedEnglish(value);
                      const cleanedNorm = normEnglish(cleaned);
                      setSpellingInput(cleaned);

                      // 자동 진행: 철자가 올바르면 다음 단계로
                      if (currentWord?.text) {
                        // Remove all whitespace and special characters from word text too
                        const wordTextNormalized = normEnglish(currentWord.text);
                        const isMatch = cleanedNorm === wordTextNormalized;

                        if (isMatch) {
                          setSpellingDone(true);
                        }
                      }
                    }}
                    placeholder="철자를 입력하세요..."
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl text-center text-2xl font-bold placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                    lang="en"
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </div>

                {/* 글자 타일 (타이핑이 힘들 때 눌러서 입력) */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowTiles((v) => !v)}
                    className="mx-auto block rounded-lg border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    {showTiles ? '글자 타일 접기' : '🧩 글자 눌러서 입력'}
                  </button>
                  {showTiles && (
                    <LetterTiles key={currentWord.id} target={currentWord.text} value={spellingInput} onChange={setSpellingInput} />
                  )}
                </div>
              </div>
            )}

            {spellingDone && (
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl px-4 py-2.5 text-center">
                <p className="text-sm font-semibold text-emerald-700">✅ 철자 완료!</p>
                <p className="text-3xl font-bold text-slate-900">{currentWord.text}</p>
                {currentWord.pos && (
                  <span className="mt-1 inline-block rounded-full bg-slate-200 px-3 py-0.5 text-sm font-semibold text-slate-700">
                    {currentWord.pos}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Pronunciation (한글 발음 따라쓰기) */}
          {spellingDone && pron && (
            <div className="space-y-2 border-t-2 border-slate-200 pt-3">
              <div className="text-lg font-bold text-slate-700">🔊 발음 따라쓰기</div>
              {pronDone ? (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-center">
                  <span className="text-xl font-bold text-slate-900">{pron}</span>
                  <span className="ml-2 text-sm font-semibold text-emerald-700">✅</span>
                </div>
              ) : (
                <>
                  <div className="rounded-xl bg-slate-100 py-2 text-center text-3xl font-bold text-slate-800">{pron}</div>
                  <input
                    ref={pronRef}
                    type="text"
                    value={pronInput}
                    lang="ko"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="위 발음을 그대로 따라 쓰세요"
                    onChange={(e) => {
                      setPronInput(e.target.value);
                      if (coreMeaning(e.target.value) === coreMeaning(pron)) {
                        setPronDone(true);
                        setTimeout(() => meaningRefs.current[0]?.focus(), 100);
                      }
                    }}
                    className="w-full rounded-xl border-2 border-slate-300 px-4 py-3 text-center text-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </>
              )}
            </div>
          )}

          {/* Meaning Section */}
          {spellingDone && pronStepDone && (
            <div className="space-y-3 border-t-2 border-slate-200 pt-3">
              <div className="text-lg font-bold text-slate-700">뜻 입력</div>

              <div className="space-y-2.5">
                {boxes.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {b.pos && (
                      <span className="w-14 shrink-0 rounded-full bg-slate-200 px-2 py-1 text-center text-sm font-bold text-slate-700">
                        {b.pos}
                      </span>
                    )}
                    <input
                      ref={(el) => {
                        meaningRefs.current[i] = el;
                      }}
                      type="text"
                      value={meaningInputs[i] ?? ''}
                      onChange={(e) => changeMeaning(i, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (e.nativeEvent.isComposing) return;
                          const nextEmpty = i + 1 < boxes.length && boxes[i + 1].required && !(meaningInputs[i + 1] ?? '').trim();
                          if (nextEmpty) meaningRefs.current[i + 1]?.focus();
                          else handleMeaningComplete();
                        }
                        if (e.key === 'Tab' && i + 1 < boxes.length) {
                          e.preventDefault();
                          meaningRefs.current[i + 1]?.focus();
                        }
                      }}
                      lang="ko"
                      autoFocus={i === 0 && !pron}
                      placeholder={
                        i === 0
                          ? b.items.join('; ') || '한국어 뜻을 입력하세요...'
                          : b.required
                            ? (b.pos ? b.items.join('; ') : '또 다른 뜻을 입력하세요...')
                            : '(뜻이 하나뿐이면 비워 둬도 돼요)'
                      }
                      className="w-full px-4 py-3 text-xl border-2 border-slate-300 rounded-xl placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>

              {meaningDone ? (
                <div className="bg-blue-50 border border-blue-300 rounded-xl px-4 py-2 text-center">
                  <p className="text-base font-semibold text-blue-700">✅ 뜻 완료!</p>
                </div>
              ) : (
                <div className="space-y-1 text-center">
                  <p className="text-sm text-slate-500">
                    {posGroups && boxes.length > 1
                      ? '품사별로 칸이 나뉘어 있어요. 같은 품사의 뜻은 한 칸에 함께 써도 돼요.'
                      : boxes.length > 1 && !allRequired
                        ? '뜻이 하나예요. 첫 칸만 쓰고 Enter를 누르세요.'
                        : '뜻을 써 보세요. 괄호 안 설명이나 ~ 는 안 써도 돼요.'}
                  </p>
                  {meaningMsg && <p className="text-sm font-semibold text-rose-600">{meaningMsg}</p>}
                  <button
                    type="button"
                    onClick={handleMeaningComplete}
                    className="mt-1 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-bold text-white hover:bg-blue-700"
                  >
                    확인 (Enter)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Next Button */}
          {canProceedToNextWord && (
            <button
              onClick={handleNextWord}
              className="mx-auto block min-w-[220px] py-3 px-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full transition text-lg shadow-md shadow-emerald-900/15 active:scale-[0.97]"
            >
              다음 단어 ➔
            </button>
          )}
        </div>
      </div>

      {/* 우측 사이드바 (30%) - 반응형 */}
      <div className="hidden lg:block flex-[3] min-h-0 bg-white border-l border-slate-200 px-4 py-4 lg:pl-4 overflow-y-auto space-y-4 lg:max-w-xs">
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
