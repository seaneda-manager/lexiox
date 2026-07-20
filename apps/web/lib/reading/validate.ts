// apps/web/lib/reading/validate.ts
import type { RSet, RQuestion } from '@/models/reading';

/** RegExp escape */
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** meta 뷰 전용 안전 파서 */
function viewMeta(q: RQuestion) {
  const summary = (q.meta?.summary ?? {}) as {
    candidates?: string[];
    correct?: number[];        // 0-based index list
    selectionCount?: number;   // required selection count
  };
  const insertion = (q.meta?.insertion ?? {}) as {
    anchors?: Array<string | number>; // explicit anchor list -> choices.length와 동일해야 함
    correctIndex?: number;
    /** 본문 마커 텍스트(예: '[[INS]]' 또는 '[#]') */
    marker?: string;
  };
  const pronoun = (q.meta?.pronoun_ref ?? {}) as {
    pronoun?: string;
    referents?: string[];      // 최소 2개
    correctIndex?: number;
  };
  const paragraphHighlight = (q.meta?.paragraph_highlight ?? {}) as {
    paragraphs?: number[];
  };
  return { summary, insertion, pronoun, paragraphHighlight };
}

/** content 문자열에서 삽입 마커 개수 세기 */
function countInsertionMarkers(content: string, marker: string) {
  if (!marker) return 0;
  const re = new RegExp(escapeRegExp(marker), 'g');
  return (content.match(re) || []).length;
}

/** 얕은 객체 판별 */
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** 세트 검증 */
export function validateSet(s: RSet) {
  const errs: string[] = [];

  if (!s.passages?.length) errs.push('No passages.');

  s.passages?.forEach((p, pi) => {
    if (!p.title) errs.push(`P${pi + 1}: title missing`);
    if (!Array.isArray(p.paragraphs) || p.paragraphs.length === 0) {
      errs.push(`P${pi + 1}: paragraphs missing`);
    }

    // paragraphs를 content 문자열로 브릿지
    const contentStr = Array.isArray(p.paragraphs) ? p.paragraphs.join('\n\n') : '';

    const seenNumbers = new Set<number>();

    (p.questions ?? []).forEach((q) => {
      // 번호 중복
      if (seenNumbers.has(q.number)) errs.push(`P${pi + 1} Q# dup: ${q.number}`);
      seenNumbers.add(q.number);

      const choices = q.choices ?? [];
      const { summary, insertion, pronoun } = viewMeta(q);

      // 단일 정답 유형: summary/organization 제외하고 정답은 정확히 1개
      if (q.type !== 'summary' && q.type !== 'organization') {
        const corrects = choices.filter((c) => !!(c as any).isCorrect).length;
        if (corrects !== 1) {
          errs.push(`P${pi + 1} Q${q.number}: single-answer must have exactly 1 correct`);
        }
      }

      // insertion: anchors 길이 === choices.length
      // anchors가 없으면 marker 기반으로 본문 마커 개수 === choices.length
      if (q.type === 'insertion') {
        const choiceCount = choices.length;
        if (Array.isArray(insertion.anchors)) {
          const anchorCount = insertion.anchors.length;
          if (anchorCount !== choiceCount) {
            errs.push(
              `P${pi + 1} Q${q.number}: insertion anchors(${anchorCount}) != choices(${choiceCount})`
            );
          }
        } else {
          const markerText = insertion.marker ?? '[[INS]]';
          const markerCount = countInsertionMarkers(contentStr, markerText);
          if (markerCount !== choiceCount) {
            errs.push(
              `P${pi + 1} Q${q.number}: insertion markers(${markerCount}) != choices(${choiceCount}) [marker="${markerText}"]`
            );
          }
        }
      }

      // summary: selectionCount & correct 개수 검증
      if (q.type === 'summary') {
        const sel = Number.isFinite(summary.selectionCount)
          ? (summary.selectionCount as number)
          : 3;

        // meta.summary.correct가 있으면 우선, 없으면 choices.isCorrect 기반
        const correctCount = Array.isArray(summary.correct)
          ? summary.correct.length
          : choices.filter((c) => !!(c as any).isCorrect).length;

        if (correctCount !== sel) {
          errs.push(`P${pi + 1} Q${q.number}: summary correct must be ${sel}`);
        }
        if (choices.length < sel * 2) {
          errs.push(`P${pi + 1} Q${q.number}: summary needs >= ${sel * 2} choices`);
        }
      }

      // pronoun_ref: 후보 최소 2, correctIndex 범위 체크
      if (q.type === 'pronoun_ref') {
        const refLen = pronoun.referents?.length ?? 0;
        if (refLen < 2) {
          errs.push(`P${pi + 1} Q${q.number}: pronoun_ref needs at least 2 referents`);
        }
        if (typeof pronoun.correctIndex === 'number' && pronoun.correctIndex >= refLen) {
          errs.push(`P${pi + 1} Q${q.number}: pronoun_ref correctIndex out of range`);
        }
      }

      // explanation.why_others (메타 안에 있는 구조화된 설명) 의 choice id 유효성
      {
        const exp = (q.meta as any)?.explanation as unknown;
        if (isObject(exp) && 'why_others' in exp) {
          const why = (exp as Record<string, unknown>)['why_others'];
          if (isObject(why)) {
            const ids = new Set(choices.map((c) => c.id));
            for (const id of Object.keys(why)) {
              if (!ids.has(id)) {
                errs.push(`P${pi + 1} Q${q.number}: why_others has unknown choice id "${id}"`);
              }
            }
          }
        }
      }
    });
  });

  return errs;
}
