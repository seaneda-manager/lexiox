"use client";

import ListeningAdaptiveRunner, {
  type ListeningTest2026,
  type ListeningItem,
  type ListeningItemKind,
} from "@/components/listening/ListeningAdaptiveRunner";

import { demoListeningTest2026 } from "./demo-data";

/** taskKind → 러너 표시용 kind로 변환 */
function mapTaskKindToKind(taskKind: string): ListeningItemKind {
  switch (taskKind) {
    case "announcement":
      return "announcement";
    case "academic_talk":
      return "lecture";
    case "conversation":
    case "short_response":
    default:
      return "conversation";
  }
}

/** taskKind별 제목 */
function mapTaskKindToTitle(taskKind: string): string {
  switch (taskKind) {
    case "short_response":
      return "Listen and choose a response.";
    case "conversation":
      return "Listen to a conversation.";
    case "announcement":
      return "Listen to an announcement.";
    case "academic_talk":
      return "Listen to part of a talk.";
    default:
      return "Listen and answer.";
  }
}

/** taskKind별 이미지 */
function getImageForTaskKind(taskKind: string): string {
  switch (taskKind) {
    case "short_response":
      return "/sample/listening/short-response.png";
    case "conversation":
      return "/sample/listening/conversation.png";
    case "announcement":
      return "/sample/listening/announcement.png";
    case "academic_talk":
      return "/sample/listening/lecture.png";
    default:
      return "/sample/listening/default.png";
  }
}

/** modules 기반 SSOT → runner 기반 flat items 변환 */
function flattenListeningTest(raw: any): ListeningTest2026 {
  const meta = {
    id: raw.meta.id,
    label: raw.meta.label,
  };

  const flat: ListeningItem[] = [];

  for (const mod of raw.modules ?? []) {
    const stage = mod.stage as 1 | 2;

    for (const item of mod.items ?? []) {
      const taskKind = item.taskKind;
      const kind = mapTaskKindToKind(taskKind);
      const promptTitle = mapTaskKindToTitle(taskKind);
      const audioSrc = item.audioUrl ?? "";
      const imageSrc = getImageForTaskKind(taskKind);

      for (const q of item.questions ?? []) {
        const correct = q.choices.find((c: any) => c.isCorrect);

        flat.push({
          id: `${item.id}-${q.id}`,
          number: q.number,
          kind,
          stage,
          promptTitle,
          imageSrc,
          audioSrc,
          question: q.stem ?? "",
          choices: q.choices.map((c: any) => ({
            id: c.id,
            text: c.text,
          })),
          correctChoiceId: correct?.id,
        });
      }
    }
  }

  return { meta, items: flat };
}

export default function ListeningAdaptiveDemoPage() {
  const test = flattenListeningTest(demoListeningTest2026);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4">
      <h1 className="text-xl font-bold">Adaptive Listening Demo Page</h1>
      <p className="text-sm text-gray-600">
        This demo uses SSOT modules → Flattened test items.
      </p>

      <ListeningAdaptiveRunner
        test={test}
        onFinish={(result) => {
          console.log("LISTENING FINISHED", result);
        }}
      />
    </main>
  );
}
