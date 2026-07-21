"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { DrillTask } from "./drill.types";

import SentenceBlankDrill from "./SentenceBlankDrill";
import CollocationDrill from "./CollocationDrill";
import WordFormPickDrill from "./WordFormPickDrill";
import DefinitionPickDrill from "./DefinitionPickDrill";
import ListenSpellMeaningDrill from "./ListenSpellMeaningDrill";
import StageScaffold from "@/components/common/stage/StageScaffold";

type Props = {
  userId: string;
  tasks: DrillTask[];
  onFinish: () => void;
  mode?: "classic" | string;
  /** 문항 하나가 끝날 때마다 결과를 부모에게 알린다 (기록용) */
  onTaskResult?: (task: DrillTask, isCorrect: boolean) => void;
};

const DRILL_TYPE_ORDER = [
  "LISTEN_SPELL",
  "DEFINITION_PICK",
  "SYNONYM",
  "WORD_FORM",
  "FILL_IN_THE_BLANKS",
  "COLLOCATION",
] as const;
type CanonDrillType = (typeof DRILL_TYPE_ORDER)[number];

function canonType(x: unknown) {
  const raw = String(x ?? "").trim().toUpperCase();
  if (!raw) return "";

  if (raw === "WORD_FORM_PICK") return "WORD_FORM";
  if (raw === "SENTENCE_BLANK") return "FILL_IN_THE_BLANKS";
  if (raw === "MEANING_SIMILAR") return "SYNONYM";

  if (raw === "WORD_FORM") return "WORD_FORM";
  if (raw === "FILL_IN_THE_BLANKS") return "FILL_IN_THE_BLANKS";
  if (raw === "SYNONYM") return "SYNONYM";
  if (raw === "COLLOCATION") return "COLLOCATION";

  // 반의어는 meaning MCQ 와 구조가 같고 seed.meta.relation 으로 구분된다
  if (raw === "MEANING_OPPOSITE") return "SYNONYM";

  if (raw === "DEFINITION_PICK") return "DEFINITION_PICK";
  if (raw === "LISTEN_SPELL_MEANING" || raw === "LISTEN_SPELL") return "LISTEN_SPELL";

  if (raw === "LISTEN_ARRANGE") return "REMOVED:LISTEN_ARRANGE";
  if (raw === "SYLLABLE_ARRANGE") return "REMOVED:SYLLABLE_ARRANGE";
  if (raw === "LISTEN_ARRANGE_SENTENCE") return "REMOVED:LISTEN_ARRANGE_SENTENCE";

  return raw;
}

function isSupportedCanon(dt: string): dt is CanonDrillType {
  return (DRILL_TYPE_ORDER as readonly string[]).includes(dt);
}

function countsByType(tasks: DrillTask[]) {
  const m: Record<string, number> = {};
  for (const t of tasks) {
    const k = canonType((t as any)?.drillType) || "UNKNOWN";
    m[k] = (m[k] ?? 0) + 1;
  }
  return m;
}

function enforceStrictTypeBlocks(tasks: DrillTask[]) {
  const buckets = new Map<CanonDrillType, DrillTask[]>();
  const unknown: DrillTask[] = [];

  for (const t of tasks ?? []) {
    const dt = canonType((t as any)?.drillType);
    if (!dt) {
      unknown.push(t);
      continue;
    }

    if (isSupportedCanon(dt)) buckets.set(dt, [...(buckets.get(dt) ?? []), t]);
    else unknown.push(t);
  }

  const out: DrillTask[] = [];
  for (const dt of DRILL_TYPE_ORDER) {
    const group = buckets.get(dt);
    if (group && group.length) out.push(...group);
  }
  if (unknown.length) out.push(...unknown);

  return out;
}

