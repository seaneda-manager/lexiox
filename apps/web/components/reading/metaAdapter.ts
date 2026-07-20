// apps/web/components/reading/metaAdapter.ts
import type { RQuestion } from '@/models/reading';

export type Target =
  | { mode: 'paragraph'; paragraph_index: number; arrow?: boolean }
  | { mode: 'insertion'; paragraph_index: number; anchors: string[] }
  | undefined;

// QLike/?뉗? 吏덈Ц 媛앹껜???덉슜?섍린 ?꾪븳 罹먮━?????
export type MetaCarrier = {
  type?: string;
  meta?: unknown;
};

// ?대? ?뚯떛?먯꽌 ?ъ슜???덉쟾??蹂댁“ ???
type ParagraphHighlightMeta = { paragraphs?: number[] } | undefined;
type InsertionMeta = { anchors?: Array<string | number> } | undefined;

/** meta ?덉쟾 ?뚯꽌 */
function viewMeta(q: MetaCarrier | RQuestion) {
  const meta = (q as any)?.meta ?? {};
  const paragraphHighlight = (meta?.paragraph_highlight ?? {}) as ParagraphHighlightMeta;
  const insertion = (meta?.insertion ?? {}) as InsertionMeta;
  return { paragraphHighlight, insertion };
}

/** ??????????????????????????????????????????????????????????
 *  ?ㅻ쾭濡쒕뱶: RQuestion?? MetaCarrier(QLike)??紐⑤몢 諛쏅뒗??
 *  ?????????????????????????????????????????????????????????? */
export function targetFromMeta(q: RQuestion): Target;
export function targetFromMeta(q: MetaCarrier): Target;
export function targetFromMeta(q: any): Target {
  const { paragraphHighlight, insertion } = viewMeta(q);

  // 臾몃떒 ?섏씠?쇱씠??
  if (paragraphHighlight?.paragraphs?.length) {
    const idxRaw = paragraphHighlight.paragraphs[0];
    const paragraph_index =
      Number.isFinite(idxRaw) && (idxRaw as number) >= 0 ? (idxRaw as number) : 0;
    return { mode: 'paragraph', paragraph_index, arrow: true };
  }

  // 臾몄옣 ?쎌엯
  if (insertion?.anchors?.length) {
    const anchors = insertion.anchors.map(String);
    // 蹂댄넻 蹂몃Ц ?꾩껜 湲곗?(0)?먯꽌 ?듭빱 紐⑸줉 ?ъ슜
    return { mode: 'insertion', paragraph_index: 0, anchors };
  }

  return undefined;
}




