"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Sparkles, Loader2, BookOpen, Languages, Bookmark, Dumbbell, Lock, Pin } from "lucide-react";
import type { RQuestion, RChoice } from "@/models/reading";

// 정답이어도 이 유형들은 추측으로 맞혔을 가능성이 있어 핵심 요지 확인을 필수로 요구한다.
const MANDATORY_TYPES = new Set(["inference", "negative_detail", "insertion", "insert_sentence"]);

function isMandatoryQuestion(q: FlatQuestion, chosenId: string | null) {
  const chosenChoice = q.choices.find((c) => c.id === chosenId);
  const isCorrect = chosenChoice?.isCorrect ?? false;
  if (!isCorrect) return true; // 오답/무응답은 전부 필수
  return MANDATORY_TYPES.has(q.type); // 정답이어도 고난도 유형이면 필수
}

function keyPointOf(q: FlatQuestion): string {
  const correctChoice = q.choices.find((c) => c.isCorrect);
  return (
    q.keyPointSummary?.trim() ||
    q.rationale?.trim() ||
    q.clueQuote?.trim() ||
    correctChoice?.explain?.trim() ||
    correctChoice?.text?.trim() ||
    "이 문제의 핵심 근거"
  );
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

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
  /** 필수 확인 팝업 퀴즈용 AI 생성 콘텐츠. 없으면 rationale/clueQuote 등으로 대체한다. */
  keyPointSummary?: string | null;
  keyPointDistractors?: string[] | null;
};

type AnswerMap = Map<string, string | null>; // questionId → chosenChoiceId

// ── Main component ───────────────────────────────────────────────────

