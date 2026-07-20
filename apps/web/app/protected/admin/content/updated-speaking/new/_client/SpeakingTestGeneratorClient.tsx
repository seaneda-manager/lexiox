"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useGenerateSpeech } from "@/lib/elevenlabs/use-generate-speech";
import type {
  SpeakingTest2026,
  SpeakingTaskListenRepeat2026,
  SpeakingTaskInterview2026,
} from "@/models/speaking-2026";

type Phase = "input" | "generating" | "edit" | "saving" | "locked";

export default function SpeakingTestGeneratorClient() {
  const router = useRouter();
  const { generateAudio, loading: audioLoading } = useGenerateSpeech();
  const [phase, setPhase] = useState<Phase>("input");
  const [listenRepeatTopic, setListenRepeatTopic] = useState("");
  const [interviewTopic, setInterviewTopic] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [test, setTest] = useState<SpeakingTest2026 | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [sentenceAudioUrls, setSentenceAudioUrls] = useState<Record<string, string>>({});
  const [questionAudioUrls, setQuestionAudioUrls] = useState<Record<string, string>>({});
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());

  const handleGenerate = useCallback(async () => {
    if (!listenRepeatTopic.trim() || !interviewTopic.trim()) return;
    setError(null);
    setPhase("generating");
    try {
      const res = await fetch("/api/admin/updated-speaking/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listenRepeatTopic, interviewTopic }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Generation failed");
      setTest(data.payload as SpeakingTest2026);
      setPhase("edit");
    } catch (e: any) {
      setError(e.message);
      setPhase("input");
    }
  }, [listenRepeatTopic, interviewTopic]);

  const handleSave = useCallback(async () => {
    if (!test) return;
    setError(null);
    setPhase("saving");
    try {
      const res = await fetch("/api/admin/updated-speaking/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Save failed");
      setSavedId(test.id);
      setPhase("edit");
    } catch (e: any) {
      setError(e.message);
      setPhase("edit");
    }
  }, [test]);

  const handleLock = useCallback(async () => {
    const id = savedId ?? test?.id;
    if (!id) { setError("먼저 저장하세요."); return; }
    if (!confirm("Lock하면 이후 수정이 불가합니다. 진행할까요?")) return;
    setError(null);
    setPhase("saving");
    try {
      await fetch("/api/admin/updated-speaking/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test }),
      });
      const res = await fetch("/api/admin/updated-speaking/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Lock failed");
      setPhase("locked");
    } catch (e: any) {
      setError(e.message);
      setPhase("edit");
    }
  }, [savedId, test]);

  const handleGenerateAudio = async (id: string, text: string, type: "sentence" | "question") => {
    if (!text.trim()) return;
    setGeneratingIds((prev) => new Set([...prev, id]));
    try {
      const result = await generateAudio(text);
      if (result) {
        if (type === "sentence") {
          setSentenceAudioUrls((prev) => ({ ...prev, [id]: result.url }));
        } else {
          setQuestionAudioUrls((prev) => ({ ...prev, [id]: result.url }));
        }
      }
    } finally {
      setGeneratingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // ── helpers ────────────────────────────────────────────────────

  const updateListenRepeat = (updater: (t: SpeakingTaskListenRepeat2026) => SpeakingTaskListenRepeat2026) =>
    setTest((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      const idx = next.tasks.findIndex((t) => t.type === "listen_repeat");
      if (idx === -1) return prev;
      next.tasks[idx] = updater(next.tasks[idx] as SpeakingTaskListenRepeat2026);
      return next;
    });

  const updateInterview = (updater: (t: SpeakingTaskInterview2026) => SpeakingTaskInterview2026) =>
    setTest((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      const idx = next.tasks.findIndex((t) => t.type === "interview");
      if (idx === -1) return prev;
      next.tasks[idx] = updater(next.tasks[idx] as SpeakingTaskInterview2026);
      return next;
    });

  // ── locked ─────────────────────────────────────────────────────

  if (phase === "locked") {
    return (
      <div className="space-y-4 text-center py-12">
        <div className="text-4xl">🔒</div>
        <p className="text-sm font-semibold text-gray-800">시험이 Lock되었습니다.</p>
        <div className="flex justify-center gap-3">
          <button onClick={() => router.push("/admin/content/updated-speaking")}
            className="rounded-lg border px-4 py-2 text-xs hover:bg-gray-50">목록으로</button>
          <button onClick={() => { setPhase("input"); setListenRepeatTopic(""); setInterviewTopic(""); setTest(null); setSavedId(null); }}
            className="rounded-lg border border-orange-500 bg-orange-500 px-4 py-2 text-xs text-white hover:bg-orange-600">새 시험 만들기</button>
        </div>
      </div>
    );
  }

  const listenRepeatTask = test?.tasks.find((t) => t.type === "listen_repeat") as SpeakingTaskListenRepeat2026 | undefined;
  const interviewTask = test?.tasks.find((t) => t.type === "interview") as SpeakingTaskInterview2026 | undefined;

  return (
    <div className="space-y-6">
      {/* Topic 입력 */}
      <section className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold">토픽 입력</h2>

        <div className="space-y-3">
          {/* Task 1 토픽 */}
          <label className="block space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700">Task 1</span>
              <span className="text-xs font-medium text-slate-700">듣고 따라말하기 — 상황 (Situation)</span>
            </div>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:bg-gray-50"
              placeholder="예: laundry room, ski resort, campus bookstore, chemistry lab safety"
              value={listenRepeatTopic}
              onChange={(e) => setListenRepeatTopic(e.target.value)}
              disabled={phase === "generating"}
            />
          </label>

          {/* Task 2 토픽 */}
          <label className="block space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">Task 2</span>
              <span className="text-xs font-medium text-slate-700">인터뷰 — 주제 (Topic)</span>
            </div>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:bg-gray-50"
              placeholder="예: festivals, technology habits, environmental choices, campus life"
              value={interviewTopic}
              onChange={(e) => setInterviewTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              disabled={phase === "generating"}
            />
          </label>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!listenRepeatTopic.trim() || !interviewTopic.trim() || phase === "generating"}
          className="w-full rounded-lg border border-orange-500 bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600 disabled:opacity-50"
        >
          {phase === "generating" ? "생성 중…" : test ? "재생성" : "AI 생성"}
        </button>

        {phase === "generating" && (
          <p className="text-xs text-gray-500 animate-pulse">
            Claude가 Listen &amp; Repeat (7문장) + Interview (4문제) 생성 중입니다 (약 15-30초)…
          </p>
        )}
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </section>

      {test && phase !== "generating" && (
        <>
          {/* 시험 제목 */}
          <section className="rounded-xl border bg-white p-4 shadow-sm space-y-2">
            <label className="text-xs font-semibold text-gray-700">시험 제목</label>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={test.label}
              onChange={(e) => setTest((prev) => prev ? { ...prev, label: e.target.value } : prev)}
            />
          </section>

          {/* ── Task 1: Listen and Repeat ── */}
          {listenRepeatTask && (
            <section className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-sky-100 px-3 py-0.5 text-xs font-semibold text-sky-700">
                  Task 1
                </span>
                <span className="text-sm font-semibold text-gray-900">듣고 따라말하기 (Listen &amp; Repeat)</span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="block text-xs">
                  <span className="text-gray-500">상황 (Situation)</span>
                  <input
                    className="mt-1 w-full rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-400"
                    value={listenRepeatTask.situation}
                    onChange={(e) => updateListenRepeat((t) => ({ ...t, situation: e.target.value }))}
                  />
                </label>
                <label className="block text-xs">
                  <span className="text-gray-500">상황 설명</span>
                  <input
                    className="mt-1 w-full rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-400"
                    value={listenRepeatTask.situationDescription ?? ""}
                    onChange={(e) => updateListenRepeat((t) => ({ ...t, situationDescription: e.target.value }))}
                  />
                </label>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-600">문장 목록 ({listenRepeatTask.sentences.length}개)</p>
                {listenRepeatTask.sentences.map((s, i) => (
                  <div key={s.id} className="flex items-start gap-2">
                    <span className="mt-2 w-5 shrink-0 text-right text-xs text-gray-400">{i + 1}</span>
                    <textarea
                      rows={2}
                      className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-sky-400"
                      value={s.text}
                      onChange={(e) => updateListenRepeat((t) => {
                        const sentences = [...t.sentences];
                        sentences[i] = { ...sentences[i], text: e.target.value };
                        return { ...t, sentences };
                      })}
                    />
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] text-gray-400">말하기(초)</span>
                        <input
                          type="number"
                          className="w-14 rounded-lg border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-sky-400"
                          value={s.speakingSeconds}
                          onChange={(e) => updateListenRepeat((t) => {
                            const sentences = [...t.sentences];
                            sentences[i] = { ...sentences[i], speakingSeconds: Number(e.target.value) };
                            return { ...t, sentences };
                          })}
                        />
                      </div>
                      <button
                        onClick={() => handleGenerateAudio(s.id, s.text, "sentence")}
                        disabled={generatingIds.has(s.id) || audioLoading}
                        className="text-xs px-2 py-1 bg-sky-500 text-white rounded hover:bg-sky-600 disabled:bg-gray-400"
                      >
                        {generatingIds.has(s.id) ? "중..." : "🎤"}
                      </button>
                      {sentenceAudioUrls[s.id] && (
                        <audio
                          controls
                          src={sentenceAudioUrls[s.id]}
                          className="w-full max-w-xs"
                        />
                      )}
                    </div>
                    <button
                      onClick={() => updateListenRepeat((t) => ({
                        ...t,
                        sentences: t.sentences.filter((_, idx) => idx !== i),
                      }))}
                      className="mt-1.5 text-xs text-red-400 hover:text-red-600"
                    >✕</button>
                  </div>
                ))}
                <button
                  onClick={() => updateListenRepeat((t) => ({
                    ...t,
                    sentences: [...t.sentences, { id: `s${Date.now()}`, text: "", speakingSeconds: 10 }],
                  }))}
                  className="text-xs text-sky-600 hover:underline"
                >
                  + 문장 추가
                </button>
              </div>
            </section>
          )}

          {/* ── Task 2: Interview ── */}
          {interviewTask && (
            <section className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-violet-100 px-3 py-0.5 text-xs font-semibold text-violet-700">
                  Task 2
                </span>
                <span className="text-sm font-semibold text-gray-900">인터뷰 (Interview)</span>
                <span className="text-xs text-gray-400">{interviewTask.questions.length}문제 · 각 45초</span>
              </div>

              <div className="space-y-3">
                {interviewTask.questions.map((q, i) => (
                  <div key={q.id} className="flex items-start gap-2">
                    <span className="mt-2 w-5 shrink-0 text-right text-xs text-gray-400">Q{i + 1}</span>
                    <div className="flex-1 space-y-1">
                      <textarea
                        rows={2}
                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-400"
                        value={q.text}
                        onChange={(e) => updateInterview((t) => {
                          const questions = [...t.questions];
                          questions[i] = { ...questions[i], text: e.target.value };
                          return { ...t, questions };
                        })}
                      />
                      <input
                        className="w-full rounded-lg border px-3 py-1 text-xs text-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-300"
                        placeholder="주제 태그 (e.g. education, technology)"
                        value={q.topic ?? ""}
                        onChange={(e) => updateInterview((t) => {
                          const questions = [...t.questions];
                          questions[i] = { ...questions[i], topic: e.target.value };
                          return { ...t, questions };
                        })}
                      />
                      {questionAudioUrls[q.id] && (
                        <audio
                          controls
                          src={questionAudioUrls[q.id]}
                          className="w-full"
                        />
                      )}
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] text-gray-400">말하기(초)</span>
                        <input
                          type="number"
                          className="w-14 rounded-lg border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400"
                          value={q.speakingSeconds}
                          onChange={(e) => updateInterview((t) => {
                            const questions = [...t.questions];
                            questions[i] = { ...questions[i], speakingSeconds: Number(e.target.value) };
                            return { ...t, questions };
                          })}
                        />
                      </div>
                      <button
                        onClick={() => handleGenerateAudio(q.id, q.text, "question")}
                        disabled={generatingIds.has(q.id) || audioLoading}
                        className="text-xs px-2 py-1 bg-violet-500 text-white rounded hover:bg-violet-600 disabled:bg-gray-400"
                      >
                        {generatingIds.has(q.id) ? "중..." : "🎤"}
                      </button>
                    </div>
                    <button
                      onClick={() => updateInterview((t) => ({
                        ...t,
                        questions: t.questions.filter((_, idx) => idx !== i),
                      }))}
                      className="mt-1.5 text-xs text-red-400 hover:text-red-600"
                    >✕</button>
                  </div>
                ))}
                <button
                  onClick={() => updateInterview((t) => ({
                    ...t,
                    questions: [...t.questions, { id: `q${Date.now()}`, text: "", topic: "", speakingSeconds: 45 }],
                  }))}
                  className="text-xs text-violet-600 hover:underline"
                >
                  + 질문 추가
                </button>
              </div>
            </section>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm">
            <div className="text-xs text-gray-400">
              {savedId ? `저장됨 (ID: ${savedId.slice(0, 8)}…)` : "아직 저장되지 않았습니다."}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={phase === "saving"}
                className="rounded-lg border px-4 py-2 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                {phase === "saving" ? "저장 중…" : "임시 저장"}
              </button>
              <button
                onClick={handleLock}
                disabled={phase === "saving"}
                className="rounded-lg border border-gray-800 bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                🔒 Lock &amp; 완료
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
