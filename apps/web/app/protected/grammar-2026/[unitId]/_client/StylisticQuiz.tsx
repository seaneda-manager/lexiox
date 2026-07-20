"use client";

import { useState } from "react";
import type { GrammarStylisticItem, StylisticOption } from "@/models/grammar/types";

const SKILL_LABEL: Record<string, string> = {
  concision: "간결성",
  parallelism: "병렬 구조",
  transition: "연결어",
  modifier: "수식어 위치",
  redundancy: "중복 표현",
  tone: "어조/격식",
  cohesion: "문장 응집성",
};

type Props = {
  items: GrammarStylisticItem[];
  onDone: () => void;
};

export default function StylisticQuiz({ items, onDone }: Props) {
  const [index, setIndex] = useState(0);

  const handleNext = () => {
    if (index + 1 >= items.length) onDone();
    else setIndex((i) => i + 1);
  };

  return (
    <div>
      <p className="text-xs text-purple-500 font-medium uppercase tracking-wide mb-1">
        Stylistic — {SKILL_LABEL[items[index].skill] ?? items[index].skill}
      </p>
      <p className="text-xs text-gray-400 mb-4">
        {index + 1} / {items.length}
      </p>
      <StylisticItem key={items[index].id} item={items[index]} onNext={handleNext} />
    </div>
  );
}

function StylisticItem({
  item,
  onNext,
}: {
  item: GrammarStylisticItem;
  onNext: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const correctOpt = item.options.find((o) => o.is_correct)!;
  const isCorrect = selected === correctOpt.id;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-700">{item.prompt}</p>

      <div className="space-y-3">
        {item.options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => !submitted && setSelected(opt.id)}
            className={`w-full text-left text-sm px-4 py-3 rounded-xl border transition
              ${submitted
                ? opt.is_correct
                  ? "border-green-400 bg-green-50 text-green-800 font-medium"
                  : selected === opt.id && !opt.is_correct
                  ? "border-red-300 bg-red-50 text-red-700"
                  : "border-gray-100 text-gray-400"
                : selected === opt.id
                ? "border-purple-400 bg-purple-50 font-medium"
                : "border-gray-200 hover:border-gray-300"}`}
          >
            {opt.text}
          </button>
        ))}
      </div>

      {!submitted ? (
        <button
          onClick={() => selected && setSubmitted(true)}
          disabled={!selected}
          className="w-full py-2.5 bg-purple-500 text-white text-sm rounded-xl hover:bg-purple-600 disabled:opacity-40 transition"
        >
          확인
        </button>
      ) : (
        <div className="space-y-3">
          <div
            className={`px-4 py-3 rounded-xl text-sm
              ${isCorrect ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"}`}
          >
            {isCorrect ? "정답!" : "오답"} — {item.explanation}
          </div>
          <button
            onClick={onNext}
            className="w-full py-2.5 bg-purple-500 text-white text-sm rounded-xl hover:bg-purple-600 transition"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
