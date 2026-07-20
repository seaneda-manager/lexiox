// apps/web/app/(protected)/writing-2026/study/page.tsx
"use client";

import WritingRunner2026 from "@/components/writing/WritingRunner2026";
import { demoWritingTest2026 } from "@/app/protected/writing-2026/study";

export default function Writing2026StudyPage() {
  return (
    <main className="mx-auto max-w-4xl p-4 space-y-6">
      <header>
        <h1 className="text-xl font-bold">Writing 2026 – Practice Demo</h1>
        <p className="mt-1 text-sm text-gray-600">
          Try the new 2026-style writing section with micro writing, an email,
          and an academic discussion task.
        </p>
      </header>

      <WritingRunner2026
        test={demoWritingTest2026}
        onFinish={(result) => {
          console.log("WRITING FINISHED", result);
        }}
      />
    </main>
  );
}
