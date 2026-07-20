// apps/web/types/types-listening.ts

export type Mode = 'study' | 'test';

export interface ListeningChoice {
  id: string;
  text: string;
  correct?: boolean;
  is_correct?: boolean;
}
export type LChoice = ListeningChoice;

export interface ListeningQuestion {
  id: string;
  number?: number;
  prompt?: string;
  stem?: string;
  choices: ListeningChoice[];
  meta?: Record<string, unknown>;
  // 메타인지 학습용
  type?: string;        // 문제 유형 (main_topic, detail, function, ...)
  clue_quote?: string;  // 정답 근거가 되는 스크립트 인용문
}
export type LQuestion = ListeningQuestion;

export interface ListeningTrack {
  id: string;
  title?: string;
  audioUrl: string;
  audio_url?: string;
  timeLimitSec?: number;
  durationSec?: number;
  questions: ListeningQuestion[];
}

export function getQuestionText(q: ListeningQuestion): string {
  const txt = q.prompt ?? q.stem ?? '';
  return typeof txt === 'string' ? txt.trim() : '';
}

export function getAudioUrl(t: ListeningTrack): string {
  return (t.audioUrl ?? t.audio_url ?? '').trim();
}

export function isChoiceCorrect(q: ListeningQuestion, choiceId: string): boolean {
  const c = q.choices.find((x) => x.id === choiceId);
  return !!(c && (c.is_correct === true || c.correct === true));
}

export function hasAnyCorrectChoice(q: ListeningQuestion): boolean {
  return q.choices.some((c) => c.is_correct === true || c.correct === true);
}

export type NormalizedListeningChoice = Readonly<{
  id: string;
  text: string;
  is_correct: boolean;
}>;

export type NormalizedListeningQuestion = Readonly<{
  id: string;
  number: number;
  text: string;
  choices: NormalizedListeningChoice[];
  meta?: Record<string, unknown>;
}>;

export type NormalizedListeningTrack = Readonly<{
  id: string;
  title?: string;
  audioUrl: string;
  timeLimitSec?: number;
  durationSec?: number;
  questions: NormalizedListeningQuestion[];
}>;

export function normalizeChoice(c: ListeningChoice): NormalizedListeningChoice {
  return {
    id: String(c.id),
    text: String(c.text ?? '').trim(),
    is_correct: c.is_correct === true || c.correct === true,
  };
}

export function normalizeQuestion(q: ListeningQuestion, fallbackNumber?: number): NormalizedListeningQuestion {
  const number =
    typeof q.number === 'number' && Number.isFinite(q.number) && q.number > 0
      ? Math.trunc(q.number)
      : Math.max(1, Math.trunc(fallbackNumber ?? 0));
  return {
    id: String(q.id),
    number,
    text: getQuestionText(q),
    choices: (q.choices ?? []).map(normalizeChoice),
    meta: q.meta,
  };
}

export function normalizeTrack(t: ListeningTrack): NormalizedListeningTrack {
  return {
    id: String(t.id),
    title: t.title,
    audioUrl: getAudioUrl(t),
    timeLimitSec: t.timeLimitSec,
    durationSec: t.durationSec,
    questions: (t.questions ?? []).map((q, i) =>
      normalizeQuestion(q, typeof q.number === 'number' ? q.number : i + 1),
    ),
  };
}

export function normalizeTracks(ts: ListeningTrack[]): NormalizedListeningTrack[] {
  return (ts ?? []).map(normalizeTrack);
}

export type ConsumePlayRow = Readonly<{
  id?: string;
  sessionId: string;
  playsAllowed: number;
  playsUsed: number;
  remaining: number;
}>;

export type ConsumePlayResponse =
  | { ok: true; data: ConsumePlayRow }
  | { ok: false; error: string };

export function normalizeConsumePlayRow(input: any): ConsumePlayRow {
  if (!input) return { sessionId: '', playsAllowed: 0, playsUsed: 0, remaining: 0 };
  const sessionId = input.sessionId ?? input.session_id ?? '';
  const playsAllowed = input.playsAllowed ?? input.plays_allowed ?? 0;
  const playsUsed = input.playsUsed ?? input.plays_used ?? 0;
  const remaining = input.remaining ?? Math.max(0, Number(playsAllowed) - Number(playsUsed));
  return {
    id: input.id ? String(input.id) : undefined,
    sessionId: String(sessionId),
    playsAllowed: Number(playsAllowed),
    playsUsed: Number(playsUsed),
    remaining: Number(remaining),
  };
}
