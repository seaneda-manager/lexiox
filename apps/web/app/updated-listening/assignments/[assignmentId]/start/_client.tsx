"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import ListeningSessionContainer from "../../../listening/_components/ListeningSessionContainer";
import type { LListeningTest2026Linear } from "@/models/listening";

export default function ListeningTestWrapper({
  testData,
  testId,
  assignmentId,
}: {
  testData: LListeningTest2026Linear;
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
    <ListeningSessionContainer
      testData={testData}
      testId={testId}
      mode="study"
    />
  );
}
