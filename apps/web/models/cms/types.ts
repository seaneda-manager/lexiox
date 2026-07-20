// apps/web/models/cms/types.ts

export type CmsChoice = {
  id: string;
  text: string;
  is_correct?: boolean;
};

export type CmsQuestionType =
  | 'vocab' | 'detail' | 'negative_detail' | 'paraphrasing'
  | 'insertion' | 'inference' | 'purpose' | 'pronoun_ref'
  | 'summary' | 'organization';

export type CmsQuestion = {
  id: string;
  number: number;
  type: CmsQuestionType;
  stem: string;
  explanation?: string | null;
  clue_quote?: string | null;
  choices: CmsChoice[];
};

export type CmsPassage = {
  id: string;
  set_id: string;
  title: string;
  content: string; // HTML or plain text
  questions: CmsQuestion[];
};




