"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, ChevronDown, ChevronUp, Pencil, Check, X, RotateCcw } from "lucide-react";
import type { WWritingTest2026, WWritingItem } from "@/models/writing";

const TASK_LABEL: Record<string, string> = {
  fill_in_blank: "빈칸 채우기",
  micro_writing: "Micro Writing",
  email: "Email Writing",
  academic_discussion: "Academic Discussion",
};

export default function WritingReviewBody({
  sessionId,
  rawAnswers,
  test,
  initialFeedback,
  parentAnswers,
  isRevision,
}: {
  sessionId: string;
  rawAnswers: Record<string, string>;
  test: WWritingTest2026 | null;
  initialFeedback?: string | null;
  parentAnswers?: Record<string, string>;
  isRevision?: boolean;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>(rawAnswers ?? {});
  const [scriptChanged, setScriptChanged] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(initialFeedback ?? null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(!!initialFeedback);
  const [revisionLoading, setRevisionLoading] = useState(false);
  const [scores, setScores] = useState<{
    task1?: number;
    task2?: number;
    task3?: number;
    total?: number;
  } | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  function updateAnswer(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  async function saveAnswer(key: string) {
    await fetch("/api/writing/update-answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, key, value: answers[key] }),
    });
    setScriptChanged(true);
  }

  async function requestFeedback() {
    setFeedbackLoading(true);
    setFeedbackError(null);
    try {
      const res = await fetch("/api/writing/ai-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "오류 발생");
      setFeedback(data.feedback);
      setScores(data.scores);
      setFeedbackOpen(true);
      setScriptChanged(false);
    } catch (e) {
      setFeedbackError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setFeedbackLoading(false);
    }
  }

  async function createRevision() {
    setRevisionLoading(true);
    try {
      const res = await fetch("/api/writing/create-revision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "오류 발생");
      // 새로운 revision session으로 이동
      router.push(`/updated-writing/test/${test?.id}?revision=${data.revisionSessionId}`);
    } catch (e) {
      setFeedbackError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setRevisionLoading(false);
    }
  }

  const feedbackSections = parseFeedback(feedback);

  const getLevelDescriptor = (total?: number) => {
    if (!total) return "";
    if (total >= 65) return "Excellent (A)";
    if (total >= 55) return "Very Good (B)";
    if (total >= 45) return "Good (C)";
    if (total >= 35) return "Fair (D)";
    return "Needs Improvement (F)";
  };

  return (
    <div className="space-y-4">
      {/* 태스크별 답변 */}
      {test ? (
        test.items.map((item) => (
          <TaskAnswerSection
            key={item.id}
            item={item}
            answers={answers}
            updateAnswer={updateAnswer}
            saveAnswer={saveAnswer}
          />
        ))
      ) : (
        <RawAnswersSection answers={answers} />
      )}

      {/* Version 비교 (Revision인 경우) */}
      {isRevision && parentAnswers && (
        <section className="rounded-xl border border-purple-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-3 p-4 bg-purple-50">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-purple-800">📊 버전 비교</span>
              <span className="text-xs text-purple-600">수정 전/후</span>
            </div>
            <button
              onClick={() => setShowComparison(!showComparison)}
              className="inline-flex items-center gap-1 rounded-lg border border-purple-200 px-2.5 py-1.5 text-[11px] font-medium text-purple-700 hover:bg-purple-50"
            >
              {showComparison ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showComparison ? "접기" : "펼치기"}
            </button>
          </div>

          {showComparison && (
            <div className="divide-y divide-purple-50">
              {test?.items.map((item) => {
                const parentText = parentAnswers[item.id] || "";
                const currentText = answers[item.id] || "";
                const hasChanges = parentText !== currentText;

                return (
                  <div key={item.id} className="p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      {item.taskKind === "email" ? "Email Writing" :
                       item.taskKind === "academic_discussion" ? "Academic Discussion" :
                       `Task ${item.id}`}
                    </h4>

                    <div className="grid md:grid-cols-2 gap-4">
                      {/* 수정 전 */}
                      <div className="rounded-lg bg-red-50 border border-red-100 p-3">
                        <p className="text-xs font-semibold text-red-700 mb-2">수정 전</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto font-mono text-xs">
                          {parentText || "(없음)"}
                        </p>
                      </div>

                      {/* 수정 후 */}
                      <div className={`rounded-lg border p-3 ${hasChanges ? "bg-green-50 border-green-100" : "bg-gray-50 border-gray-100"}`}>
                        <p className={`text-xs font-semibold mb-2 ${hasChanges ? "text-green-700" : "text-gray-600"}`}>
                          수정 후 {hasChanges && "✓"}
                        </p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto font-mono text-xs">
                          {currentText || "(없음)"}
                        </p>
                      </div>
                    </div>

                    {hasChanges && (
                      <div className="mt-3 flex items-start gap-2 rounded bg-blue-50 p-2">
                        <span className="text-xs text-blue-700">💡 이 부분이 수정되었습니다.</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 점수 표시 */}
      {scores && (
        <section className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-sm p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-emerald-900">Score Report</h3>
                <p className="text-xs text-emerald-700 mt-1">{getLevelDescriptor(scores.total)}</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-emerald-600">{scores.total}</div>
                <div className="text-xs text-emerald-600">/70</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-white border border-emerald-100 p-3">
                <p className="text-xs font-medium text-emerald-700">Task 1</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{scores.task1}</p>
                <p className="text-[9px] text-emerald-600">/10</p>
              </div>
              <div className="rounded-lg bg-white border border-teal-100 p-3">
                <p className="text-xs font-medium text-teal-700">Task 2</p>
                <p className="text-2xl font-bold text-teal-600 mt-1">{scores.task2}</p>
                <p className="text-[9px] text-teal-600">/30</p>
              </div>
              <div className="rounded-lg bg-white border border-cyan-100 p-3">
                <p className="text-xs font-medium text-cyan-700">Task 3</p>
                <p className="text-2xl font-bold text-cyan-600 mt-1">{scores.task3}</p>
                <p className="text-[9px] text-cyan-600">/30</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* AI 첨삭 */}
      <section className="rounded-xl border border-teal-100 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-teal-500" />
            <span className="text-sm font-semibold text-teal-800">AI 첨삭</span>
            {feedback && !scriptChanged && (
              <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-teal-600">
                완료
              </span>
            )}
            {feedback && scriptChanged && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-600">
                답변 변경됨
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!feedback && (
              <button
                onClick={requestFeedback}
                disabled={feedbackLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-60"
              >
                {feedbackLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {feedbackLoading ? "분석 중…" : "AI 첨삭 받기"}
              </button>
            )}
            {feedback && (
              <button
                onClick={() => setFeedbackOpen((v) => !v)}
                className="inline-flex items-center gap-1 rounded-lg border border-teal-100 px-2.5 py-1.5 text-[11px] font-medium text-teal-700 hover:bg-teal-50"
              >
                {feedbackOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {feedbackOpen ? "접기" : "펼치기"}
              </button>
            )}
            {feedback && (
              <button
                onClick={requestFeedback}
                disabled={feedbackLoading}
                className="inline-flex items-center gap-1 rounded-lg border border-teal-100 px-2.5 py-1.5 text-[11px] font-medium text-teal-600 hover:bg-teal-50 disabled:opacity-60"
              >
                {feedbackLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                재분석
              </button>
            )}
            {feedback && (
              <button
                onClick={createRevision}
                disabled={revisionLoading}
                className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-2.5 py-1.5 text-[11px] font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-60"
              >
                {revisionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                다시 작성하기
              </button>
            )}
          </div>
        </div>

        {feedbackError && (
          <div className="mx-4 mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{feedbackError}</div>
        )}

        {feedback && feedbackOpen && (
          <div className="border-t border-teal-100 divide-y divide-teal-50">
            {feedbackSections.length > 0
              ? feedbackSections.map((sec, i) => (
                  <div key={i} className="px-4 py-3">
                    <div className="mb-1.5 text-[11px] font-bold text-teal-700 uppercase tracking-wide">
                      {sec.title}
                    </div>
                    <div className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
                      {sec.body}
                    </div>
                  </div>
                ))
              : (
                <div className="px-4 py-3 text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
                  {feedback}
                </div>
              )}
          </div>
        )}
      </section>
    </div>
  );
}

// ── Task answer editor ────────────────────────────────────────────────

function TaskAnswerSection({
  item,
  answers,
  updateAnswer,
  saveAnswer,
}: {
  item: WWritingItem;
  answers: Record<string, string>;
  updateAnswer: (key: string, value: string) => void;
  saveAnswer: (key: string) => Promise<void>;
}) {
  if (item.taskKind === "micro_writing") {
    return (
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="border-b bg-teal-50 px-4 py-3">
          <div className="text-xs font-bold text-teal-700 uppercase tracking-wide">Micro Writing</div>
        </div>
        <div className="divide-y">
          {item.prompts.map((p) => {
            const key = `${item.id}::${p.id}`;
            return (
              <AnswerField
                key={key}
                label={p.prompt}
                answerKey={key}
                value={answers[key] ?? ""}
                onChange={(v) => updateAnswer(key, v)}
                onSave={() => saveAnswer(key)}
                rows={3}
              />
            );
          })}
        </div>
      </div>
    );
  }

  if (item.taskKind === "email") {
    return (
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="border-b bg-teal-50 px-4 py-3">
          <div className="text-xs font-bold text-teal-700 uppercase tracking-wide">Email Writing</div>
          <p className="mt-1 text-xs text-gray-600">{item.situation}</p>
          <p className="mt-0.5 text-xs text-gray-800 font-medium">{item.prompt}</p>
        </div>
        <AnswerField
          label=""
          answerKey={item.id}
          value={answers[item.id] ?? ""}
          onChange={(v) => updateAnswer(item.id, v)}
          onSave={() => saveAnswer(item.id)}
          rows={8}
          noBorderLabel
        />
      </div>
    );
  }

  if (item.taskKind === "academic_discussion") {
    return (
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="border-b bg-teal-50 px-4 py-3">
          <div className="text-xs font-bold text-teal-700 uppercase tracking-wide">Academic Discussion</div>
          <p className="mt-1 text-xs text-gray-600">{item.context}</p>
          <p className="mt-0.5 text-xs text-gray-800 font-medium">{item.professorPrompt}</p>
        </div>
        <AnswerField
          label=""
          answerKey={item.id}
          value={answers[item.id] ?? ""}
          onChange={(v) => updateAnswer(item.id, v)}
          onSave={() => saveAnswer(item.id)}
          rows={8}
          noBorderLabel
        />
      </div>
    );
  }

  // fill_in_blank: 간단 표시
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="text-xs font-bold text-teal-700 uppercase tracking-wide mb-2">
        {TASK_LABEL[item.taskKind] ?? item.taskKind}
      </div>
      <pre className="whitespace-pre-wrap text-xs text-gray-700">{JSON.stringify(answers, null, 2)}</pre>
    </div>
  );
}

function AnswerField({
  label,
  answerKey,
  value,
  onChange,
  onSave,
  rows = 5,
  noBorderLabel,
}: {
  label: string;
  answerKey: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => Promise<void>;
  rows?: number;
  noBorderLabel?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    onChange(draft);
    await onSave();
    setSaving(false);
    setEditing(false);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  return (
    <div className="p-4">
      {label && <p className="mb-2 text-xs text-gray-600">{label}</p>}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {editing ? (
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={rows}
              className="w-full resize-y rounded-lg border border-teal-200 bg-teal-50/30 p-3 text-sm leading-relaxed text-gray-800 outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-200"
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
              {value || <span className="text-gray-400">답변 없음</span>}
            </p>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-1">
          {!editing ? (
            <button
              onClick={() => { setDraft(value); setEditing(true); }}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-600 hover:border-teal-300 hover:text-teal-700"
            >
              <Pencil className="h-3 w-3" />
              수정
            </button>
          ) : (
            <>
              <button onClick={cancel} disabled={saving} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-600 disabled:opacity-50">
                <X className="h-3 w-3" />
              </button>
              <button onClick={save} disabled={saving} className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-50">
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RawAnswersSection({ answers }: { answers: Record<string, string> }) {
  return (
    <div className="space-y-3">
      {Object.entries(answers).map(([key, val]) => (
        <div key={key} className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="mb-1 text-[10px] font-mono text-gray-400">{key}</div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{val}</p>
        </div>
      ))}
    </div>
  );
}

type FeedbackSection = { title: string; body: string };

function parseFeedback(raw: string | null): FeedbackSection[] {
  if (!raw) return [];
  const sections: FeedbackSection[] = [];
  const lines = raw.split("\n");
  let current: FeedbackSection | null = null;
  for (const line of lines) {
    const m = line.match(/^###\s+(.+)/);
    if (m) {
      if (current) sections.push(current);
      current = { title: m[1].trim(), body: "" };
    } else if (current) {
      current.body += (current.body ? "\n" : "") + line;
    }
  }
  if (current) sections.push(current);
  return sections.map((s) => ({ ...s, body: s.body.trim() })).filter((s) => s.body);
}
