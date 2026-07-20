"use client";

import { useState, useEffect, useRef } from "react";
import type { GrammarDrill, GrammarStudentResponse } from "@/models/grammar/types";

const OPTION_LABELS = ["A", "B", "C", "D"];

type Props = {
  drills: GrammarDrill[];
  onDone: (responses: GrammarStudentResponse[]) => void;
};

export default function DrillRunner({ drills, onDone }: Props) {
  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState<GrammarStudentResponse[]>([]);

  if (drills.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm">
        드릴 문제가 아직 준비되지 않았습니다.
        <br />
        <button onClick={() => onDone([])} className="mt-4 px-5 py-2 bg-blue-500 text-white text-sm rounded-xl hover:bg-blue-600 transition">
          다음으로
        </button>
      </div>
    );
  }

  const handleResponse = (r: GrammarStudentResponse) => {
    const next = [...responses, r];
    setResponses(next);
    if (index + 1 >= drills.length) {
      onDone(next);
    } else {
      setIndex((i) => i + 1);
    }
  };

  return (
    <div>
      {/* 드릴 진행 표시 */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          드릴 문제
        </p>
        <div className="flex gap-1.5">
          {drills.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i < index
                  ? "bg-blue-400"
                  : i === index
                  ? "bg-blue-600"
                  : "bg-gray-200"
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-gray-400">{index + 1} / {drills.length}</p>
      </div>

      <DrillItem key={drills[index].id} drill={drills[index]} onSubmit={handleResponse} />
    </div>
  );
}

function DrillItem({
  drill,
  onSubmit,
}: {
  drill: GrammarDrill;
  onSubmit: (r: GrammarStudentResponse) => void;
}) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);
  const [labelSubmitted, setLabelSubmitted] = useState(false);
  const labelRef = useRef<HTMLDivElement>(null);

  // 정답 확인 후 자동으로 레이블 영역 열기
  useEffect(() => {
    if (answerSubmitted && !labelSubmitted) {
      const t = setTimeout(() => {
        setAccordionOpen(true);
        labelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 600);
      return () => clearTimeout(t);
    }
  }, [answerSubmitted, labelSubmitted]);

  const options: string[] =
    drill.type === "judgment"
      ? ["correct", "incorrect"]
      : [drill.answer, ...drill.distractors].sort(() => Math.random() - 0.5);

  const JUDGMENT_LABEL: Record<string, string> = {
    correct: "✓ 맞다 (Correct)",
    incorrect: "✗ 틀리다 (Incorrect)",
  };
  const displayOption = (opt: string) => JUDGMENT_LABEL[opt] ?? opt;

  // useMemo 대신 초기화 시점에 fix — key prop으로 컴포넌트 리마운트되므로 안전
  const [shuffledOptions] = useState(options);

  const handleAnswerSubmit = () => {
    if (!selectedAnswer) return;
    setAnswerSubmitted(true);
  };

  const handleLabelSubmit = () => {
    if (!selectedLabelId) return;
    setLabelSubmitted(true);
  };

  const answer_correct = selectedAnswer === drill.answer;
  const correctLabel = drill.grammar_labels.find((l) => l.is_correct);
  const label_correct = selectedLabelId === correctLabel?.id;

  const INSTRUCTION: Record<string, string> = {
    fill: "빈칸에 알맞은 보기를 고르세요.",
    judgment: "문법적으로 올바른 문장인지 판단하세요.",
    reorder: "단어를 올바른 순서로 배열하세요.",
    correction: "밑줄 친 부분 중 오류를 고르세요.",
    listen_judge: "음성을 듣고 문법적으로 맞는지 고르세요.",
  };

  return (
    <div className="space-y-5">
      {/* Instruction + 문법 개념 태그 */}
      <div className="flex items-start gap-3">
        <p className="text-sm text-gray-600 flex-1">
          {INSTRUCTION[drill.type] ?? "알맞은 보기를 고르세요."}
        </p>
        <span className="shrink-0 text-xs text-blue-500 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
          {correctLabel?.label_ko ?? "문법 개념"}
        </span>
      </div>

      {/* 문장 */}
      <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
        <p className="text-base font-medium leading-relaxed text-gray-900">
          {drill.sentence}
        </p>
      </div>

      {/* 선택지 (1단계) */}
      {!answerSubmitted ? (
        <div className="space-y-2">
          {shuffledOptions.map((opt, i) => (
            <button
              key={opt}
              onClick={() => setSelectedAnswer(opt)}
              className={`w-full text-left text-sm px-4 py-3 rounded-xl border transition flex items-center gap-3
                ${selectedAnswer === opt
                  ? "border-blue-400 bg-blue-50 font-medium text-blue-900"
                  : "border-gray-200 hover:border-gray-300 text-gray-700"}`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                ${selectedAnswer === opt ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500"}`}>
                {OPTION_LABELS[i]}
              </span>
              {displayOption(opt)}
            </button>
          ))}
          <button
            onClick={handleAnswerSubmit}
            disabled={!selectedAnswer}
            className="mt-2 w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 disabled:opacity-30 transition"
          >
            정답 확인
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* 선택지 결과 표시 */}
          <div className="space-y-2">
            {shuffledOptions.map((opt, i) => {
              const isSelected = opt === selectedAnswer;
              const isCorrectOpt = opt === drill.answer;
              return (
                <div
                  key={opt}
                  className={`flex items-center gap-3 text-sm px-4 py-3 rounded-xl border
                    ${isCorrectOpt
                      ? "border-green-300 bg-green-50 text-green-800"
                      : isSelected && !isCorrectOpt
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-gray-100 text-gray-400"}`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                    ${isCorrectOpt ? "bg-green-500 text-white" : isSelected ? "bg-red-400 text-white" : "bg-gray-100 text-gray-400"}`}>
                    {isCorrectOpt ? "✓" : OPTION_LABELS[i]}
                  </span>
                  {displayOption(opt)}
                  {isSelected && !isCorrectOpt && (
                    <span className="ml-auto text-xs text-red-400">내 선택</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* 정오 피드백 */}
          <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
            answer_correct ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}>
            {answer_correct
              ? "정답입니다!"
              : `오답 — 정답은 "${displayOption(drill.answer)}"입니다.`}
          </div>

          {/* 레이블 선택 영역 (자동 오픈) */}
          <div ref={labelRef}>
            {accordionOpen && !labelSubmitted && (
              <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-indigo-700 mb-0.5">
                    이 문제가 테스트하는 문법 개념은?
                  </p>
                  <p className="text-xs text-indigo-400">
                    정확한 개념 파악이 진짜 학습입니다.
                  </p>
                </div>
                <div className="space-y-2">
                  {drill.grammar_labels.map((lbl, i) => (
                    <button
                      key={lbl.id}
                      onClick={() => setSelectedLabelId(lbl.id)}
                      className={`w-full text-left text-sm px-3 py-2.5 rounded-lg border transition flex items-center gap-2
                        ${selectedLabelId === lbl.id
                          ? "border-indigo-400 bg-indigo-100 font-medium text-indigo-900"
                          : "border-indigo-200 bg-white hover:bg-indigo-50 text-gray-700"}`}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                        ${selectedLabelId === lbl.id ? "bg-indigo-500 text-white" : "bg-indigo-100 text-indigo-400"}`}>
                        {OPTION_LABELS[i]}
                      </span>
                      {lbl.label_ko}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleLabelSubmit}
                  disabled={!selectedLabelId}
                  className="w-full py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-30 transition"
                >
                  개념 확인
                </button>
              </div>
            )}

            {/* 레이블 결과 */}
            {labelSubmitted && (
              <div className={`px-4 py-3 rounded-xl text-sm ${
                label_correct
                  ? "bg-indigo-50 text-indigo-700"
                  : "bg-orange-50 text-orange-700"
              }`}>
                {label_correct
                  ? `개념 정확히 파악! ✓ [${correctLabel?.label_ko}]`
                  : `개념 재확인 필요 — 정답: [${correctLabel?.label_ko}]`}
              </div>
            )}
          </div>

          {/* 다음 버튼 */}
          {labelSubmitted && (
            <button
              onClick={() => {
                const response: GrammarStudentResponse = {
                  drill_id: drill.id,
                  answer_correct,
                  label_correct,
                  selected_answer: selectedAnswer ?? undefined,
                  selected_label_id: selectedLabelId ?? undefined,
                  accordion_opened: accordionOpen,
                };
                fetch("/api/grammar-2026/response", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(response),
                }).catch(() => {});
                onSubmit(response);
              }}
              className="w-full py-2.5 bg-blue-500 text-white text-sm font-medium rounded-xl hover:bg-blue-600 transition"
            >
              다음 문제 →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
