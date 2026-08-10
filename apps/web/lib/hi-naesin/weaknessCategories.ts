// 약점 분석 카테고리 정의 — 여기 한 곳만 고치면 새 드릴 유형/문법 카테고리가 반영된다.
// 문법(grammar_choice)은 payload.grammarCategory로 더 세분화하고, 나머지는 드릴 유형 단위로 묶는다.
// 이 목록은 확정된 최종 taxonomy가 아니라 계속 다듬어 나갈 초기 버전이다.

type DrillPayload = Record<string, unknown>;

const STATIC_CATEGORY_BY_DRILL_TYPE: Record<string, string> = {
  vocab: "어휘",
  fill_blank: "문법·구문 (빈칸)",
  translation: "번역",
  translation_arrange: "번역 (순서 배열)",
  writing: "작문",
  writing_arrange: "작문 (순서 배열)",
  identify_categorize: "구문 식별",
};

export function resolveWeaknessCategory(drillType: string, payload: DrillPayload): string {
  if (drillType === "grammar_choice") {
    const cat = typeof payload.grammarCategory === "string" ? payload.grammarCategory.trim() : "";
    return cat ? `문법 · ${cat}` : "문법 · 기타";
  }
  return STATIC_CATEGORY_BY_DRILL_TYPE[drillType] ?? drillType;
}

export type CategoryStat = {
  category: string;
  attempts: number;
  correct: number;
  accuracyPct: number;
};

// 표본이 너무 적으면(1~2회) 정답률이 튀어서 오히려 오판을 유발하므로 최소 시도 수를 둔다.
const MIN_ATTEMPTS_TO_SURFACE = 3;

export function summarizeWeaknesses(
  rows: { drillType: string; payload: DrillPayload; isCorrect: boolean | null }[],
): CategoryStat[] {
  const byCategory = new Map<string, { attempts: number; correct: number }>();

  for (const row of rows) {
    if (row.isCorrect === null) continue; // AI 채점 대기 중 등 아직 결과 없는 응답은 제외
    const category = resolveWeaknessCategory(row.drillType, row.payload);
    const stat = byCategory.get(category) ?? { attempts: 0, correct: 0 };
    stat.attempts += 1;
    if (row.isCorrect) stat.correct += 1;
    byCategory.set(category, stat);
  }

  return [...byCategory.entries()]
    .map(([category, { attempts, correct }]) => ({
      category,
      attempts,
      correct,
      accuracyPct: Math.round((correct / attempts) * 100),
    }))
    .filter((s) => s.attempts >= MIN_ATTEMPTS_TO_SURFACE)
    .sort((a, b) => a.accuracyPct - b.accuracyPct);
}
