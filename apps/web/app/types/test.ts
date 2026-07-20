export type Choice = { id: string; label: string };
export type Question = { id: string; prompt: string; choices: Choice[] };
export type Passage = { id: string; title: string; content: string; questions: Question[] };

export type TestProgress = {
  answered: Record<string, string>;   // questionId -> choiceId
  lastPlayedTrack?: string | null;
  startedAt?: string;
};





