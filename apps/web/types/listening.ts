// apps/web/types/consume-play.ts

/** 紐⑤뱶(吏㏃? ?쒓린/湲??쒓린) */
export type ModeShort = 'p' | 't' | 'r';          // practice, test, review
export type ModeLong  = 'study' | 'test' | 'review';
export type Mode = ModeShort | ModeLong;

/** 1???덉퐫?? */
export type ConsumePlayRow = Readonly<{
  session_id: string;
  track_id: string | null;
  mode: Mode;

  /** ?덉슜 ?ъ깮 ?잛닔 (0 ?댁긽) */
  plays_allowed: number;

  /** ?ъ슜???ъ깮 ?잛닔 (0 ?댁긽) */
  plays_used: number;

  /**
   * ?⑥? ?ъ깮 ?잛닔.
   * ?쒕쾭媛 怨꾩궛??以??섎룄 ?덇퀬(optional), ?놁쑝硫??대씪?댁뼵?몄뿉??怨꾩궛?⑸땲??
   * UI/濡쒖쭅?먯꽑 remainingPlays(row) ?좏떥???ъ슜?섎뒗 嫄?沅뚯옣?⑸땲??
   */
  remaining?: number;
}>;

/** ?깃났 ?묐떟 (?섏씠吏?ㅼ씠??媛?? */
export type ConsumePlayOk = Readonly<{
  ok: true;
  data: ConsumePlayRow[];
  /** ?꾩슂 ???댁뼱諛쏆쓣 而ㅼ꽌 */
  cursor?: string | null;
}>;

/** ?ㅽ뙣 ?묐떟 */
export type ConsumePlayErr = Readonly<{
  ok: false;
  error: string;
  /** ?? 'UNAUTHORIZED' | 'NOT_FOUND' | 'RATE_LIMITED' ??*/
  code?: string;
}>;

export type ConsumePlayResponse = ConsumePlayOk | ConsumePlayErr;

/* ????????????????????????? Helpers ????????????????????????? */

/**
 * 紐⑤뱶瑜?湲??쒓린('study' | 'test' | 'review')濡??뺢퇋??
 */
export function canonicalMode(m: Mode): ModeLong {
  if (m === 'p') return 'study';
  if (m === 't' || m === 'test') return 'test';
  if (m === 'r' || m === 'review') return 'review';
  // 湲곕낯媛? study
  return 'study';
}

/**
 * ?⑥? ?ъ깮 ?잛닔 怨꾩궛 (?뚯닔/NaN 諛⑹? ?ы븿)
 */
export function remainingPlays(row: ConsumePlayRow): number {
  const allow = Math.max(0, Math.trunc(row.plays_allowed ?? 0));
  const used  = Math.max(0, Math.trunc(row.plays_used ?? 0));
  const rem   = row.remaining ?? (allow - used);
  return Math.max(0, Math.trunc(rem));
}

/**
 * ?ъ깮 媛???щ?
 */
export function canPlay(row: ConsumePlayRow): boolean {
  return remainingPlays(row) > 0;
}




