"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles, Loader2, BookOpen, Languages } from "lucide-react";
import type { RQuestion, RChoice } from "@/models/reading";

// ── Question type labels & colors ────────────────────────────────────

const QTYPE_META: Record<string, { label: string; color: string }> = {
  vocab:             { label: "어휘",       color: "bg-sky-100 text-sky-700" },
  detail:            { label: "세부정보",   color: "bg-blue-100 text-blue-700" },
  negative_detail:   { label: "NOT 문제",   color: "bg-indigo-100 text-indigo-700" },
  inference:         { label: "추론",       color: "bg-violet-100 text-violet-700" },
  purpose:           { label: "목적",       color: "bg-purple-100 text-purple-700" },
  reference:         { label: "지칭",       color: "bg-fuchsia-100 text-fuchsia-700" },
  pronoun_ref:       { label: "대명사",     color: "bg-pink-100 text-pink-700" },
  paraphrasing:      { label: "바꿔쓰기",   color: "bg-rose-100 text-rose-700" },
  sentence_simplify: { label: "문장단순화", color: "bg-orange-100 text-orange-700" },
  insertion:         { label: "문장삽입",   color: "bg-amber-100 text-amber-700" },
  insert_sentence:   { label: "문장삽입",   color: "bg-amber-100 text-amber-700" },
  summary:           { label: "요약",       color: "bg-teal-100 text-teal-700" },
  organization:      { label: "구조",       color: "bg-emerald-100 text-emerald-700" },
};

