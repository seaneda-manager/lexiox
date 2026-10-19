"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type TaskSummary = {
  id: string;
  track_id: string;
  day_index: number;
  status: string;
  phase: "study" | "retest";
  word_count: number;
  extra_term_count: number;
};

type CoreWord = {
  id: string;
  text: string;
  pos: string | null;
  meanings_ko: string[];
  example: string | null;
  reason: "wrong" | "hard";
};

type ExtraTerm = { text: string; meanings_ko: string[] };

type Detail = {
  task: { id: string; track_id: string; day_index: number; status: string };
  words: CoreWord[];
  extra: ExtraTerm[];
};

type Step = "cards" | "extra" | "check" | "done";

function speak(text: string) {
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    window.speechSynthesis.speak(u);
  } catch {
    /* 음성 미지원 기기는 조용히 무시 */
  }
}

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function RemedialInner() {
  const router = useRouter();
  const params = useSearchParams();
  const taskId = params.get("task");

  const [tasks, setTasks] = useState<TaskSummary[] | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    try {
      const res = await fetch("/api/vocab/remedial", { cache: "no-store" });
      if (!res.ok) throw new Error("목록을 불러오지 못했어요.");
      const d = await res.json();
      setTasks(d.tasks ?? []);
    } catch (e: any) {
      setError(e?.message ?? "목록을 불러오지 못했어요.");
    }
  }, []);

  useEffect(() => {
    setDetail(null);
    setError(null);
    if (!taskId) {
      loadList();
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/vocab/remedial/${encodeURIComponent(taskId)}`, { cache: "no-store" });
        if (!res.ok) throw new Error("재학습 내용을 불러오지 못했어요.");
        setDetail(await res.json());
      } catch (e: any) {
        setError(e?.message ?? "재학습 내용을 불러오지 못했어요.");
      }
    })();
  }, [taskId, loadList]);

  if (error) {
    return (
      <div className="mx-auto max-w-md p-8 text-center space-y-3">
        <p className="text-gray-700">{error}</p>
        <button onClick={() => router.push("/vocab/hub-new")} className="rounded bg-blue-600 px-4 py-2 text-white">
          단어 학습으로 이동
        </button>
      </div>
    );
  }

  if (!taskId) {
    return (
      <div className="mx-auto max-w-md p-6 space-y-4">
        <h1 className="text-xl font-bold text-gray-900">필수 재학습</h1>
        {tasks === null && <p className="text-gray-500">불러오는 중…</p>}
        {tasks && tasks.length === 0 && (
          <p className="text-gray-600">지금 해야 할 재학습이 없어요. 👍</p>
        )}
        {tasks?.map((t) => (
          <div key={t.id} className="rounded-xl border bg-white p-4 space-y-2">
            <p className="font-semibold text-gray-900">Day {t.day_index}</p>
            {t.phase === "study" ? (
              <>
                <p className="text-sm text-gray-600">
                  단어 {t.word_count}개{t.extra_term_count > 0 ? ` + 파생어 ${t.extra_term_count}개` : ""}
                </p>
                <button
                  onClick={() => router.push(`/vocab/remedial?task=${t.id}`)}
                  className="w-full rounded-lg bg-rose-600 py-2 font-semibold text-white hover:bg-rose-700"
                >
                  재학습 시작 (필수)
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-emerald-700">재학습 완료 · 다음 수업의 복습시험을 준비해요</p>
                <button
                  onClick={() =>
                    router.push(`/vocab/test?track_id=${t.track_id}&day=${t.day_index}&retest=${t.id}`)
                  }
                  className="w-full rounded-lg border border-amber-300 bg-amber-50 py-2 font-semibold text-amber-800 hover:bg-amber-100"
                >
                  복습시험 보러 가기
                </button>
              </>
            )}
          </div>
        ))}
        <button onClick={() => router.push("/vocab/hub-new")} className="text-sm text-gray-500 underline">
          단어 학습으로 돌아가기
        </button>
      </div>
    );
  }

  if (!detail) return <div className="p-8 text-center text-gray-500">불러오는 중…</div>;
  return <Study detail={detail} onExit={() => router.push("/vocab/remedial")} />;
}

function Study({ detail, onExit }: { detail: Detail; onExit: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("cards");
  const [idx, setIdx] = useState(0);
  const checkOrder = useMemo(() => shuffled(detail.words), [detail.words]);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<null | { ok: boolean; correct: string }>(null);
  const [results, setResults] = useState<Array<{ word_id: string; correct: boolean }>>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const core = detail.words;

  const finish = async (final: Array<{ word_id: string; correct: boolean }>) => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/vocab/remedial/${detail.task.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results: final }),
      });
      if (!res.ok) throw new Error("완료 저장에 실패했어요. 다시 시도해 주세요.");
      setStep("done");
    } catch (e: any) {
      setSaveError(e?.message ?? "완료 저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  const submitCheck = () => {
    const w = checkOrder[idx];
    const ok = answer.trim().toLowerCase() === w.text.toLowerCase();
    setFeedback({ ok, correct: w.text });
  };

  const nextCheck = () => {
    const w = checkOrder[idx];
    const next = [...results, { word_id: w.id, correct: feedback?.ok === true }];
    setResults(next);
    setAnswer("");
    setFeedback(null);
    if (idx + 1 >= checkOrder.length) {
      finish(next);
    } else {
      setIdx(idx + 1);
    }
  };

  return (
    <div className="mx-auto max-w-md p-6 space-y-4">
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Day {detail.task.day_index} 필수 재학습</span>
        <button onClick={onExit} className="underline">
          나가기
        </button>
      </div>

      {step === "cards" && core[idx] && (
        <div className="rounded-2xl border bg-white p-6 space-y-3 text-center">
          <p className="text-xs text-gray-400">
            {idx + 1} / {core.length} · {core[idx].reason === "wrong" ? "틀린 단어" : "중요 단어"}
          </p>
          <p className="text-3xl font-bold text-gray-900">{core[idx].text}</p>
          {core[idx].pos && <p className="text-sm text-gray-500">{core[idx].pos}</p>}
          <p className="text-lg text-gray-800">{core[idx].meanings_ko.join(", ")}</p>
          {core[idx].example && <p className="text-sm italic text-gray-500">{core[idx].example}</p>}
          <button onClick={() => speak(core[idx].text)} className="rounded-full bg-sky-100 px-4 py-1 text-sm text-sky-800">
            🔊 듣기
          </button>
          <div className="flex gap-2 pt-2">
            <button
              disabled={idx === 0}
              onClick={() => setIdx(idx - 1)}
              className="flex-1 rounded-lg bg-gray-200 py-2 disabled:opacity-40"
            >
              이전
            </button>
            <button
              onClick={() => {
                if (idx + 1 < core.length) setIdx(idx + 1);
                else if (detail.extra.length > 0) setStep("extra");
                else {
                  setIdx(0);
                  setStep("check");
                }
              }}
              className="flex-1 rounded-lg bg-blue-600 py-2 font-semibold text-white"
            >
              {idx + 1 < core.length ? "다음" : detail.extra.length > 0 ? "파생어 보기" : "철자 점검 시작"}
            </button>
          </div>
        </div>
      )}

      {step === "extra" && (
        <div className="rounded-2xl border bg-white p-6 space-y-3">
          <p className="font-semibold text-gray-900">파생어도 함께 익혀요</p>
          <ul className="space-y-1">
            {detail.extra.map((e) => (
              <li key={e.text} className="flex items-center justify-between border-b py-1 text-sm">
                <span className="font-medium text-gray-900">{e.text}</span>
                <span className="text-gray-500">{e.meanings_ko.join(", ")}</span>
                <button onClick={() => speak(e.text)} aria-label={`${e.text} 듣기`}>
                  🔊
                </button>
              </li>
            ))}
          </ul>
          <button
            onClick={() => {
              setIdx(0);
              setStep("check");
            }}
            className="w-full rounded-lg bg-blue-600 py-2 font-semibold text-white"
          >
            철자 점검 시작
          </button>
        </div>
      )}

      {step === "check" && checkOrder[idx] && (
        <div className="rounded-2xl border bg-white p-6 space-y-3 text-center">
          <p className="text-xs text-gray-400">
            철자 점검 {idx + 1} / {checkOrder.length}
          </p>
          <p className="text-xl text-gray-900">{checkOrder[idx].meanings_ko.join(", ")}</p>
          <input
            autoFocus
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (feedback ? nextCheck : submitCheck)();
            }}
            disabled={!!feedback}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="영어 단어를 입력하세요"
            className="w-full rounded-lg border px-3 py-2 text-center text-lg"
          />
          {feedback && (
            <p className={feedback.ok ? "text-emerald-700" : "text-red-600"}>
              {feedback.ok ? "정답!" : `정답: ${feedback.correct}`}
            </p>
          )}
          {saveError && <p className="text-sm text-red-600">{saveError}</p>}
          <button
            disabled={saving || (!feedback && answer.trim() === "")}
            onClick={feedback ? nextCheck : submitCheck}
            className="w-full rounded-lg bg-blue-600 py-2 font-semibold text-white disabled:opacity-50"
          >
            {feedback ? (idx + 1 >= checkOrder.length ? "완료" : "다음") : "확인"}
          </button>
        </div>
      )}

      {step === "done" && (
        <div className="rounded-2xl border bg-white p-6 space-y-3 text-center">
          <p className="text-3xl">✅</p>
          <p className="text-lg font-bold text-gray-900">재학습 완료!</p>
          <p className="text-sm text-gray-600">다음 수업에서 복습시험을 봐요. 틀렸던 단어를 한 번 더 훑어 두세요.</p>
          <button
            onClick={() =>
              router.push(
                `/vocab/test?track_id=${detail.task.track_id}&day=${detail.task.day_index}&retest=${detail.task.id}`
              )
            }
            className="w-full rounded-lg border border-amber-300 bg-amber-50 py-2 font-semibold text-amber-800"
          >
            복습시험 보러 가기
          </button>
          <button onClick={() => router.push("/vocab/hub-new")} className="w-full rounded-lg bg-gray-200 py-2">
            단어 학습으로 돌아가기
          </button>
        </div>
      )}
    </div>
  );
}

export default function VocabRemedialPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">불러오는 중…</div>}>
      <RemedialInner />
    </Suspense>
  );
}
