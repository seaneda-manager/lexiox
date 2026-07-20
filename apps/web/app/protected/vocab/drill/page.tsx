// apps/web/app/(protected)/vocab/drill/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import FocusModeWrapper from "@/components/common/FocusModeWrapper";
import DrillRunner from "@/components/vocab/drill/DrillRunner";
import type { DrillTask, DrillType } from "@/components/vocab/drill/drill.types";

const STORAGE_KEY = "lingox_vocab_session";
const SPEED_DRILL_KEY = "pendingDrillTasks";

const ALLOWED_TYPES: DrillType[] = [
  "MEANING_SIMILAR",
  "WORD_FORM_PICK",
  "SENTENCE_BLANK",
  "COLLOCATION",
];

type SessionPayload = {
  userId?: string;
  wordMap?: Record<string, any>;
};

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function countByType(tasks: DrillTask[]) {
  const m: Record<string, number> = {};
  for (const t of tasks) {
    const k = String((t as any)?.drillType ?? "UNKNOWN");
    m[k] = (m[k] ?? 0) + 1;
  }
  return m;
}

/** Page-level canonicalization for storage filtering */
function canonStorageType(raw: any): DrillType | "" {
  const k = String(raw ?? "").trim().toUpperCase();
  if (!k) return "";

  // runner-canon aliases (if they ever sneak into storage)
  if (k === "SYNONYM") return "MEANING_SIMILAR";
  if (k === "WORD_FORM") return "WORD_FORM_PICK";
  if (k === "FILL_IN_THE_BLANKS") return "SENTENCE_BLANK";

  // real drill types
  if (k === "MEANING_SIMILAR") return "MEANING_SIMILAR";
  if (k === "WORD_FORM_PICK") return "WORD_FORM_PICK";
  if (k === "SENTENCE_BLANK") return "SENTENCE_BLANK";
  if (k === "COLLOCATION") return "COLLOCATION";

  // removed / moved to homework
  if (
    k === "LISTEN_ARRANGE" ||
    k === "SYLLABLE_ARRANGE" ||
    k === "LISTEN_ARRANGE_SENTENCE" ||
    k === "MEANING_OPPOSITE"
  ) {
    return "";
  }

  return "";
}

function isAllowedType(dt: any): boolean {
  const c = canonStorageType(dt);
  return Boolean(c) && (ALLOWED_TYPES as string[]).includes(c);
}

export default function VocabDrillPage() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<DrillTask[]>([]);
  const [userId, setUserId] = useState<string>("__anon__");

  const [isDone, setIsDone] = useState(false);
  const finishedRef = useRef(false);

  // debug
  const [rawTaskCounts, setRawTaskCounts] = useState<Record<string, number>>({});
  const [finalTaskCounts, setFinalTaskCounts] = useState<Record<string, number>>({});
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      const rawTasksStr = sessionStorage.getItem(SPEED_DRILL_KEY);
      const rawSessionStr = sessionStorage.getItem(STORAGE_KEY);

      const parsedTasks = safeJsonParse<any[]>(rawTasksStr, []);
      const parsedSession = safeJsonParse<SessionPayload>(rawSessionStr, {});

      setUserId(parsedSession?.userId || "__anon__");

      const rawAsDrillTasks = Array.isArray(parsedTasks) ? (parsedTasks as DrillTask[]) : [];
      setRawTaskCounts(countByType(rawAsDrillTasks));

      const filtered = rawAsDrillTasks.filter((t: any) => isAllowedType(t?.drillType));
      setFinalTaskCounts(countByType(filtered));

      const hadLegacy = rawAsDrillTasks.length > 0 && filtered.length !== rawAsDrillTasks.length;
      if (hadLegacy) {
        try {
          sessionStorage.setItem(SPEED_DRILL_KEY, JSON.stringify(filtered));
          setNotice("Legacy/unsupported drill tasks were detected and automatically cleaned.");
        } catch {}
      }

      setTasks(filtered);
      setLoading(false);
    } catch {
      setTasks([]);
      setLoading(false);
    }
  }, []);

  const hasTasks = tasks.length > 0;

  const header = useMemo(() => {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-2 text-center">
        <div className="text-xs text-white/50">Lingo-X · Vocab Drill</div>
        <h1 className="text-2xl font-bold text-white">Drill</h1>
        <p className="text-sm text-white/60">Types: {ALLOWED_TYPES.join(" · ")}</p>

        {notice && (
          <div className="mx-auto max-w-xl rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
            {notice}
          </div>
        )}

        <details className="mx-auto max-w-xl rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-white/70">
          <summary className="cursor-pointer text-white/80">Debug</summary>
          <div className="mt-2 space-y-1">
            <div>
              raw: <code className="text-white/80">{JSON.stringify(rawTaskCounts)}</code>
            </div>
            <div>
              filtered: <code className="text-white/80">{JSON.stringify(finalTaskCounts)}</code>
            </div>
          </div>
        </details>
      </div>
    );
  }, [notice, rawTaskCounts, finalTaskCounts]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6 text-white">
        <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          Loading...
        </div>
      </div>
    );
  }

  if (!hasTasks) {
    return (
      <div className="min-h-screen bg-black p-6 text-white">
        <div className="mx-auto max-w-xl space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <h2 className="text-xl font-bold">No drill tasks</h2>
          <p className="text-sm text-white/70">
            pendingDrillTasks 안에 지원되는 drillType이 없어요.
            <br />
            (/vocab/session에서 seed 후 다시 들어오면 됩니다)
          </p>

          <button
            className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black"
            onClick={() => (window.location.href = "/vocab/session")}
          >
            Go to /vocab/session
          </button>
        </div>
      </div>
    );
  }

  if (isDone) {
    return (
      <div className="min-h-screen bg-black p-6 text-white">
        <div className="mx-auto max-w-xl space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <h2 className="text-2xl font-bold">Complete 🎉</h2>
          <div className="text-sm text-white/70">Finished: {tasks.length} tasks</div>
          <button
            className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black"
            onClick={() => (window.location.href = "/vocab/session")}
          >
            Back to Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6 text-white">
      <FocusModeWrapper>
        <div className="space-y-6">
          {header}

          <DrillRunner
            userId={userId}
            tasks={tasks}
            mode="classic"
            onFinish={() => {
              if (finishedRef.current) return;
              finishedRef.current = true;

              try {
                sessionStorage.removeItem(SPEED_DRILL_KEY);
              } catch {}

              setIsDone(true);
            }}
          />
        </div>
      </FocusModeWrapper>
    </div>
  );
}
