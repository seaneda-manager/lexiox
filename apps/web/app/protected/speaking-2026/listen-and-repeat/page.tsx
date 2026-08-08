// apps/web/app/(protected)/speaking-2026/listen-and-repeat/page.tsx
"use client";

import { useEffect, useState } from "react";
import ListenAndRepeatRunner, {
  ListenRepeatItem,
} from "../components/ListenAndRepeatRunner";
import { useGenerateSpeech } from "@/lib/elevenlabs/use-generate-speech";

const demoPhrases = [
  { id: "s1", sentence: "The student center closes earlier on Fridays." },
  { id: "s2", sentence: "Many international students attend orientation in the first week." },
  { id: "s3", sentence: "Please remember to submit your assignment before midnight." },
  { id: "s4", sentence: "The library will be under renovation during the summer term." },
  { id: "s5", sentence: "Group projects help students develop communication skills." },
  { id: "s6", sentence: "Some classes are offered both online and in person." },
  { id: "s7", sentence: "You can book an appointment with your advisor using the portal." },
];

export default function ListenAndRepeatPage() {
  const { generateAudio, loading } = useGenerateSpeech();
  const [items, setItems] = useState<ListenRepeatItem[]>([]);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [volume, setVolume] = useState(70);

  useEffect(() => {
    const loadAudio = async () => {
      const itemsWithAudio: ListenRepeatItem[] = [];

      for (const phrase of demoPhrases) {
        setGeneratingIds((prev) => new Set([...prev, phrase.id]));
        try {
          const result = await generateAudio(phrase.sentence);
          itemsWithAudio.push({
            ...phrase,
            audioUrl: result?.url || "",
          });
        } catch (err) {
          console.error(`Failed to generate audio for ${phrase.id}:`, err);
          itemsWithAudio.push(phrase);
        }
        setGeneratingIds((prev) => {
          const next = new Set(prev);
          next.delete(phrase.id);
          return next;
        });
        // Rate limiting: wait between requests
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      setItems(itemsWithAudio);
    };

    loadAudio();
  }, [generateAudio]);

  if (!items.length) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="mb-4 text-4xl">🎵</div>
          <p className="text-lg font-semibold text-gray-800 mb-2">음성 생성 중…</p>
          <p className="text-sm text-gray-600">
            {generatingIds.size > 0 ? `${demoPhrases.length - generatingIds.size}/${demoPhrases.length}` : "준비 중"}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce"></div>
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "0.1s" }}></div>
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "0.2s" }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ListenAndRepeatRunner
      items={items}
      mode="test"
      totalQuestions={items.length}
      totalQuestionOffset={1}
      volume={volume}
      onVolumeChange={setVolume}
      onComplete={(result) => {
        console.log("Listen & Repeat 시험 완료:", result);
      }}
    />
  );
}
