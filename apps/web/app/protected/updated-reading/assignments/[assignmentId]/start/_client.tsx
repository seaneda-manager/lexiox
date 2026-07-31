"use client";

import { useEffect, useCallback, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import ReadingAdaptiveRunner2026 from "@/components/reading/ReadingAdaptiveRunner2026";
import type { RReadingTest2026 } from "@/models/reading";

const STYLE_CONTENT = `
html { font-size: 19.2px !important; }
body { margin: 0; padding: 0; }
aside { display: none !important; }
main {
  width: 100vw !important;
  height: 100vh !important;
  max-width: 100vw !important;
  padding: 0 !important;
  margin: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
}
main > * {
  max-width: 64rem !important;
  width: 95% !important;
  height: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
}
.text-xs { font-size: 1rem !important; }
.text-sm { font-size: 1.1rem !important; }
span, div { font-size: inherit !important; }
`;

export default function ReadingTestWrapper({
  testData,
  testId,
  assignmentId,
}: {
  testData: RReadingTest2026;
  testId: string;
  assignmentId: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [autoFill, setAutoFill] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    setAutoFill(params.get('autoFill') === 'true');
  }, []);

  useEffect(() => {
    const styleEl = document.createElement("style");
    styleEl.textContent = STYLE_CONTENT;
    document.head.appendChild(styleEl);

    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  useEffect(() => {
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


  const handleFinish = useCallback(
    async (result: {
      testId: string;
      answers: Record<string, string>;
      stage1Correct: number;
      stage1Total: number;
      stage2Correct: number;
      stage2Total: number;
    }) => {
      try {
        const res = await fetch(`/api/updated-reading/result/${assignmentId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testId: result.testId,
            answers: result.answers,
            stage1Correct: result.stage1Correct,
            stage1Total: result.stage1Total,
            stage2Correct: result.stage2Correct,
            stage2Total: result.stage2Total,
          }),
        });

        if (!res.ok) {
          console.error("Failed to save result:", await res.text());
          return;
        }

        const data = await res.json();
        console.log('API Response:', data);
        if (data.ok) {
          // 저장 성공
          console.log('Result saved successfully!');
          // 잠시 후 다음 페이지로
          setTimeout(() => {
            router.push(`/protected/reading/review/${assignmentId}`);
          }, 1000);
        } else {
          console.error('API returned ok: false', data);
        }
      } catch (err) {
        console.error("Error saving result:", err);
      }
    },
    [assignmentId, router]
  );

  return (
    <ReadingAdaptiveRunner2026 test={testData} onFinish={handleFinish} autoFill={autoFill} />
  );
}
