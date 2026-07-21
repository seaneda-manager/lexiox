// apps/web/app/(protected)/vocab/drill/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { createBrowserClient } from "@/lib/supabase/client";
import { loadSessionWords } from "@/lib/vocab/session/loadSessionWords";
import { generateDrillChunks, toGenWord, type GeneratedChunk } from "@/lib/vocab/drill-generator";

import FocusModeWrapper from "@/components/common/FocusModeWrapper";
import DrillRunner from "@/components/vocab/drill/DrillRunner";
import type { DrillTask, DrillType } from "@/components/vocab/drill/drill.types";

const CHUNK_SIZE = 4;

/** 러너가 렌더할 수 있는 타입 (6종 전부) */
const RUNNER_READY_TYPES: DrillType[] = [
  "LISTEN_SPELL_MEANING",
  "DEFINITION_PICK",
  "SYNONYM",
  "MEANING_OPPOSITE",
  "COLLOCATION",
  "WORD_FORM_PICK",
];

export default function VocabDrillPage() {
  const [loading, setLoading] = useState(true);
  const [chunks, setChunks] = useState<GeneratedChunk[]>([]);
  const [chunkIdx, setChunkIdx] = useState(0);
  const [userId, setUserId] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const finishedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const sp = new URLSearchParams(window.location.search);
        const setId = sp.get("setId");

        const supabase = createBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (!cancelled) {
            setErrorMsg("로그인이 필요합니다.");
            setLoading(false);
          }
          return;
        }

        const words = await loadSessionWords({ userId: user.id, setId });
        if (cancelled) return;

        if (!words || words.length === 0) {
          setErrorMsg("학습할 단어를 찾지 못했습니다. 오늘 배정된 단어가 있는지 확인해 주세요.");
          setLoading(false);
          return;
        }

        const generated = generateDrillChunks(words.map(toGenWord), {
          chunkSize: CHUNK_SIZE,
          types: RUNNER_READY_TYPES,
        });

        setUserId(user.id);
        setChunks(generated);
        setLoading(false);
      } catch (e: any) {
        if (!cancelled) {
          setErrorMsg("드릴을 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const currentChunk = chunks[chunkIdx] ?? null;
  const totalChunks = chunks.length;

  const tasks: DrillTask[] = useMemo(() => currentChunk?.tasks ?? [], [currentChunk]);

  function handleChunkFinish() {
    if (finishedRef.current) return;
    finishedRef.current = true;

    if (chunkIdx + 1 < totalChunks) {
      setChunkIdx((i) => i + 1);
      finishedRef.current = false;
    } else {
      setIsDone(true);
    }
  }

  if (loading) {
    return (
      <Shell>
        <p className="text-sm text-white/70">단어를 불러오는 중…</p>
      </Shell>
    );
  }

  if (errorMsg) {
    return (
      <Shell>
        <h2 className="text-xl font-bold">드릴을 시작할 수 없어요</h2>
        <p className="text-sm text-white/70">{errorMsg}</p>
        <button
          className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black"
          onClick={() => (window.location.href = "/vocab/hub")}
        >
          단어 허브로
        </button>
      </Shell>
    );
  }

  if (totalChunks === 0) {
    return (
      <Shell>
        <h2 className="text-xl font-bold">만들 수 있는 문항이 없어요</h2>
        <p className="text-sm text-white/70">
          이 단어들에는 아직 드릴에 쓸 정보(동의어·연어·활용형 등)가 부족합니다.
        </p>
        <button
          className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black"
          onClick={() => (window.location.href = "/vocab/hub")}
        >
          단어 허브로
        </button>
      </Shell>
    );
  }

  if (isDone) {
    return (
      <Shell>
        <h2 className="text-2xl font-bold">드릴 완료 🎉</h2>
        <p className="text-sm text-white/70">
          {totalChunks}개 묶음 · 총 {chunks.reduce((n, c) => n + c.tasks.length, 0)}문항
        </p>
        <button
          className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black"
          onClick={() => (window.location.href = "/vocab/hub")}
        >
          단어 허브로
        </button>
      </Shell>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6 text-white">
      <FocusModeWrapper>
        <div className="space-y-6">
          <div className="mx-auto w-full max-w-2xl space-y-2 text-center">
            <div className="text-xs text-white/50">Lingo-X · 단어 드릴</div>
            <div className="flex items-center justify-center gap-1.5">
              {chunks.map((_, i) => (
                <span
                  key={i}
                  className={`h-2 w-2 rounded-full ${
                    i < chunkIdx ? "bg-emerald-400" : i === chunkIdx ? "bg-white" : "bg-white/20"
                  }`}
                />
              ))}
              <span className="ml-2 text-xs text-white/50">
                묶음 {chunkIdx + 1} / {totalChunks}
              </span>
            </div>
          </div>

          <DrillRunner
            key={`chunk-${chunkIdx}`}
            userId={userId}
            tasks={tasks}
            mode="classic"
            onFinish={handleChunkFinish}
          />
        </div>
      </FocusModeWrapper>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-xl space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
        {children}
      </div>
    </div>
  );
}