function QTypeBadge({ type }: { type: string }) {
  const m = QTYPE_META[type] ?? { label: type, color: "bg-gray-100 text-gray-600" };
  return (
    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${m.color}`}>
      {m.label}
    </span>
  );
}

// ── Types ────────────────────────────────────────────────────────────

export type CwReviewItem = {
  id: string;
  paragraphHtml: string;
  blanks: { id: string; order: number; correctToken: string }[];
};

export type FlatQuestion = {
  id: string;
  number: number;
  type: string;
  stem: string;
  passageHtml: string;
  passageText: string;
  choices: { id: string; text: string; isCorrect: boolean; explain?: string | null }[];
  rationale?: string | null;
  clueQuote?: string | null;
};

type AnswerMap = Map<string, string | null>; // questionId → chosenChoiceId

// ── Main component ───────────────────────────────────────────────────

export default function ReadingReviewV2({
  flatQuestions,
  answerMap,
  cwItems = [],
}: {
  flatQuestions: FlatQuestion[];
  answerMap: Record<string, string | null>;
  cwItems?: CwReviewItem[];
}) {
  const groups = groupByPassage(flatQuestions);
  const aMap = new Map(Object.entries(answerMap));

  return (
    <div className="space-y-8">
      {/* Complete the Words 섹션 */}
      {cwItems.length > 0 && (
        <CompleteWordsReview cwItems={cwItems} answerMap={aMap} />
      )}
      {/* Academic Passage 섹션 */}
      {groups.map((group, gi) => (
        <PassageGroup key={gi} group={group} answerMap={aMap} />
      ))}
    </div>
  );
}

// ── Passage group ────────────────────────────────────────────────────

function PassageGroup({
  group,
  answerMap,
}: {
  group: { passageHtml: string; passageText: string; questions: FlatQuestion[] };
  answerMap: AnswerMap;
}) {
  const [showPassage, setShowPassage] = useState(true);
  const [translation, setTranslation] = useState<string | null>(null);
  const [transLoading, setTransLoading] = useState(false);
  const [showTrans, setShowTrans] = useState(false);

  async function fetchTranslation() {
    if (translation) { setShowTrans((v) => !v); return; }
    setTransLoading(true);
    try {
      const res = await fetch("/api/reading/ai-explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "translate", content: group.passageText }),
      });
      const data = await res.json();
      setTranslation(data.result ?? "번역 실패");
      setShowTrans(true);
    } finally {
      setTransLoading(false);
    }
  }

  const correct = group.questions.filter((q) => {
    const chosen = answerMap.get(q.id);
    return chosen != null && q.choices.find((c) => c.id === chosen)?.isCorrect;
  }).length;

  return (
    <div className="space-y-4">
      {/* Passage header */}
      <div className="rounded-xl border border-emerald-100 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-emerald-50">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-800">지문</span>
            <span className="text-[11px] text-gray-500">
              {correct}/{group.questions.length} 정답
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchTranslation}
              disabled={transLoading}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
            >
              {transLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3" />}
              한국어 번역
            </button>
            <button
              onClick={() => setShowPassage((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-500 hover:bg-gray-50"
            >
              {showPassage ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showPassage ? "접기" : "펼치기"}
            </button>
          </div>
        </div>

        {showPassage && (
          <div
            className="prose prose-sm max-h-[50vh] overflow-auto px-4 py-3 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: group.passageHtml }}
          />
        )}

        {showTrans && translation && (
          <div className="border-t border-emerald-50 bg-emerald-50/40 px-4 py-3">
            <div className="mb-1 text-[10px] font-bold text-emerald-700 uppercase tracking-wide">한국어 번역</div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{translation}</p>
          </div>
        )}
      </div>

      {/* Questions */}
      <div className="space-y-3">
        {group.questions.map((q) => (
          <QuestionCard key={q.id} q={q} chosenId={answerMap.get(q.id) ?? null} />
        ))}
      </div>
    </div>
  );
}

// ── Question card ────────────────────────────────────────────────────

function QuestionCard({ q, chosenId }: { q: FlatQuestion; chosenId: string | null }) {
  const [open, setOpen] = useState(false);
  const [bgKnowledge, setBgKnowledge] = useState<string | null>(null);
  const [bgLoading, setBgLoading] = useState(false);

  const correctChoice = q.choices.find((c) => c.isCorrect);
  const chosenChoice = q.choices.find((c) => c.id === chosenId);
  const isCorrect = chosenChoice?.isCorrect ?? false;
  const isUnanswered = !chosenId;

  async function fetchBg() {
    if (bgKnowledge) { setOpen(true); return; }
    setBgLoading(true);
    try {
      const context = `문제: ${q.stem}\n정답: ${correctChoice?.text ?? ""}\n지문 내용: ${q.passageText.slice(0, 800)}`;
      const res = await fetch("/api/reading/ai-explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "background", content: context }),
      });
      const data = await res.json();
      setBgKnowledge(data.result ?? "");
      setOpen(true);
    } finally {
      setBgLoading(false);
    }
  }

  const statusBadge = isUnanswered
    ? "무응답"
    : isCorrect
    ? "정답"
    : "오답";
  const statusColor = isUnanswered
    ? "bg-gray-100 text-gray-500"
    : isCorrect
    ? "bg-green-100 text-green-700"
    : "bg-red-100 text-red-700";

  return (
    <article className="rounded-xl border bg-white shadow-sm overflow-hidden">
      {/* Question header */}
      <div className="flex items-start justify-between gap-2 px-4 py-3">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-gray-700">Q{q.number}</span>
            <QTypeBadge type={q.type} />
            <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${statusColor}`}>
              {statusBadge}
            </span>
          </div>
          <p className="text-sm text-gray-900 leading-snug">{q.stem}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={fetchBg}
            disabled={bgLoading}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
          >
            {bgLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            배경지식
          </button>
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-medium text-gray-500 hover:bg-gray-50"
          >
            {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            해설
          </button>
        </div>
      </div>

      {/* Choices */}
      <div className="px-4 pb-3 space-y-1.5">
        {q.choices.map((c, idx) => {
          const letter = String.fromCharCode(65 + idx);
          const isChosen = c.id === chosenId;
          const choiceCls = c.isCorrect
            ? "border-green-300 bg-green-50 text-green-900"
            : isChosen && !c.isCorrect
            ? "border-red-300 bg-red-50 text-red-900"
            : "border-gray-200 bg-gray-50 text-gray-700";

          return (
            <div key={c.id} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${choiceCls}`}>
              <span className="font-bold mt-0.5 shrink-0">{letter}.</span>
              <span className="flex-1 leading-snug">{c.text}</span>
              {c.isCorrect && (
                <span className="shrink-0 rounded bg-green-200 px-1 py-0.5 text-[9px] font-bold text-green-800">정답</span>
              )}
              {isChosen && !c.isCorrect && (
                <span className="shrink-0 rounded bg-red-200 px-1 py-0.5 text-[9px] font-bold text-red-800">내 답</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Explanation + background */}
      {open && (
        <div className="border-t border-gray-100 bg-gray-50 divide-y divide-gray-100">
          {/* Rationale */}
          {(q.rationale || q.clueQuote) && (
            <div className="px-4 py-3 space-y-2">
              {q.clueQuote && (
                <blockquote className="border-l-2 border-emerald-400 pl-3 text-xs italic text-gray-600">
                  "{q.clueQuote}"
                </blockquote>
              )}
              {q.rationale && (
                <p className="text-xs leading-relaxed text-gray-800">{q.rationale}</p>
              )}
            </div>
          )}

          {/* Choice-level explanations */}
          {q.choices.some((c) => c.explain) && (
            <div className="px-4 py-3 space-y-1.5">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">선택지 해설</div>
              {q.choices.map((c, idx) => c.explain ? (
                <div key={c.id} className="flex gap-2 text-xs">
                  <span className="font-bold shrink-0 text-gray-500">{String.fromCharCode(65 + idx)}.</span>
                  <span className="text-gray-700 leading-snug">{c.explain}</span>
                </div>
              ) : null)}
            </div>
          )}

          {/* Background knowledge */}
          {bgKnowledge && (
            <div className="px-4 py-3">
              <div className="mb-1 text-[10px] font-bold text-violet-600 uppercase tracking-wide flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                배경지식
              </div>
              <div className="text-xs leading-relaxed text-gray-800 whitespace-pre-wrap">{bgKnowledge}</div>
            </div>
          )}

          {/* No explanation at all */}
          {!q.rationale && !q.clueQuote && !q.choices.some((c) => c.explain) && !bgKnowledge && (
            <div className="px-4 py-3 text-xs text-gray-400">
              이 문항에는 등록된 해설이 없습니다. 위 "배경지식" 버튼으로 AI 설명을 받아보세요.
            </div>
          )}
        </div>
      )}
    </article>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

// ── Complete the Words Review ─────────────────────────────────────────

function CompleteWordsReview({
  cwItems,
  answerMap,
}: {
  cwItems: CwReviewItem[];
  answerMap: Map<string, string | null>;
}) {
  const totalBlanks = cwItems.reduce((s, it) => s + it.blanks.length, 0);
  const correctBlanks = cwItems.reduce((s, it) =>
    s + it.blanks.filter((b) => {
      const key = `cw__${it.id}__${b.id}`;
      const typed = (answerMap.get(key) ?? "").trim().toLowerCase();
      return typed === b.correctToken.toLowerCase();
    }).length, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs">Complete the Words</span>
        <span className="text-xs font-normal text-gray-500">{correctBlanks}/{totalBlanks} 정답</span>
      </div>

      {cwItems.map((item) => (
        <CwItemCard key={item.id} item={item} answerMap={answerMap} />
      ))}
    </div>
  );
}

function CwItemCard({
  item,
  answerMap,
}: {
  item: CwReviewItem;
  answerMap: Map<string, string | null>;
}) {
  function renderParagraph() {
    // Strip HTML tags, split on __ markers
    const plain = item.paragraphHtml.replace(/<[^>]+>/g, "");
    const parts = plain.split("__");
    return (
      <p className="text-sm leading-loose text-gray-900 whitespace-pre-wrap">
        {parts.map((part, i) => {
          const blank = item.blanks[i];
          if (!blank) return <span key={i}>{part}</span>;
          const key = `cw__${item.id}__${blank.id}`;
          const typed = (answerMap.get(key) ?? "").trim();
          const isCorrect = typed.toLowerCase() === blank.correctToken.toLowerCase();
          const isEmpty = !typed;

          return (
            <span key={i}>
              {part}
              <span className="mx-0.5 inline-flex flex-col items-center align-middle">
                <span className={[
                  "inline-block rounded px-1.5 py-0 text-xs font-bold leading-5",
                  isCorrect
                    ? "bg-green-100 text-green-800"
                    : isEmpty
                    ? "bg-gray-100 text-gray-400"
                    : "bg-red-100 text-red-800",
                ].join(" ")}>
                  {isEmpty ? "___" : typed}
                </span>
                {(!isCorrect || isEmpty) && (
                  <span className="text-[10px] leading-tight text-green-700">→ {blank.correctToken}</span>
                )}
              </span>
            </span>
          );
        })}
      </p>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
        {renderParagraph()}
      </div>
    </div>
  );
}

function groupByPassage(questions: FlatQuestion[]) {
  const seen = new Map<string, { passageHtml: string; passageText: string; questions: FlatQuestion[] }>();
  for (const q of questions) {
    if (!seen.has(q.passageHtml)) {
      seen.set(q.passageHtml, { passageHtml: q.passageHtml, passageText: q.passageText, questions: [] });
    }
    seen.get(q.passageHtml)!.questions.push(q);
  }
  return [...seen.values()];
}
