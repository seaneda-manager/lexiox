// apps/web/app/(protected)/updated-listening/runner-debug/page.tsx
"use client";

import ListeningAdaptiveRunner, {
  type ListeningTest2026,
} from "@/components/listening/ListeningAdaptiveRunner";

const flatDemoTest: ListeningTest2026 = {
  meta: {
    id: "listening-runner-debug",
    label: "Listening Runner Debug Test",
  },
  items: [
    {
      id: "dbg-1",
      number: 1,
      kind: "conversation",
      stage: 1,
      promptTitle: "Debug Q1 – Conversation",
      imageSrc: "/sample/listening/conversation.png",
      audioSrc: "/sample/listening/conv-1.mp3",
      question: "Why does the student visit the professor?",
      choices: [
        { id: "dbg-1-a", text: "To ask about an exam." },
        { id: "dbg-1-b", text: "To request an extension." },
        { id: "dbg-1-c", text: "To drop the course." },
        { id: "dbg-1-d", text: "To return a book." },
      ],
      correctChoiceId: "dbg-1-b",
    },
    {
      id: "dbg-2",
      number: 2,
      kind: "announcement",
      stage: 1,
      promptTitle: "Debug Q2 – Announcement",
      imageSrc: "/sample/listening/announcement.png",
      audioSrc: "/sample/listening/ann-1.mp3",
      question: "What is the main purpose of the announcement?",
      choices: [
        { id: "dbg-2-a", text: "To cancel an event." },
        { id: "dbg-2-b", text: "To explain new rules." },
        { id: "dbg-2-c", text: "To ask for volunteers." },
        { id: "dbg-2-d", text: "To change office hours." },
      ],
      correctChoiceId: "dbg-2-c",
    },
    {
      id: "dbg-3",
      number: 3,
      kind: "lecture",
      stage: 1,
      promptTitle: "Debug Q3 – Lecture",
      imageSrc: "/sample/listening/lecture.png",
      audioSrc: "/sample/listening/lec-1.mp3",
      question: "What is the speaker mainly discussing?",
      choices: [
        { id: "dbg-3-a", text: "Types of ecosystems." },
        { id: "dbg-3-b", text: "Urban planning." },
        { id: "dbg-3-c", text: "Language acquisition." },
        { id: "dbg-3-d", text: "Cultural festivals." },
      ],
      correctChoiceId: "dbg-3-a",
    },
  ],
};

export default function ListeningRunnerDebugPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4">
      <h1 className="text-xl font-bold">Listening Runner Debug</h1>
      <p className="text-sm text-gray-600">
        This page tests ListeningAdaptiveRunner with a simple flat test.
      </p>

      <ListeningAdaptiveRunner
        test={flatDemoTest}
        onFinish={(result) => {
          console.log("DEBUG LISTENING RESULT", result);
        }}
      />
    </main>
  );
}
