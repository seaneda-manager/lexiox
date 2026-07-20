// apps/web/app/(protected)/admin/content/updated-reading/[testId]/_client/ReadingTestFormClient.tsx
"use client";

// TODO: Import when ReadingTestForm is available
// import ReadingTestForm from "@/components/reading/admin/ReadingTestForm";
import type { RReadingTest2026 } from "@/models/reading";

type Props = {
  initial: RReadingTest2026;
};

export default function ReadingTestFormClient({ initial }: Props) {
  // 폼 값 변경 디버깅용 (선택)
  const handleChange = (value: RReadingTest2026) => {
    console.log("ReadingTestFormClient CHANGE", value.meta?.id);
  };

  // ✅ 실제 저장 로직
  const handleSubmit = async (value: RReadingTest2026) => {
    const payloadToSave: RReadingTest2026 = {
      ...value,
      meta: {
        ...value.meta,
        // 필요하면 여기서 id/label 고정
      },
    };

    try {
      const res = await fetch("/api/admin/updated-reading/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: payloadToSave }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        console.error(
          "ReadingTestFormClient SAVE FAILED",
          res.status,
          json
        );
        alert("저장 중 오류가 발생했습니다. (콘솔 확인)");
        return;
      }

      console.log("ReadingTestFormClient SAVE OK");
      alert("저장되었습니다 ✅");
    } catch (e) {
      console.error("ReadingTestFormClient SAVE ERROR", e);
      alert("저장 중 오류가 발생했습니다. (네트워크 확인)");
    }
  };

  return (
    <ReadingTestForm
      initial={initial}
      onChange={handleChange}
      onSubmit={handleSubmit}
    />
  );
}
