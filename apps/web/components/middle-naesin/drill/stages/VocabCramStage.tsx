'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { MiddleDrillVocabItem } from '@/models/middle-naesin/drill';
import { saveMiddleNaesinDrillResultAction } from '@/lib/middle-naesin/drill-results';

type Props = {
  vocab: MiddleDrillVocabItem[];
  unitId?: string;
};

const REPS_PER_WORD = 5;

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default function VocabCramStage({ vocab, unitId }: Props) {
  // 단어(word) : 영영 뜻 고르기(전체 리스트에서) : 한글 뜻 확인, 단어당 5회 반복
  const words = useMemo(
    () => vocab.filter((v) => v.kind === 'en_en' && !!v.definition && !!v.koGloss),
    [vocab],
  );

  const [wordOrder, setWordOrder] = useState<number[]>(() => shuffle(words.map((_, i) => i)));
  const [wordIdx, setWordIdx] = useState(0);
  const [rep, setRep] = useState(1);
  const [choices, setChoices] = useState<string[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [passed, setPassed] = useState(false);

  const currentWord = words[wordOrder[wordIdx]];

  useEffect(() => {
    if (!currentWord) return;
    const distractorPool = words.filter((w) => w.index !== currentWord.index).map((w) => w.definition);
    setChoices(shuffle([currentWord.definition, ...shuffle(distractorPool).slice(0, 3)]));
    setSelected(null);
    setPassed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordIdx, rep]);

  const restart = () => {
    setWordOrder(shuffle(words.map((_, i) => i)));
    setWordIdx(0);
    setRep(1);
  };

  const isDone = words.length > 0 && wordIdx >= words.length;
  const savedRef = useRef(false);

  useEffect(() => {
    if (!isDone || !unitId || savedRef.current) return;
    savedRef.current = true;
    saveMiddleNaesinDrillResultAction({
      unitId,
      drillType: 'vocab_cram',
      score: words.length,
      total: words.length,
    });
  }, [isDone, unitId, words.length]);

  if (words.length === 0) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center text-sm text-neutral-400">
        깜지용 단어가 없습니다. "영영 단어" 콘텐츠에 영어 정의와 한글 뜻(괄호 안 "설명 / 한글 뜻")이 함께 있는 단어가 필요합니다.
      </div>
    );
  }

  if (isDone) {
    return (
      <div className="rounded-2xl border bg-white p-10 text-center space-y-4">
        <div className="text-2xl">🎉</div>
        <div className="text-lg font-semibold text-neutral-900">
          {words.length}개 단어 · 단어당 {REPS_PER_WORD}회 반복 깜지 완료!
        </div>
        {unitId && <p className="text-xs text-emerald-600">✓ 결과가 저장되었어요</p>}
        <button
          type="button"
          onClick={() => { savedRef.current = false; restart(); }}
          className="rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
        >
          처음부터 다시
        </button>
      </div>
    );
  }

  const handleSelect = (cIdx: number) => {
    setSelected(cIdx);
    if (choices[cIdx] === currentWord.definition) {
      setPassed(true);
    }
  };

  const handleNext = () => {
    if (rep < REPS_PER_WORD) {
      setRep(rep + 1);
    } else {
      setWordIdx(wordIdx + 1);
      setRep(1);
    }
  };

  const wordsDoneCount = wordIdx;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border bg-white px-5 py-3 text-sm">
        <span className="font-semibold text-neutral-700">디지털 깜지</span>
        <span className="text-neutral-500">
          단어 {wordsDoneCount + 1}/{words.length} · 반복 {rep}/{REPS_PER_WORD}
        </span>
      </div>

      <div className="rounded-2xl border bg-white p-6 space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: REPS_PER_WORD }, (_, i) => (
            <span
              key={i}
              className={[
                'h-2 flex-1 rounded-full',
                i < rep - 1 || (i === rep - 1 && passed) ? 'bg-emerald-400' : i === rep - 1 ? 'bg-neutral-300' : 'bg-neutral-100',
              ].join(' ')}
            />
          ))}
        </div>

        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-neutral-400">단어</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{currentWord.word}</p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-neutral-500">영영 뜻 고르기</p>
          {choices.map((choice, cIdx) => {
            const isSelected = selected === cIdx;
            const isCorrectChoice = choice === currentWord.definition;
            const showState = selected !== null && (isSelected || (passed && isCorrectChoice));

            return (
              <button
                key={cIdx}
                type="button"
                onClick={() => handleSelect(cIdx)}
                disabled={passed}
                className={[
                  'block w-full rounded-xl border px-4 py-2 text-left text-sm transition disabled:cursor-default',
                  showState
                    ? isCorrectChoice
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : 'border-rose-300 bg-rose-50 text-rose-700'
                    : 'bg-white text-neutral-700 hover:bg-neutral-50',
                ].join(' ')}
              >
                {choice}
              </button>
            );
          })}
        </div>

        {selected !== null && !passed && (
          <p className="text-center text-xs font-semibold text-rose-600">✗ 오답이에요. 다시 골라보세요.</p>
        )}

        {passed && (
          <div className="space-y-3">
            <div className="rounded-xl bg-sky-50 px-4 py-3 text-center">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-sky-400">한글 뜻</div>
              <p className="text-base font-semibold text-sky-900">{currentWord.koGloss}</p>
            </div>
            <button
              type="button"
              onClick={handleNext}
              className="w-full rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              {rep < REPS_PER_WORD ? `다음 반복 (${rep}/${REPS_PER_WORD} 완료)` : '다음 단어 →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
