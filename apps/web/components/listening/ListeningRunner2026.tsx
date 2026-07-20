"use client";

import { useState, useMemo, useRef } from "react";
import type { LBaseItem } from "@/models/listening";
import type { ListeningProgram } from "@/lib/listening/questionTypes";
import { getListeningQTypes, getListeningQType } from "@/lib/listening/questionTypes";
import type { StudyLevel } from "@/components/reading/ReadingRunner2026";

// ── 유틸 ─────────────────────────────────────────────────────
function extractSentences(text: string): string[] {
  return (text.match(/[^.!?]{15,}[.!?]+/g) ?? [])
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function findBestSentence(sentences: string[], clue: string): number {
  const words = clue.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
  let best = -1, bestScore = 0;
  for (let i = 0; i < sentences.length; i++) {
    const score = words.filter((w) => sentences[i].toLowerCase().includes(w)).length;
    if (score > bestScore) { bestScore = score; best = i; }
  }
  return best;
}

type EvidenceChoice = { id: string; text: string; isCorrect: boolean };

// ── Props ─────────────────────────────────────────────────────
type Props = {
  items: LBaseItem[];
  program?: ListeningProgram;
  level?: StudyLevel;
  onFinish?: (result: {
    answers:       Record<string, string>;
    typeAnswers:   Record<string, string>;
    evAnswers:     Record<string, string>;
  }) => void;
};

type SubStep = 'answer' | 'reflect';

// ── Component ─────────────────────────────────────────────────
export default function ListeningRunner2026({
  items,
  program  = 'toefl',
  level    = 'standard',
  onFinish,
}: Props) {
  const [itemIdx,     setItemIdx]     = useState(0);
  const [qIdx,        setQIdx]        = useState(0);
  const [subStep,     setSubStep]     = useState<SubStep>('answer');
  const [answers,     setAnswers]     = useState<Record<string, string>>({});
  const [typeAnswers, setTypeAnswers] = useState<Record<string, string>>({});
  const [evAnswers,   setEvAnswers]   = useState<Record<string, string>>({});
  const [audioPlayed, setAudioPlayed] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const allQTypes = getListeningQTypes(program);

  const currentItem = items[itemIdx];
  const questions   = currentItem?.questions ?? [];
  const currentQ    = questions[qIdx];
  const qid         = currentQ?.id ?? `q-${itemIdx}-${qIdx}`;

  const isLastQ    = itemIdx === items.length - 1 && qIdx === questions.length - 1;
  const hasReflect = !!(currentQ?.type);

  // 레벨별 유형 보기
  const typeChoices = useMemo(() => {
    if (!currentQ) return allQTypes;
    if (level === 'basic') {
      const correct = allQTypes.find((t) => t.value === currentQ.type);
      const others  = allQTypes.filter((t) => t.value !== currentQ.type)
        .sort(() => Math.random() - 0.5).slice(0, 2);
      return correct ? shuffle([correct, ...others]) : allQTypes;
    }
    return allQTypes;
  }, [currentQ, qIdx, itemIdx, level]);

  // 스크립트 근거 보기 (4개)
  const evidenceChoices = useMemo((): EvidenceChoice[] => {
    if (!currentQ?.clue_quote || !currentItem?.transcript) return [];
    const sents   = extractSentences(currentItem.transcript);
    const clueIdx = findBestSentence(sents, currentQ.clue_quote);
    if (clueIdx < 0 || sents.length < 2) return [];

    const distractors = sents
      .filter((_, i) => i !== clueIdx)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    return shuffle([
      { id: 'correct', text: sents[clueIdx], isCorrect: true },
      ...distractors.map((t, i) => ({ id: `d${i}`, text: t, isCorrect: false })),
    ]);
  }, [currentQ, qIdx, itemIdx]);

  // ── 네비게이션 ──────────────────────────────────────────────
  function advance() {
    // answer → reflect (있을 때만)
    if (subStep === 'answer' && hasReflect) {
      setSubStep('reflect');
      return;
    }
    setSubStep('answer');
    setAudioPlayed(false);

    // 같은 아이템 내 다음 질문
    if (qIdx < questions.length - 1) {
      setQIdx((i) => i + 1);
      return;
    }
    // 다음 아이템
    if (itemIdx < items.length - 1) {
      setItemIdx((i) => i + 1);
      setQIdx(0);
      return;
    }
    // 완료
    onFinish?.({ answers, typeAnswers, evAnswers });
  }

  function goBack() {
    if (subStep === 'reflect') { setSubStep('answer'); return; }
    if (qIdx > 0) { setQIdx((i) => i - 1); return; }
    if (itemIdx > 0) {
      const prevItem = items[itemIdx - 1];
      setItemIdx((i) => i - 1);
      setQIdx((prevItem?.questions?.length ?? 1) - 1);
    }
  }

  const canAdvance = (() => {
    if (!currentQ) return false;
    if (subStep === 'answer') return !!answers[qid] && audioPlayed;
    const typeOk = !!typeAnswers[qid];
    const evOk   = evidenceChoices.length === 0 || !!evAnswers[qid];
    return typeOk && evOk;
  })();

  const totalItems = items.length;
  const totalQs    = items.reduce((s, it) => s + (it.questions?.length ?? 0), 0);
  const doneQs     = items.slice(0, itemIdx).reduce((s, it) => s + (it.questions?.length ?? 0), 0) + qIdx + 1;

  if (!currentItem || !currentQ) {
    return (
      <div className="p-8 text-center text-sm text-neutral-400">
        리스닝 문항이 없습니다.
      </div>
    );
  }

  const typeInfo = getListeningQType(program, typeAnswers[qid] ?? '');

  return (
    <div className="flex flex-col gap-0 bg-white rounded-2xl border border-neutral-200 overflow-hidden">

      {/* ── 헤더 ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 border-b border-neutral-100 bg-neutral-50 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-neutral-700">Listening</span>
          <span className="text-xs text-neutral-400">{doneQs} / {totalQs}</span>
          {hasReflect && (
            <span className={[
              'text-[11px] px-2 py-0.5 rounded-full font-medium',
              subStep === 'answer' ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700',
            ].join(' ')}>
              {subStep === 'answer' ? '① 문제 풀기' : '② 풀이 확인'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={goBack}
            disabled={itemIdx === 0 && qIdx === 0 && subStep === 'answer'}
            className="rounded-full border border-neutral-300 px-3 py-1 text-xs text-neutral-600 disabled:opacity-40 hover:bg-neutral-100">
            Back
          </button>
          <button type="button" onClick={advance} disabled={!canAdvance}
            className="rounded-full bg-sky-600 px-4 py-1 text-xs font-medium text-white hover:bg-sky-700 disabled:opacity-40">
            {isLastQ && (subStep === 'reflect' || !hasReflect) ? 'Finish'
              : subStep === 'answer' && hasReflect ? '답 제출 →' : 'Next →'}
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row min-h-[520px]">

        {/* ── 오디오 패널 ───────────────────────────────── */}
        <div className="md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-neutral-100 p-5 flex flex-col gap-4 items-center bg-[#0f1e35]">

          {/* 아이템 이미지 (있을 때) */}
          {(currentItem as any).imageUrl && (
            <img
              src={(currentItem as any).imageUrl}
              alt=""
              className="w-full max-w-[160px] rounded-xl object-cover"
            />
          )}

          {/* 아이템 제목 */}
          <p className="text-xs text-white/60 text-center leading-relaxed">
            {currentItem.title ?? currentItem.taskKind}
          </p>

          {/* 오디오 플레이어 */}
          <div className="w-full space-y-2">
            <audio
              ref={audioRef}
              src={currentItem.audioUrl}
              controls
              onPlay={() => setAudioPlayed(true)}
              className="w-full rounded-lg"
              style={{ colorScheme: 'dark' }}
            />
            {!audioPlayed && (
              <p className="text-[11px] text-amber-300 text-center">
                오디오를 먼저 들어주세요
              </p>
            )}
          </div>

          {/* Study Mode: 풀이 확인 단계에서 스크립트 전체 표시 */}
          {subStep === 'reflect' && currentItem.transcript && (
            <div className="w-full mt-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1">
                Script
              </p>
              <div className="max-h-48 overflow-y-auto rounded-lg bg-white/5 p-3 text-[11px] text-white/80 leading-relaxed">
                {currentItem.transcript}
              </div>
            </div>
          )}
        </div>

        {/* ── 문제 패널 ─────────────────────────────────── */}
        <div className="flex-1 p-6 overflow-y-auto">

          {/* ① 문제 풀기 */}
          {subStep === 'answer' && (
            <div className="space-y-5 text-sm text-neutral-800">
              <p className="font-medium leading-relaxed text-neutral-900">
                {currentQ.stem ?? currentQ.prompt}
              </p>
              <ul className="space-y-2">
                {currentQ.choices.map((choice) => {
                  const checked = answers[qid] === choice.id;
                  return (
                    <li key={choice.id}>
                      <label className={[
                        'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition',
                        checked ? 'border-sky-400 bg-sky-50' : 'border-neutral-200 hover:bg-neutral-50',
                      ].join(' ')}>
                        <input type="radio" name={qid} value={choice.id} checked={checked}
                          onChange={() => setAnswers((p) => ({ ...p, [qid]: choice.id }))}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-sky-600" />
                        <span className="text-[13px] leading-relaxed">{choice.text}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* ② 풀이 확인 */}
          {subStep === 'reflect' && (
            <div className="space-y-6 text-sm text-neutral-800">

              {/* 내 답 요약 */}
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                <p className="text-xs text-neutral-400 mb-0.5">내가 선택한 답</p>
                <p className="text-xs font-medium text-neutral-700">
                  {currentQ.choices.find((c) => c.id === answers[qid])?.text ?? '—'}
                </p>
              </div>

              {/* 유형 고르기 */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">
                  이 문제는 어떤 유형인가요?
                </p>
                {level === 'basic' && (
                  <p className="text-[11px] text-neutral-400">힌트: {typeChoices.length}가지 중 선택</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {typeChoices.map((t) => {
                    const selected = typeAnswers[qid] === t.value;
                    return (
                      <button key={t.value} type="button"
                        onClick={() => setTypeAnswers((p) => ({ ...p, [qid]: t.value }))}
                        className={[
                          'rounded-full border px-3 py-1 text-[12px] font-medium transition',
                          selected
                            ? `${t.color} border-current ring-2 ring-offset-1 ring-current/30`
                            : 'border-neutral-200 text-neutral-500 hover:border-neutral-300',
                        ].join(' ')}>
                        {t.label}
                      </button>
                    );
                  })}
                </div>
                {level === 'basic' && typeAnswers[qid] && (
                  <p className="text-[11px] text-neutral-500 mt-1">
                    {getListeningQType(program, typeAnswers[qid])?.hint}
                  </p>
                )}
              </div>

              {/* 스크립트 근거 고르기 */}
              {evidenceChoices.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">
                    정답의 근거가 된 스크립트 문장을 고르세요
                  </p>
                  <ul className="space-y-2">
                    {evidenceChoices.map((choice) => {
                      const selected = evAnswers[qid] === choice.id;
                      return (
                        <li key={choice.id}>
                          <label className={[
                            'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition',
                            selected ? 'border-amber-400 bg-amber-50' : 'border-neutral-200 hover:bg-neutral-50',
                          ].join(' ')}>
                            <input type="radio" name={`ev-${qid}`} value={choice.id} checked={selected}
                              onChange={() => setEvAnswers((p) => ({ ...p, [qid]: choice.id }))}
                              className="mt-0.5 h-4 w-4 shrink-0 accent-amber-500" />
                            <span className="text-[12px] leading-relaxed text-neutral-700 italic">
                              "{choice.text.length > 180 ? choice.text.slice(0, 177) + '…' : choice.text}"
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
