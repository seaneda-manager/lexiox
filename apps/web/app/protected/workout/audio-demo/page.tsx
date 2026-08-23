"use client";

import { useState } from "react";
import AudioResponseDrill from "@/components/workout/AudioResponseDrill";
import type { AudioDrillItem } from "@/lib/workout/audioDrillTypes";

const DEMO_ITEMS: AudioDrillItem[] = [
  {
    id: "answer-1",
    taskKind: "answer",
    title: "Campus Announcement",
    timeLimitSec: 20,
    script:
      "Attention students. The library will be closing early today at six PM for a scheduled maintenance check. Please plan to return any borrowed materials before then. The library will reopen tomorrow at its regular time of eight AM.",
    prompt: "What time will the library close today?",
    choices: [
      { text: "6 PM" },
      { text: "8 AM" },
      { text: "It will stay open all night" },
      { text: "It is already closed" },
    ].map((c, i) => ({ ...c, correct: i === 0 })),
  },
  {
    id: "detail-1",
    taskKind: "detail",
    title: "Short Lecture: Bee Communication",
    timeLimitSec: 20,
    script:
      "When a honeybee finds a good source of food, it returns to the hive and performs what scientists call the waggle dance. The angle and duration of the dance tell other bees the direction and distance of the food source.",
    prompt: "According to the talk, what does the angle of the waggle dance communicate?",
    choices: [
      { text: "The direction of the food source" },
      { text: "The type of flower found" },
      { text: "How many bees are needed" },
      { text: "The temperature of the hive" },
    ].map((c, i) => ({ ...c, correct: i === 0 })),
  },
  {
    id: "summary-1",
    taskKind: "summary",
    title: "Conversation: Office Hours",
    timeLimitSec: 25,
    script:
      "A student visits her professor to ask about extending a paper deadline because she has been sick. The professor agrees to give her three extra days, but reminds her that this is the last extension he can offer this semester.",
    prompt: "Which sentence best summarizes this conversation?",
    choices: [
      { text: "A professor refuses to extend a student's deadline." },
      { text: "A student gets a short deadline extension due to illness, but is told it is the last one." },
      { text: "A student asks to drop the class because she is sick." },
      { text: "A professor and student discuss the course syllabus." },
    ].map((c, i) => ({ ...c, correct: i === 1 })),
  },
  {
    id: "notetaking-1",
    taskKind: "notetaking",
    title: "Short Lecture: Tree Rings",
    timeLimitSec: 40,
    script:
      "Scientists can learn a lot about past climate by studying tree rings. Each year, a tree adds one ring to its trunk. In years with plenty of rain, the ring tends to be wide. In dry years, the ring is much narrower. By counting and measuring these rings, researchers can build a record of rainfall going back hundreds of years.",
    prompt: "지문을 들으며 아래 항목을 채워보세요.",
    notePrompts: ["핵심 주제", "비 오는 해의 나이테", "가문 해의 나이테"],
    modelNotes: [
      "나이테로 과거 기후(강수량)를 알 수 있음",
      "넓은 나이테",
      "좁은 나이테",
    ],
  },
];

export default function AudioResponseDemoPage() {
  const [result, setResult] = useState<{ correct: number; gradable: number; total: number } | null>(null);
  const [runKey, setRunKey] = useState(0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">Workout 프로토타입</p>
      <h1 className="mb-4 text-lg font-bold text-neutral-900">오디오 응답 엔진 — 듣고 대답 / 요약 / 디테일 / 노트테이킹</h1>
      <p className="mb-4 text-xs text-neutral-400">ElevenLabs로 실시간 음성을 생성합니다 — 재생 버튼을 누르면 몇 초 정도 생성 시간이 걸려요.</p>

      <div className="h-[640px] w-full">
        {result ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-4 rounded-[28px] border border-black/10 bg-white/80 text-center">
            <p className="text-4xl">{result.gradable > 0 && result.correct === result.gradable ? "🏆" : "🎯"}</p>
            <p className="text-2xl font-black text-slate-800">
              객관식 {result.correct}/{result.gradable} 정답 · 전체 {result.total}문항 완료
            </p>
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setRunKey((k) => k + 1);
              }}
              className="rounded-2xl bg-emerald-700 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-emerald-600"
            >
              다시하기
            </button>
          </div>
        ) : (
          <AudioResponseDrill key={runKey} items={DEMO_ITEMS} onComplete={setResult} />
        )}
      </div>
    </div>
  );
}
