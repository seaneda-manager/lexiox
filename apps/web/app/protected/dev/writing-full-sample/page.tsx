"use client";

// WritingRunnerETS 전체 플로우(Intro → Task1/2/3 Begin → 문항 → Time Remaining → Done) 검증용
// 데모 (DB 불필요, 로그인 불필요 — app/protected/layout.tsx의 인증 체크가 비활성화되어 있음).
import WritingRunnerETS from "@/components/writing/WritingRunnerETS";
import type { WWritingTest2026 } from "@/models/writing";

const sampleTest = {
  meta: { id: "dev-full-sample", label: "Full Flow Sample", examEra: "ibt_2026" },
  items: [
    {
      id: "task-build-sample",
      taskKind: "build_a_sentence",
      questions: [
        {
          id: "q1",
          contextLeadIn: "What was the highlight of your trip?",
          contextLeadOut: "fantastic.",
          punctuation: "",
          tokens: [
            { id: "t1", text: "The", type: "WORD" },
            { id: "t2", text: "old city", type: "PHRASE" },
            { id: "t3", text: "tour guides", type: "PHRASE" },
            { id: "t4", text: "who", type: "WORD" },
            { id: "t5", text: "showed us around", type: "PHRASE" },
            { id: "t6", text: "were", type: "WORD" },
          ],
          correctOrder: ["t1", "t2", "t3", "t4", "t5", "t6"],
        },
        {
          id: "q2",
          contextLeadIn: "A: Welcome to Sunrise Cafe!",
          contextLeadOut: "today?",
          punctuation: "",
          tokens: [
            { id: "t1", text: "What", type: "WORD" },
            { id: "t2", text: "can", type: "WORD" },
            { id: "t3", text: "I", type: "WORD" },
            { id: "t4", text: "get", type: "WORD" },
            { id: "t5", text: "you", type: "WORD" },
          ],
          correctOrder: ["t1", "t2", "t3", "t4", "t5"],
        },
      ],
      timeLimitSeconds: 410,
    },
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
    {
      id: "task-academic-sample",
      taskKind: "academic_discussion",
      professorName: "Dr. Alvarez",
      context: "Your professor is teaching a class on social studies.",
      professorPrompt:
        "Should high school students be required to do volunteer work? Why or why not?",
      studentPosts: [
        {
          id: "post-1",
          author: "Mina",
          content:
            "Yes, I think high schools should require volunteer hours because it helps students build a sense of civic responsibility.",
        },
        {
          id: "post-2",
          author: "Carlos",
          content:
            "I don't think volunteer hours should be required because many students already have limited free time.",
        },
      ],
      wordLimit: { min: 100, max: 200 },
      recommendedTimeSeconds: 600,
    },
  ],
} as unknown as WWritingTest2026;

export default function WritingFullSamplePage() {
  return (
    <WritingRunnerETS
      test={sampleTest}
      onFinish={(answers) => console.log("onFinish", answers)}
    />
  );
}
