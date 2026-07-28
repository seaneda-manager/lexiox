"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown, ChevronUp, Sparkles, Bookmark, Mic } from "lucide-react";
import type { ListeningTest2026 } from "@/models/listening";

type Props = {
  resultId: string;
  test: ListeningTest2026;
  answers: Record<string, number>;
  module: number;
  difficulty: "hard" | "easy" | null;
};

type QuestionData = {
  id: string;
  number: number;
  stem?: string;
  choices: { id: string; text: string; isCorrect: boolean }[];
  transcript?: string;
  explanation?: string;
};

export default function ListeningReviewDetail({
  resultId,
  test,
  answers,
  module,
  difficulty,
}: Props) {
  const [expandedQ, setExpandedQ] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [vocaList, setVocaList] = useState<string[]>([]);

  // Flatten all questions with metadata
  const allQuestions: QuestionData[] = [];

  if (test.module1?.tracks) {
    test.module1.tracks.forEach((track, trackIdx) => {
      track.questions?.forEach((q, qIdx) => {
        allQuestions.push({
          id: `m1-${trackIdx}-${qIdx}`,
          number: allQuestions.length + 1,
          stem: q.stem,
          choices: q.choices || [],
          transcript: track.transcript,
          explanation: q.explanation,
        });
      });
    });
  }

  if ((difficulty === "hard" ? test.module2Hard : test.module2Easy)?.tracks) {
    const tracks = (difficulty === "hard" ? test.module2Hard : test.module2Easy)!.tracks;
    tracks.forEach((track, trackIdx) => {
      track.questions?.forEach((q, qIdx) => {
        allQuestions.push({
          id: `m2-${trackIdx}-${qIdx}`,
          number: allQuestions.length + 1,
          stem: q.stem,
          choices: q.choices || [],
          transcript: track.transcript,
          explanation: q.explanation,
        });
      });
    });
  }

  const userAnswers = answers || {};
  const correct = allQuestions.filter((q) => {
    const choiceIdx = userAnswers[q.id];
    return choiceIdx !== undefined && q.choices[choiceIdx]?.isCorrect;
  }).length;

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <Tabs defaultValue="review" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="review">정/오답</TabsTrigger>
          <TabsTrigger value="vocabulary">단어</TabsTrigger>
          <TabsTrigger value="notes">노트</TabsTrigger>
          <TabsTrigger value="shadowing">섀도잉</TabsTrigger>
        </TabsList>

        {/* Review Tab: Correct/Incorrect */}
        <TabsContent value="review" className="space-y-4">
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

          <div className="space-y-3">
            {allQuestions.map((q) => {
              const choiceIdx = userAnswers[q.id];
              const selected = choiceIdx !== undefined ? q.choices[choiceIdx] : null;
              const correct = selected?.isCorrect;
              const isExpanded = expandedQ === q.id;

              return (
                <div
                  key={q.id}
                  className={`rounded-lg border ${
                    correct
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-rose-200 bg-rose-50"
                  }`}
                >
                  <button
                    onClick={() => setExpandedQ(isExpanded ? null : q.id)}
                    className="w-full px-4 py-3 flex items-start justify-between"
                  >
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-bold ${correct ? "text-emerald-700" : "text-rose-700"}`}>
                          Q{q.number}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                          correct ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        }`}>
                          {correct ? "정답" : "오답"}
                        </span>
                      </div>
                      {q.stem && (
                        <p className={`text-sm ${correct ? "text-emerald-900" : "text-rose-900"}`}>
                          {q.stem}
                        </p>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 flex-shrink-0 mt-1" />
                    ) : (
                      <ChevronDown className="h-5 w-5 flex-shrink-0 mt-1" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="border-t px-4 py-3 space-y-3">
                      {/* Choices */}
                      <div>
                        <div className="text-xs font-semibold text-gray-600 mb-2">선택지</div>
                        <div className="space-y-1">
                          {q.choices.map((choice, idx) => (
                            <div
                              key={choice.id}
                              className={`text-sm p-2 rounded ${
                                selected?.id === choice.id
                                  ? choice.isCorrect
                                    ? "bg-emerald-100 text-emerald-900"
                                    : "bg-rose-100 text-rose-900 line-through"
                                  : choice.isCorrect
                                  ? "bg-emerald-100 text-emerald-900"
                                  : "text-gray-700"
                              }`}
                            >
                              {String.fromCharCode(65 + idx)}. {choice.text}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Transcript */}
                      {q.transcript && (
                        <div>
                          <div className="text-xs font-semibold text-gray-600 mb-2">음성 스크립트</div>
                          <p className="text-sm text-gray-700 leading-relaxed">{q.transcript}</p>
                        </div>
                      )}

                      {/* Explanation */}
                      {q.explanation && (
                        <div>
                          <div className="text-xs font-semibold text-gray-600 mb-2">해설</div>
                          <p className="text-sm text-gray-700 leading-relaxed">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Vocabulary Tab */}
        <TabsContent value="vocabulary" className="space-y-4">
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <p className="text-sm text-blue-900">
              모르는 단어와 표현을 체크하면 자동으로 정리됩니다.
            </p>
          </div>

          <div className="space-y-2">
            {allQuestions.map((q) => (
              <div key={q.id} className="rounded-lg border p-3 space-y-2">
                <p className="text-sm font-medium">Q{q.number}</p>
                <div className="text-xs text-gray-600 space-y-1">
                  {q.transcript && (
                    <div>
                      <span className="font-semibold">음성:</span> {q.transcript}
                    </div>
                  )}
                  {q.choices.map((choice) => (
                    <div key={choice.id} className="text-xs text-gray-600">
                      {choice.text}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {vocaList.length > 0 && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
              <div className="text-sm font-semibold text-emerald-900 mb-2">정리된 단어 ({vocaList.length})</div>
              <div className="space-y-1">
                {vocaList.map((word) => (
                  <div key={word} className="text-sm text-emerald-800">• {word}</div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-4">
          <div className="space-y-4">
            {allQuestions.map((q) => (
              <div key={q.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Bookmark className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">Q{q.number}</span>
                </div>
                <textarea
                  value={notes[q.id] || ""}
                  onChange={(e) => setNotes({ ...notes, [q.id]: e.target.value })}
                  placeholder="이 문제에 대한 노트를 작성하세요..."
                  className="w-full p-2 border rounded text-sm"
                  rows={3}
                />
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Shadowing Tab */}
        <TabsContent value="shadowing" className="space-y-4">
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <p className="text-sm text-blue-900">
              오답한 문제들의 음성을 따라 읽으며 발음과 리듬을 연습하세요.
            </p>
          </div>

          <div className="space-y-3">
            {allQuestions
              .filter((q) => {
                const choiceIdx = userAnswers[q.id];
                const selected = choiceIdx !== undefined ? q.choices[choiceIdx] : null;
                return !selected?.isCorrect;
              })
              .map((q) => (
                <div key={q.id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Q{q.number}</span>
                    <button className="flex items-center gap-1 px-3 py-1.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 text-sm">
                      <Mic className="h-4 w-4" />
                      재생
                    </button>
                  </div>
                  {q.transcript && (
                    <p className="text-sm text-gray-700 leading-relaxed">{q.transcript}</p>
                  )}
                </div>
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
