"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect } from "react";
import WritingRunnerETS from "@/components/writing/WritingRunnerETS";
import type { WWritingTest2026 } from "@/models/writing";

export default function WritingTestClient({
  test,
  testId,
  assignmentId,
}: {
  test: WWritingTest2026;
  testId: string;
  assignmentId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const revisionSessionId = searchParams.get("revision");

  useEffect(() => {
    // Hide sidebar and topbar padding for fullscreen test mode
    if (pathname.includes("/assignments/") && pathname.includes("/start")) {
      const aside = document.querySelector("aside");
      const main = document.querySelector("main");
      const body = document.body;

      if (aside) aside.style.display = "none";
      if (main) main.style.padding = "0";
      body.style.overflow = "hidden";

      return () => {
        if (aside) aside.style.display = "";
        if (main) main.style.padding = "";
        body.style.overflow = "";
      };
    }
  }, [pathname]);

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
          sessionId: revisionSessionId,
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

  return <WritingRunnerETS test={test} onFinish={handleFinish} />;
}
