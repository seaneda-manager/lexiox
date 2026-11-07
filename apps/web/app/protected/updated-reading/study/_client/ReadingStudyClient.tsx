// apps/web/app/protected/updated-reading/study/_client/ReadingStudyClient.tsx
"use client";

import MockTestPlayer from "@/components/reading/MockTestPlayer";
import type { RReadingTest2026 } from "@/models/reading";

type Props = {
  test: RReadingTest2026;
};

/**
 * Study 모드 = 시험 화면(MockTestPlayer)과 동일한 UI + 시간 제한 없음 / 정답 확인 / 한·영 전환.
 * 결과는 기존 Study 저장 API(save-result)로 남긴다.
 */
export default function ReadingStudyClient({ test }: Props) {
  return (
    <MockTestPlayer
      mode="study"
      testId={test.meta.id}
      label={test.meta.label ?? "Reading Practice"}
      test={test}
      onFinish={async (payload) => {
        const answers: Record<string, string> = {};
        for (const a of payload.answers) {
          if (a.chosenChoiceId != null) {
            answers[a.questionId] = Array.isArray(a.chosenChoiceId)
              ? a.chosenChoiceId.join(",")
              : a.chosenChoiceId;
          }
        }
        try {
          await fetch("/api/updated-reading/save-result", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              testId: payload.testId,
              totalQuestions: payload.answers.length,
              answers,
            }),
          });
        } catch {
          /* 저장 실패해도 결과 화면은 그대로 보여준다 */
        }
      }}
    />
  );
}
