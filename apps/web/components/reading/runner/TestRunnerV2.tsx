"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RPassage, RQuestion } from "@/models/reading";
import PassagePane from "@/components/reading/PassagePane";
import SkimGate from "@/components/reading/SkimGate";
import {
  startReadingSession,
  submitReadingAnswer,
  finishReadingSession,
} from "@/actions/reading";
import {
  startNaesinReadingSession,
  submitNaesinReadingAnswer,
  finishNaesinReadingSession,
} from "@/actions/naesinReading";
import { getRunnerProfile, type ReadingRunnerProfile } from "./runnerProfiles";

type Props = {
  passage: RPassage;
  sessionId?: string;
  setId?: string;
  profileId?: string;
  initialPicked?: Record<string, string | string[]>;
  mode?: "study" | "exam" | "review" | "test";
  gateFirst?: boolean;
  backend?: "legacy" | "naesin";
  finishRedirectPath?: string | null;
  onFinishAction?: (sessionId: string | number) => void;
};

function viewMeta(q?: RQuestion) {
  const summary = (q?.meta?.summary ?? {}) as {
    selectionCount?: number;
  };
  return { summary };
}

function getExplain(q?: RQuestion): { explanation?: string; clue_quote?: string } {
  const m = (q?.meta ?? {}) as any;
  return {
    explanation: typeof m?.explanation === "string" ? m.explanation : undefined,
    clue_quote: typeof m?.clue_quote === "string" ? m.clue_quote : undefined,
  };
}

function asSelArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === "string" && v) return [v];
  return [];
}

function getActionError(res: unknown, fallback: string): string {
  if (
    res &&
    typeof res === "object" &&
    "error" in res &&
    typeof (res as { error?: unknown }).error === "string"
  ) {
    return (res as { error: string }).error;
  }
  return fallback;
}

export default function TestRunnerV2({
  passage,
  sessionId,
  setId,
  profileId,
  initialPicked,
  mode,
  gateFirst,
  backend = "legacy",
  finishRedirectPath,
  onFinishAction,
}: Props) {
  const profile: ReadingRunnerProfile = useMemo(() => {
    try {
      if (profileId) return getRunnerProfile(profileId);
      if (mode === "review") return getRunnerProfile("toefl_review");
      return getRunnerProfile("toefl_test");
    } catch {
      return getRunnerProfile("toefl_test");
    }
  }, [profileId, mode]);

  const needsSession = profile.enableSubmit !== false;

  const [activeSessionId, setActiveSessionId] = useState<string | null>(sessionId ?? null);
  const [isStarting, setIsStarting] = useState(needsSession && !sessionId);
  const [startError, setStartError] = useState<string | null>(null);

  const didStartRef = useRef(false);

  useEffect(() => {
    if (sessionId) {
      setActiveSessionId(sessionId);
      setIsStarting(false);
      setStartError(null);
      return;
    }

    if (!needsSession) {
      setIsStarting(false);
      setStartError(null);
      return;
    }

    if (didStartRef.current) return;
    didStartRef.current = true;

    let active = true;

    (async () => {
      try {
        setIsStarting(true);
        setStartError(null);

        const res =
          backend === "naesin"
            ? await startNaesinReadingSession({
              setId,
              mode: mode ?? "test",
              profileId,
            })
            : await startReadingSession({
              setId,
              passageId: String(passage.id),
              mode: mode ?? "test",
              profileId,
            });

        if (
          !res ||
          res.ok !== true ||
          !("sessionId" in res) ||
          !res.sessionId ||
          String(res.sessionId).startsWith("local-")
        ) {
          throw new Error(getActionError(res, "Failed to create DB reading session"));
        }

        if (!active) return;
        setActiveSessionId(String(res.sessionId));
      } catch (e: any) {
        console.error("[TestRunnerV2] failed to start reading session", e);
        if (!active) return;
        setActiveSessionId(null);
        setStartError(String(e?.message || e || "Failed to create reading session"));
      } finally {
        if (active) setIsStarting(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [backend, sessionId, needsSession, setId, passage.id, mode, profileId]);

  const effectiveGateFirst = typeof gateFirst === "boolean" ? gateFirst : profile.gateFirst;
  const [gateDone, setGateDone] = useState(!effectiveGateFirst);

  const contentStr = useMemo(
    () => (Array.isArray(passage.paragraphs) ? passage.paragraphs.join("\n\n") : ""),
    [passage.paragraphs],
  );

  if (isStarting) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
        Starting reading session...
      </div>
    );
  }

  if (startError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to start reading session.
        <div className="mt-2 text-xs text-red-600">{startError}</div>
      </div>
    );
  }

  if (needsSession && !activeSessionId) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Reading session is missing.
      </div>
    );
  }

  if (!gateDone) {
    return <SkimGate content={contentStr} onUnlockAction={() => setGateDone(true)} />;
  }

  return (
    <RunnerCore
      backend={backend}
      profile={profile}
      passage={passage}
      sessionId={activeSessionId}
      onFinishAction={onFinishAction}
      contentStr={contentStr}
      initialPicked={initialPicked}
      finishRedirectPath={finishRedirectPath}
    />
  );
}

