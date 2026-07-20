// apps/web/app/(protected)/updated-reading/study/_client/ReadingStudyClient.tsx
"use client";

import { useState } from "react";
import ReadingAdaptiveRunner2026 from "@/components/reading/ReadingAdaptiveRunner2026";
import type { RReadingTest2026 } from "@/models/reading";

type Props = {
  test: RReadingTest2026;
};

export default function ReadingStudyClient({ test }: Props) {
  const [saving, setSaving] = useState(false);

  // ✅ result 가 아니라 answers 그대로 받기
  const handleFinish = async (answers: Record<string, unknown>) => {
    try {
      setSaving(true);

      const totalQuestions = Object.keys(answers ?? {}).length;

      const res = await fetch("/api/updated-reading/save-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId: test.meta.id,
          totalQuestions,
          answers,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        console.error(
          "READING-2026 SAVE RESULT FAILED",
          res.status,
          json,
        );
        alert("결과 저장 중 오류가 발생했습니다. (콘솔 확인)");
        return;
      }

      console.log("READING-2026 SAVE RESULT OK", json);

      // ✅ 결과 페이지로 이동
      if (json.resultId) {
        window.location.href = `/updated-reading/result/${json.resultId}`;
      } else {
        alert("수고했어요! 이번 세션 결과가 저장되었습니다 ✅");
      }
    } catch (e) {
      console.error("READING-2026 SAVE RESULT ERROR", e);
      alert("네트워크 오류로 결과를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {saving && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
          Saving your result...
        </div>
      )}

      {/* ✅ onFinish 에 handleFinish 그대로 전달 */}
      <ReadingAdaptiveRunner2026 test={test} onFinish={handleFinish} />
    </div>
  );
}
