// apps/web/types/consume-play.ts

export type ModeShort = 'p' | 't' | 'r';
export type ModeLong  = 'study' | 'test' | 'review';
export type Mode = ModeShort | ModeLong;

export type ConsumePlayRow = Readonly<{
  session_id: string;
  track_id: string | null;
  mode: Mode;
  plays_allowed: number;
  plays_used: number;
  remaining?: number;
}>;

export type ConsumePlayOk = Readonly<{
  ok: true;
  data: ConsumePlayRow[];
  cursor?: string | null;
}>;
export type ConsumePlayErr = Readonly<{
  ok: false;
  error: string;
  code?: string;
}>;
export type ConsumePlayResponse = ConsumePlayOk | ConsumePlayErr;

export function canonicalMode(m: Mode): ModeLong {
  if (m === 'p') return 'study';
  if (m === 't' || m === 'test') return 'test';
  if (m === 'r' || m === 'review') return 'review';
  return 'study';
}

export function remainingPlays(row: ConsumePlayRow): number {
  const allow = Math.max(0, Math.trunc(row.plays_allowed ?? 0));
  const used  = Math.max(0, Math.trunc(row.plays_used ?? 0));
  const rem = (row.remaining ?? allow - used);
  return Math.max(0, Math.trunc(rem));
}

export function canPlay(row: ConsumePlayRow): boolean {
  return remainingPlays(row) > 0;
}




