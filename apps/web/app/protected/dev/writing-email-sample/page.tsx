"use client";

// WritingRunnerETS 이메일 화면 레이아웃 확인용 데모 (DB 불필요).
// 학생 창이 좁을 때 에디터가 보이는지 검증한다.
import WritingRunnerETS from "@/components/writing/WritingRunnerETS";
import type { WWritingTest2026 } from "@/models/writing";

const sampleTest = {
  meta: { id: "dev-email-sample", label: "Email Layout Sample", examEra: "ibt_2026" },
  items: [
    {
      id: "task-email-sample",
      taskKind: "email",
      recipient: "Professor James Whitfield",
      recipientEmail: "j.whitfield@greenfield.edu",
      subjectLine: "Request to Schedule a Presentation Rehearsal Session",
      situation:
        "You are a student in Professor Whitfield's Advanced Communication Skills course. Your group is scheduled to deliver a formal presentation next week, but your team feels underprepared and would like to rehearse in front of the professor to receive feedback beforehand.",
      prompt: "Write a formal email to the professor.",
      hints: [
        "Explain why your group would like to conduct a rehearsal session before the official presentation date.",
        "Propose two specific times when your group is available to meet with the professor.",
        "Politely ask the professor to confirm a suitable time and express appreciation for their support.",
      ],
      wordLimit: { min: 100, max: 120 },
      recommendedTimeSeconds: 420,
    },
  ],
} as unknown as WWritingTest2026;

export default function WritingEmailSamplePage() {
  return <WritingRunnerETS test={sampleTest} />;
}
