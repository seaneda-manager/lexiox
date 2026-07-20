"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { LListeningTest2026Linear, LListeningTrack2026, LQuestion2026 } from "@/models/listening";

type Phase = "input" | "generating" | "edit" | "saving" | "locked";

const KIND_LABEL: Record<string, string> = {
  conversation: "Conversation",
  academic_lecture: "Academic Lecture",
  campus_audio_log: "Campus Audio Log",
};

const KIND_COLOR: Record<string, string> = {
  conversation: "bg-sky-100 text-sky-700",
  academic_lecture: "bg-indigo-100 text-indigo-700",
  campus_audio_log: "bg-teal-100 text-teal-700",
};

export default function ListeningTestGeneratorClient() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("input");
  const [conversationTopic, setConversationTopic] = useState("");
  const [lectureTopic, setLectureTopic] = useState("");
  const [campusTopic, setCampusTopic] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [test, setTest] = useState<LListeningTest2026Linear | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const canGenerate = conversationTopic.trim() && lectureTopic.trim() && campusTopic.trim();

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;
    setError(null);
    setPhase("generating");
    try {
      const res = await fetch("/api/admin/updated-listening/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationTopic, lectureTopic, campusTopic }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Generation failed");
      setTest(data.payload as LListeningTest2026Linear);
      setPhase("edit");
    } catch (e: any) {
      setError(e.message);
      setPhase("input");
    }
  }, [conversationTopic, lectureTopic, campusTopic, canGenerate]);

  const setLabel = (label: string) =>
    setTest((prev) => prev ? { ...prev, meta: { ...prev.meta, label } } : prev);

  const setTranscript = (ti: number, val: string) =>
    setTest((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      if (next.tracks[ti]) next.tracks[ti].transcript = val;
      return next;
    });

  const setQStem = (ti: number, qi: number, val: string) =>
    setTest((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      const q = next.tracks[ti]?.questions?.[qi];
      if (q) q.stem = val;
      return next;
    });

  const setChoiceText = (ti: number, qi: number, ci: number, val: string) =>
    setTest((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      const c = next.tracks[ti]?.questions?.[qi]?.choices?.[ci];
      if (c) c.text = val;
      return next;
    });

  const setCorrect = (ti: number, qi: number, ci: number) =>
    setTest((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      const q = next.tracks[ti]?.questions?.[qi];
      if (!q) return next;
      const isMulti = (q.selectCount ?? 1) > 1;
      if (isMulti) {
        // toggle
        const current = q.correctIndices ?? [];
        const newIdx = current.includes(ci)
          ? current.filter((i) => i !== ci)
          : [...current, ci];
        q.correctIndices = newIdx;
        q.choices.forEach((c, i) => { c.isCorrect = newIdx.includes(i); });
      } else {
        q.correctIndices = [ci];
        q.choices.forEach((c, i) => { c.isCorrect = i === ci; });
      }
      return next;
    });

  const handleSave = useCallback(async () => {
    if (!test) return;
    setError(null);
    setPhase("saving");
    try {
      const res = await fetch("/api/admin/updated-listening/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Save failed");
      setSavedId(test.meta.id);
      setPhase("edit");
    } catch (e: any) {
      setError(e.message);
      setPhase("edit");
    }
  }, [test]);

  const handleLock = useCallback(async () => {
    const id = savedId ?? test?.meta.id;
    if (!id) { setError("먼저 저장하세요."); return; }
    if (!confirm("Lock하면 이후 수정이 불가합니다. 진행할까요?")) return;
    setError(null);
    setPhase("saving");
    try {
      await fetch("/api/admin/updated-listening/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test }),
      });
      const res = await fetch("/api/admin/updated-listening/lock", {
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

  const handleGenerateScript = useCallback(
    async (trackIndex: number, isHard: boolean) => {
      if (!test) return;
      const module = isHard ? test.hard : test.easy;
      const track = module.tracks[trackIndex];
      if (!track || !track.transcript) {
        setError("스크립트를 먼저 입력해주세요.");
        return;
      }

      setError(null);
      try {
        const res = await fetch("/api/admin/listening/generate-script", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: track.transcript,
            taskKind: track.taskKind,
          }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error ?? "Script generation failed");

        // test 상태 업데이트
        setTest((prev) => {
          if (!prev) return prev;
          const next = structuredClone(prev);
          const targetModule = isHard ? next.hard : next.easy;
          targetModule.tracks[trackIndex].scriptSegments = data.payload;
          return next;
        });
      } catch (e: any) {
        setError(`스크립트 생성 실패: ${e.message}`);
      }
    },
    [test]
  );

  if (phase === "locked") {
    return (
      <div className="space-y-4 text-center py-12">
        <div className="text-4xl">🔒</div>
        <p className="text-sm font-semibold text-gray-800">시험이 Lock되었습니다.</p>
        <div className="flex justify-center gap-3">
          <button onClick={() => router.push("/admin/content/updated-listening")} className="rounded-lg border px-4 py-2 text-xs hover:bg-gray-50">목록으로</button>
          <button onClick={() => { setPhase("input"); setTest(null); setSavedId(null); }} className="rounded-lg border border-violet-500 bg-violet-600 px-4 py-2 text-xs text-white hover:bg-violet-700">새 시험 만들기</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Topic Inputs */}
      <section className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold">토픽 입력 (3가지)</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-sky-700">💬 Conversation</label>
            <input
              className="w-full rounded-lg border border-sky-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:bg-gray-50"
              placeholder="예: Campus library hours"
              value={conversationTopic}
              onChange={(e) => setConversationTopic(e.target.value)}
              disabled={phase === "generating"}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-indigo-700">🎓 Academic Lecture</label>
            <input
              className="w-full rounded-lg border border-indigo-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50"
              placeholder="예: Marine biology / Photosynthesis"
              value={lectureTopic}
              onChange={(e) => setLectureTopic(e.target.value)}
              disabled={phase === "generating"}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-teal-700">📢 Campus Audio Log</label>
            <input
              className="w-full rounded-lg border border-teal-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:bg-gray-50"
              placeholder="예: Career fair announcement"
              value={campusTopic}
              onChange={(e) => setCampusTopic(e.target.value)}
              disabled={phase === "generating"}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || phase === "generating"}
            className="rounded-lg border border-violet-500 bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
          >
            {phase === "generating" ? "생성 중…" : test ? "재생성" : "AI 생성"}
          </button>
        </div>
        {phase === "generating" && (
          <p className="text-xs text-gray-500 animate-pulse">
            Claude가 3개 세트 스크립트와 문제를 생성 중입니다 (약 30–60초)…
          </p>
        )}
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </section>

      {test && phase !== "generating" && (
        <>
          {/* Label */}
          <section className="rounded-xl border bg-white p-4 shadow-sm space-y-2">
            <label className="text-xs font-semibold text-gray-700">시험 제목</label>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              value={test.meta.label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </section>

          {/* Tracks - Hard */}
          <div className="rounded-xl border bg-amber-50 p-4 shadow-sm">
            <h3 className="text-sm font-bold text-amber-900 mb-4">🔴 Hard Module</h3>
            {test.hard.tracks.map((track: LListeningTrack2026, ti) => (
            <section key={track.id} className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${KIND_COLOR[track.taskKind] ?? "bg-gray-100 text-gray-600"}`}>
                  {KIND_LABEL[track.taskKind] ?? track.taskKind}
                </span>
                <span className="text-sm font-semibold text-gray-900">{track.title}</span>
                <span className="text-xs text-gray-400">· {track.questions.length}Q · {track.audioSeconds ?? "?"}s</span>
              </div>

              {/* Audio Player */}
              {track.audioUrl && (
                <div className="rounded-lg bg-blue-50 p-3">
                  <p className="text-xs font-semibold text-blue-700 mb-2">🎧 음성</p>
                  <audio
                    controls
                    className="w-full"
                    src={track.audioUrl}
                    style={{ height: "32px" }}
                  />
                </div>
              )}

              {/* Transcript */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-500">스크립트</label>
                  {(track as any).scriptSegments && (
                    <span className="text-[10px] text-emerald-600 font-semibold">✓ 타임스탐프 완료</span>
                  )}
                </div>
                <textarea
                  rows={7}
                  className="w-full rounded-lg border px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-violet-400"
                  value={track.transcript ?? ""}
                  onChange={(e) => setTranscript(ti, e.target.value)}
                />
                <button
                  onClick={() => handleGenerateScript(ti, true)}
                  className="w-full rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition"
                >
                  ⚡ 타임스탐프 생성 (Claude AI)
                </button>
              </div>

              {/* Questions */}
              <div className="space-y-3">
                {track.questions.map((q: LQuestion2026, qi) => {
                  const isMulti = (q.selectCount ?? 1) > 1;
                  return (
                    <div key={q.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-gray-400">Q{q.number ?? qi + 1}</span>
                        <span className="rounded-full border px-2 py-0.5 text-[10px] text-gray-400">{q.type}</span>
                        {isMulti && (
                          <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-semibold">
                            다중선택 ×{q.selectCount}
                          </span>
                        )}
                      </div>
                      <textarea
                        rows={2}
                        className="w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400"
                        value={q.stem}
                        onChange={(e) => setQStem(ti, qi, e.target.value)}
                      />
                      <div className="space-y-1">
                        {q.choices.map((c, ci) => {
                          const isCorrect = q.correctIndices.includes(ci);
                          return (
                            <label key={c.id} className={`flex items-start gap-2 rounded border px-2 py-1 text-xs cursor-pointer transition ${isCorrect ? "border-violet-400 bg-violet-50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                              <input
                                type={isMulti ? "checkbox" : "radio"}
                                name={`t${ti}-q${qi}-correct`}
                                checked={isCorrect}
                                onChange={() => setCorrect(ti, qi, ci)}
                                className="mt-0.5 shrink-0"
                              />
                              <input
                                className="flex-1 bg-transparent focus:outline-none"
                                value={c.text}
                                onChange={(e) => setChoiceText(ti, qi, ci, e.target.value)}
                              />
                              {isCorrect && <span className="shrink-0 text-[10px] font-semibold text-violet-600">✓ 정답</span>}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
            ))}
          </div>

          {/* Tracks - Easy */}
          <div className="rounded-xl border bg-blue-50 p-4 shadow-sm">
            <h3 className="text-sm font-bold text-blue-900 mb-4">🟢 Easy Module</h3>
            {test.easy.tracks.map((track: LListeningTrack2026, ti) => (
            <section key={track.id} className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${KIND_COLOR[track.taskKind] ?? "bg-gray-100 text-gray-600"}`}>
                  {KIND_LABEL[track.taskKind] ?? track.taskKind}
                </span>
                <span className="text-sm font-semibold text-gray-900">{track.title}</span>
                <span className="text-xs text-gray-400">· {track.questions.length}Q · {track.audioSeconds ?? "?"}s</span>
              </div>

              {/* Audio Player */}
              {track.audioUrl && (
                <div className="rounded-lg bg-blue-50 p-3">
                  <p className="text-xs font-semibold text-blue-700 mb-2">🎧 음성</p>
                  <audio
                    controls
                    className="w-full"
                    src={track.audioUrl}
                    style={{ height: "32px" }}
                  />
                </div>
              )}

              {/* Transcript */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-500">스크립트</label>
                  {(track as any).scriptSegments && (
                    <span className="text-[10px] text-emerald-600 font-semibold">✓ 타임스탐프 완료</span>
                  )}
                </div>
                <textarea
                  rows={7}
                  className="w-full rounded-lg border px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-violet-400"
                  value={track.transcript ?? ""}
                  onChange={(e) => setTranscript(ti, e.target.value)}
                />
                <button
                  onClick={() => handleGenerateScript(ti, true)}
                  className="w-full rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition"
                >
                  ⚡ 타임스탐프 생성 (Claude AI)
                </button>
              </div>

              {/* Questions */}
              <div className="space-y-3">
                {track.questions.map((q: LQuestion2026, qi) => {
                  const isMulti = (q.selectCount ?? 1) > 1;
                  return (
                    <div key={q.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-gray-400">Q{q.number ?? qi + 1}</span>
                        <span className="rounded-full border px-2 py-0.5 text-[10px] text-gray-400">{q.type}</span>
                        {isMulti && (
                          <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-semibold">
                            다중선택 ×{q.selectCount}
                          </span>
                        )}
                      </div>
                      <textarea
                        rows={2}
                        className="w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400"
                        value={q.stem}
                        onChange={(e) => setQStem(ti, qi, e.target.value)}
                      />
                      <div className="space-y-1">
                        {q.choices.map((c, ci) => {
                          const isCorrect = q.correctIndices.includes(ci);
                          return (
                            <label key={c.id} className={`flex items-start gap-2 rounded border px-2 py-1 text-xs cursor-pointer transition ${isCorrect ? "border-violet-400 bg-violet-50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                              <input
                                type={isMulti ? "checkbox" : "radio"}
                                name={`t${ti}-q${qi}-correct`}
                                checked={isCorrect}
                                onChange={() => setCorrect(ti, qi, ci)}
                                className="mt-0.5 shrink-0"
                              />
                              <input
                                className="flex-1 bg-transparent focus:outline-none"
                                value={c.text}
                                onChange={(e) => setChoiceText(ti, qi, ci, e.target.value)}
                              />
                              {isCorrect && <span className="shrink-0 text-[10px] font-semibold text-violet-600">✓ 정답</span>}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm">
            <div className="text-xs text-gray-400">
              {savedId ? `저장됨 (ID: ${savedId.slice(0, 8)}…)` : "아직 저장되지 않았습니다."}
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={phase === "saving"} className="rounded-lg border px-4 py-2 text-xs font-medium hover:bg-gray-50 disabled:opacity-50">
                {phase === "saving" ? "저장 중…" : "임시 저장"}
              </button>
              <button onClick={handleLock} disabled={phase === "saving"} className="rounded-lg border border-gray-800 bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50">
                🔒 Lock & 완료
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
