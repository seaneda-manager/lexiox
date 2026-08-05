"use client";

import React, { useMemo, useState, useEffect } from "react";

type AnyProps = Record<string, any>;

function pickFirst<T>(...candidates: any[]): T | null {
  for (const c of candidates) if (c !== undefined && c !== null) return c as T;
  return null;
}

function getId(w: any): string {
  return String(w?.id ?? w?.wordId ?? w?.wid ?? w?.word_id ?? "").trim();
}

function getText(w: any): string {
  return String(w?.text ?? w?.lemma ?? w?.target ?? w?.word ?? "").trim();
}

function safeList(v: any): any[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return [];
}

function asBool(v: any): boolean | null {
  if (v === true) return true;
  if (v === false) return false;

  if (v === "KNOW" || v === "known" || v === "YES" || v === "Y") return true;
  if (v === "DONT_KNOW" || v === "unknown" || v === "NO" || v === "N") return false;

  if (v === 1) return true;
  if (v === 0) return false;

  return null;
}

function uniqByWordId(list: any[]) {
  const out: any[] = [];
  const seen = new Set<string>();
  for (const w of list) {
    const id = getId(w);
    if (!id) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(w);
  }
  return out;
}

export default function SummaryScreen(props: AnyProps) {
  const [canSkip, setCanSkip] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [cheatKeyPressed, setCheatKeyPressed] = useState(false);

  const isTeacher = props?.isTeacher === true;
  const previousAccuracy = props?.previousAccuracy ?? 0;
  const isReview = previousAccuracy >= 80;

  useEffect(() => {
    setCanSkip(cheatKeyPressed || isReview);
  }, [cheatKeyPressed, isReview]);

  useEffect(() => {
    const keySequence: string[] = [];
    const targetSequence = ["6", "6", "5", "3"];

    const onKeyDown = (e: KeyboardEvent) => {
      if (!["6", "5", "3"].includes(e.key)) return;

      keySequence.push(e.key);
      if (keySequence.length > 4) keySequence.shift();

      if (JSON.stringify(keySequence) === JSON.stringify(targetSequence)) {
        setCheatKeyPressed(true);
        keySequence.length = 0;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const onNext =
    typeof props?.onNext === "function"
      ? props.onNext
      : typeof props?.onContinue === "function"
        ? props.onContinue
        : typeof props?.onDone === "function"
          ? props.onDone
          : typeof props?.onFinish === "function"
            ? props.onFinish
            : null;

  const onQuiz = typeof props?.onQuiz === "function" ? props.onQuiz : null;

  const words = useMemo(() => {
    const list =
      pickFirst<any[]>(
        props.words,
        props.items,
        props.allWords,
        props.sessionWords,
        props.results?.words,
        props.result?.words,
      ) ?? [];
    return safeList(list);
  }, [props.words, props.items, props.allWords, props.sessionWords, props.results, props.result]);

  const prescreenMap =
    pickFirst<Record<string, any>>(
      props.prescreenChoiceMap,
      props.prescreenMap,
      props.choiceMap,
      props.knowMap,
      props.knownMap,
      props.prescreenChoices,
      props.prescreen,
    ) ?? null;

  const spellPassMap =
    pickFirst<Record<string, any>>(
      props.spellPassMap,
      props.spellingPassMap,
      props.spellMap,
      props.spellingMap,
      props.spellcheckMap,
      props.spellCheckMap,
    ) ?? null;

  const recentWeakWords = useMemo(() => {
    const list = props.recentWeakWords ?? [];
    return safeList(list);
  }, [props.recentWeakWords]);

  const { unknownList, spellFailedList, knowCount, unknownCount, spellFailedCount, learnList } = useMemo(() => {
    const unknown: any[] = [];
    const failed: any[] = [];
    let kCount = 0;

    for (const w of words) {
      const id = getId(w);
      if (!id) continue;

      const prescreenKnown = asBool(prescreenMap ? prescreenMap[id] : null);
      const spellPass = asBool(spellPassMap ? spellPassMap[id] : null);

      const isKnown = prescreenKnown === true;
      const isUnknown = prescreenKnown === false;

      if (isKnown) kCount++;
      if (isUnknown) unknown.push(w);

      const isSpellFailed = isKnown && spellPass !== true;
      if (isSpellFailed) failed.push(w);
    }

    const uniqUnknown = uniqByWordId(unknown);
    const uniqFailed = uniqByWordId(failed);
    const learn = uniqByWordId([...uniqUnknown, ...uniqFailed]);

    return {
      unknownList: uniqUnknown,
      spellFailedList: uniqFailed,
      knowCount: kCount,
      unknownCount: uniqUnknown.length,
      spellFailedCount: uniqFailed.length,
      learnList: learn,
    };
  }, [words, prescreenMap, spellPassMap]);

  const nextPayloadStudy = useMemo(
    () => ({
      knowCount,
      unknownCount,
      spellFailedCount,
      unknownList,
      spellFailedList,
      xknowList: learnList,
    }),
    [knowCount, unknownCount, spellFailedCount, unknownList, spellFailedList, learnList],
  );

  const nextPayloadSkip = useMemo(
    () => ({
      knowCount,
      unknownCount,
      spellFailedCount,
      unknownList,
      spellFailedList,
      xknowList: [],
    }),
    [knowCount, unknownCount, spellFailedCount, unknownList, spellFailedList],
  );

  function fireNext(payload: any) {
    if (!onNext) return;
    (onNext as any)(payload);
  }

  function handleSkipClick() {
    if (!canSkip) return;
    setShowSkipConfirm(true);
  }

  function confirmSkip() {
    setShowSkipConfirm(false);
    fireNext(nextPayloadSkip);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{
          width: "min(90vw, 800px)",
          maxHeight: "85vh",
          boxSizing: "border-box",
        }}
      >
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-teal-500 to-cyan-500 px-8 py-6 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-3xl font-black text-white">📊 학습 요약</h1>
            <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <span className="text-lg">✅</span>
              <span className="text-xs font-bold text-white">저장됨</span>
            </div>
          </div>
          <p className="text-white/90 text-sm">PreScreen & Spelling 단계를 완료했습니다. 언제든 이어서 학습할 수 있습니다.</p>
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 overflow-hidden px-8 py-5 space-y-5 flex flex-col">
          {/* 메트릭 카드 (3개) */}
          <div className="grid grid-cols-3 gap-3">
            {/* 학습 대상 */}
            <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 p-4 text-center space-y-0.5 border border-blue-200">
              <div className="text-2xl font-black text-blue-600">{learnList.length}</div>
              <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">학습 대상</div>
            </div>

            {/* 스펠링 실패 */}
            <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-red-100 p-4 text-center space-y-0.5 border border-rose-200">
              <div className="text-2xl font-black text-rose-600">{spellFailedCount}</div>
              <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">실패</div>
            </div>

            {/* 알고 있던 단어 */}
            <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-100 p-4 text-center space-y-0.5 border border-emerald-200">
              <div className="text-2xl font-black text-emerald-600">{knowCount}</div>
              <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">패스</div>
            </div>
          </div>

          {/* 학습 예정 단어 */}
          {learnList.length > 0 ? (
            <div className="space-y-2 flex-1 overflow-hidden flex flex-col min-h-0">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex-shrink-0">
                📚 학습 예정 단어 ({learnList.length})
              </h2>
              <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 p-5 border border-slate-200 flex-1 overflow-hidden relative flex flex-col">
                {/* 스크롤 컨테이너 */}
                <div className="word-list-container overflow-y-auto pr-1 flex-1" style={{ maxHeight: "220px" }}>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    {learnList.map((w, idx) => (
                      <div
                        key={`${getId(w) || getText(w) || "l"}-${idx}`}
                        className="px-3 py-1.5 bg-white rounded-lg text-xs font-semibold text-slate-700 shadow-sm hover:shadow-md transition-shadow border border-slate-200 truncate"
                        title={getText(w) || ""}
                      >
                        {getText(w) || "—"}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 페이드 아웃 효과 */}
                {learnList.length > 12 && (
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-100 to-transparent pointer-events-none" />
                )}
              </div>

              {/* 스크롤바 스타일 */}
              <style jsx>{`
                .word-list-container::-webkit-scrollbar {
                  width: 4px;
                }
                .word-list-container::-webkit-scrollbar-thumb {
                  background-color: #cbd5e1;
                  border-radius: 4px;
                }
                .word-list-container::-webkit-scrollbar-thumb:hover {
                  background-color: #94a3b8;
                }
              `}</style>
            </div>
          ) : (
            <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-100 p-6 border border-emerald-300 text-center space-y-2">
              <div className="text-2xl">✅</div>
              <div className="font-bold text-emerald-700">완벽하게 완료했습니다!</div>
              <div className="text-sm text-emerald-600">Learning 단계 없이 바로 다음으로 진행할 수 있습니다.</div>
            </div>
          )}

          {/* 누적 퀴즈 옵션 */}
          {onQuiz && (
            <div className="rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 p-5 border border-purple-200 space-y-3">
              <div className="text-sm font-bold text-purple-700 uppercase tracking-wider">📝 누적 퀴즈</div>
              <p className="text-xs text-slate-600">지난 학습 세션의 약점 단어들을 복습하세요.</p>
              <button
                onClick={() => (onQuiz as any)()}
                className="w-full py-2 px-4 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-sm hover:shadow-lg transition-shadow"
              >
                퀴즈 풀기
              </button>
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="bg-slate-50 border-t border-slate-200 px-8 py-4 flex gap-3 justify-end flex-shrink-0">
          <button
            onClick={handleSkipClick}
            disabled={!canSkip}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              canSkip
                ? "bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-50"
                : "bg-slate-100 border-2 border-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            Skip Learning (2)
          </button>
          <button
            onClick={() => fireNext(nextPayloadStudy)}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold hover:shadow-lg transition-all active:scale-95"
          >
            학습 시작 ➔ (1)
          </button>
        </div>
      </div>

      {/* Skip 확인 모달 */}
      {showSkipConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="rounded-2xl bg-white p-8 max-w-sm space-y-6 shadow-2xl">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Learning을 건너뛸까요?</h2>
              <p className="text-sm text-slate-600">
                학습 단계를 건너뛰고 다음 단계로 진행합니다.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSkipConfirm(false)}
                className="flex-1 rounded-lg border border-slate-300 py-2 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                onClick={confirmSkip}
                className="flex-1 rounded-lg bg-orange-500 py-2 px-4 text-sm font-semibold text-white hover:bg-orange-600"
              >
                건너뛰기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
