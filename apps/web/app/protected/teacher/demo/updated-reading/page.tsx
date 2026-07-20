// apps/web/app/(protected)/teacher/demo/updated-reading/page.tsx
"use client";

import ReadingAdaptiveRunner2026 from "@/components/reading/ReadingAdaptiveRunner2026";
import { adaptiveReadingTest2026 } from "@/app/protected/reading/adaptive/adaptive-demo/demo-data";

export default function Reading2026DemoPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <h1 className="text-xl font-bold">Reading 2026 – Adaptive Demo</h1>
      <p className="text-sm text-slate-600">
        내부 테스트용 데모입니다. Stage 1 세트와 Stage 2 세트 구성을 바꾸면서
        실제 2026형 레이아웃을 연구하는 용도로 사용하세요.
      </p>

      <ReadingAdaptiveRunner2026
        test={adaptiveReadingTest2026}
        onFinish={(r) => {
          console.log("READING-2026 DEMO FINISHED", r);
        }}
      />
    </main>
  );
}
