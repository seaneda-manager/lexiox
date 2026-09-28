'use client';

import { useEffect, useMemo, useState } from 'react';
import type { MiddleDrillVocabItem } from '@/models/middle-naesin/drill';
import SaveResultButton from '@/components/middle-naesin/drill/SaveResultButton';
import type { MiddleNaesinDrillDetailItem, MiddleNaesinDrillType } from '@/lib/middle-naesin/drill-results';

type Props = {
  vocab: MiddleDrillVocabItem[];
  unitId?: string;
};

type TestMode = 'en_en' | 'en_to_ko' | 'ko_to_en';

const MODE_DRILL_TYPE: Record<TestMode, MiddleNaesinDrillType> = {
  en_en: 'vocab_test_en_en',
  en_to_ko: 'vocab_test_en_to_ko',
  ko_to_en: 'vocab_test_ko_to_en',
};

type TextItemState = {
  input: string;
  checked: boolean;
  revealed: boolean;
};

type ChoiceItemState = {
  selected: number | null;
};

const MODE_LABEL: Record<TestMode, string> = {
  en_en: '영영 시험',
  en_to_ko: '영한 시험',
  ko_to_en: '한영 시험',
};

function normalizeEn(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function normalizeKo(s: string): string {
  return s.replace(/\s+/g, '').trim();
}

function isKoAnswerCorrect(input: string, gloss: string): boolean {
  const norm = normalizeKo(input);
  if (!norm) return false;
  const alts = gloss
    .split(/[,/]/)
    .map((s) => normalizeKo(s))
    .filter(Boolean);
  return alts.some((alt) => alt === norm || alt.includes(norm) || norm.includes(alt));
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default function VocabTestStage({ vocab, unitId }: Props) {
  const [mode, setMode] = useState<TestMode>('en_en');

  // 영한/한영: 한글 뜻이 있는 단어 전부. 영영: 영어 정의(vocab_en_en)가 있는 단어만
  // (영영 문제는 보기를 다른 단어의 영어 정의로 만들어야 하므로 최소 2개 필요)
  const koPool = useMemo(() => vocab.filter((v) => !!v.koGloss), [vocab]);
  const enEnPool = useMemo(() => vocab.filter((v) => v.kind === 'en_en' && !!v.definition), [vocab]);
  const pool = mode === 'en_en' ? enEnPool : koPool;

  const [order, setOrder] = useState<number[]>(() => shuffle(pool.map((_, i) => i)));
  const [textStates, setTextStates] = useState<Record<number, TextItemState>>({});
  const [choiceStates, setChoiceStates] = useState<Record<number, ChoiceItemState>>({});

  useEffect(() => {
    setOrder(shuffle(pool.map((_, i) => i)));
    setTextStates({});
    setChoiceStates({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const reset = () => {
    setOrder(shuffle(pool.map((_, i) => i)));
    setTextStates({});
    setChoiceStates({});
  };

  const updateText = (idx: number, patch: Partial<TextItemState>) =>
    setTextStates((prev) => ({
      ...prev,
      [idx]: { input: '', checked: false, revealed: false, ...prev[idx], ...patch },
    }));

  const selectChoice = (idx: number, choiceIdx: number) =>
    setChoiceStates((prev) => ({ ...prev, [idx]: { selected: choiceIdx } }));

  // 영영 모드 보기 — order/pool이 바뀔 때만 재계산해서 선택 중 보기가 흔들리지 않게 함
  const enEnRounds = useMemo(() => {
    if (mode !== 'en_en') return [];
    return order
      .map((i) => {
        const item = enEnPool[i];
        if (!item) return null;
        const distractorPool = enEnPool.filter((v) => v.index !== item.index).map((v) => v.definition);
        const choices = shuffle([item.definition, ...shuffle(distractorPool).slice(0, 3)]);
        return { item, choices };
      })
      .filter((r): r is { item: MiddleDrillVocabItem; choices: string[] } => r !== null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, order, enEnPool]);

  const items = order.map((i) => pool[i]).filter(Boolean);

  const checkedCount =
    mode === 'en_en'
      ? Object.keys(choiceStates).length
      : order.filter((i) => textStates[i]?.checked).length;

  const correctCount =
    mode === 'en_en'
      ? enEnRounds.filter((r, idx) => {
          const sel = choiceStates[idx]?.selected;
          return sel !== undefined && sel !== null && r.choices[sel] === r.item.definition;
        }).length
      : order.filter((i) => {
          const st = textStates[i];
          if (!st?.checked) return false;
          const item = pool[i];
          return mode === 'en_to_ko'
            ? isKoAnswerCorrect(st.input, item.koGloss!)
            : normalizeEn(st.input) === normalizeEn(item.word);
        }).length;

  const detail: MiddleNaesinDrillDetailItem[] =
    mode === 'en_en'
      ? enEnRounds.map((r, idx) => {
          const sel = choiceStates[idx]?.selected;
          const yourAnswer = sel !== undefined && sel !== null ? r.choices[sel] : '';
          return {
            prompt: r.item.word,
            yourAnswer,
            correctAnswer: r.item.definition,
            isCorrect: yourAnswer === r.item.definition,
          };
        })
      : order
          .filter((i) => textStates[i]?.checked)
          .map((i) => {
            const st = textStates[i]!;
            const item = pool[i];
            const isCorrect =
              mode === 'en_to_ko'
                ? isKoAnswerCorrect(st.input, item.koGloss!)
                : normalizeEn(st.input) === normalizeEn(item.word);
            return {
              prompt: mode === 'en_to_ko' ? item.word : item.koGloss!,
              yourAnswer: st.input,
              correctAnswer: mode === 'en_to_ko' ? item.koGloss! : item.word,
              isCorrect,
            };
          });

  if (pool.length === 0) {
    return (
      <div className="space-y-4">
        <ModeToggle mode={mode} setMode={setMode} />
        <div className="rounded-2xl border bg-white p-8 text-center text-sm text-neutral-400">
          {mode === 'en_en'
            ? '영영 시험용 영어 정의가 있는 단어가 없습니다. "영영 단어" 콘텐츠를 추가해주세요.'
            : '시험용 한글 뜻이 있는 단어가 없습니다. "단어 (한글 뜻)" 콘텐츠를 추가하거나, 영영 단어 입력 시 괄호 안에 "설명 / 한글 뜻" 형식으로 뜻을 넣어주세요.'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white px-5 py-3">
        <ModeToggle mode={mode} setMode={setMode} />
        <div className="flex items-center gap-3">
          <span className="text-sm text-neutral-500">
            {checkedCount}/{items.length}개 확인 · {correctCount}개 정답
          </span>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50"
          >
            다시 풀기
          </button>
          {unitId && (
            <SaveResultButton
              unitId={unitId}
              drillType={MODE_DRILL_TYPE[mode]}
              score={correctCount}
              total={checkedCount}
              detail={detail}
            />
          )}
        </div>
      </div>

      {mode === 'en_en'
        ? enEnRounds.map((round, i) => {
            const st = choiceStates[i];
            const isChecked = st !== undefined;
            const isCorrect = isChecked && st.selected !== null && round.choices[st.selected] === round.item.definition;

            return (
              <div
                key={i}
                className={[
                  'rounded-2xl border bg-white p-5 space-y-3 transition',
                  isChecked && isCorrect ? 'border-emerald-200' : isChecked ? 'border-amber-100' : '',
                ].join(' ')}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-500">
                    {i + 1}
                  </span>
                  <p className="text-lg font-semibold text-neutral-900">{round.item.word}</p>
                </div>

                <div className="space-y-2">
                  {round.choices.map((choice, cIdx) => {
                    const isSelected = st?.selected === cIdx;
                    const isCorrectChoice = choice === round.item.definition;
                    const showState = isChecked && (isSelected || isCorrectChoice);

                    return (
                      <button
                        key={cIdx}
                        type="button"
                        onClick={() => selectChoice(i, cIdx)}
                        className={[
                          'block w-full rounded-xl border px-4 py-2 text-left text-sm transition',
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

                {isChecked && (
                  <span className={['text-xs font-semibold', isCorrect ? 'text-emerald-600' : 'text-amber-600'].join(' ')}>
                    {isCorrect ? '✓ 정답' : '△ 오답'}
                  </span>
                )}
              </div>
            );
          })
        : items.map((item, i) => {
            const idx = order[i];
            const st = textStates[idx] ?? { input: '', checked: false, revealed: false };
            const prompt = mode === 'en_to_ko' ? item.word : item.koGloss!;
            const answer = mode === 'en_to_ko' ? item.koGloss! : item.word;
            const isCorrect =
              st.checked &&
              (mode === 'en_to_ko'
                ? isKoAnswerCorrect(st.input, item.koGloss!)
                : normalizeEn(st.input) === normalizeEn(item.word));

            return (
              <div
                key={idx}
                className={[
                  'rounded-2xl border bg-white p-5 space-y-3 transition',
                  st.checked && isCorrect ? 'border-emerald-200' : st.checked ? 'border-amber-100' : '',
                ].join(' ')}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-500">
                    {i + 1}
                  </span>
                  <p className="text-lg font-semibold text-neutral-900">{prompt}</p>
                </div>

                <input
                  value={st.input}
                  onChange={(e) => updateText(idx, { input: e.target.value, checked: false })}
                  placeholder={mode === 'en_to_ko' ? '한글 뜻을 입력하세요...' : '영어 단어를 입력하세요...'}
                  disabled={st.revealed}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200 disabled:bg-neutral-50 font-mono"
                />

                <div className="flex flex-wrap items-center gap-2">
                  {!st.revealed && (
                    <button
                      type="button"
                      onClick={() => updateText(idx, { checked: true })}
                      disabled={!st.input.trim()}
                      className="rounded-xl bg-neutral-800 px-4 py-1.5 text-xs text-white disabled:opacity-40"
                    >
                      확인
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => updateText(idx, { revealed: true, checked: true })}
                    className="rounded-xl border px-4 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50"
                  >
                    정답 보기
                  </button>
                  {st.checked && (
                    <span className={['text-xs font-semibold', isCorrect ? 'text-emerald-600' : 'text-amber-600'].join(' ')}>
                      {isCorrect ? '✓ 정답' : '△ 오답'}
                    </span>
                  )}
                </div>

                {(st.revealed || (st.checked && !isCorrect)) && (
                  <div className="rounded-xl bg-sky-50 px-4 py-3">
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-sky-400">정답</div>
                    <p className="text-sm leading-relaxed text-sky-800">{answer}</p>
                  </div>
                )}
              </div>
            );
          })}
    </div>
  );
}

function ModeToggle({ mode, setMode }: { mode: TestMode; setMode: (m: TestMode) => void }) {
  return (
    <div className="flex gap-2">
      {(Object.keys(MODE_LABEL) as TestMode[]).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setMode(m)}
          className={[
            'rounded-xl px-4 py-2 text-sm font-medium transition',
            mode === m ? 'bg-neutral-900 text-white' : 'border text-neutral-500 hover:bg-neutral-50',
          ].join(' ')}
        >
          {MODE_LABEL[m]}
        </button>
      ))}
    </div>
  );
}
