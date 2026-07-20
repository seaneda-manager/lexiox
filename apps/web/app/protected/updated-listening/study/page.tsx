"use client";

import ListeningAdaptiveRunner, {
  type ListeningTest2026,
  type ListeningItem,
  type ListeningItemKind,
} from "@/components/listening/ListeningAdaptiveRunner";

import { demoListeningTest2026 } from "../adaptive-demo/demo-data";

function mapTaskKindToKind(taskKind: string): ListeningItemKind {
  switch (taskKind) {
    case "announcement":  return "announcement";
    case "academic_talk": return "lecture";
    case "conversation":
    case "short_response":
    default:              return "conversation";
  }
}

function mapTaskKindToTitle(taskKind: string): string {
  switch (taskKind) {
    case "short_response": return "Listen and choose a response.";
    case "conversation":   return "Listen to a conversation.";
    case "announcement":   return "Listen to an announcement.";
    case "academic_talk":  return "Listen to part of a talk.";
    default:               return "Listen and answer.";
  }
}

function getImageForTaskKind(taskKind: string): string {
  switch (taskKind) {
    case "short_response": return "/sample/listening/short-response.png";
    case "conversation":   return "/sample/listening/conversation.png";
    case "announcement":   return "/sample/listening/announcement.png";
    case "academic_talk":  return "/sample/listening/lecture.png";
    default:               return "/sample/listening/default.png";
  }
}

function flattenListeningTest(raw: any): ListeningTest2026 {
  const flat: ListeningItem[] = [];

  for (const mod of raw.modules ?? []) {
    const stage = mod.stage as 1 | 2;
    for (const item of mod.items ?? []) {
      const taskKind = item.taskKind;
      const correct = null;
      for (const q of item.questions ?? []) {
        const correctChoice = q.choices.find((c: any) => c.isCorrect);
        flat.push({
          id: `${item.id}-${q.id}`,
          number: q.number,
          kind: mapTaskKindToKind(taskKind),
          stage,
          promptTitle: mapTaskKindToTitle(taskKind),
          imageSrc: getImageForTaskKind(taskKind),
          audioSrc: item.audioUrl ?? "",
          question: q.stem ?? "",
          choices: q.choices.map((c: any) => ({ id: c.id, text: c.text })),
          correctChoiceId: correctChoice?.id,
          // ── 새로 추가: scriptSegments (선택사항) ──
          scriptSegments: item.scriptSegments,
        });
      }
    }
  }

  return { meta: { id: raw.meta.id, label: raw.meta.label }, items: flat };
}

export default function Listening2026StudyPage() {
  const test = flattenListeningTest(demoListeningTest2026);

  return (
    <ListeningAdaptiveRunner
      test={test}
      onFinish={(result) => {
        console.log("LISTENING FINISHED", result);
      }}
    />
  );
}