export default function ReadingReviewV2({
  resultId,
  flatQuestions,
  answerMap,
  cwItems = [],
}: {
  resultId: string;
  flatQuestions: FlatQuestion[];
  answerMap: Record<string, string | null>;
  cwItems?: CwReviewItem[];
}) {
  const [tab, setTab] = useState<"review" | "voca">("review");
  const groups = groupByPassage(flatQuestions);
  const aMap = new Map(Object.entries(answerMap));

  // ── 필수 확인 게이트: 오답 + 정답이어도 고난도 유형인 문제는
  // 핵심 요지 팝업 퀴즈를 통과해야 다음 문제가 잠금 해제된다.
  const mandatoryIds = useMemo(
    () => flatQuestions.filter((q) => isMandatoryQuestion(q, aMap.get(q.id) ?? null)).map((q) => q.id),
    [flatQuestions, answerMap]
  );
  const [clearedMandatory, setClearedMandatory] = useState<Set<string>>(new Set());
  const [openGateId, setOpenGateId] = useState<string | null>(null);
  const activeMandatoryId = mandatoryIds.find((id) => !clearedMandatory.has(id)) ?? null;

  // 다음 필수 문제로 넘어갈 때마다 팝업을 자동으로 띄운다.
  useEffect(() => {
    setOpenGateId(activeMandatoryId);
  }, [activeMandatoryId]);

  const gateQuestion = flatQuestions.find((q) => q.id === openGateId) ?? null;

  // Extract all words and phrases from passages and choices
  const allText = [
    ...groups.map(g => g.passageText),
    ...flatQuestions.flatMap(q => q.choices.map(c => c.text))
  ].join(" ");

  const [unknownWords, setUnknownWords] = useState<Set<string>>(new Set());

  const toggleWord = (word: string) => {
    const newSet = new Set(unknownWords);
    if (newSet.has(word)) {
      newSet.delete(word);
    } else {
      newSet.add(word);
    }
    setUnknownWords(newSet);
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setTab("review")}
          className={`px-4 py-2 font-medium border-b-2 ${
            tab === "review"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          정/오답 리뷰
        </button>
        <button
          onClick={() => setTab("voca")}
          className={`px-4 py-2 font-medium border-b-2 flex items-center gap-2 ${
            tab === "voca"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          <Bookmark className="h-4 w-4" />
          단어 분석 ({unknownWords.size})
        </button>
      </div>

      {/* Review Tab */}
      {tab === "review" && (
        <div className="space-y-8">
          {/* Complete the Words 섹션 */}
          {cwItems.length > 0 && (
            <CompleteWordsReview cwItems={cwItems} answerMap={aMap} />
          )}
          {/* Academic Passage 섹션 */}
          {groups.map((group, gi) => (
            <PassageGroup
              key={gi}
              group={group}
              answerMap={aMap}
              resultId={resultId}
              mandatoryIds={mandatoryIds}
              clearedMandatory={clearedMandatory}
              activeMandatoryId={activeMandatoryId}
              onOpenGate={setOpenGateId}
            />
          ))}
        </div>
      )}

      {gateQuestion && (
        <KeyPointGateModal
          question={gateQuestion}
          onClose={() => setOpenGateId(null)}
          onPass={() => {
            setClearedMandatory((prev) => new Set(prev).add(gateQuestion.id));
            setOpenGateId(null);
          }}
        />
      )}

      {/* Voca Tab */}
      {tab === "voca" && (
        <VocaAnalysis
          passages={groups.map(g => g.passageText)}
          questions={flatQuestions}
          unknownWords={unknownWords}
          onToggleWord={toggleWord}
        />
      )}
    </div>
  );
}

function VocaAnalysis({
  passages,
  questions,
  unknownWords,
  onToggleWord,
}: {
  passages: string[];
  questions: FlatQuestion[];
  unknownWords: Set<string>;
  onToggleWord: (word: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <p className="text-sm text-blue-900">
          모르는 단어와 표현을 클릭하여 표시하면 자동으로 정리됩니다.
        </p>
      </div>

      {/* Passages */}
      <div className="space-y-4">
        {passages.map((text, idx) => (
          <div key={idx} className="rounded-lg border p-4 space-y-2">
            <p className="text-sm font-semibold text-gray-700">Passage {idx + 1}</p>
            <p className="text-sm text-gray-600 leading-relaxed">{text}</p>
          </div>
        ))}
      </div>

      {/* Questions & Choices */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-gray-700">선택지와 표현</p>
        {questions.map((q) => (
          <div key={q.id} className="rounded-lg border p-3 space-y-2">
            <p className="text-xs font-medium text-gray-600">Q{q.number}</p>
            <div className="space-y-1">
              {q.choices.map((choice) => (
                <p key={choice.id} className="text-sm text-gray-700">
                  • {choice.text}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Known Words List */}
      {unknownWords.size > 0 && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
          <p className="text-sm font-semibold text-emerald-900 mb-3">
            정리된 단어 ({unknownWords.size})
          </p>
          <div className="flex flex-wrap gap-2">
            {Array.from(unknownWords).map((word) => (
              <button
                key={word}
                onClick={() => onToggleWord(word)}
                className="px-3 py-1 rounded-full bg-emerald-200 text-emerald-900 text-sm hover:bg-emerald-300 transition"
              >
                {word} ×
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Passage group ────────────────────────────────────────────────────

function PassageGroup({
  group,
  answerMap,
  resultId,
  mandatoryIds,
  clearedMandatory,
  activeMandatoryId,
  onOpenGate,
}: {
  group: { passageHtml: string; passageText: string; questions: FlatQuestion[] };
  answerMap: AnswerMap;
  resultId: string;
  mandatoryIds: string[];
  clearedMandatory: Set<string>;
  activeMandatoryId: string | null;
  onOpenGate: (id: string) => void;
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
          <QuestionCard
            key={q.id}
            q={q}
            chosenId={answerMap.get(q.id) ?? null}
            resultId={resultId}
            isMandatory={mandatoryIds.includes(q.id)}
            isCleared={clearedMandatory.has(q.id)}
            isLocked={mandatoryIds.includes(q.id) && !clearedMandatory.has(q.id) && q.id !== activeMandatoryId}
            onOpenGate={() => onOpenGate(q.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Question card ────────────────────────────────────────────────────

function QuestionCard({
  q,
  chosenId,
  resultId,
  isMandatory,
  isCleared,
  isLocked,
  onOpenGate,
}: {
  q: FlatQuestion;
  chosenId: string | null;
  resultId: string;
  isMandatory: boolean;
  isCleared: boolean;
  isLocked: boolean;
  onOpenGate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [bgKnowledge, setBgKnowledge] = useState<string | null>(null);
  const [bgLoading, setBgLoading] = useState(false);
  const [qTranslation, setQTranslation] = useState<string | null>(null);
  const [qTransLoading, setQTransLoading] = useState(false);

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

  async function fetchQuestionTranslation() {
    if (qTranslation) { setOpen(true); return; }
    setQTransLoading(true);
    try {
      const choicesText = q.choices
        .map((c, idx) => `${String.fromCharCode(65 + idx)}. ${c.text}`)
        .join("\n");
      const content = `문제: ${q.stem}\n\n보기:\n${choicesText}`;
      const res = await fetch("/api/reading/ai-explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "translate", content }),
      });
      const data = await res.json();
      setQTranslation(data.result ?? "번역 실패");
      setOpen(true);
    } finally {
      setQTransLoading(false);
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

  if (isLocked) {
    return (
      <article className="rounded-xl border border-dashed bg-gray-50 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-4 text-gray-400">
          <Lock className="h-4 w-4 shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold">Q{q.number}</span>
              <QTypeBadge type={q.type} />
            </div>
            <p className="mt-0.5 text-xs">이전 필수 확인 문제를 먼저 통과해야 열립니다.</p>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="rounded-xl border bg-white shadow-sm overflow-hidden">
      {isMandatory && (
        <div
          className={`flex items-center justify-between gap-2 px-4 py-2 text-[11px] font-semibold ${
            isCleared ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          <span className="inline-flex items-center gap-1">
            <Pin className="h-3 w-3" />
            {isCleared ? "필수 확인 완료" : "필수 확인 문제 — 핵심 요지를 확인해야 통과됩니다"}
          </span>
          {!isCleared && (
            <button
              onClick={onOpenGate}
              className="rounded-full bg-amber-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-amber-700"
            >
              퀴즈 열기
            </button>
          )}
        </div>
      )}
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
          {isMandatory && !isCleared ? (
            <span className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-[10px] font-semibold text-gray-400">
              <Lock className="h-3 w-3" />
              퀴즈 통과 후 드릴 가능
            </span>
          ) : (
            <Link
              href={`/student/reading/drill/${resultId}/${q.id}`}
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold ${
                isCorrect
                  ? "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
                  : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
              }`}
            >
              <Dumbbell className="h-3 w-3" />
              드릴로 연습하기
            </Link>
          )}
          <button
            onClick={fetchQuestionTranslation}
            disabled={qTransLoading}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
          >
            {qTransLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3" />}
            번역
          </button>
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
      <div className="px-4 pb-3 space-y-2">
        {q.choices.map((c, idx) => {
          const letter = String.fromCharCode(65 + idx);
          const isChosen = c.id === chosenId;
          const choiceCls = c.isCorrect
            ? "border-green-300 bg-green-50 text-green-900"
            : isChosen && !c.isCorrect
            ? "border-red-300 bg-red-50 text-red-900"
            : "border-gray-200 bg-gray-50 text-gray-700";

          return (
            <div key={c.id} className={`rounded-lg border p-3 space-y-1.5 ${choiceCls}`}>
              <div className="flex items-start gap-2">
                <span className="font-bold mt-0.5 shrink-0">{letter}.</span>
                <span className="flex-1 leading-snug text-xs">{c.text}</span>
                {c.isCorrect && (
                  <span className="shrink-0 rounded bg-green-200 px-1 py-0.5 text-[9px] font-bold text-green-800">정답</span>
                )}
                {isChosen && !c.isCorrect && (
                  <span className="shrink-0 rounded bg-red-200 px-1 py-0.5 text-[9px] font-bold text-red-800">내 답</span>
                )}
              </div>
              {c.explain && (
                <div className="pl-6 text-[12px] leading-relaxed opacity-90">
                  <div className="text-[10px] font-semibold opacity-75 mb-1">해석:</div>
                  <p>{c.explain}</p>
                </div>
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
          {/* Question + choices translation */}
          {qTranslation && (
            <div className="px-4 py-3">
              <div className="mb-1 text-[10px] font-bold text-blue-600 uppercase tracking-wide flex items-center gap-1">
                <Languages className="h-3 w-3" />
                문제/보기 번역
              </div>
              <div className="text-xs leading-relaxed text-gray-800 whitespace-pre-wrap">{qTranslation}</div>
            </div>
          )}

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
          {!q.rationale && !q.clueQuote && !q.choices.some((c) => c.explain) && !bgKnowledge && !qTranslation && (
            <div className="px-4 py-3 text-xs text-gray-400">
              이 문항에는 등록된 해설이 없습니다. 위 "배경지식" 버튼으로 AI 설명을 받아보세요.
            </div>
          )}
        </div>
      )}
    </article>
  );
}

// ── 필수 확인 팝업 퀴즈 ──────────────────────────────────────────────
// TODO(콘텐츠): 지금은 플로우만 연결된 상태라 함정 보기가 임시 문구다.
// 실제로는 generate-explanations처럼 AI로 문제별 함정 보기를 생성해서
// reading_question_explanations에 저장해두고 여기서 읽어와야 한다.
function KeyPointGateModal({
  question,
  onPass,
  onClose,
}: {
  question: FlatQuestion;
  onPass: () => void;
  onClose: () => void;
}) {
  const correctOption = useMemo(() => keyPointOf(question), [question]);
  // AI가 문항별로 생성한 함정 보기가 있으면 그걸 쓰고, 없으면 임시 문구로 대체한다.
  const generatedDistractors = (question.keyPointDistractors ?? []).filter((d) => d?.trim());
  const distractors =
    generatedDistractors.length >= 2
      ? generatedDistractors.slice(0, 2)
      : ["문제와 직접적인 관련이 없는 진술입니다.", "정답과 반대되는 근거를 설명하는 내용입니다."];
  const options = useMemo(() => shuffle([correctOption, ...distractors]), [correctOption, distractors.join("|")]);

  const [selected, setSelected] = useState("");
  const [wrongTried, setWrongTried] = useState(false);

  function submit() {
    if (selected === correctOption) {
      onPass();
    } else {
      setWrongTried(true);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-2">
          <Pin className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <h3 className="text-sm font-bold text-gray-900">필수 확인 퀴즈</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Q{question.number} — 이 문제의 핵심 근거/설명 요지를 골라야 다음으로 넘어갈 수 있어요.
            </p>
          </div>
        </div>

        <select
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value);
            setWrongTried(false);
          }}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
        >
          <option value="">선택하세요</option>
          {options.map((opt, i) => (
            <option key={i} value={opt}>
              {opt}
            </option>
          ))}
        </select>

        {wrongTried && (
          <p className="text-xs font-medium text-rose-600">
            다시 생각해보세요 — 위 "해설" 버튼으로 지문 근거를 다시 확인해보세요.
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50"
          >
            나중에
          </button>
          <button
            onClick={submit}
            disabled={!selected}
            className="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
          >
            확인하고 통과하기
          </button>
        </div>
      </div>
    </div>
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
