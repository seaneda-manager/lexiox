// apps/web/app/(protected)/toefl-2026/test/page.tsx
"use client";

import ReadingAdaptiveRunner from "@/components/reading/ReadingAdaptiveRunner";
import ListeningRunner2026 from "@/components/listening/ListeningRunner2026";
import SpeakingRunner2026 from "@/components/speaking/SpeakingRunner2026";
import WritingRunner2026 from "@/components/writing/WritingRunner2026";

import {
  demoReadingTest2026,
  demoListeningTest2026,
  demoSpeakingTest2026,
  demoWritingTest2026,
} from "./demo-tests";

export default function Toefl2026FullTestPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-10 px-4 py-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">TOEFL iBT 2026 – Full Test Demo</h1>
        <p className="text-sm text-gray-600">
          Reading, Listening, Speaking, Writing 네 섹션을 한 페이지에서 시험
          형식으로 연습해 보는 데모입니다.
        </p>
      </header>

      {/* Reading Section */}
      <section className="space-y-4 border-t pt-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold">Reading</h2>
          <span className="text-xs text-gray-500">Adaptive / 2026 형식</span>
        </div>

        <ReadingAdaptiveRunner
          test={demoReadingTest2026}
          onFinish={(result) => {
            console.log("READING-2026 FINISHED", result);
            return { ok: true };
          }}
        />
      </section>

      {/* Listening Section */}
      <section className="space-y-4 border-t pt-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold">Listening</h2>
          <span className="text-xs text-gray-500">
            Conversations + Lectures / 2026 형식(임시)
          </span>
        </div>

        <ListeningRunner2026
          test={demoListeningTest2026}
          onFinish={(result) => {
            console.log("LISTENING-2026 FINISHED", result);
            return { ok: true };
          }}
        />
      </section>

      {/* Speaking Section */}
      <section className="space-y-4 border-t pt-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold">Speaking</h2>
          <span className="text-xs text-gray-500">
            4 Tasks / 녹음 + 타이머 테스트
          </span>
        </div>

        <SpeakingRunner2026
          test={demoSpeakingTest2026}
          onFinish={(result) => {
            console.log("SPEAKING-2026 FINISHED", result);
            return { ok: true };
          }}
        />
      </section>

      {/* Writing Section */}
      <section className="space-y-4 border-t pt-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold">Writing</h2>
          <span className="text-xs text-gray-500">
            3 Tasks / New Writing 2026
          </span>
        </div>

        <WritingRunner2026
          test={demoWritingTest2026}
          onFinish={(result) => {
            console.log("WRITING-2026 FINISHED", result);
            return { ok: true };
          }}
        />
      </section>
    </main>
  );
}
