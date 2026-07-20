// apps/web/components/listening/ListenConversation.tsx
"use client";

import TestSectionLayout from "@/components/test/TestSectionLayout";
import { useState } from "react";

type Props = {
  title: string;
  imageSrc: string;
  audioSrc: string;
  choices: string[];
  onNext?: (answer: string | null) => void;
};

export default function ListenConversation({
  title,
  imageSrc,
  audioSrc,
  choices,
  onNext,
}: Props) {
  const [answer, setAnswer] = useState<string | null>(null);

  return (
    <TestSectionLayout
      sectionLabel="Listening"
      title={title}
      showVolumeButton={true}
      showBackButton={false}
      onNext={() => onNext?.(answer)}
      nextLabel="Next"
      left={
        <div className="flex flex-col items-center gap-4">
          <img
            src={imageSrc}
            alt="Conversation Image"
            className="w-48 rounded-md shadow"
          />
          <audio controls className="w-full">
            <source src={audioSrc} />
          </audio>
        </div>
      }
      right={
        <form className="flex flex-col gap-3 text-sm">
          {choices.map((c, i) => (
            <label
              key={i}
              className={`flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 ${
                answer === c ? "bg-emerald-50 border-emerald-400" : "hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="q"
                className="mt-1"
                checked={answer === c}
                onChange={() => setAnswer(c)}
              />
              <span>{c}</span>
            </label>
          ))}
        </form>
      }
    />
  );
}
