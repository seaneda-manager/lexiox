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
    <MockTestPlayer
      testId={testId}
      label="Reading Test"
      test={testData}
      assignmentId={assignmentId}
    />
  );
}
