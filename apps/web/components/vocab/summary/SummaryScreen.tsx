"use client";

import React, { useMemo, useState, useEffect } from "react";
import StageIntroScreen from "@/components/common/StageIntroScreen";

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

function gridClassForCount(count: number) {
  const dense = count >= 28;
  return {
    list: [
      "grid",
      "grid-cols-1",
      "sm:grid-cols-2",
      "lg:grid-cols-3",
      dense ? "gap-x-5 gap-y-1" : "gap-x-6 gap-y-1.5",
    ].join(" "),
    item: [
      "break-inside-avoid",
      dense ? "text-[11px] sm:text-[12px]" : "text-[12px] sm:text-[13px]",
      dense ? "leading-[1.25]" : "leading-[1.35]",
      "font-bold",
      "text-slate-800",
      "truncate",
    ].join(" "),
  };
}

export default function SummaryScreen(props: AnyProps) {
  const [canSkip, setCanSkip] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [cheatKeyPressed, setCheatKeyPressed] = useState(false);

  const isTeacher = props?.isTeacher === true;
  const previousAccuracy = props?.previousAccuracy ?? 0; // 0-100%
  const isReview = previousAccuracy >= 80; // 복습: 이전에 80% 이상 통과

  // Skip 가능 조건: (Cheat 키 입력) OR (복습이고 학생)
  useEffect(() => {
    setCanSkip(cheatKeyPressed || isReview);
  }, [cheatKeyPressed, isReview]);

  // Cheat 키 감지: z + l
  useEffect(() => {
    let zPressed = false;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "z") zPressed = true;
      if (e.key.toLowerCase() === "l" && zPressed) {
        setCheatKeyPressed(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "z") zPressed = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
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

      // spellingFail only matters for known words
      const isSpellFailed = isKnown && spellPass !== true;
      if (isSpellFailed) failed.push(w);
    }

    const uniqUnknown = uniqByWordId(unknown);
    const uniqFailed = uniqByWordId(failed);

    // ✅ 핵심: Learning 대상은 unknown + spellFailed 합집합
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

  const gridUnknown = gridClassForCount(unknownCount);
  const gridFailed = gridClassForCount(spellFailedCount);

  const nextPayloadStudy = useMemo(
    () => ({
      knowCount,
      unknownCount,
      spellFailedCount,
      unknownList,
      spellFailedList,
      xknowList: learnList, // ✅ FIX: 반드시 이걸로!
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
      xknowList: [], // skip learning
    }),
    [knowCount, unknownCount, spellFailedCount, unknownList, spellFailedList],
  );

  function fireNext(payload: any) {
    if (!onNext) return;
    (onNext as any)(payload); // ✅ 여기선 try/catch로 삼키지 말자 (문제 있으면 바로 드러나게)
  }

  function handleSkipClick() {
    if (!canSkip) return;
    setShowSkipConfirm(true);
  }

  function confirmSkip() {
    setShowSkipConfirm(false);
    fireNext(nextPayloadSkip);
  }

  const hint = `Not Yet: ${unknownCount} • Spell failed: ${spellFailedCount} • Know: ${knowCount}`;

  return (
    <div className="lx-panel-wrap">
      <StageIntroScreen
        badge={`Summary  (Keyboard supported)`}
        title="Summary"
        subtitle="These words will be studied in the Learning stage."
        hint={
          <div>
            <div className="font-extrabold">{hint}</div>
            <div className="mt-1 text-sm font-semibold text-slate-600">
              Continue = go to Learning with (Not Yet + Spell failed).
            </div>
            {!isTeacher && !isReview && (
              <div className="mt-2 text-xs text-slate-500">
                💡 Skip Learning is available after completing with 80%+ accuracy.
              </div>
            )}
          </div>
        }
        primaryLabel="Continue"
        secondaryLabel="Skip Learning"
        secondaryDisabled={!canSkip}
        onPrimary={() => fireNext(nextPayloadStudy)}
        onSecondary={handleSkipClick}
        theme="dark"
      >
        {learnList.length === 0 ? (
          <div className="mt-4 rounded-2xl p-5 font-semibold" style={{ background: "rgba(26,61,48,0.6)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#9FE1CB" }}>
            Nothing to study ✅
            <div className="mt-2 text-sm" style={{ color: "#4da88a" }}>You can skip Learning and go straight to Speed.</div>
          </div>
        ) : (
          <div className="mt-4 space-y-6">
            {/* 2 Days Review */}
            {recentWeakWords.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="font-extrabold" style={{ color: "#FFE3B3" }}>
                    2 Days Review{" "}
                    <span className="ml-2 font-bold" style={{ color: "#FF9800" }}>({recentWeakWords.length})</span>
                  </div>
                  <div className="text-sm font-semibold" style={{ color: "#FF9800" }}>Vulnerable words</div>
                </div>

                <div className="rounded-2xl px-4 py-4" style={{ background: "rgba(255,152,0,0.05)", border: "0.5px solid rgba(255,152,0,0.2)" }}>
                  <ul className={gridClassForCount(recentWeakWords.length).list}>
                    {recentWeakWords.map((w, idx) => (
                      <li
                        key={`${getId(w) || getText(w) || "r"}-${idx}`}
                        className={gridClassForCount(recentWeakWords.length).item.replace("text-slate-800", "")}
                        style={{ color: "#FFB74D" }}
                        title={getText(w) || ""}
                      >
                        {getText(w) || "—"}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}
            {/* Unknown */}
            {unknownCount > 0 ? (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="font-extrabold" style={{ color: "#E1F5EE" }}>
                    Not Yet <span className="ml-2 font-bold" style={{ color: "#4da88a" }}>({unknownCount})</span>
                  </div>
                  <div className="text-sm font-semibold" style={{ color: "#4da88a" }}>From Prescreen</div>
                </div>

                <div className="rounded-2xl px-4 py-4" style={{ background: "rgba(15,40,30,0.6)", border: "0.5px solid rgba(255,255,255,0.1)" }}>
                  <ul className={gridUnknown.list}>
                    {unknownList.map((w, idx) => (
                      <li
                        key={`${getId(w) || getText(w) || "u"}-${idx}`}
                        className={gridUnknown.item.replace("text-slate-800", "")}
                        style={{ color: "#C8EEE3" }}
                        title={getText(w) || ""}
                      >
                        {getText(w) || "—"}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}

            {/* Spell failed */}
            {spellFailedCount > 0 ? (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="font-extrabold" style={{ color: "#E1F5EE" }}>
                    Spell Check Failed{" "}
                    <span className="ml-2 font-bold" style={{ color: "#4da88a" }}>({spellFailedCount})</span>
                  </div>
                  <div className="text-sm font-semibold" style={{ color: "#4da88a" }}>From Spelling</div>
                </div>

                <div className="rounded-2xl px-4 py-4" style={{ background: "rgba(15,40,30,0.6)", border: "0.5px solid rgba(255,255,255,0.1)" }}>
                  <ul className={gridFailed.list}>
                    {spellFailedList.map((w, idx) => (
                      <li
                        key={`${getId(w) || getText(w) || "f"}-${idx}`}
                        className={gridFailed.item.replace("text-slate-800", "")}
                        style={{ color: "#F09595" }}
                        title={getText(w) || ""}
                      >
                        {getText(w) || "—"}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </StageIntroScreen>

      {/* Quiz Option */}
      {onQuiz ? (
        <div className="mt-4 px-4">
          <button
            type="button"
            onClick={() => (onQuiz as any)()}
            className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 py-3 px-4 text-sm font-bold text-white hover:shadow-lg transition-shadow"
          >
            📝 Take Cumulative Quiz
          </button>
          <div className="mt-2 text-xs text-slate-500 text-center">
            Review vulnerable words from past sessions
          </div>
        </div>
      ) : null}

      {/* Skip Confirmation Modal */}
      {showSkipConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-2xl bg-white p-8 max-w-sm space-y-6 shadow-2xl">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">넘어가겠습니까?</h2>
              <p className="text-sm text-slate-600">
                Learning 단계를 건너뛰고 다음 단계로 진행합니다.
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
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
