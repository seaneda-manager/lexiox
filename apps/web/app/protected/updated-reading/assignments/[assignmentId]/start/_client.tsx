"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import MockTestPlayer from "@/components/reading/MockTestPlayer";
import type { RReadingTest2026 } from "@/models/reading";

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

  return (
    <div className="w-full h-full">
      <style>{`
        main {
          width: 100% !important;
          max-width: 100% !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        main > * {
          max-width: 100% !important;
          width: 100% !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
        }
        main > div {
          padding-left: 0 !important;
          padding-right: 0 !important;
        }
      `}</style>
      <MockTestPlayer
        testId={testId}
        label="Reading Test"
        test={testData}
        assignmentId={assignmentId}
      />
    </div>
  );
}
