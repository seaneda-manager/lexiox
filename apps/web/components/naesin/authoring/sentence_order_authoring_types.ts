export type SentenceOrderStyle = "naesin" | "junior" | "mock_exam" | "other";

export type SentenceOrderPresentation =
  | "excerpt_bundle"
  | "first_fixed_then_order"
  | "full_sentence_reorder";

export type PassageSentenceOrderItem = {
  id: string;
  title: string;
  style: SentenceOrderStyle;
  presentation: SentenceOrderPresentation;
  prompt?: string;
  sourceParagraphId?: string;
  sourceSentenceIds: string[];
  fixedSentenceIds?: string[];
  choiceSentenceIds: string[];
  answerSentenceIds: string[];
  note?: string;
};

export function createEmptySentenceOrderItem(
  id: string,
): PassageSentenceOrderItem {
  return {
    id,
    title: "Sentence Order",
    style: "naesin",
    presentation: "excerpt_bundle",
    prompt: "문장 순서를 올바르게 배열하세요.",
    sourceSentenceIds: [],
    fixedSentenceIds: [],
    choiceSentenceIds: [],
    answerSentenceIds: [],
    note: "",
  };
}
