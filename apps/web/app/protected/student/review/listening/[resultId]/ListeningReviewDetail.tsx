"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Bookmark, Mic, Volume2 } from "lucide-react";
import type { LListeningTest2026Linear, LListeningTrack2026, LQuestion2026 } from "@/models/listening";
import { isChoiceCorrect } from "@/lib/utils/listeningChoice";

type AnswerEntry = { questionId: string; choiceIndex: number; isCorrect: boolean };

type Props = {
  resultId: string;
  test: LListeningTest2026Linear;
  answers: AnswerEntry[];
  module: number;
  difficulty: "hard" | "easy" | null;
  initialNotes: Record<string, string>;
};

type FlatQuestion = LQuestion2026 & {
  track: LListeningTrack2026;
};

function tracksForModule(test: LListeningTest2026Linear, module: number, difficulty: "hard" | "easy" | null): LListeningTrack2026[] {
  if (module === 1) return test.modules?.[0]?.items ?? [];
  const pool = difficulty === "easy" ? test.stage2Pool?.easy : test.stage2Pool?.hard;
  return pool?.items ?? test.modules?.[1]?.items ?? [];
}

function groupByTrack(questions: FlatQuestion[]) {
  const seen = new Map<string, { track: LListeningTrack2026; questions: FlatQuestion[] }>();
  for (const q of questions) {
    if (!seen.has(q.track.id)) seen.set(q.track.id, { track: q.track, questions: [] });
    seen.get(q.track.id)!.questions.push(q);
  }
  return [...seen.values()];
}

