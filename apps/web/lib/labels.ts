export function toDisplayLabel(key: string): string {
  const map: Record<string, string> = {
    vocab: 'Vocabulary',
    detail: 'Detail',
    negative_detail: 'Negative Detail',
    paraphrasing: 'Paraphrasing',
    insertion: 'Insertion',
    inference: 'Inference',
    purpose: 'Purpose',
    pronoun_ref: 'Pronoun Reference',
    summary: 'Summary',
    organization: 'Organization',
  };
  return map[key] ?? key;
}




