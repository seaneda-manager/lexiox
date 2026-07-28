"use client";

import { useEffect } from "react";
import SpeakingAssignmentRunner from "./SpeakingAssignmentRunner";
import type { SpeakingTest2026 } from "@/models/speaking-2026";

export default function SpeakingAssignmentWrapper({
  assignmentId,
  test,
  testLabel,
}: {
  assignmentId: string;
  test: SpeakingTest2026;
  testLabel: string;
}) {
  useEffect(() => {
    // Hide sidebar and topbar padding for fullscreen test mode
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
  }, []);

  return (
    <div className="w-full h-full">
      <SpeakingAssignmentRunner
        assignmentId={assignmentId}
        test={test}
        testLabel={testLabel}
      />
    </div>
  );
}
