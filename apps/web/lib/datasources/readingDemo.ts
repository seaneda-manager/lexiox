// apps/web/lib/datasources/readingDemo.ts
import type {
  ReadingEditorDataSource,
  RPassage,
} from "@/components/reading/admin/ReadingEditorData";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const readingDemoDataSource: ReadingEditorDataSource = {
  async load(passageId: string) {
    await delay(200);
    return {
      id: passageId,
      title: "Demo Passage",
      content: "This is a demo passage.\n\nSecond paragraph.",
      questions: [
        {
          id: "q1",
          number: 1,
          type: "detail",
          stem: "What is the main idea?",
          choices: [
            { id: "c1", text: "A", is_correct: true, order_no: 1 },
            { id: "c2", text: "B", is_correct: false, order_no: 2 },
            { id: "c3", text: "C", is_correct: false, order_no: 3 },
            { id: "c4", text: "D", is_correct: false, order_no: 4 },
          ],
        },
      ],
    } satisfies RPassage;
  },
  async save(model: RPassage) {
    await delay(200);
    console.log("[DEMO SAVE]", model);
    return { passage_id: model.id || "demo-passage-id" };
  },
};
