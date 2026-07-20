"use client";

import InterviewRunner, {
  InterviewQuestion,
} from "../components/InterviewRunner";

// 주제: Education & Learning (같은 주제의 4개 다른 질문)
const demoQuestions: InterviewQuestion[] = [
  {
    id: "q1",
    question:
      "Tell me about a subject you have studied in school or a skill you have learned that was important to you.",
    topic: "Education & Learning",
  },
  {
    id: "q2",
    question:
      "Describe a time when you faced a difficulty while learning something. How did you overcome it?",
    topic: "Education & Learning",
  },
  {
    id: "q3",
    question:
      "Tell me about a memorable experience related to your education, such as a project or class discussion.",
    topic: "Education & Learning",
  },
  {
    id: "q4",
    question:
      "In your opinion, what are the most important qualities or skills that a successful student should have?",
    topic: "Education & Learning",
  },
];

export default function InterviewPage() {
  return (
    <InterviewRunner
      questions={demoQuestions}
      mode="test"
      onComplete={(results) => {
        console.log("Interview 완료:", results);
      }}
    />
  );
}
