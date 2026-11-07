export interface RChoice { id: string; text: string; is_correct?: boolean; explain?: string | null; ord?: number; label?: string; meta?: unknown }
export interface RQuestionMeta { summary?: { selectionCount?: number; candidates?: string[]; correct?: number[] }; insertion?: { anchors?: string[]; correctIndex?: number }; pronoun_ref?: { pronoun?: string; referents?: string[]; correctIndex?: number }; paragraph_highlight?: { paragraphs?: number[] } }
/** 정답 근거 문장 — 지문의 원문을 그대로 인용한다. AI가 초안(draft)을 만들고 선생님이 검수해 approved로 바꾼다. */
export interface REvidence {
  quote: string;
  status: 'draft' | 'approved' | 'rejected';
  source: 'ai' | 'teacher';
  reviewedAt?: string;
  reviewedBy?: string;
}
export interface RExplanation { clue_quote?: string; rationale?: string; evidence?: REvidence[] }
export interface RQuestion { id: string; passage_id?: string; number: number; type: string; stem: string; choices: RChoice[]; meta?: RQuestionMeta; explanation?: RExplanation }
export interface RPassage { id: string; title?: string; text: string; meta?: unknown; questions: RQuestion[] }
export interface RSet { id: string; source?: string; topic?: string; passages: RPassage[]; meta?: unknown }
export type RQType = 'vocab' | 'detail' | 'inference' | 'purpose' | 'reference' | 'sentence_simplify' | 'insert_sentence' | 'summary'
