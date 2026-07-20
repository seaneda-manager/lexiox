"use client";

import { useRouter } from "next/navigation";
import ListeningRunnerETS from "@/components/listening/ListeningRunnerETS";
import type { LListeningTest2026Linear } from "@/models/listening";

export default function Listening2026TestClient({
  test,
  testId,
}: {
  test: LListeningTest2026Linear;
  testId: string;
}) {
  const router = useRouter();

  async function handleFinish(result: {
    answers: Record<string, string[]>;
    correct: number;
    total: number;
  }) {
    try {
      const res = await fetch("/api/listening/save-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId,
          correct: result.correct,
          total: result.total,
          answers: result.answers,
        }),
      });
      const data = await res.json();
      if (data.sessionId) {
        router.push(`/student/review/listening/${data.sessionId}`);
      }
    } catch {
      // 저장 실패 시 완료 화면 유지
    }
  }

  return <ListeningRunnerETS test={test} onFinish={handleFinish} />;
}