function stableTaskSig(t: DrillTask) {
  const id = String((t as any)?.id ?? "");
  const dt = canonType((t as any)?.drillType);
  const wordId = String((t as any)?.wordId ?? "");
  const variant = String((t as any)?.seed?.variant ?? "");
  const mode = String((t as any)?.seed?.mode ?? "");
  const metaKind = String((t as any)?.seed?.meta?.kind ?? "");
  const metaRel = String((t as any)?.seed?.meta?.relation ?? "");
  return `${id}|${dt}|${wordId}|${variant}|${mode}|${metaKind}|${metaRel}`;
}

function hashStr(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function makeTasksKey(tasks: DrillTask[]) {
  const joined = (tasks ?? []).map(stableTaskSig).join(";");
  return hashStr(joined);
}

/* =========================
   Inline SYNONYM block
   ========================= */

function pickString(...xs: any[]) {
  for (const x of xs) {
    const s = String(x ?? "").trim();
    if (s) return s;
  }
  return "";
}

function uniqStrings(arr: any[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of arr ?? []) {
    const s = String(x ?? "").trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

function readMeaningMCQ(task: DrillTask) {
  const t: any = task as any;
  const seed: any = t?.seed ?? {};
  const meta: any = seed?.meta ?? {};

  const kind = pickString(meta?.kind, seed?.kind, "");
  const relation = pickString(meta?.relation, seed?.relation, "");
  const prompt = pickString(seed?.prompt, meta?.prompt, "");

  const stem = pickString(seed?.stem, seed?.target, seed?.question, meta?.stem, meta?.target, meta?.question, "");

  const rawChoices =
    seed?.choices ??
    seed?.options ??
    seed?.items ??
    meta?.choices ??
    meta?.options ??
    seed?.distractors ??
    meta?.distractors ??
    [];

  const choices = uniqStrings(Array.isArray(rawChoices) ? rawChoices : []);

  const correctText = pickString(seed?.answer, seed?.correct, meta?.answer, meta?.correct, seed?.key);
  const correctIndex = Number.isFinite(seed?.answerIndex)
    ? Number(seed?.answerIndex)
    : Number.isFinite(seed?.correctIndex)
      ? Number(seed?.correctIndex)
      : null;

  let answerIdx: number | null = null;

  if (choices.length) {
    if (correctIndex !== null && correctIndex >= 0 && correctIndex < choices.length) answerIdx = correctIndex;
    else if (correctText) {
      const i = choices.findIndex((c) => c.toLowerCase() === String(correctText).toLowerCase());
      if (i >= 0) answerIdx = i;
    }
  }

  return { kind, relation, prompt, stem, choices, answerIdx, meta, debug: { seed, meta, t } };
}

function InlineSynonymDrill({ task, onDone }: { task: DrillTask; onDone: (isCorrect: boolean) => void }) {
  const { kind, relation, prompt, stem, choices, answerIdx, meta, debug } = useMemo(
    () => readMeaningMCQ(task),
    [task]
  );

  const [picked, setPicked] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    setPicked(null);
    setLocked(false);
  }, [task]);

  const canAnswer = !locked && choices.length >= 2 && answerIdx !== null;

  function choose(i: number) {
    if (!canAnswer) return;
    setPicked(i);
    setLocked(true);
    const ok = i === answerIdx!;
    window.setTimeout(() => onDone(ok), 380);
  }

  const isMeaningToWord = String(kind).toUpperCase() === "MEANING_TO_WORD";
  const isSyn = String(relation).toLowerCase() === "synonym";

  const title = isMeaningToWord ? "MEANING" : "SYNONYM";
  const instruction =
    prompt ||
    (isMeaningToWord
      ? "Choose the word that matches this meaning:"
      : isSyn
        ? "Choose the closest synonym for:"
        : "Choose the best answer:");

  const subHint = !isMeaningToWord && meta?.meaningKo ? `뜻: ${String(meta.meaningKo)}` : "";

  if (!stem || choices.length < 2 || answerIdx === null) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
        <div className="font-semibold">{title} task seed is not usable</div>
        <div className="mt-1 text-xs text-rose-700">seed에 stem + choices + answer(또는 answerIndex)가 필요합니다.</div>

        <pre className="mt-3 max-h-64 overflow-auto rounded-lg border bg-white p-2 text-[11px] text-slate-700">
          {JSON.stringify(debug?.seed ?? debug, null, 2)}
        </pre>

        <button className="mt-3 w-full rounded-xl bg-black py-2 text-white" onClick={() => onDone(false)} type="button">
          Skip this task
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <div className="font-semibold" style={{ fontSize: "clamp(12px, 1.35cqi, 13px)", color: "#4da88a" }}>
        {title}
      </div>

      <div className="mt-2 font-extrabold" style={{ fontSize: "clamp(16px, 2.0cqi, 24px)", color: "#E1F5EE" }}>
        {instruction}{" "}
        <span className="rounded-xl px-3 py-1 font-mono" style={{ background: "rgba(15,40,30,0.7)", border: "1px solid rgba(255,255,255,0.1)", color: "#9FE1CB" }}>{stem}</span>
      </div>

      {subHint ? <div className="mt-2" style={{ fontSize: "clamp(12px, 1.35cqi, 13px)", color: "#4da88a" }}>{subHint}</div> : null}

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {choices.slice(0, 6).map((c, i) => {
          const isPicked = picked === i;
          const isAnswer = i === answerIdx;
          const choiceStyle = locked
            ? isAnswer
              ? { border: "1.5px solid #5DCAA5", background: "#1e4a3a" }
              : isPicked
                ? { border: "1.5px solid #F09595", background: "rgba(61,21,21,0.6)" }
                : { border: "0.5px solid rgba(255,255,255,0.08)", background: "rgba(26,61,48,0.4)", opacity: 0.6 }
            : { border: "0.5px solid rgba(255,255,255,0.1)", background: "rgba(26,61,48,0.5)" };

          return (
            <button
              key={`${c}-${i}`}
              onClick={() => choose(i)}
              disabled={!canAnswer}
              className="rounded-2xl px-4 py-4 text-left transition"
              style={choiceStyle}
              type="button"
            >
              <div className="font-extrabold" style={{ fontSize: "clamp(14px, 1.7cqi, 18px)", color: "#E1F5EE" }}>
                {c}
              </div>
              {locked && isAnswer ? (
                <div className="mt-1 text-xs font-semibold" style={{ color: "#5DCAA5" }}>Correct</div>
              ) : locked && isPicked && !isAnswer ? (
                <div className="mt-1 text-xs font-semibold" style={{ color: "#F09595" }}>Incorrect</div>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-4 font-semibold" style={{ fontSize: "clamp(12px, 1.35cqi, 13px)", color: "#3d7a63" }}>
        Tap one choice. Auto-advances.
      </div>
    </div>
  );
}

function humanType(dt: string) {
  if (dt === "SYNONYM") return "Synonym";
  if (dt === "WORD_FORM") return "Word Form";
  if (dt === "FILL_IN_THE_BLANKS") return "Fill in the Blanks";
  if (dt === "COLLOCATION") return "Collocation";
  if (!dt) return "Unknown";
  return dt;
}

export default function DrillRunner({ userId: _userId, tasks, onFinish, mode = "classic", onTaskResult }: Props) {
  const [index, setIndex] = useState(0);
  const finishedRef = useRef(false);

  const normalizedTasks = useMemo(() => enforceStrictTypeBlocks(tasks ?? []), [tasks, mode]);
  const tasksKey = useMemo(() => makeTasksKey(normalizedTasks), [normalizedTasks]);

  useEffect(() => {
    finishedRef.current = false;
    setIndex(0);
  }, [tasksKey]);

  const total = normalizedTasks.length;
  const current = useMemo(() => normalizedTasks[index] ?? null, [normalizedTasks, index]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    const first10 = normalizedTasks.slice(0, 10).map((t) => ({
      dt: canonType((t as any)?.drillType) || "UNKNOWN",
      raw: String((t as any)?.drillType ?? ""),
      id: String((t as any)?.id ?? ""),
      wordId: String((t as any)?.wordId ?? ""),
      variant: String((t as any)?.seed?.variant ?? ""),
      mode: String((t as any)?.seed?.mode ?? ""),
      metaKind: String((t as any)?.seed?.meta?.kind ?? ""),
      metaRel: String((t as any)?.seed?.meta?.relation ?? ""),
    }));

    console.log("[DrillRunner] tasks:", {
      total: normalizedTasks.length,
      counts: countsByType(normalizedTasks),
      first10,
      note: "strict type blocks enforced WITHOUT mutating drillType",
    });
  }, [normalizedTasks]);

  function finishOnce() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    window.setTimeout(() => onFinish(), 0);
  }

  function goNext() {
    setIndex((prev) => {
      const next = prev + 1;
      if (next >= total) {
        finishOnce();
        return prev;
      }
      return next;
    });
  }

  function onDone(isCorrect: boolean) {
    if (current) {
      try {
        onTaskResult?.(current, isCorrect);
      } catch {
        /* 기록 실패가 진행을 막지 않도록 */
      }
    }
    goNext();
  }

  const dt = canonType((current as any)?.drillType);
  const title = humanType(dt);

  if (!current) {
    return (
      <div className="h-full w-full">
        <StageScaffold
          stageKey="drill"
          stageLabel="Drill"
          title="Drill"
          subtitle="No drill tasks were generated."
          hint="Upstream may be missing word_forms/collocations, or drillTypes were not created."
          primary={{ label: "Finish", onClick: finishOnce }}
          align="center"
          theme="dark"

        >
          <div className="rounded-2xl border border-black/5 bg-white/70 px-5 py-5 text-neutral-700 font-semibold">
            No drill tasks.
          </div>
        </StageScaffold>
      </div>
    );
  }

  const hint = `Task ${Math.min(index + 1, Math.max(1, total))}/${Math.max(1, total)} • ${title}`;

  return (
    <div className="h-full w-full">
      <StageScaffold
        stageKey="drill"
        stageLabel="Drill"
        title={title}
        subtitle="Answer the question. It will auto-advance."
        step={{ index: Math.min(index + 1, Math.max(1, total)), total: Math.max(1, total) }}
        hint={hint}
        secondary={{ label: "Skip", onClick: goNext, variant: "ghost" }}
        align="center"
        theme="dark"

      >
        <div className="w-full h-full">
          {dt === "LISTEN_SPELL" ? (
            <ListenSpellMeaningDrill task={current} onDone={onDone} />
          ) : dt === "DEFINITION_PICK" ? (
            <DefinitionPickDrill task={current} onDone={onDone} />
          ) : dt === "SYNONYM" ? (
            <InlineSynonymDrill task={current} onDone={onDone} />
          ) : dt === "WORD_FORM" ? (
            <WordFormPickDrill task={current} onDone={onDone} />
          ) : dt === "FILL_IN_THE_BLANKS" ? (
            <SentenceBlankDrill task={current} onDone={onDone} />
          ) : dt === "COLLOCATION" ? (
            <CollocationDrill task={current} onDone={onDone} />
          ) : (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
              <div className="font-semibold">Unknown/removed drillType</div>
              <div className="mt-1">
                drillType(canon): <code className="font-mono">{dt || "(empty)"}</code>
              </div>
              <div className="mt-1 text-xs text-rose-700">
                raw drillType: <code className="font-mono">{String((current as any)?.drillType ?? "")}</code>
              </div>

              <div className="mt-3 text-xs text-rose-700">
                이 타입이 내려오면 buildBlockDrillTasksV1에서 아직 구 타입/미지원 타입을 만들고 있는 상태.
              </div>

              <pre className="mt-3 max-h-64 overflow-auto rounded-lg border bg-white p-2 text-[11px] text-slate-700">
                {JSON.stringify(current, null, 2)}
              </pre>

              <button className="mt-3 w-full rounded-xl bg-black py-2 text-white" onClick={() => goNext()} type="button">
                Skip this task
              </button>
            </div>
          )}
        </div>
      </StageScaffold>
    </div>
  );
}
