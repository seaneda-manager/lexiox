// apps/web/app/(protected)/writing-2026/test/page.tsx
"use client";

import WritingRunner2026 from "@/components/writing/WritingRunner2026";
import { demoWritingTest2026 } from "../study"; // ← 여기 경로는 지금 쓰던 그대로 가져와

export default function Writing2026TestPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <h1 className="text-xl font-bold">TOEFL iBT 2026 – Writing Practice</h1>
      <p className="text-sm text-gray-600">
        This page lets you practice the three new Writing task types in one
        place. Use it for self-study or as a homework task for your 학원
        students.
      </p>

      <WritingRunner2026
        test={demoWritingTest2026}
        onFinish={(result) => {
          console.log("WRITING-2026 FINISHED", result);
        }}
      />
    </main>
  );
}