function RunnerCore({
  backend,
  profile,
  passage,
  sessionId,
  onFinishAction,
  contentStr,
  initialPicked,
  finishRedirectPath,
}: {
  backend: "legacy" | "naesin";
  profile: ReadingRunnerProfile;
  passage: RPassage;
  sessionId: string | null;
  onFinishAction?: (sessionId: string | number) => void;
  contentStr: string;
  initialPicked?: Record<string, string | string[]>;
  finishRedirectPath?: string | null;
}) {
  const qs = (passage?.questions ?? []) as RQuestion[];
  const total = qs.length;

  const [idx, setIdx] = useState(0);
  const clamp = useCallback(
    (i: number) => Math.min(Math.max(0, i), Math.max(0, total - 1)),
    [total],
  );

  const [showText, setShowText] = useState(false);
  const [picked, setPicked] = useState<Record<string, string | string[]>>(initialPicked ?? {});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);

  const q = total > 0 ? qs[clamp(idx)] : undefined;
  const qKey = q ? String(q.id) : "";
  const isSummary = q?.type === "summary";
  const selectionCount = Math.max(1, Number(viewMeta(q).summary.selectionCount ?? 2) || 2);

  const selArr = useMemo(() => {
    if (!qKey) return [];
    return asSelArray(picked[qKey]);
  }, [picked, qKey]);

  const isReadOnly = profile.enableSubmit === false;
  const isLocked = !!(qKey && checked[qKey] && profile.lockAfterCheck);

  const toggle = useCallback(
    (qid: string, cid: string) => {
      if (isReadOnly || isLocked) return;

      setPicked((s) => {
        const cur = s[qid];
        if (isSummary) {
          const arr = Array.isArray(cur) ? [...cur] : [];
          const i = arr.indexOf(cid);
          if (i >= 0) {
            arr.splice(i, 1);
            return { ...s, [qid]: arr };
          }
          if (arr.length >= selectionCount) return s;
          return { ...s, [qid]: [...arr, cid] };
        }
        return s[qid] === cid ? s : { ...s, [qid]: cid };
      });

      if (profile.revealAfterCheck) {
        setChecked((m) => ({ ...m, [qid]: false }));
      }

      setActionError(null);
    },
    [isReadOnly, isLocked, isSummary, selectionCount, profile.revealAfterCheck],
  );

  const lastTickRef = useRef<number>(0);
  const tick = useCallback(() => {
    const now = Date.now();
    if (lastTickRef.current === 0) {
      lastTickRef.current = now;
      return 0;
    }
    const elapsed = now - lastTickRef.current;
    lastTickRef.current = now;
    return Math.max(0, elapsed);
  }, []);

  const submitOne = useCallback(async () => {
    if (!profile.enableSubmit) return;
    if (!qKey) return;
    if (!sessionId) throw new Error("Missing sessionId");

    if (isSummary) {
      if (selArr.length !== selectionCount) return;

      const res =
        backend === "naesin"
          ? await submitNaesinReadingAnswer({
            sessionId,
            questionId: qKey,
            choiceId: selArr.join("|"),
            elapsedMs: tick(),
          })
          : await submitReadingAnswer({
            sessionId,
            questionId: qKey,
            choiceId: selArr.join("|"),
            elapsedMs: tick(),
          });

      if (res?.ok !== true) {
        throw new Error(getActionError(res, "Failed to save answer"));
      }
      return;
    }

    const cid = typeof picked[qKey] === "string" ? (picked[qKey] as string) : "";
    if (!cid) return;

    const res =
      backend === "naesin"
        ? await submitNaesinReadingAnswer({
          sessionId,
          questionId: qKey,
          choiceId: cid,
          elapsedMs: tick(),
        })
        : await submitReadingAnswer({
          sessionId,
          questionId: qKey,
          choiceId: cid,
          elapsedMs: tick(),
        });

    if (res?.ok !== true) {
      throw new Error(getActionError(res, "Failed to save answer"));
    }
  }, [backend, profile.enableSubmit, qKey, isSummary, selArr, selectionCount, sessionId, picked, tick]);

  const checkNow = useCallback(async () => {
    if (!profile.revealAfterCheck) return;
    if (!qKey) return;

    if (isSummary) {
      if (selArr.length !== selectionCount) {
        alert(`Please select exactly ${selectionCount} choices.`);
        return;
      }
    } else {
      const cid = typeof picked[qKey] === "string" ? (picked[qKey] as string) : "";
      if (!cid) {
        alert("Please select an answer first.");
        return;
      }
    }

    try {
      setActionError(null);
      await submitOne();
      setChecked((m) => ({ ...m, [qKey]: true }));
    } catch (e: any) {
      console.error("[TestRunnerV2] checkNow failed", e);
      setActionError(String(e?.message || e || "Failed to save answer"));
    }
  }, [profile.revealAfterCheck, qKey, isSummary, selArr, selectionCount, picked, submitOne]);

  const canProceed = useMemo(() => {
    if (!qKey) return false;
    const hasAnswer = isSummary
      ? selArr.length === selectionCount
      : typeof picked[qKey] === "string" && !!picked[qKey];
    if (!hasAnswer) return false;
    if (profile.revealAfterCheck) return !!checked[qKey];
    return true;
  }, [qKey, isSummary, selectionCount, selArr, picked, profile.revealAfterCheck, checked]);

  const isLast = clamp(idx) >= total - 1;

  const doFinish = useCallback(async () => {
    try {
      setActionError(null);

      if (profile.enableSubmit) {
        if (!sessionId) throw new Error("Missing sessionId");

        const res =
          backend === "naesin"
            ? await finishNaesinReadingSession({ sessionId })
            : await finishReadingSession({ sessionId });

        if (res?.ok !== true) {
          throw new Error(getActionError(res, "Failed to finish reading session"));
        }
      }

      if (onFinishAction) {
        onFinishAction(sessionId ?? "");
        return;
      }

      if (typeof window !== "undefined") {
        if (typeof finishRedirectPath === "string" && finishRedirectPath.length > 0) {
          const sid = encodeURIComponent(sessionId ?? "");
          window.location.href = finishRedirectPath.replace(":sessionId", sid);
          return;
        }

        const sid = encodeURIComponent(sessionId ?? "");
        const pid = encodeURIComponent(profile.id);
        window.location.href = `/reading/review/${sid}?profileId=${pid}&view=runner`;
      }
    } catch (e: any) {
      console.error("[TestRunnerV2] doFinish failed", e);
      setActionError(String(e?.message || e || "Failed to finish reading session"));
    } finally {
      setIsFinishing(false);
    }
  }, [backend, profile.enableSubmit, profile.id, sessionId, onFinishAction, finishRedirectPath]);

  const next = async () => {
    if (!qKey) return;

    if (!profile.revealAfterCheck) {
      const hasAnswer = isSummary
        ? selArr.length === selectionCount
        : typeof picked[qKey] === "string" && !!picked[qKey];

      if (!hasAnswer && profile.enableSubmit) {
        alert(isSummary ? `Please select exactly ${selectionCount} choices.` : "Please select an answer.");
        return;
      }

      if (hasAnswer) {
        try {
          setActionError(null);
          await submitOne();
        } catch (e: any) {
          console.error("[TestRunnerV2] next submit failed", e);
          setActionError(String(e?.message || e || "Failed to save answer"));
          return;
        }
      }
    } else {
      if (!canProceed) return;
    }

    setShowText(false);

    if (!isLast) {
      setIdx((i) => clamp(i + 1));
      return;
    }

    setIsFinishing(true);
    await doFinish();
  };

  const goPrev = () => {
    if (!profile.allowPrev) return;
    setShowText(false);
    setIdx((i) => clamp(i - 1));
  };

  if (total === 0) {
    return (
      <div className="rounded-xl border p-4 text-sm">
        No questions available. (passage: <b>{passage?.title ?? "untitled"}</b>)
      </div>
    );
  }

  if (isSummary && showText) {
    const looksLikeHTML = /<[a-z][\s\S]*>/i.test(contentStr);
    return (
      <div className="p-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm text-neutral-500">{profile.label} · Full Text</div>
          <button type="button" className="rounded border px-3 py-1" onClick={() => setShowText(false)}>
            View Questions
          </button>
        </div>

        <div className="mx-auto max-w-4xl rounded-2xl border p-5">
          <h1 className="mb-3 text-2xl font-bold">{passage.title}</h1>
          {looksLikeHTML ? (
            <div dangerouslySetInnerHTML={{ __html: contentStr }} />
          ) : (
            <pre className="whitespace-pre-wrap text-[16px] leading-8">{contentStr}</pre>
          )}
        </div>
      </div>
    );
  }

  const isToeflLayout = profile.layout === "toefl";
  const remaining = isSummary ? selectionCount - selArr.length : 0;
  const { explanation, clue_quote } = getExplain(q);

  const QuestionPane = (
    <div style={{ minWidth: 0 }}>
      <div className="flex items-center justify-between text-sm text-neutral-500">
        <div>
          Question {q?.number ?? clamp(idx) + 1} / {total}{" "}
          <span className="ml-2 rounded bg-emerald-600/15 px-2 py-0.5 text-[11px] text-emerald-300">
            {profile.label}
          </span>
        </div>
        {isSummary && (
          <button type="button" className="rounded border px-3 py-1" onClick={() => setShowText(true)}>
            View Text
          </button>
        )}
      </div>

      <h2 className="mt-2 text-lg font-semibold">{q?.stem ?? ""}</h2>
      {isSummary ? (
        <div className="mt-1 text-xs text-neutral-500">
          Select <b>{selectionCount}</b> choices. (Remaining: {remaining})
        </div>
      ) : null}

      <ul className="mt-3 space-y-2">
        {(q?.choices ?? []).map((c: any, i: number) => {
          const cid = String(c.id);
          const pickedNow = isSummary ? selArr.includes(cid) : picked[qKey] === cid;
          const correctFlag = typeof c?.isCorrect === "boolean" ? !!c.isCorrect : null;

          const ring =
            profile.showCorrectness && pickedNow && correctFlag !== null
              ? correctFlag
                ? "ring-2 ring-emerald-400/60"
                : "ring-2 ring-red-400/60"
              : pickedNow
                ? "ring-2 ring-emerald-400/40"
                : "";

          return (
            <li key={cid}>
              <label
                className={[
                  "flex cursor-pointer items-start gap-2 rounded-xl border p-3",
                  ring,
                  isLocked ? "opacity-90" : "hover:bg-white/5",
                ].join(" ")}
              >
                <input
                  type={isSummary ? "checkbox" : "radio"}
                  name={`q-${qKey || "none"}`}
                  className="mt-1"
                  checked={pickedNow}
                  disabled={isReadOnly || isLocked}
                  onChange={() => qKey && toggle(qKey, cid)}
                  aria-label={`Choice ${i + 1}`}
                />
                <span className="leading-7">
                  {c.text}
                  {profile.showCorrectness && correctFlag !== null ? (
                    <span className="ml-2 text-xs text-neutral-400">
                      {correctFlag ? "(correct)" : "(wrong)"}
                    </span>
                  ) : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      {profile.revealAfterCheck ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            className="rounded border px-4 py-2"
            onClick={checkNow}
            disabled={!qKey || !!checked[qKey] || isReadOnly}
          >
            {checked[qKey] ? "Checked" : "Check"}
          </button>
        </div>
      ) : null}

      {actionError ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}

      {profile.showExplanation ? (
        <div className="mt-4 rounded-xl border bg-white/50 p-4 text-sm">
          {clue_quote ? (
            <div className="mb-3">
              <div className="text-xs font-semibold text-neutral-500">Clue</div>
              <div className="mt-1 whitespace-pre-wrap leading-6">{clue_quote}</div>
            </div>
          ) : null}
          {explanation ? (
            <div>
              <div className="text-xs font-semibold text-neutral-500">Explanation</div>
              <div className="mt-1 whitespace-pre-wrap leading-6">{explanation}</div>
            </div>
          ) : (
            <div className="text-neutral-500">No explanation provided.</div>
          )}
        </div>
      ) : null}

      <div className="mt-4 flex justify-between">
        <button
          type="button"
          className="rounded border px-4 py-2"
          disabled={!profile.allowPrev || clamp(idx) === 0}
          onClick={goPrev}
        >
          Prev
        </button>
        <button
          type="button"
          className={[
            "rounded border px-4 py-2",
            profile.revealAfterCheck && !canProceed ? "cursor-not-allowed opacity-50" : "",
          ].join(" ")}
          onClick={next}
          disabled={(profile.revealAfterCheck ? !canProceed : false) || isFinishing}
        >
          {isFinishing ? "Finishing..." : isLast ? "Finish" : "Next"}
        </button>
      </div>
    </div>
  );

  const PassageStickyPane = (
    <div style={{ position: "sticky", top: "1rem", height: "calc(100vh - 2rem)", overflow: "auto" }}>
      <div className="rounded-2xl border p-4">{q ? <PassagePane content={contentStr} q={q} /> : null}</div>
    </div>
  );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isToeflLayout
          ? "minmax(420px, 1.4fr) minmax(320px, 1fr)"
          : "minmax(320px, 1fr) minmax(420px, 1.4fr)",
        gap: "1.5rem",
        alignItems: "start",
      }}
    >
      {isToeflLayout ? (
        <>
          {PassageStickyPane}
          {QuestionPane}
        </>
      ) : (
        <>
          {QuestionPane}
          {PassageStickyPane}
        </>
      )}
    </div>
  );
}