export default function ListeningReviewDetail({ resultId, test, answers, module, difficulty, initialNotes }: Props) {
  const [tab, setTab] = useState<"review" | "voca" | "notes" | "shadowing">("review");
  const [expandedQ, setExpandedQ] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>(initialNotes);
  const [savingNote, setSavingNote] = useState<string | null>(null);
  const [vocab, setVocab] = useState<{ word: string; pos: string; meaning: string; loading?: boolean }[]>([]);

  const tracks = tracksForModule(test, module, difficulty);

  const allQuestions: FlatQuestion[] = [];
  for (const track of tracks) {
    for (const q of track.questions ?? []) {
      allQuestions.push({ ...q, track });
    }
  }

  const answerMap = new Map(answers.map((a) => [a.questionId, a]));
  const correct = allQuestions.filter((q) => answerMap.get(q.id)?.isCorrect).length;

  const groups = groupByTrack(allQuestions);

  async function saveNote(questionId: string, note: string) {
    setSavingNote(questionId);
    try {
      await fetch("/api/updated-listening/review/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultId, questionId, note }),
      });
    } finally {
      setSavingNote(null);
    }
  }

  async function toggleVocabWord(word: string, context: string) {
    const lower = word.toLowerCase();
    if (vocab.some((v) => v.word.toLowerCase() === lower)) {
      setVocab((prev) => prev.filter((v) => v.word.toLowerCase() !== lower));
      return;
    }
    setVocab((prev) => [...prev, { word, pos: "", meaning: "뜻을 찾는 중...", loading: true }]);
    try {
      const res = await fetch("/api/reading/ai-explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "vocab", content: word, context }),
      });
      const data = await res.json();
      setVocab((prev) =>
        prev.map((v) =>
          v.word.toLowerCase() === lower
            ? { word, pos: data.pos ?? "", meaning: data.meaning ?? "뜻을 찾지 못했습니다", loading: false }
            : v
        )
      );
    } catch {
      setVocab((prev) =>
        prev.map((v) => (v.word.toLowerCase() === lower ? { word, pos: "", meaning: "뜻을 찾지 못했습니다", loading: false } : v))
      );
    }
  }

  function renderClickableTranscript(text: string) {
    const words = text.match(/\b[\w'-]+\b|[.,!?;:]/g) || [];
    return words.map((word, idx) => {
      const isWord = /^[\w'-]+$/.test(word);
      if (!isWord) return <span key={idx}>{word} </span>;
      const isSelected = vocab.some((v) => v.word.toLowerCase() === word.toLowerCase());
      return (
        <button
          key={idx}
          onClick={() => toggleVocabWord(word, text)}
          className={`rounded px-0.5 transition ${
            isSelected ? "bg-yellow-300 font-bold text-yellow-900 hover:bg-yellow-400" : "hover:bg-yellow-100"
          }`}
        >
          {word}
        </button>
      );
    });
  }

  if (allQuestions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
        이 결과에 해당하는 문제 데이터를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setTab("review")}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            tab === "review" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          정/오답
        </button>
        <button
          onClick={() => setTab("voca")}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            tab === "voca" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          단어 ({vocab.length})
        </button>
        <button
          onClick={() => setTab("notes")}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            tab === "notes" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          노트
        </button>
        <button
          onClick={() => setTab("shadowing")}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            tab === "shadowing" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          섀도잉
        </button>
      </div>

      {/* Review Tab */}
      {tab === "review" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-emerald-50 p-4 border border-emerald-200">
              <div className="text-sm font-medium text-emerald-900">정답</div>
              <div className="text-2xl font-bold text-emerald-700">{correct}</div>
            </div>
            <div className="rounded-lg bg-rose-50 p-4 border border-rose-200">
              <div className="text-sm font-medium text-rose-900">오답</div>
              <div className="text-2xl font-bold text-rose-700">{allQuestions.length - correct}</div>
            </div>
          </div>

          {groups.map(({ track, questions }) => (
            <div key={track.id} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              {/* 오디오 다시 듣기 */}
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                <Volume2 className="h-4 w-4 shrink-0 text-slate-500" />
                {track.audioUrl ? (
                  <audio controls src={track.audioUrl} className="h-8 flex-1" />
                ) : (
                  <span className="text-xs text-slate-400">이 트랙에는 오디오 파일이 없습니다</span>
                )}
              </div>

              {track.transcript && (
                <details className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <summary className="cursor-pointer font-semibold text-slate-700">스크립트 보기</summary>
                  <p className="mt-2 leading-relaxed whitespace-pre-wrap">{track.transcript}</p>
                </details>
              )}

              {questions.map((q) => {
                const ans = answerMap.get(q.id);
                const isCorrect = ans?.isCorrect ?? false;
                const isExpanded = expandedQ === q.id;

                return (
                  <div
                    key={q.id}
                    className={`rounded-lg border ${isCorrect ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}
                  >
                    <button onClick={() => setExpandedQ(isExpanded ? null : q.id)} className="w-full px-4 py-3 flex items-start justify-between">
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-bold ${isCorrect ? "text-emerald-700" : "text-rose-700"}`}>Q{q.number}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                            {ans ? (isCorrect ? "정답" : "오답") : "무응답"}
                          </span>
                        </div>
                        {q.stem && <p className={`text-sm ${isCorrect ? "text-emerald-900" : "text-rose-900"}`}>{q.stem}</p>}
                      </div>
                      {isExpanded ? <ChevronUp className="h-5 w-5 flex-shrink-0 mt-1" /> : <ChevronDown className="h-5 w-5 flex-shrink-0 mt-1" />}
                    </button>

                    {isExpanded && (
                      <div className="border-t px-4 py-3 space-y-3">
                        <div>
                          <div className="text-xs font-semibold text-gray-600 mb-2">선택지</div>
                          <div className="space-y-2">
                            {q.choices.map((choice, idx) => {
                              const isChosen = ans != null && q.choices[ans.choiceIndex]?.id === choice.id;
                              const choiceIsCorrect = isChoiceCorrect(choice);
                              return (
                                <div
                                  key={choice.id}
                                  className={`rounded p-2.5 space-y-1.5 ${
                                    choiceIsCorrect
                                      ? "bg-emerald-100 text-emerald-900"
                                      : isChosen
                                        ? "bg-rose-100 text-rose-900"
                                        : "bg-gray-50 text-gray-700"
                                  }`}
                                >
                                  <div className="text-sm font-medium">
                                    {String.fromCharCode(65 + idx)}. {choice.text}
                                    {choiceIsCorrect && <span className="ml-2 rounded bg-emerald-200 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">정답</span>}
                                    {isChosen && !choiceIsCorrect && <span className="ml-2 rounded bg-rose-200 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">내 답</span>}
                                  </div>
                                  {choice.explanation && (
                                    <div className="text-xs leading-relaxed opacity-90 pl-4 border-l-2 border-current">{choice.explanation}</div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Vocabulary Tab */}
      {tab === "voca" && (
        <div className="space-y-4">
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <p className="text-sm text-blue-900">스크립트에서 모르는 단어를 클릭하면 AI가 문맥에 맞는 뜻을 찾아줍니다.</p>
          </div>

          <div className="space-y-3">
            {groups.map(({ track }) =>
              track.transcript ? (
                <div key={track.id} className="rounded-lg border p-4">
                  <p className="mb-2 text-xs font-semibold text-gray-500">{track.title ?? track.taskKind}</p>
                  <p className="text-sm leading-relaxed text-gray-800">{renderClickableTranscript(track.transcript)}</p>
                </div>
              ) : null
            )}
          </div>

          {vocab.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
              <p className="mb-3 text-sm font-semibold text-amber-900">정리된 단어 ({vocab.length})</p>
              <div className="space-y-2">
                {vocab.map((item, idx) => (
                  <div key={idx} className={`rounded-lg bg-white border border-amber-200 p-2 ${item.loading ? "opacity-60" : ""}`}>
                    <p className="text-sm font-bold text-amber-900">{item.word}</p>
                    {item.pos && <p className="text-xs text-amber-700">{item.pos}</p>}
                    <p className="text-xs italic text-amber-600">{item.meaning}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notes Tab */}
      {tab === "notes" && (
        <div className="space-y-4">
          {allQuestions.map((q) => (
            <div key={q.id} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-gray-400" />
                <span className="font-medium">Q{q.number}</span>
                {savingNote === q.id && <span className="text-[10px] text-gray-400">저장 중...</span>}
              </div>
              <textarea
                value={notes[q.id] || ""}
                onChange={(e) => setNotes({ ...notes, [q.id]: e.target.value })}
                onBlur={(e) => saveNote(q.id, e.target.value)}
                placeholder="이 문제에 대한 노트를 작성하세요..."
                className="w-full p-2 border rounded text-sm"
                rows={3}
              />
            </div>
          ))}
        </div>
      )}

      {/* Shadowing Tab — 자체 구현 대신 실제 쉐도잉 게임(녹음+발음 채점)으로 연결한다 */}
      {tab === "shadowing" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 text-center space-y-3">
            <Mic className="mx-auto h-8 w-8 text-blue-600" />
            <p className="text-sm font-semibold text-blue-900">발음 연습은 쉐도잉 게임에서 이어서 하세요</p>
            <p className="text-xs text-blue-700">
              녹음하고 발음을 채점받아 포인트까지 쌓을 수 있는 쉐도잉 게임이 따로 있어요. 이 화면의 오답 트랙 음성은
              위 "정/오답" 탭에서 다시 들을 수 있습니다.
            </p>
            <Link
              href="/speaking-2026/shadowing"
              className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              쉐도잉 게임으로 이동 →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
