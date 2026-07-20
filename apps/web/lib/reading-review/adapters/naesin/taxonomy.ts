import type { WeakTagTaxonomy } from "@/lib/reading-review/core/types";

export const NAESIN_READING_TAXONOMY: WeakTagTaxonomy = {
  detail: ["detail", "negative_detail", "grammar_in_context"],
  inference: ["inference"],
  purposeMainIdea: ["purpose", "main_idea", "title", "author_claim", "tone"],
  summaryOrganization: ["summary", "organization", "order", "matching", "topic_sentence"],
};
