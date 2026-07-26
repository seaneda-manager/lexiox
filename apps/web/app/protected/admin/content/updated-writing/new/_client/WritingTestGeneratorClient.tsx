"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import type {
  WWritingTest2026,
  WBuildSentenceItem,
  WBuildSentenceQuestion,
  WSentenceToken,
  WEmailWritingItem,
  WAcademicWritingItem,
} from "@/models/writing";
import {
  parseSentenceToTokens,
  joinTokens,
  normalizeBuildSentenceQuestion,
} from "@/lib/writing/build-sentence-parser";

type Phase = "input" | "generating" | "edit" | "saving";

export default function WritingTestGeneratorClient() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("input");
  const [buildSentenceTopic, setBuildSentenceTopic] = useState("");
  const [emailTopic, setEmailTopic] = useState("");
  const [academicTopic, setAcademicTopic] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [test, setTest] = useState<WWritingTest2026 | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  // ── 추천 주제 상태 ──────────────────────────────────────────────
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [topicSuggestions, setTopicSuggestions] = useState<{
    buildSentenceTopic: string;
    emailSuggestions: string[];
    academicSuggestions: string[];
  } | null>(null);

  // 페이지 로드 시 추천 주제 가져오기
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        setLoadingTopics(true);
        const [bsRes, emRes, acRes] = await Promise.all([
          fetch("/api/admin/speaking/topic-suggestions?taskType=listen_repeat"),
          fetch("/api/admin/speaking/topic-suggestions?taskType=writing"),
          fetch("/api/admin/speaking/topic-suggestions?taskType=writing"),
        ]);
        const bsData = await bsRes.json();
        const emData = await emRes.json();
        const acData = await acRes.json();

        if (bsData.ok && emData.ok && acData.ok) {
          setTopicSuggestions({
            buildSentenceTopic: bsData.topic,
            emailSuggestions: emData.suggestions,
            academicSuggestions: acData.suggestions,
          });
          setBuildSentenceTopic(bsData.topic);
          setEmailTopic(emData.recommended);
          setAcademicTopic(acData.recommended);
        }
      } catch (e) {
        console.error("Failed to fetch topic suggestions:", e);
      } finally {
        setLoadingTopics(false);
      }
    };

    fetchSuggestions();
  }, []);

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

  return (
    <div className="space-y-6">

      {/* ── 토픽 입력 (3개) ── */}
      <section className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold">토픽 입력</h2>

        {/* Task 1 - 자동 선택 */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700">Task 1</span>
            <span className="text-xs font-medium text-slate-700">Build a Sentence — 상황/맥락 (자동 선택)</span>
          </div>
          <div className="rounded-lg border bg-sky-50 px-3 py-2 text-sm text-slate-700 font-medium">
            {loadingTopics ? "주제 선택 중…" : buildSentenceTopic || "주제 준비 중…"}
          </div>
          <p className="text-[11px] text-slate-500">매번 다른 주제로 자동 생성됩니다.</p>
        </div>

        {/* Task 2 - 추천값 제시 */}
        <label className="block space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-[11px] font-semibold text-teal-700">Task 2</span>
            <span className="text-xs font-medium text-slate-700">Write an Email — 상황/주제 (선택 또는 수정)</span>
          </div>
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:bg-gray-50"
            placeholder="주제를 선택하거나 입력하세요"
            value={emailTopic}
            onChange={(e) => setEmailTopic(e.target.value)}
            disabled={phase === "generating"}
            list="email-topics"
          />
          <datalist id="email-topics">
            {topicSuggestions?.emailSuggestions.map((topic, idx) => (
              <option key={idx} value={topic} />
            ))}
          </datalist>
          {topicSuggestions && topicSuggestions.emailSuggestions.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {topicSuggestions.emailSuggestions.map((topic, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setEmailTopic(topic)}
                  className="text-[11px] rounded-lg bg-teal-100 px-2 py-1 text-teal-700 hover:bg-teal-200 font-medium"
                >
                  {topic}
                </button>
              ))}
            </div>
          )}
        </label>

        {/* Task 3 - 추천값 제시 */}
        <label className="block space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">Task 3</span>
            <span className="text-xs font-medium text-slate-700">Academic Discussion — 토론 주제 (선택 또는 수정)</span>
          </div>
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:bg-gray-50"
            placeholder="주제를 선택하거나 입력하세요"
            value={academicTopic}
            onChange={(e) => setAcademicTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            disabled={phase === "generating"}
            list="academic-topics"
          />
          <datalist id="academic-topics">
            {topicSuggestions?.academicSuggestions.map((topic, idx) => (
              <option key={idx} value={topic} />
            ))}
          </datalist>
          {topicSuggestions && topicSuggestions.academicSuggestions.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {topicSuggestions.academicSuggestions.map((topic, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setAcademicTopic(topic)}
                  className="text-[11px] rounded-lg bg-violet-100 px-2 py-1 text-violet-700 hover:bg-violet-200 font-medium"
                >
                  {topic}
                </button>
              ))}
            </div>
          )}
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
            Claude가 Build a Sentence (10문항) + Email + Academic Discussion을 생성 중입니다 (약 30-45초)…
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
                  {item.taskKind === "build_a_sentence" ? "Build a Sentence (10문항)"
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

          {/* Actions — 저장 즉시 배정 가능한 상태가 됩니다. 별도 Lock 단계 없음. */}
          <div className="flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm">
            <div className="text-xs text-gray-400">
              {savedId ? `저장됨 (ID: ${savedId.slice(0, 8)}…) · 바로 배정 가능합니다.` : "아직 저장되지 않았습니다."}
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={phase === "saving"}
                className="rounded-lg border border-teal-500 bg-teal-600 px-4 py-2 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50">
                {phase === "saving" ? "저장 중…" : "저장"}
              </button>
              {savedId && (
                <button onClick={() => router.push("/admin/content/updated-writing/assign")}
                  className="rounded-lg border px-4 py-2 text-xs font-medium hover:bg-gray-50">
                  배정하러 가기 →
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Build a Sentence Editor ────────────────────────────────────────────
//
// 작업 흐름: 정답 문장을 넣고 "자동 분할" → 파서가 Word/Phrase 초안을 만든다 →
// 관리자가 조각을 병합/분리하거나 단위를 바꿔 마무리한다.
// 파서에 품사 태거가 없어 명사/동사 판단이 완벽하지 않으므로, 손으로 고치는 단계가 필수다.
//
// tokens 배열의 순서가 곧 정답 순서다. 화면 셔플은 러너가 담당한다.
function BuildSentenceEditor({ item, onChange }: { item: WBuildSentenceItem; onChange: (u: WBuildSentenceItem) => void }) {
  // 문항별 "정답 문장" 입력 상태. 최초값은 기존 조각을 이어 붙여 만든다.
  const [drafts, setDrafts] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    item.questions.forEach((q, i) => {
      const n = normalizeBuildSentenceQuestion(q);
      init[i] = joinTokens(n.tokens.map((t) => t.text), n.punctuation);
    });
    return init;
  });

  const updateQ = (qi: number, updater: (q: WBuildSentenceQuestion) => WBuildSentenceQuestion) => {
    onChange({ ...item, questions: item.questions.map((q, i) => (i === qi ? updater(q) : q)) });
  };

  /** tokens를 갈아끼우고 correctOrder를 순서대로 다시 맞춘다. */
  const setTokens = (qi: number, tokens: WSentenceToken[], punctuation?: string) => {
    updateQ(qi, (q) => ({
      ...q,
      tokens,
      correctOrder: tokens.map((t) => t.id),
      punctuation: punctuation ?? q.punctuation ?? "",
      // 레거시 필드는 더 이상 쓰지 않으므로 같이 지운다.
      shuffledChunks: undefined,
      correctSequence: undefined,
      unnecessaryChunk: undefined,
    }));
  };

  const autoSplit = (qi: number) => {
    const sentence = (drafts[qi] ?? "").trim();
    if (!sentence) return;
    const { tokens, punctuation } = parseSentenceToTokens(sentence);
    setTokens(qi, tokens, punctuation);
  };

  const reindex = (tokens: { text: string; type: WSentenceToken["type"] }[]): WSentenceToken[] =>
    tokens.map((t, i) => ({ id: `t${i + 1}`, text: t.text, type: t.type }));

  const mergeWithPrev = (qi: number, ti: number) => {
    const n = normalizeBuildSentenceQuestion(item.questions[qi]);
    if (ti === 0) return;
    const next = n.tokens.map((t) => ({ text: t.text, type: t.type }));
    next[ti - 1] = { text: `${next[ti - 1].text} ${next[ti].text}`, type: "PHRASE" };
    next.splice(ti, 1);
    setTokens(qi, reindex(next));
  };

  const splitToken = (qi: number, ti: number) => {
    const n = normalizeBuildSentenceQuestion(item.questions[qi]);
    const parts = n.tokens[ti].text.trim().split(/\s+/);
    if (parts.length < 2) return;
    const next = n.tokens.map((t) => ({ text: t.text, type: t.type }));
    next.splice(ti, 1, ...parts.map((p) => ({ text: p, type: "WORD" as const })));
    setTokens(qi, reindex(next));
  };

  const editText = (qi: number, ti: number, text: string) => {
    const n = normalizeBuildSentenceQuestion(item.questions[qi]);
    const next = n.tokens.map((t, i) => (i === ti ? { text, type: t.type } : { text: t.text, type: t.type }));
    setTokens(qi, reindex(next));
  };

  const toggleType = (qi: number, ti: number) => {
    const n = normalizeBuildSentenceQuestion(item.questions[qi]);
    const next = n.tokens.map((t, i) =>
      i === ti ? { text: t.text, type: t.type === "WORD" ? ("PHRASE" as const) : ("WORD" as const) } : { text: t.text, type: t.type },
    );
    setTokens(qi, reindex(next));
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">지시문: {item.instruction}</p>
      <p className="rounded-lg bg-sky-50 px-3 py-2 text-[11px] leading-relaxed text-sky-800">
        어순·문법을 재는 성분(의문사·조동사·대명사·동사·부사)은 <b>WORD</b>로 낱개,
        관사+명사·전치사구·고정 연결어는 <b>PHRASE</b>로 묶습니다.
        자동 분할은 초안이므로 결과를 확인하고 고쳐주세요.
      </p>

      <div className="space-y-4">
        {item.questions.map((q, qi) => {
          const n = normalizeBuildSentenceQuestion(q);
          return (
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

              {/* 정답 문장 → 자동 분할 */}
              <div className="space-y-1">
                <span className="text-xs text-gray-500">정답 문장</span>
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded border px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-sky-400"
                    placeholder="예: What brand will you buy?"
                    value={drafts[qi] ?? ""}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [qi]: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => autoSplit(qi)}
                    className="whitespace-nowrap rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
                  >
                    자동 분할
                  </button>
                </div>
              </div>

              {/* 조각 목록 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    조각 {n.tokens.length}개 · 순서가 정답입니다
                    {n.punctuation && <span className="ml-1 text-gray-400">(문장부호 {n.punctuation} 는 고정 표시)</span>}
                  </span>
                </div>

                {n.tokens.length === 0 && (
                  <p className="text-[11px] text-gray-400">정답 문장을 입력하고 자동 분할을 눌러주세요.</p>
                )}

                {n.tokens.map((t, ti) => (
                  <div key={t.id} className="flex items-center gap-1.5">
                    <span className="w-5 text-center text-[10px] text-gray-400">{ti + 1}</span>
                    <input
                      className="flex-1 rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-sky-400"
                      value={t.text}
                      onChange={(e) => editText(qi, ti, e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => toggleType(qi, ti)}
                      title="WORD / PHRASE 전환"
                      className={`w-16 rounded px-1.5 py-1 text-[10px] font-semibold ${
                        t.type === "PHRASE"
                          ? "bg-violet-100 text-violet-700"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {t.type}
                    </button>
                    <button
                      type="button"
                      onClick={() => mergeWithPrev(qi, ti)}
                      disabled={ti === 0}
                      title="앞 조각과 합치기"
                      className="rounded border px-1.5 py-1 text-[10px] text-gray-600 hover:bg-white disabled:opacity-30"
                    >
                      ←합치기
                    </button>
                    <button
                      type="button"
                      onClick={() => splitToken(qi, ti)}
                      disabled={!t.text.trim().includes(" ")}
                      title="공백 기준으로 쪼개기"
                      className="rounded border px-1.5 py-1 text-[10px] text-gray-600 hover:bg-white disabled:opacity-30"
                    >
                      쪼개기
                    </button>
                  </div>
                ))}

                {n.tokens.length > 0 && (
                  <p className="pt-1 text-[11px] text-gray-500">
                    미리보기: <span className="text-sky-700">{joinTokens(n.tokens.map((t) => t.text), n.punctuation)}</span>
                  </p>
                )}
              </div>
            </div>
          );
        })}
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
