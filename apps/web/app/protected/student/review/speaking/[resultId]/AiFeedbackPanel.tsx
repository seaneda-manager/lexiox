"use client";

import { useState } from "react";
import { Sparkles, Loader2, ChevronDown, ChevronUp } from "lucide-react";

export default function AiFeedbackPanel({
  resultId,
  initialFeedback,
  scriptChanged,
}: {
  resultId: string;
  initialFeedback?: string | null;
  scriptChanged?: boolean;
}) {
  const [feedback, setFeedback] = useState<string | null>(initialFeedback ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(!!initialFeedback);

  async function requestFeedback() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/speaking/ai-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "오류 발생");
      setFeedback(data.feedback);
      setOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // Parse feedback into sections
  const sections = parseFeedback(feedback);

  return (
    <section className="rounded-xl border border-violet-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-500" />
          <span className="text-sm font-semibold text-violet-800">AI 첨삭</span>
          {feedback && !scriptChanged && (
            <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-600">
              완료
            </span>
          )}
          {feedback && scriptChanged && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-600">
              스크립트 변경됨
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!feedback && (
            <button
              onClick={requestFeedback}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-60 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  분석 중…
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3" />
                  AI 첨삭 받기
                </>
              )}
            </button>
          )}
          {feedback && (
            <button
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg border border-violet-100 px-2.5 py-1.5 text-[11px] font-medium text-violet-700 hover:bg-violet-50"
            >
              {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {open ? "접기" : "펼치기"}
            </button>
          )}
          {feedback && (
            <button
              onClick={requestFeedback}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-lg border border-violet-100 px-2.5 py-1.5 text-[11px] font-medium text-violet-600 hover:bg-violet-50 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              재분석
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mx-4 mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
      )}

      {/* Feedback Content */}
      {feedback && open && (
        <div className="border-t border-violet-100 divide-y divide-violet-50">
          {sections.length > 0
            ? sections.map((sec, i) => (
                <div key={i} className="px-4 py-3">
                  <div className="mb-1.5 text-[11px] font-bold text-violet-700 uppercase tracking-wide">
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
  );
}

type FeedbackSection = { title: string; body: string };

function parseFeedback(raw: string | null): FeedbackSection[] {
  if (!raw) return [];
  const sections: FeedbackSection[] = [];
  const lines = raw.split("\n");
  let current: FeedbackSection | null = null;

  for (const line of lines) {
    const headingMatch = line.match(/^###\s+(.+)/);
    if (headingMatch) {
      if (current) sections.push(current);
      current = { title: headingMatch[1].trim(), body: "" };
    } else if (current) {
      current.body += (current.body ? "\n" : "") + line;
    }
  }
  if (current) sections.push(current);

  return sections.map((s) => ({ ...s, body: s.body.trim() })).filter((s) => s.body);
}
