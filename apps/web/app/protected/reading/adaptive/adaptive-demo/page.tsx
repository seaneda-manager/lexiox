// apps/web/app/(protected)/reading/adaptive/adaptive-demo/page.tsx
"use client";

import ReadingAdaptiveRunner2026 from "@/components/reading/ReadingAdaptiveRunner2026";
import type { RReadingTest2026 } from "@/models/reading";

const demoAdaptiveTest: RReadingTest2026 = {
  meta: {
    id: "updated-reading-demo-1",
    label: "Adaptive Reading – 2 Stage Demo",
    examEra: "2026",
  },
  modules: [
    {
      id: "stage1",
      label: "Stage 1 – Warm-up",
      items: [
        {
          id: "cw1",
          taskKind: "complete_words",
          paragraphHtml:
            "<p>This is a demo paragraph with some missing w_rds for you to c_mpl_te.</p>",
          blanks: [
            { id: "b1", correctToken: "words" },
            { id: "b2", correctToken: "complete" },
          ],
        },
        {
          id: "dl1",
          taskKind: "daily_life",
          contentHtml:
            "<p>You are planning to study English every day for 30 minutes after school.</p>",
          questions: [
            {
              id: "q1",
              number: 1,
              stem: "What is the student planning to do?",
              choices: [
                { id: "q1a", text: "Study English every day", isCorrect: true },
                { id: "q1b", text: "Play games all night", isCorrect: false },
                { id: "q1c", text: "Quit studying completely", isCorrect: false },
                { id: "q1d", text: "Only study on weekends", isCorrect: false },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "stage2",
      label: "Stage 2 – Academic Passage",
      items: [
        {
          id: "ap1",
          taskKind: "academic_passage",
          passageHtml:
            "<p>Researchers have found that regular practice with feedback can significantly improve reading comprehension skills for language learners.</p>",
          questions: [
            {
              id: "q2",
              number: 2,
              stem: "What helps improve reading comprehension according to the passage?",
              choices: [
                {
                  id: "q2a",
                  text: "Regular practice with feedback",
                  isCorrect: true,
                },
                {
                  id: "q2b",
                  text: "Only taking full-length tests",
                  isCorrect: false,
                },
                {
                  id: "q2c",
                  text: "Ignoring your mistakes",
                  isCorrect: false,
                },
                {
                  id: "q2d",
                  text: "Memorizing every word",
                  isCorrect: false,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as unknown as RReadingTest2026; // 타입 구조 조금 달라도 일단 데모용으로 강제 캐스팅

export default function AdaptiveDemoPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <h1 className="text-xl font-bold">Reading Adaptive Runner 2026 – Demo</h1>
      <p className="text-sm text-slate-600">
        이 페이지는 우리가 만든 <code>ReadingAdaptiveRunner2026</code>를 테스트하기 위한
        데모야. 나중에는 Supabase에서 실제 테스트 세트를 불러와 연결하면 돼.
      </p>

      <ReadingAdaptiveRunner2026
        test={demoAdaptiveTest}
        onFinish={(result) => {
          console.log("ADAPTIVE-READING-2026 RESULT", result);
        }}
      />
    </main>
  );
}
