// apps/web/app/types/listening.ts

/** 紐⑤뱶 ??? 異뺤빟??t/p/r)怨??뺢퇋??test/study/review) 紐⑤몢 ?덉슜 */
export type CanonicalMode = 'test' | 'study' | 'review';
export type Mode = CanonicalMode | 't' | 'p' | 'r';

/** API?먯꽌 ??긽 ?뺢퇋?뺤쑝濡??곌린 ?꾪븳 ?몃??쇱씠? */
export function normalizeMode(m: Mode | undefined | null): CanonicalMode {
  switch (m) {
    case 't':
    case 'test':
      return 'test';
    case 'p':
    case 'study':
      return 'study';
    case 'r':
    case 'review':
      return 'review';
    default:
      // 湲곕낯媛믪? test濡?
      return 'test';
  }
}

/** ?붿뿬 ?ъ깮 ?뺣낫 1??*/
export type ConsumePlayRow = {
  session_id: string;
  /** ?꾩껜(?몃옓 臾닿?)??寃쎌슦 null */
  track_id: string | null;
  mode: CanonicalMode;            // ???뺢퇋?뺣쭔 ?ъ슜
  plays_allowed: number;
  plays_used: number;
  remaining: number;
};

/** API ?묐떟 ?좊땲??*/
export type ConsumePlayResponse =
  | { ok: true; data: ConsumePlayRow[] }
  | { ok: false; error: string };




