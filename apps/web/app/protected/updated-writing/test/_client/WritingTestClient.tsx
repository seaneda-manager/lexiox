"use client";

import { useRouter, useSearchParams } from "next/navigation";
import WritingRunnerETS from "@/components/writing/WritingRunnerETS";
import type { WWritingTest2026 } from "@/models/writing";

export default function WritingTestClient({ test, testId }: { test: WWritingTest2026; testId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const revisionSessionId = searchParams.get("revision");

  async function handleFinish(answers: {
    task1Scores: { questionId: string; correct: boolean; userSequence: string[] }[];
    task2Text: string;
    task3Text: string;
  }) {
    try {
      const res = await fetch("/api/writing/save-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId,
          sessionId: revisionSessionId, // revision인 경우 기존 session ID 사용
          answers: {
            task_1_score_raw: answers.task1Scores.filter((s) => s.correct).length,
            task_2_submission: answers.task2Text,
            task_3_submission: answers.task3Text,
          },
        }),
      });
      const data = await res.json();
      if (data.sessionId) {
        router.push(`/student/review/writing/${data.sessionId}`);
      }
    } catch {
      // 저장 실패 시 완료 화면 유지
    }
  }

  return <WritingRunnerETS test={test} onFinish={handleFinish} />;
}
