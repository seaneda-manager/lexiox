"use client";

import type { VocabTestQuestion } from "@/models/vocab/test.types";

export interface TestQuestionsTableProps {
  questions: VocabTestQuestion[];
  selectedIdx: number;
  onSelect: (idx: number) => void;
}

const questionTypeLabel: Record<string, string> = {
  word_to_meaning: "단어→뜻",
  meaning_to_word: "뜻→단어",
  synonym: "동의어",
  listening: "듣기",
};

// 같은 단어가 word_to_meaning(스펠링 노출)과 meaning_to_word(스펠링이 정답)로
// 동시에 목록에 걸리므로, 개별 항목만 마스킹해서는 다른 항목에서 스펠링이 새는 걸 막을 수 없다.
// 풀기 전에는 어떤 유형이든 단어/뜻 내용을 아예 보여주지 않고, 푼 뒤에만 복습용으로 노출한다.
function getListLabel(q: VocabTestQuestion): string {
  return q.is_correct !== null ? q.word_text : "문제";
}

export default function TestQuestionsTable({
  questions,
  selectedIdx,
  onSelect,
}: TestQuestionsTableProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="sticky top-0 bg-gray-100 px-4 py-3 border-b">
        <h3 className="font-semibold text-gray-800">문제 목록</h3>
        <p className="text-xs text-gray-500">
          {questions.filter(q => q.is_correct !== null).length} / {questions.length} 풀이 완료
        </p>
      </div>

      <div className="divide-y max-h-[calc(100vh-180px)] overflow-y-auto">
        {questions.map((q, idx) => (
          <button
            key={q.id}
            onClick={() => onSelect(idx)}
            className={`w-full px-4 py-3 text-left transition ${
              selectedIdx === idx
                ? "bg-blue-100 border-l-4 border-blue-500"
                : "hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">
                  {idx + 1}. {getListLabel(q)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {questionTypeLabel[q.question_type] || q.question_type}
                </div>
              </div>

              <div className="flex-shrink-0">
                {q.is_correct === null && (
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-300 text-white text-xs font-bold">
                    ○
                  </span>
                )}
                {q.is_correct === true && (
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-xs font-bold">
                    ✓
                  </span>
                )}
                {q.is_correct === false && (
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold">
                    ✕
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
