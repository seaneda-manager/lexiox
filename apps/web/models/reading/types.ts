export interface RChoice { id: string; text: string; is_correct?: boolean; explain?: string | null; ord?: number; label?: string; meta?: unknown }
export interface RQuestionMeta { summary?: { selectionCount?: number; candidates?: string[]; correct?: number[] }; insertion?: { anchors?: string[]; correctIndex?: number }; pronoun_ref?: { pronoun?: string; referents?: string[]; correctIndex?: number }; paragraph_highlight?: { paragraphs?: number[] } }
export interface RExplanation { clue_quote?: string; rationale?: string }
export interface RQuestion { id: string; passage_id?: string; number: number; type: string; stem: string; choices: RChoice[]; meta?: RQuestionMeta; explanation?: RExplanation }
export interface RPassage { id: string; title?: string; text: string; meta?: unknown; questions: RQuestion[] }
export interface RSet { id: string; source?: string; topic?: string; passages: RPassage[]; meta?: unknown }
export type RQType = 'vocab' | 'detail' | 'inference' | 'purpose' | 'reference' | 'sentence_simplify' | 'insert_sentence' | 'summary'
