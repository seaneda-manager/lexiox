"use client";

import { useState } from "react";
import { Sparkles, Loader2, ChevronDown, ChevronUp, Pencil, Check, X } from "lucide-react";
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
}: {
  sessionId: string;
  rawAnswers: Record<string, string>;
  test: WWritingTest2026 | null;
  initialFeedback?: string | null;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(rawAnswers ?? {});
  const [scriptChanged, setScriptChanged] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(initialFeedback ?? null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(!!initialFeedback);

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
      setFeedbackOpen(true);
      setScriptChanged(false);
    } catch (e) {
      setFeedbackError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setFeedbackLoading(false);
    }
  }

  const feedbackSections = parseFeedback(feedback);

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
