"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type {
  WWritingTest2026,
  WBuildSentenceItem,
  WEmailWritingItem,
  WAcademicWritingItem,
} from "@/models/writing";

type Phase = "input" | "generating" | "edit" | "saving" | "locked";

export default function WritingTestGeneratorClient() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("input");
  const [buildSentenceTopic, setBuildSentenceTopic] = useState("");
  const [emailTopic, setEmailTopic] = useState("");
  const [academicTopic, setAcademicTopic] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [test, setTest] = useState<WWritingTest2026 | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const allFilled = buildSentenceTopic.trim() && emailTopic.trim() && academicTopic.trim();

  const handleGenerate = useCallback(async () => {
    if (!allFilled) return;
    setError(null);
    setPhase("generating");
    try {
      const res = await fetch("/api/admin/updated-writing/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buildSentenceTopic, emailTopic, academicTopic }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Generation failed");
      setTest(data.payload as WWritingTest2026);
      setPhase("edit");
    } catch (e: any) {
      setError(e.message);
      setPhase("input");
    }
  }, [buildSentenceTopic, emailTopic, academicTopic, allFilled]);

  const setLabel = (label: string) =>
    setTest((prev) => prev ? { ...prev, meta: { ...prev.meta, label } } : prev);

  const updateItem = (idx: number, updater: (item: any) => any) =>
    setTest((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      next.items[idx] = updater(next.items[idx]);
      return next;
    });

  const handleSave = useCallback(async () => {
    if (!test) return;
    setError(null);
    setPhase("saving");
    try {
      const res = await fetch("/api/admin/updated-writing/save", {
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
      await fetch("/api/admin/updated-writing/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test }),
      });
      const res = await fetch("/api/admin/updated-writing/lock", {
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

  if (phase === "locked") {
    return (
      <div className="space-y-4 text-center py-12">
        <div className="text-4xl">🔒</div>
        <p className="text-sm font-semibold text-gray-800">시험이 Lock되었습니다.</p>
        <div className="flex justify-center gap-3">
          <button onClick={() => router.push("/admin/content/updated-writing")}
            className="rounded-lg border px-4 py-2 text-xs hover:bg-gray-50">목록으로</button>
          <button onClick={() => { setPhase("input"); setTest(null); setSavedId(null); }}
            className="rounded-lg border border-teal-500 bg-teal-600 px-4 py-2 text-xs text-white hover:bg-teal-700">새 시험 만들기</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── 토픽 입력 (3개) ── */}
      <section className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold">토픽 입력</h2>

        <label className="block space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700">Task 1</span>
            <span className="text-xs font-medium text-slate-700">Build a Sentence — 상황/맥락</span>
          </div>
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:bg-gray-50"
            placeholder="예: campus recycling program, student health center procedures, library renovation"
            value={buildSentenceTopic}
            onChange={(e) => setBuildSentenceTopic(e.target.value)}
            disabled={phase === "generating"}
          />
        </label>

        <label className="block space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-[11px] font-semibold text-teal-700">Task 2</span>
            <span className="text-xs font-medium text-slate-700">Write an Email — 상황/주제</span>
          </div>
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:bg-gray-50"
            placeholder="예: summer research assistant position, internship inquiry, course withdrawal request"
            value={emailTopic}
            onChange={(e) => setEmailTopic(e.target.value)}
            disabled={phase === "generating"}
          />
        </label>

        <label className="block space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">Task 3</span>
            <span className="text-xs font-medium text-slate-700">Academic Discussion — 토론 주제</span>
          </div>
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:bg-gray-50"
            placeholder="예: space exploration vs public transportation, remote work benefits, social media regulation"
            value={academicTopic}
            onChange={(e) => setAcademicTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            disabled={phase === "generating"}
          />
        </label>

        <button
          onClick={handleGenerate}
          disabled={!allFilled || phase === "generating"}
          className="w-full rounded-lg border border-teal-500 bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
        >
          {phase === "generating" ? "생성 중…" : test ? "재생성" : "AI 생성"}
        </button>

        {phase === "generating" && (
          <p className="text-xs text-gray-500 animate-pulse">
            Claude가 Build a Sentence (9문항) + Email + Academic Discussion을 생성 중입니다 (약 30-45초)…
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
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              value={test.meta.label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </section>

          {/* Tasks */}
          {test.items.map((item, idx) => (
            <section key={item.id} className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${
                  item.taskKind === "build_a_sentence" ? "bg-sky-100 text-sky-700"
                  : item.taskKind === "email" ? "bg-teal-100 text-teal-700"
                  : "bg-violet-100 text-violet-700"
                }`}>
                  Task {idx + 1}
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {item.taskKind === "build_a_sentence" ? "Build a Sentence (9문항)"
                    : item.taskKind === "email" ? "Write an Email"
                    : "Academic Discussion"}
                </span>
              </div>

              {item.taskKind === "build_a_sentence" && (
                <BuildSentenceEditor
                  item={item as WBuildSentenceItem}
                  onChange={(updated) => updateItem(idx, () => updated)}
                />
              )}
              {item.taskKind === "email" && (
                <EmailEditor
                  item={item as WEmailWritingItem}
                  onChange={(updated) => updateItem(idx, () => updated)}
                />
              )}
              {item.taskKind === "academic_discussion" && (
                <AcademicEditor
                  item={item as WAcademicWritingItem}
                  onChange={(updated) => updateItem(idx, () => updated)}
                />
              )}
            </section>
          ))}

          {/* Actions */}
          <div className="flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm">
            <div className="text-xs text-gray-400">
              {savedId ? `저장됨 (ID: ${savedId.slice(0, 8)}…)` : "아직 저장되지 않았습니다."}
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={phase === "saving"}
                className="rounded-lg border px-4 py-2 text-xs font-medium hover:bg-gray-50 disabled:opacity-50">
                {phase === "saving" ? "저장 중…" : "임시 저장"}
              </button>
              <button onClick={handleLock} disabled={phase === "saving"}
                className="rounded-lg border border-gray-800 bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50">
                🔒 Lock &amp; 완료
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Build a Sentence Editor ────────────────────────────────────────────
function BuildSentenceEditor({ item, onChange }: { item: WBuildSentenceItem; onChange: (u: WBuildSentenceItem) => void }) {
  const updateQ = (qi: number, updater: (q: any) => any) => {
    const questions = item.questions.map((q, i) => i === qi ? updater(q) : q);
    onChange({ ...item, questions });
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">지시문: {item.instruction}</p>
      <div className="space-y-4">
        {item.questions.map((q, qi) => (
          <div key={q.id} className="rounded-lg border border-slate-100 bg-slate-50 p-4 space-y-3">
            <p className="text-[11px] font-semibold text-sky-600">Q{qi + 1}</p>

            <div className="grid gap-2 md:grid-cols-2">
              <label className="block text-xs">
                <span className="text-gray-500">Context Lead-in (앞 문장)</span>
                <textarea rows={2} className="mt-1 w-full rounded-lg border px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-sky-400"
                  value={q.contextLeadIn}
                  onChange={(e) => updateQ(qi, (qq) => ({ ...qq, contextLeadIn: e.target.value }))} />
              </label>
              <label className="block text-xs">
                <span className="text-gray-500">Context Lead-out (뒷 문장)</span>
                <textarea rows={2} className="mt-1 w-full rounded-lg border px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-sky-400"
                  value={q.contextLeadOut}
                  onChange={(e) => updateQ(qi, (qq) => ({ ...qq, contextLeadOut: e.target.value }))} />
              </label>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-gray-500">정답 순서 (3개 청크)</p>
              {q.correctSequence.map((chunk: string, ci: number) => (
                <div key={ci} className="flex items-center gap-2">
                  <span className="w-5 text-center text-[10px] text-gray-400">{ci + 1}</span>
                  <input className="flex-1 rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-sky-400"
                    value={chunk}
                    onChange={(e) => {
                      const seq = [...q.correctSequence];
                      seq[ci] = e.target.value;
                      updateQ(qi, (qq) => ({ ...qq, correctSequence: seq }));
                    }} />
                </div>
              ))}
            </div>

            <label className="block text-xs">
              <span className="text-gray-500">잉여 청크 (unnecessary chunk)</span>
              <input className="mt-1 w-full rounded border px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-red-300"
                value={q.unnecessaryChunk ?? ""}
                onChange={(e) => updateQ(qi, (qq) => ({ ...qq, unnecessaryChunk: e.target.value }))} />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Email Editor ───────────────────────────────────────────────────────
function EmailEditor({ item, onChange }: { item: WEmailWritingItem; onChange: (u: WEmailWritingItem) => void }) {
  const ext = item as any;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-xs">
          <span className="text-gray-500">수신자 이름</span>
          <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-400"
            value={ext.recipient ?? ""}
            onChange={(e) => onChange({ ...item, ...(item as any), recipient: e.target.value } as any)} />
        </label>
        <label className="block text-xs">
          <span className="text-gray-500">제목 (Subject)</span>
          <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-400"
            value={ext.subjectLine ?? ext.subject_line ?? ""}
            onChange={(e) => onChange({ ...item, ...(item as any), subjectLine: e.target.value } as any)} />
        </label>
      </div>
      <label className="block text-xs">
        <span className="text-gray-500">상황 설명 (Situation)</span>
        <textarea rows={3} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-400"
          value={item.situation}
          onChange={(e) => onChange({ ...item, situation: e.target.value })} />
      </label>
      <label className="block text-xs">
        <span className="text-gray-500">힌트 (한 줄씩)</span>
        <textarea rows={4} className="mt-1 w-full rounded-lg border px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-teal-400"
          value={(item.hints ?? []).join("\n")}
          onChange={(e) => onChange({ ...item, hints: e.target.value.split("\n").filter(Boolean) })} />
      </label>
    </div>
  );
}

// ── Academic Discussion Editor ─────────────────────────────────────────
function AcademicEditor({ item, onChange }: { item: WAcademicWritingItem; onChange: (u: WAcademicWritingItem) => void }) {
  const ext = item as any;
  return (
    <div className="space-y-3">
      <label className="block text-xs">
        <span className="text-gray-500">교수 이름</span>
        <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-400"
          value={ext.professorName ?? ""}
          onChange={(e) => onChange({ ...item, ...(item as any), professorName: e.target.value } as any)} />
      </label>
      <label className="block text-xs">
        <span className="text-gray-500">교수 질문</span>
        <textarea rows={3} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-400"
          value={item.professorPrompt}
          onChange={(e) => onChange({ ...item, professorPrompt: e.target.value })} />
      </label>
      <div className="space-y-2">
        <p className="text-xs text-gray-500">학생 게시글</p>
        {(item.studentPosts ?? []).map((post, pi) => (
          <div key={post.id} className="rounded-lg border bg-slate-50 p-3 space-y-2">
            <input className="w-full rounded border px-2 py-1 text-xs font-semibold focus:outline-none"
              placeholder="학생 이름"
              value={post.author}
              onChange={(e) => {
                const posts = item.studentPosts!.map((p, i) => i === pi ? { ...p, author: e.target.value } : p);
                onChange({ ...item, studentPosts: posts });
              }} />
            <textarea rows={3} className="w-full rounded border px-2 py-1 text-xs focus:outline-none"
              value={post.content}
              onChange={(e) => {
                const posts = item.studentPosts!.map((p, i) => i === pi ? { ...p, content: e.target.value } : p);
                onChange({ ...item, studentPosts: posts });
              }} />
          </div>
        ))}
      </div>
    </div>
  );
}
