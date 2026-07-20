import type {
  PassageAuthoringDocument,
  PassageParagraph,
  PassageSentence,
} from "@/components/naesin/authoring/passage_authoring_schema_v1";

function normalizeLineBreaks(input: string): string {
  return input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function splitRawPassageIntoParagraphs(rawPassage: string): string[] {
  const normalized = normalizeLineBreaks(rawPassage).trim();
  if (!normalized) return [];

  return normalized
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function splitParagraphIntoSentences(paragraph: string): string[] {
  const normalized = paragraph.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const matches = normalized.match(/.+?[.!?](?=(?:\s+[A-Z"'“‘(])|\s*$)|.+$/g);
  if (!matches) return [normalized];

  return matches.map((sentence) => sentence.trim()).filter(Boolean);
}

export function buildParagraphsAndSentences(rawPassage: string): {
  paragraphs: PassageParagraph[];
  sentences: PassageSentence[];
} {
  const paragraphTexts = splitRawPassageIntoParagraphs(rawPassage);
  const paragraphs: PassageParagraph[] = [];
  const sentences: PassageSentence[] = [];

  let globalSentenceOrder = 0;

  paragraphTexts.forEach((rawParagraph, paragraphIndex) => {
    const paragraphId = `p${paragraphIndex + 1}`;
    const sentenceTexts = splitParagraphIntoSentences(rawParagraph);
    const sentenceIds: string[] = [];

    sentenceTexts.forEach((text, sentenceIndex) => {
      globalSentenceOrder += 1;
      const sentenceId = `s${globalSentenceOrder}`;
      sentenceIds.push(sentenceId);
      sentences.push({
        id: sentenceId,
        paragraphId,
        order: globalSentenceOrder,
        text,
      });
    });

    paragraphs.push({
      id: paragraphId,
      label: `Paragraph ${paragraphIndex + 1}`,
      sentenceIds,
      rawText: rawParagraph,
    });
  });

  return {
    paragraphs,
    sentences,
  };
}

export function applyRawPassageToDocument(
  doc: PassageAuthoringDocument,
  rawPassage: string,
): PassageAuthoringDocument {
  const { paragraphs, sentences } = buildParagraphsAndSentences(rawPassage);

  return {
    ...doc,
    core: {
      ...doc.core,
      rawPassage,
      paragraphs,
      sentences,
    },
  };
}
