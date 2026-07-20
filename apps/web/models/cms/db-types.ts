// apps/web/models/cms/db-types.ts

export type DbContentSet = {
  id: string;
  owner_id: string;
  title: string;
  section: 'reading' | 'listening' | 'speaking' | 'writing';
  level: string | null;
  tags: string[] | null;
  description: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type DbContentSetInput = {
  title: string;
  section: DbContentSet['section'];
  level?: string | null;
  tags?: string[] | null;
  description?: string | null;
  is_published?: boolean;
};

export type DbPassage = {
  id: string;
  set_id: string;
  title: string;
  content: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
};

export type DbQuestionType =
  | 'vocab' | 'detail' | 'negative_detail' | 'paraphrasing' | 'insertion'
  | 'inference' | 'purpose' | 'pronoun_ref' | 'summary' | 'organization';

export type DbQuestion = {
  id: string;
  set_id: string;
  passage_id: string | null;
  number: number;
  type: DbQuestionType;
  stem: string;
  explanation: string | null;
  clue_quote: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
};

export type DbChoice = {
  id: string;
  question_id: string;
  text: string;
  is_correct: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
};




