"use client";

import { useRouter, useSearchParams } from "next/navigation";
import WritingRunnerETS from "@/components/writing/WritingRunnerETS";
import type { WWritingTest2026 } from "@/models/writing";

export default function WritingTestClient({
  test,
  testId,
  assignmentId,
}: {
  test: WWritingTest2026;
  testId: string;
  /** 배정을 통해 들어온 경우에만 존재. 완료 시 test_assignments 상태를 업데이트한다. */
  assignmentId?: string;
}) {
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
          assignmentId,
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

  // Listening처럼 protected layout의 padding을 무시하고 full width 사용.
  // -m-4 md:-m-6은 p-4 md:p-6을 상쇄하고,
  // h-[calc(100%+2rem)] md:h-[calc(100%+3rem)]은 무시된 padding만큼 높이를 복구.
  return (
    <div className="-m-4 md:-m-6 h-[calc(100%+2rem)] md:h-[calc(100%+3rem)]">
      <WritingRunnerETS test={test} onFinish={handleFinish} />
    </div>
  );
}
