import type { SpeakingTest2026 } from "@/models/speaking-2026";

export const demoSpeakingTest2026: SpeakingTest2026 = {
  id: "speaking2026-demo-v1",
  label: "Speaking 2026 Demo Test",
  tasks: [
    {
      id: "task1",
      type: "repeat",
      prompt: "Technology is changing the way students learn in school."
    },
    {
      id: "task2",
      type: "independent",
      question:
        "Do you prefer studying alone or studying with friends? Explain your reasons with details."
    },
    {
      id: "task3",
      type: "integrated",
      readingText: "Campus libraries are considering extending their hours...",
      listeningText:
        "The student believes longer library hours will benefit those with late classes.",
      question:
        "Summarize the student's opinion and explain how it relates to the reading."
    }
  ]
};
